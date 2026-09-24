require("dotenv").config();
const passport = require("passport");
const passportJWT = require("passport-jwt");
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const fs = require("fs");
const path = require("path");
const db = require("../models/index");
const { isTokenBlacklisted } = require("../utils/authHelpers");
const User = db.users;
const Role = db.role;

let publicKey;
try {
  publicKey = fs.readFileSync(path.join(__dirname, "../public.key"), "utf8");
} catch (e) {
  if (process.env.PUBLIC_KEY) {
    publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, "\n");
  }
}

const opts = {
  jwtFromRequest: ExtractJWT.fromExtractors([
    ExtractJWT.fromAuthHeaderAsBearerToken(),
    (req) => {
      return req.cookies?.accessToken || null;
    },
  ]),
  secretOrKey: publicKey,
  algorithms: ["RS256"],
};

passport.use(
  new JWTStrategy(opts, async (jwtPayload, done) => {
    try {
      if (isTokenBlacklisted(jwtPayload.jti)) {
        return done(null, false, { message: "Invalid token" });
      }

      if (jwtPayload.type !== "access") {
        return done(null, false, { message: "Invalid token" });
      }

      const user = await User.findByPk(jwtPayload.id, {
        include: [
          {
            model: Role,
            as: "role",
          },
        ],
      });

      if (user) {
        if (user.isActive === false) {
          return done(null, false, { message: "Account is decativated" });
        }

        user.tokenJti = jwtPayload.jti;
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  }),
);

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !req.user.role?.name) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userRole = req.user.role?.name;

  if (Array.isArray(roles) ? roles.includes(userRole) : roles === userRole) {
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
};

const checkTokenExpiry = (req, res, next) => {
  if (req.user && req.user.tokenExp) {
    const timeToExpiry = req.user.tokenExp - Date.now();
    if (timeToExpiry < 5 * 60 * 1000) {
      res.setHeader("X-Token-Expiring", "true");
    }
  }
  next();
};

module.exports = { passport, requireRole, checkTokenExpiry };
