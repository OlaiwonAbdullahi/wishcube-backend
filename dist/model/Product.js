"use strict";
const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    images: [{ url: String, publicId: String }],
    category: {
        type: String,
        enum: [
            "Cakes",
            "Flowers",
            "Fashion",
            "Electronics",
            "Experiences",
            "Vouchers",
            "Food",
            "Jewelry",
            "Other",
        ],
        required: true,
    },
    occasionTags: [{ type: String }],
    deliveryZones: [{ type: String }],
    stock: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model("Product", productSchema);
