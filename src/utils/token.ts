import jwt from "jsonwebtoken";
import { Response } from "express";
import { IUser } from "../model/User";

export const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_access_secret", {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
    {
      expiresIn: "7d",
    }
  );
};

export const sendTokenResponse = (
  user: IUser,
  statusCode: number,
  res: Response
) => {
  const accessToken = generateAccessToken((user._id as any).toString());
  const refreshToken = generateRefreshToken((user._id as any).toString());

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? "User registered successfully" : "User logged in successfully",
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        authProvider: user.authProvider,
      },
    },
  });
};
