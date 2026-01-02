import { Response } from "express";
import { validationResult } from "express-validator";
import Gift from "../models/Gift";
import GiftBox from "../models/GiftBox";
import Wallet from "../models/Wallet";
import Card from "../models/Card";
import Website from "../models/Website";
import { AuthRequest } from "../types";
import { getPagination, formatPaginatedResponse } from "../utils/helpers";

// Get Gift Catalog
export const getGiftCatalog = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { skip } = getPagination(page, limit);

    const [gifts, total] = await Promise.all([
      Gift.find({ isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Gift.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      ...formatPaginatedResponse(gifts, total, page, limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch gift catalog." });
  }
};

// Purchase Gift (deduct from wallet)
export const purchaseGift = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { giftId, quantity = 1 } = req.body;

    // Get gift
    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) {
      res.status(404).json({ success: false, message: "Gift not found." });
      return;
    }

    // Check stock if applicable
    if (gift.stock !== undefined && gift.stock < quantity) {
      res.status(400).json({ success: false, message: "Insufficient stock." });
      return;
    }

    const totalPrice = gift.price * quantity;

    // Get wallet
    const wallet = await Wallet.findOne({ userId: req.user!._id });
    if (!wallet || wallet.balance < totalPrice) {
      res.status(400).json({
        success: false,
        message: "Insufficient wallet balance.",
      });
      return;
    }

    // Deduct from wallet
    wallet.balance -= totalPrice;
    wallet.transactions.push({
      type: "debit",
      amount: totalPrice,
      reference: `GIFT_${Date.now()}`,
      description: `Purchased ${quantity}x ${gift.name}`,
      status: "completed",
      createdAt: new Date(),
    });
    await wallet.save();

    // Update stock if applicable
    if (gift.stock !== undefined) {
      gift.stock -= quantity;
      await gift.save();
    }

    res.json({
      success: true,
      message: "Gift purchased successfully.",
      data: {
        gift: gift,
        quantity,
        totalPrice,
        newBalance: wallet.balance,
      },
    });
  } catch (error) {
    console.error("Purchase gift error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to purchase gift." });
  }
};

// Add Gift to Gift Box
export const addToGiftBox = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const {
      giftId,
      cardId,
      websiteId,
      quantity = 1,
      recipientEmail,
    } = req.body;

    if (!cardId && !websiteId) {
      res.status(400).json({
        success: false,
        message: "Either cardId or websiteId is required.",
      });
      return;
    }

    // Verify gift exists
    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) {
      res.status(404).json({ success: false, message: "Gift not found." });
      return;
    }

    // Verify card/website ownership
    if (cardId) {
      const card = await Card.findOne({ _id: cardId, userId: req.user!._id });
      if (!card) {
        res.status(404).json({ success: false, message: "Card not found." });
        return;
      }
    }

    if (websiteId) {
      const website = await Website.findOne({
        _id: websiteId,
        userId: req.user!._id,
      });
      if (!website) {
        res.status(404).json({ success: false, message: "Website not found." });
        return;
      }
    }

    // Find or create gift box
    let giftBox = await GiftBox.findOne({
      senderId: req.user!._id,
      ...(cardId ? { cardId } : { websiteId }),
      isRedeemed: false,
    });

    if (!giftBox) {
      giftBox = await GiftBox.create({
        senderId: req.user!._id,
        cardId,
        websiteId,
        recipientEmail,
        gifts: [],
      });

      // Link gift box to card/website
      if (cardId) {
        await Card.findByIdAndUpdate(cardId, { giftBox: giftBox._id });
      } else if (websiteId) {
        await Website.findByIdAndUpdate(websiteId, { giftBox: giftBox._id });
      }
    }

    // Add gift to box
    const existingGift = giftBox.gifts.find(
      (g) => g.giftId.toString() === giftId
    );
    if (existingGift) {
      existingGift.quantity += quantity;
    } else {
      giftBox.gifts.push({
        giftId,
        quantity,
        purchasedAt: new Date(),
      });
    }

    await giftBox.save();

    const populatedGiftBox = await GiftBox.findById(giftBox._id).populate(
      "gifts.giftId"
    );

    res.json({
      success: true,
      message: "Gift added to gift box.",
      data: populatedGiftBox,
    });
  } catch (error) {
    console.error("Add to gift box error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add gift to box." });
  }
};

// Get Gift Box
export const getGiftBox = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const giftBox = await GiftBox.findById(id)
      .populate("gifts.giftId")
      .populate("senderId", "firstName lastName email");

    if (!giftBox) {
      res.status(404).json({ success: false, message: "Gift box not found." });
      return;
    }

    res.json({ success: true, data: giftBox });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch gift box." });
  }
};

// Redeem Gift Box (in-app only)
export const redeemGiftBox = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;

    const giftBox = await GiftBox.findOne({ redemptionCode: code })
      .populate("gifts.giftId")
      .populate("senderId", "firstName lastName");

    if (!giftBox) {
      res.status(404).json({ success: false, message: "Gift box not found." });
      return;
    }

    if (giftBox.isRedeemed) {
      res.status(400).json({
        success: false,
        message: "This gift box has already been redeemed.",
      });
      return;
    }

    // Mark as redeemed
    giftBox.isRedeemed = true;
    giftBox.redeemedAt = new Date();
    await giftBox.save();

    // Calculate total value
    const totalValue = giftBox.gifts.reduce((sum, item) => {
      const gift = item.giftId as any;
      return sum + gift.value * item.quantity;
    }, 0);

    // Add value to recipient's wallet (if logged in)
    if (req.user) {
      let wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet) {
        wallet = await Wallet.create({ userId: req.user._id });
      }
      wallet.balance += totalValue;
      wallet.transactions.push({
        type: "credit",
        amount: totalValue,
        reference: `REDEEM_${giftBox.redemptionCode}`,
        description: "Gift box redemption",
        status: "completed",
        createdAt: new Date(),
      });
      await wallet.save();
    }

    res.json({
      success: true,
      message: "Gift box redeemed successfully!",
      data: {
        giftBox,
        totalValue,
        creditedToWallet: !!req.user,
      },
    });
  } catch (error) {
    console.error("Redeem gift box error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to redeem gift box." });
  }
};

// Get My Gift Boxes (sent)
export const getMySentGiftBoxes = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const giftBoxes = await GiftBox.find({ senderId: req.user!._id })
      .populate("gifts.giftId")
      .populate("cardId", "title")
      .populate("websiteId", "title")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: giftBoxes });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch gift boxes." });
  }
};
