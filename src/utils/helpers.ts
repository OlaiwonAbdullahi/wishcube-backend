import crypto from "crypto";

/**
 * Generate a unique shareable link
 */
export const generateShareableLink = (): string => {
  return crypto.randomBytes(8).toString("hex");
};

/**
 * Generate a gift box redemption code
 */
export const generateRedemptionCode = (): string => {
  return crypto.randomBytes(6).toString("hex").toUpperCase();
};

/**
 * Generate a random token for verification/reset
 */
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Calculate pagination values
 */
export const getPagination = (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Math.min(limit, 100) };
};

/**
 * Format pagination response
 */
export const formatPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Sanitize user object for response (remove sensitive fields)
 */
export const sanitizeUser = (user: any) => {
  const {
    password,
    verificationToken,
    resetPasswordToken,
    resetPasswordExpires,
    ...sanitized
  } = user.toObject ? user.toObject() : user;
  return sanitized;
};

/**
 * Generate slug from string
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
};
