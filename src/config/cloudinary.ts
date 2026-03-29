import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

// Allowed MIME types for general media uploads
const mediaFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // Audio
    "audio/mpeg", // .mp3
    "audio/wav", // .wav
    "audio/ogg", // .ogg
    "audio/mp4", // .m4a
    "audio/aac", // .aac
    "audio/flac", // .flac
    "audio/webm", // .weba
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Allowed: images and audio files.`,
      ),
    );
  }
};

export const uploadImage = multer({ storage });
export const uploadLogo = multer({ storage });
export const uploadVoice = multer({ storage });
export const uploadVideo = multer({ storage });
export const uploadProduct = multer({ storage });

// General media uploader — accepts images AND audio
export const uploadMedia = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max
});

/**
 * Detects whether a mimetype is audio, video, or image
 * and returns the correct Cloudinary resource_type.
 * Note: Cloudinary uses resource_type "video" for audio files too.
 */
function getResourceType(mimetype: string): "image" | "video" | "raw" {
  if (mimetype.startsWith("audio/")) return "video"; // Cloudinary handles audio under "video"
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("image/")) return "image";
  return "raw";
}

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string = "cards",
  mimetype: string = "image/jpeg",
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimetype);
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    uploadStream.end(buffer);
  });
};

export const deleteFile = async (
  publicId: string,
  mimetype: string = "image/jpeg",
) => {
  try {
    const resourceType = getResourceType(mimetype);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};
