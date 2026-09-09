import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Upload an image from a remote URL to Cloudinary.
 * Returns the secure HTTPS URL of the uploaded image.
 *
 * @param {string} sourceUrl  - Public URL of the source image (e.g. Unsplash)
 * @param {string} publicId   - The filename/path inside Cloudinary (e.g. "voicebite/menu/burger")
 */
export const uploadFromUrl = async (sourceUrl, publicId) => {
  const result = await cloudinary.uploader.upload(sourceUrl, {
    public_id:      publicId,
    folder:         "voicebite/menu",
    overwrite:      true,
    resource_type:  "image",
    transformation: [{ width: 800, height: 800, crop: "fill", gravity: "center", quality: "auto:good", fetch_format: "auto" }],
  });
  return result.secure_url;
};

/**
 * Upload a file buffer (from multer) to Cloudinary.
 * Used by the admin image-upload endpoint.
 *
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {string} publicId - Cloudinary path/filename
 */
export const uploadBuffer = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id:      publicId,
        folder:         "voicebite/menu",
        overwrite:      true,
        resource_type:  "image",
        transformation: [{ width: 800, height: 800, crop: "fill", gravity: "center", quality: "auto:good", fetch_format: "auto" }],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

export default cloudinary;
