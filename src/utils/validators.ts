import { body, param, query } from "express-validator";

// Auth Validators
export const registerValidator = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/\d/)
    .withMessage("Password must contain a number"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
];

export const loginValidator = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

// Card Validators
export const createCardValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("occasion").trim().notEmpty().withMessage("Occasion is required"),
  body("content").optional().isString(),
];

export const updateCardValidator = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty"),
  body("occasion").optional().trim().notEmpty(),
  body("content").optional().isString(),
  body("customization").optional().isObject(),
];

// Website Validators
export const createWebsiteValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("occasion").trim().notEmpty().withMessage("Occasion is required"),
  body("subdomain")
    .trim()
    .notEmpty()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Subdomain must be lowercase alphanumeric with hyphens"),
];

// Event Validators
export const createEventValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("description").optional().isString(),
  body("eventType").trim().notEmpty().withMessage("Event type is required"),
  body("date").isISO8601().withMessage("Valid date is required"),
  body("time").trim().notEmpty().withMessage("Time is required"),
  body("location").isObject().withMessage("Location is required"),
  body("location.type")
    .isIn(["physical", "virtual"])
    .withMessage("Location type must be physical or virtual"),
];

// Gift Validators
export const purchaseGiftValidator = [
  body("giftId").isMongoId().withMessage("Valid gift ID is required"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const addToGiftBoxValidator = [
  body("giftId").isMongoId().withMessage("Valid gift ID is required"),
  body("cardId")
    .optional()
    .isMongoId()
    .withMessage("Valid card ID is required"),
  body("websiteId")
    .optional()
    .isMongoId()
    .withMessage("Valid website ID is required"),
];

// Wallet Validators
export const fundWalletValidator = [
  body("amount").isFloat({ min: 100 }).withMessage("Minimum amount is 100"),
];

// RSVP Validators
export const submitRSVPValidator = [
  body("guestName").trim().notEmpty().withMessage("Guest name is required"),
  body("guestEmail")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("status")
    .isIn(["accepted", "declined", "maybe"])
    .withMessage("Invalid RSVP status"),
  body("plusOnes")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("Plus ones must be between 0 and 10"),
];

// Common Validators
export const mongoIdValidator = (fieldName: string) => [
  param(fieldName).isMongoId().withMessage(`Valid ${fieldName} is required`),
];

export const paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
