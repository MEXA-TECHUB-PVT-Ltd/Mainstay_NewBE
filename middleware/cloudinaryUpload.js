const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../config/cloudinaryConfig");
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "mainstays",
    format: async (req, file) => {
      // Check file mimetype to determine format
      if (file.mimetype === "image/jpeg") {
        return "jpg";
      } else if (file.mimetype === "image/png") {
        return "png";
      } else {
        // Default format or throw an error
        return "jpg"; // or throw new Error('Unsupported file type');
      }
    },
    public_id: (req, file) => {
      // Using UUID to generate a unique identifier
      return uuidv4() + "-" + file.originalname;
    },
  },
});
const cloudinaryUpload = multer({ storage: cloudinaryStorage });

module.exports = { cloudinaryUpload };
