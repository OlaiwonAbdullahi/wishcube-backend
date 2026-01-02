import multer from "multer";
import { Request } from "express";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedAudioTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
  ];
  const allowedTypes = [...allowedImageTypes, ...allowedAudioTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images and audio files are allowed.")
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload helpers
export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 5);
export const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "voice", maxCount: 1 },
  { name: "music", maxCount: 1 },
]);
