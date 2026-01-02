import { Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { env } from "../config/env";
import { AuthRequest } from "../types";
import { generateToken, sanitizeUser } from "../utils/helpers";
import { sendEmail } from "../services/emailService";

// Generate JWT tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: "15m",
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId }, env.jwtRefreshSecret, {
    expiresIn: "7d",
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
};

// Register
export const register = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
      return;
    }

    // Create user
    const verificationToken = generateToken();
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      verificationToken,
    });

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    // Send verification email (async, don't await)
    sendEmail({
      to: email,
      subject: "Verify your WishCube account",
      html: `
        <h1>Welcome to WishCube!</h1>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${env.appUrl}/verify?token=${verificationToken}">Verify Email</a>
      `,
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: {
        user: sanitizeUser(user),
        ...tokens,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Registration failed." });
  }
};

// Login
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        user: sanitizeUser(user),
        ...tokens,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed." });
  }
};

// Refresh Token
export const refreshToken = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret) as {
      userId: string;
    };

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString());

    res.json({
      success: true,
      message: "Token refreshed successfully.",
      data: tokens,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
};

// Forgot Password
export const forgotPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      res.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
      return;
    }

    // Generate reset token
    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // Send reset email
    await sendEmail({
      to: email,
      subject: "Reset your WishCube password",
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${env.appUrl}/reset-password?token=${resetToken}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });

    res.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to process request." });
  }
};

// Reset Password
export const resetPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
      return;
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to reset password." });
  }
};

// Verify Email
export const verifyEmail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token }).select(
      "+verificationToken"
    );
    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid verification token.",
      });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ success: false, message: "Verification failed." });
  }
};

// Get Profile
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: sanitizeUser(req.user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get profile." });
  }
};

// Update Profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { firstName, lastName, avatar },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully.",
      data: sanitizeUser(user),
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile." });
  }
};
