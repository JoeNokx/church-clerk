import SystemSettings from "../models/systemSettingsModel.js";

const TRIAL_DAYS_ALLOWED = new Set([3, 7, 14, 21, 30, 40]);

const getSingletonSettings = async () => {
  let settings = await SystemSettings.findOne({ key: "singleton" });
  if (!settings) {
    settings = await SystemSettings.create({ key: "singleton" });
  }
  return settings;
};

export const getSystemSettings = async (req, res) => {
  try {
    const settings = await getSingletonSettings();
    return res.json({
      settings: {
        trialDays: settings.trialDays,
        gracePeriodDays: settings.gracePeriodDays
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateSystemSettings = async (req, res) => {
  try {
    const { trialDays, gracePeriodDays } = req.body || {};

    const update = {};

    if (trialDays !== undefined) {
      const n = Number(trialDays);
      if (!Number.isFinite(n) || !TRIAL_DAYS_ALLOWED.has(n)) {
        return res.status(400).json({ message: "Invalid trialDays. Allowed: 3, 7, 14, 21, 30, 40" });
      }
      update.trialDays = n;
    }

    if (gracePeriodDays !== undefined) {
      const n = Number(gracePeriodDays);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return res.status(400).json({ message: "gracePeriodDays must be a whole number >= 0" });
      }
      update.gracePeriodDays = n;
    }

    const settings = await getSingletonSettings();

    if (Object.keys(update).length === 0) {
      return res.json({
        message: "No changes",
        settings: {
          trialDays: settings.trialDays,
          gracePeriodDays: settings.gracePeriodDays
        }
      });
    }

    settings.set(update);
    await settings.save();

    return res.json({
      message: "System settings updated",
      settings: {
        trialDays: settings.trialDays,
        gracePeriodDays: settings.gracePeriodDays
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getSystemSettingsSnapshot = async () => {
  const settings = await getSingletonSettings();
  return {
    trialDays: Number(settings.trialDays || 14),
    gracePeriodDays: Number(settings.gracePeriodDays || 3)
  };
};
