const crypto = require("crypto");
const bcrypt = require("bcrypt");

class RecoveryService {
  async generate() {
    const safeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const RandomString = (length) => {
      const bytes = crypto.randomBytes(length);
      return Array.from(bytes)
        .map((b) => safeChars[b % safeChars.length])
        .join("");
    };

    const recoveryCode = () => {
      return `${RandomString(5)}-${RandomString(5)}`;
    };
    const existingCode = recoveryCode();
    const hashRecoveryCode = await bcrypt.hash(existingCode, 10);
    return { existingCode, hashRecoveryCode };
  }
}

module.exports = new RecoveryService();
