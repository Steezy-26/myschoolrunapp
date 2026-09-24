const { Op } = require("sequelize");
const db = require("../models");

const Guardian = db.guardians;
const UserSubscription = db.usersubscriptions;
const SubscriptionPlan = db.subscriptionplans;

const PRO_PLAN_NAMES = new Set(["pro", "premium"]);

const getGuardianForUser = async (userId) => {
  return Guardian.findOne({
    where: { userId, isActive: true },
  });
};

const getActiveSubscription = async (guardianId) => {
  return UserSubscription.findOne({
    where: {
      guardianId,
      status: "active",
      startDate: { [Op.lte]: new Date() },
      endDate: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: SubscriptionPlan,
        as: "plan",
        where: { isActive: true },
        required: true,
      },
    ],
    order: [["endDate", "DESC"]],
  });
};

const isProPlan = (plan) => {
  return Boolean(
    plan?.name && PRO_PLAN_NAMES.has(plan.name.trim().toLowerCase()),
  );
};

const hasActiveSubscription = async (guardianId) => {
  return Boolean(await getActiveSubscription(guardianId));
};

const hasActiveProSubscription = async (guardianOrId) => {
  let guardian;
  if (typeof guardianOrId === "object" && guardianOrId !== null) {
    guardian = guardianOrId;
  } else {
    guardian = await Guardian.findByPk(guardianOrId);
  }
  if (!guardian) return false;

  const subscription = await getActiveSubscription(guardian.id);
  if (subscription && isProPlan(subscription.plan)) {
    return true;
  }

  const legacyPro =
    guardian.isSubscribed &&
    guardian.subscriptionExpiresAt &&
    new Date() < new Date(guardian.subscriptionExpiresAt) &&
    ["pro", "premium"].includes(String(guardian.subscriptionPlan).toLowerCase());

  return Boolean(legacyPro || guardian.canUseApp?.());
};

const requireProFeature = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const guardian = await getGuardianForUser(req.user.id);
    if (!guardian) {
      return res.status(403).json({
        message: "An active guardian profile is required for this PRO feature.",
        subscriptionRequired: true,
      });
    }

    const subscription = await getActiveSubscription(guardian.id);
    const hasDbSubscription = Boolean(subscription && isProPlan(subscription.plan));
    const hasGuardianSub = await hasActiveProSubscription(guardian);

    if (!hasDbSubscription && !hasGuardianSub) {
      return res.status(403).json({
        message: "A PRO subscription is required for this feature.",
        subscriptionRequired: true,
        proRequired: true,
      });
    }

    req.guardian = guardian;
    req.subscription = subscription || {
      status: "active",
      plan: { name: guardian.subscriptionPlan || "pro" },
    };
    return next();
  } catch (error) {
    console.error("PRO subscription check failed:", error);
    return res.status(500).json({ message: "Unable to verify subscription" });
  }
};

module.exports = {
  getGuardianForUser,
  getActiveSubscription,
  hasActiveSubscription,
  hasActiveProSubscription,
  isProPlan,
  requireProFeature,
};
