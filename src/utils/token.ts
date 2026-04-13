import jwt from "jsonwebtoken";
import { Response } from "express";

interface TokenEntity {
  _id: any;
  name?: string;
  ownerName?: string;
  email: string;
  role?: string;
  avatar?: string;
  logo?: string | null;
  isActive: boolean;
  authProvider?: string;
}
export const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_access_secret", {
    expiresIn: "1h", // Increased from 15m to 1h for better DX, but still more secure than 7d
  });
};
export const generateRefreshToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
    {
      expiresIn: "7d",
    },
  );
};

export const sendTokenResponse = (
  entity: TokenEntity,
  statusCode: number,
  res: Response,
  type: "user" | "vendor" = "user",
) => {
  const accessToken = generateAccessToken((entity._id as any).toString());
  const refreshToken = generateRefreshToken((entity._id as any).toString());

  const responseData: any = {
    accessToken,
    refreshToken,
  };

  if (type === "user") {
    responseData.user = {
      id: entity._id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      avatar: entity.avatar,
      isActive: entity.isActive,
      authProvider: entity.authProvider,
    };
  } else {
    responseData.vendor = {
      id: entity._id,
      ownerName: entity.ownerName,
      email: entity.email,
      logo: entity.logo,
      isActive: entity.isActive,
    };
  }

  res.status(statusCode).json({
    success: true,
    message:
      statusCode === 201
        ? `${type === "user" ? "User" : "Vendor"} registered successfully`
        : `${type === "user" ? "User" : "Vendor"} logged in successfully`,
    data: responseData,
  });
};
