import { v2 as cloudinary } from "cloudinary"; // V = version 2.


// yahan pe hum authenticate kar rahe hien apni application ko cloudinary ke account se
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // Forces Cloudinary to return all image delivery URLs using encrypted https:// protocols instead of unencrypted http://
  secure: true,
});

/**
 * Upload an image from a remote URL to Cloudinary.
 * Returns the secure HTTPS URL of the uploaded image.
 *
 * @param {string} sourceUrl  - Public URL of the source image (e.g. Unsplash)
 * @param {string} publicId   - the custom filename to assign inside Cloudinary (e.g. "voicebite/menu/burger")
 */

// const result = await cloudinary.uploader.upload(sourceUrl, { Calls Cloudinary’s server-to-server URL 
// upload API. Cloudinary fetches the image directly from sourceUrl without passing bytes
// through your local computer
export const uploadFromUrl = async (sourceUrl, publicId) => {
  const result = await cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    folder: "voicebite/menu",
    overwrite: true,
    resource_type: "image",
    transformation: [{ width: 800, height: 800, crop: "fill", gravity: "center", quality: "auto:good", fetch_format: "auto" }],
  });
  return result.secure_url;
};

/**
 * Es function ka complete understanding end pe hai!
 * Upload a file buffer (from multer) to Cloudinary.
 * ye function used horaha hai jab client(react,postman)(Admin) pictures bhejta hai, apne localStorage(disk) se
 * Used by the admin image-upload endpoint.
 *
 * @param {Buffer} buffer   - File buffer from multer memoryStorage
 * @param {string} publicId - Cloudinary path/filename
 */
export const uploadBuffer = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: "voicebite/menu",
        overwrite: true,
        resource_type: "image",
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

// export const uploadBuffer = (buffer, publicId) =>

// Defines a function that accepts buffer (req.file.buffer created by Multer in RAM) and publicId (desired filename).

// new Promise((resolve, reject) => {

// Why a Promise? Cloudinary’s upload_stream relies on Node.js stream events and legacy callbacks. Wrapping it inside a Native JavaScript Promise allows us to use modern await uploadBuffer(...) inside our Express controllers.

// const stream = cloudinary.uploader.upload_stream({ ... }, (err, result) => {

// Initializes an HTTP upload stream handler to Cloudinary. It accepts identical configuration parameters (public_id, folder, transformation) and a completion callback function (err, result).

// if (err) return reject(err);

// If the network stream fails or Cloudinary rejects the payload, the Promise rejects and triggers our controller's catch block or asyncHandler.

// resolve(result.secure_url);

// If successful, the Promise resolves with the Cloudinary HTTPS CDN link.

// stream.end(buffer);

// The Critical Operational Line: stream.end() writes the entire RAM buffer directly into the network stream connection and closes the stream, signaling to Cloudinary that data transmission is complete.
