import multer from "multer";

// Stores files temporarily in RAM (RAM Buffer) instead of writing to disk
//it holds the raw binary file data inside server RAM as a Node.js Buffer object attached to req.file.buffer
const storage = multer.memoryStorage();

//Creates and exports the configured Multer instance to be attached directly
// to route definitions (e.g., upload.single("image"))
export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit A security guardrail set 
    // to 5*1024*1024 bytes (5MB). 
    // This prevents Denial of Service (DoS) / Memory Exhaustion attacks where
    //  a user uploads a massive file (e.g., 2GB) that exhausts Node's RAM and crashes your server
});