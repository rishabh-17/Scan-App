const Activity = require('../models/Activity');
const { getActivityCatalog, DEFAULT_ACTIVITIES, normalizeActivityText } = require('../utils/activityCatalog');

const getActivities = async (req, res) => {
  try {
    const activities = await getActivityCatalog({ includeInactive: true });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createActivity = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim();
    const aliases = Array.isArray(req.body?.aliases)
      ? req.body.aliases.map((item) => String(item || '').trim()).filter(Boolean)
      : String(req.body?.aliases || '').split(',').map((item) => item.trim()).filter(Boolean);

    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }

    const defaultExists = DEFAULT_ACTIVITIES.some((activity) => normalizeActivityText(activity.code) === normalizeActivityText(code));
    const existing = await Activity.findOne({ code });
    if (defaultExists || existing) {
      return res.status(400).json({ message: 'Activity code already exists' });
    }

    const activity = await Activity.create({
      name,
      code,
      aliases: Array.from(new Set([name, code, ...aliases])),
      isActive: req.body?.isActive !== false,
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getActivities,
  createActivity,
};

