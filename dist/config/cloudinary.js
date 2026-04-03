"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadToCloudinary = exports.uploadMedia = exports.uploadProduct = exports.uploadVideo = exports.uploadVoice = exports.uploadLogo = exports.uploadImage = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = multer_1.default.memoryStorage();
// Allowed MIME types for general media uploads
const mediaFileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: images and audio files.`));
    }
};
exports.uploadImage = (0, multer_1.default)({ storage });
exports.uploadLogo = (0, multer_1.default)({ storage });
exports.uploadVoice = (0, multer_1.default)({ storage });
exports.uploadVideo = (0, multer_1.default)({ storage });
exports.uploadProduct = (0, multer_1.default)({ storage });
// General media uploader — accepts images AND audio
exports.uploadMedia = (0, multer_1.default)({
    storage,
    fileFilter: mediaFileFilter,
    limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max
});
/**
 * Detects whether a mimetype is audio, video, or image
 * and returns the correct Cloudinary resource_type.
 * Note: Cloudinary uses resource_type "video" for audio files too.
 */
function getResourceType(mimetype) {
    if (mimetype.startsWith("audio/"))
        return "video"; // Cloudinary handles audio under "video"
    if (mimetype.startsWith("video/"))
        return "video";
    if (mimetype.startsWith("image/"))
        return "image";
    return "raw";
}
const uploadToCloudinary = (buffer, folder = "cards", mimetype = "image/jpeg") => {
    return new Promise((resolve, reject) => {
        const resourceType = getResourceType(mimetype);
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({ folder, resource_type: resourceType }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result);
        });
        uploadStream.end(buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFile = async (publicId, mimetype = "image/jpeg") => {
    try {
        const resourceType = getResourceType(mimetype);
        await cloudinary_1.v2.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
    }
    catch (error) {
        console.error("Cloudinary Delete Error:", error);
    }
};
exports.deleteFile = deleteFile;
