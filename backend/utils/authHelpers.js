const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const db = require("../models/index");
const sendEmail = require("../middleware/emailTransporter");
const User = db.users;
require("dotenv").config();

let privateKey;
let publicKey;

try {
  privateKey = fs.readFileSync(path.join(__dirname, "../private.key"), "utf8");
} catch (e) {
  if (process.env.PRIVATE_KEY) {
    privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
  }
}

try {
  publicKey = fs.readFileSync(path.join(__dirname, "../public.key"), "utf8");
} catch (e) {
  if (process.env.PUBLIC_KEY) {
    publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, "\n");
  }
}

if (!privateKey || !publicKey) {
  throw new Error("Failed to load RSA keys");
}

console.log("RSA keys loaded successfully");

const tokenBlacklist = new Map();
const refreshTokenStore = new Map();

const generateAccessToken = (user, jti = null) => {
  const tokenId = jti || uuidv4();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role?.name,
      jti: tokenId,
      type: "access",
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "15m",
    },
  );
};

const generateRefreshToken = async (user, deviceInfo = {}) => {
  const jti = uuidv4();
  const refreshToken = jwt.sign(
    {
      id: user.id,
      jti: jti,
      type: "refresh",
    },
    privateKey,
    {
      algorithm: "RS256",
      expiresIn: "7d",
    },
  );

  const tokenData = {
    jti,
    userId: user.id,
    deviceInfo,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
  };

  if (!refreshTokenStore.has(user.id)) {
    refreshTokenStore.set(user.id, []);
  }
  refreshTokenStore.get(user.id).push(tokenData);

  return { refreshToken, jti };
};

const verifyToken = (token, isrefreshToken = false) => {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ["RS256"],
    });

    if (isrefreshToken && decoded.type !== "refresh") {
      return null;
    }

    if (!isrefreshToken && decoded.type !== "access") {
      return null;
    }

    if (isTokenBlacklisted(decoded.jti)) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

const isTokenBlacklisted = (jti) => {
  const entry = tokenBlacklist.get(jti);

  if (!entry) return false;

  if (entry.expiresAt < Date.now()) {
    tokenBlacklist.delete(jti);
    return false;
  }

  return true;
};

const blacklistToken = (jti, expiresAt) => {
  tokenBlacklist.set(jti, {
    expiresAt: new Date(expiresAt).getTime(),
  });

  setTimeout(
    () => {
      tokenBlacklist.delete(jti);
    },
    new Date(expiresAt).getTime() - Date.now(),
  );
};

const revokeAllUserTokens = async (userId) => {
  if (refreshTokenStore.has(userId)) {
    const userTokens = refreshTokenStore.get(userId);
    userTokens.forEach((token) => {
      blacklistToken(token.jti, token.expiresAt);
    });

    refreshTokenStore.delete(userId);
  }
};

const revokeSpecificRefreshToken = async (userId, jti) => {
  if (refreshTokenStore.has(userId)) {
    const userTokens = refreshTokenStore.get(userId);
    const token = userTokens.find((t) => t.jti === jti);

    if (token) {
      blacklistToken(token.jti, token.expiresAt);
      refreshTokenStore.set(
        userId,
        userTokens.filter((t) => t.jti !== jti),
      );
    }
  }
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const cleanupExpiredRefreshTokens = () => {
  for (const [userId, tokens] of refreshTokenStore.entries()) {
    const validTokens = tokens.filter((t) => t.expiresAt > new Date());
    if (validTokens.length === 0) {
      refreshTokenStore.delete(userId);
    } else if (validTokens.length !== tokens.length) {
      refreshTokenStore.set(userId, validTokens);
    }
  }
};

setInterval(cleanupExpiredRefreshTokens, 60 * 60 * 1000);

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateOTPWithExpiry = (expiryMinutes = 10) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return { otp, expiresAt };
};

const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const verifyOTP = (providedOTP, storedHash) => {
  const hashedProvided = crypto
    .createHash("sha256")
    .update(providedOTP)
    .digest("hex");

  return hashedProvided === storedHash;
};

const isOTPExpired = (expiresAt) => {
  return new Date(expiresAt) < new Date();
};

const getRemainingOTPAttempts = (attempts, maxAttempts = 3) => {
  return Math.max(0, maxAttempts - attempts);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  comparePassword,
  blacklistToken,
  revokeAllUserTokens,
  revokeSpecificRefreshToken,
  isTokenBlacklisted,
  tokenBlacklist,
  refreshTokenStore,
  generateOTP,
  generateOTPWithExpiry,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  getRemainingOTPAttempts,
};
