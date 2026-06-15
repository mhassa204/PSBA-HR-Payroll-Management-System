// utils/cryptoUtil.js
const crypto = require("crypto");

const algorithm = "aes-256-cbc";

// Derive/validate a 32-byte key for AES-256-CBC
const secretFromEnv = process.env.ENCRYPTION_SECRET;
if (!secretFromEnv) {
  throw new Error(
    "ENCRYPTION_SECRET is not set. Please define it in your server/.env file."
  );
}

// If exactly 32 bytes in UTF-8, use directly for backward compatibility; otherwise derive via SHA-256
let secretKey;
if (Buffer.byteLength(secretFromEnv, "utf8") === 32) {
  secretKey = Buffer.from(secretFromEnv, "utf8");
} else {
  // Use a deterministic 32-byte key derived from the provided secret
  secretKey = crypto
    .createHash("sha256")
    .update(secretFromEnv, "utf8")
    .digest();
}

function encrypt(text) {
  const iv = crypto.randomBytes(16); // 16 bytes required for aes-256-cbc
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText) {
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted) {
      throw new Error("Invalid encrypted text format");
    }

    const ivBuffer = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, secretKey, ivBuffer);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
