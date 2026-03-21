import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../model/User";
import Vendor, { IVendor } from "../model/Vendor";
import { AppError } from "../utils/errorHandler";
import { asyncHandler } from "../utils/errorHandler";

// Extend Express Request interface to include user or vendor
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      vendor?: IVendor;
    }
  }
}

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_access_secret"
      );

      // Check User first
      const user = await User.findById(decoded.id);
      if (user) {
        if (!user.isActive) {
          return next(new AppError("Account is deactivated", 403));
        }
        req.user = user;
        return next();
      }

      // Check Vendor if not User
      const vendor = await Vendor.findById(decoded.id);
      if (vendor) {
        if (!vendor.isActive && vendor.status === "suspended") {
          return next(new AppError("Vendor account is suspended", 403));
        }
        req.vendor = vendor;
        // For compatibility with routes expecting req.user
        req.user = {
          _id: vendor._id,
          name: vendor.ownerName,
          email: vendor.email,
          role: "vendor",
          isActive: vendor.isActive,
        } as any;
        return next();
      }

      return next(new AppError("No account found with this id", 404));
    } catch (err) {
      return next(new AppError("Not authorized to access this route", 401));
    }
  }
);

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(String(req.user.role).trim())) {
      return next(
        new AppError(
          `User role ${req.user?.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
