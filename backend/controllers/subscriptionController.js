const db = require("../models/index");
const { Op } = require("sequelize");
const logAudit = require("../utils/logAudit");
const requestIp = require("request-ip");
const SubscriptionPlan = db.subscriptionplans;
const UserSubscription = db.usersubscriptions;
const Guardian = db.guardians;
const User = db.users;
const {
  getGuardianForUser,
  getActiveSubscription,
  hasActiveSubscription,
  requireProFeature,
} = require("../services/subscriptionService");

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      where: { isActive: true },
      order: [["price", "ASC"]],
    });

    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({
      message: "Server error: Failed to get plans",
    });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const { id } = req.user;

    const guardian = await getGuardianForUser(id);

    if (!guardian) {
      return res.status(404).json({ message: "Guardian profile not found" });
    }

    const subscription = await getActiveSubscription(guardian.id);

    if (!subscription) {
      return res.status(404).json({
        message: "No active subscription",
      });
    }

    const diff = new Date(subscription.endDate) - new Date();
    const daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    return res.status(200).json({
      hasSubscription: true,

      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planName: subscription.plan?.name,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        daysRemaining,
        autoRenew: subscription.autoRenew,
        amountPaid: subscription.amountPaid,
        currency: subscription.currency,
        paymentMethod: subscription.paymentMethod,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error: Failed to fetch subscription" });
  }
};

const subscribePlan = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  const userIp = requestIp.getClientIp(req);
  const { id } = req.user;

  try {
    const guardian = await getGuardianForUser(id);
    if (!guardian) {
      await transaction.rollback();
      return res.status(404).json({ message: "Guardian profile not found" });
    }

    const guardianId = guardian.id;
    const { planId, paymentReference, paymentMethod = "card" } = req.body;

    if (!planId || !paymentReference) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Plan Id and payment details are required" });
    }

    const plan = await SubscriptionPlan.findOne({
      where: { id: planId, isActive: true },
      transaction,
    });

    if (!plan) {
      await transaction.rollback();
      return res.status(404).json({ message: "Subscription plan not found." });
    }

    await UserSubscription.update(
      { status: "expired" },
      {
        where: {
          guardianId,
          status: "active",
          endDate: { [Op.gt]: new Date() },
        },
        transaction,
      },
    );

    const duplicate = await UserSubscription.findOne({
      where: { paymentReference },
      transaction,
    });

    if (duplicate) {
      await transaction.rollback();
      return res
        .status(409)
        .json({ message: "This payment reference has already been used." });
    }

    const now = new Date();
    const endDate = addDays(now, plan.duration);

    const subscription = await UserSubscription.create(
      {
        guardianId,
        planId: plan.id,
        status: "active",
        startDate: now,
        endDate,
        paymentMethod,
        paymentReference,
        amountPaid: plan.price,
        currency: "USD",
        autoRenew: false,
      },
      { transaction },
    );

    // Keep legacy guardian table columns synchronized with UserSubscription
    const normalizedPlanName = plan.name.toLowerCase() === "pro" ? "premium" : plan.name.toLowerCase();
    const validPlan = ["basic", "family", "premium"].includes(normalizedPlanName) ? normalizedPlanName : "premium";
    
    await guardian.update(
      {
        isSubscribed: true,
        subscriptionPlan: validPlan,
        subscriptionExpiresAt: endDate,
      },
      { transaction },
    );

    await transaction.commit();

    try {
      await logAudit({
        userId: id,
        action: "subscribe",
        entity: "UserSubscription",
        entityId: subscription.id,
        metadata: {
          ip: userIp,
          planId: plan.id,
          planName: plan.name,
          amountPaid: plan.price,
          paymentReference,
          paymentMethod,
          endDate,
        },
      });
    } catch (auditError) {}

    return res.status(201).json({
      message: `Subscription successful!`,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res
      .status(500)
      .json({ message: "Server error: Failed to create subscription." });
  }
};

const cancelSubscription = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  const userIp = requestIp.getClientIp(req);
  const { id } = req.user;
  try {
    const guardian = await getGuardianForUser(id);
    if (!guardian) {
      await transaction.rollback();
      return res.status(404).json({ message: "Guardian profile not found" });
    }

    const subscription = await UserSubscription.findOne({
      where: {
        guardianId: guardian.id,
        status: "active",
        endDate: { [Op.gt]: new Date() },
      },
      transaction,
    });

    if (!subscription) {
      await transaction.rollback();
      return res.status(404).json({ message: "No active subscription found" });
    }

    await subscription.update(
      {
        status: "cancelled",
        autoRenew: false,
        cancelledAt: new Date(),
      },
      { transaction },
    );

    await transaction.commit();

    try {
      await logAudit({
        userId: id,
        action: "cancel_subscription",
        entity: "UserSubscription",
        entityId: subscription.id,
        metadata: { ip: userIp, path: req.path },
      });
    } catch (e) {}

    return res.status(200).json({
      message:
        "Subscription cancelled. You retain access until the end of your billing period.",
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    return res.status(500).json({ message: "Failed to cancel subscription." });
  }
};

const expireSubscriptions = async () => {
  try {
    const [count] = await UserSubscription.update(
      { status: "expired" },
      {
        where: {
          status: "active",
          endDate: { [Op.lt]: new Date() },
        },
      },
    );
    if (count > 0) {
      console.log(`[Subscription] Expired ${count} subscription(s)`);
    }
  } catch (error) {
    console.error("[Subscription] expireSubscriptions job error:", error);
  }
};

module.exports = {
  getPlans,
  getMySubscription,
  subscribePlan,
  cancelSubscription,
  requireSubscription: requireProFeature,
  expireSubscriptions,
  hasActiveSubscription,
};
