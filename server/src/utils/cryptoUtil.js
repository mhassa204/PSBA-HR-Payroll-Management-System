// utils/cryptoUtil.js
const crypto = require("crypto");

const algorithm = "aes-256-cbc";

// 👇 Must be exactly 32 characters (1 char = 1 byte in UTF-8)
const secretKey = Buffer.from(process.env.ENCRYPTION_SECRET, "utf8"); // ✅ 32-byte key

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
