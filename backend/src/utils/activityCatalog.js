const Activity = require('../models/Activity');

const DEFAULT_ACTIVITIES = [
  { name: 'Scanning', code: 'SCAN', aliases: ['Scanning', 'SCAN'] },
  { name: 'QC', code: 'QC', aliases: ['QC'] },
  { name: 'Stickering', code: 'Sticker', aliases: ['Stickering', 'Sticker'] },
  { name: 'Inward', code: 'Inward', aliases: ['Inward'] },
  { name: 'Outward', code: 'Outward', aliases: ['Outward'] },
  { name: 'Day Wise', code: 'Day', aliases: ['Day Wise', 'Day', 'DayWise'] },
  { name: 'Training', code: 'Training', aliases: ['Training'] },
  { name: 'Referral', code: 'Referral', aliases: ['Referral'] },
  { name: 'Misc', code: 'Misc', aliases: ['Misc'] },
  { name: 'Others', code: 'Others', aliases: ['Others'] },
];

const normalizeActivityText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

const mergeCatalog = (dbActivities = []) => {
  const byCode = new Map();

  for (const activity of DEFAULT_ACTIVITIES) {
    byCode.set(activity.code, {
      name: activity.name,
      code: activity.code,
      aliases: Array.from(new Set(activity.aliases || [activity.name, activity.code])),
      isActive: true,
      source: 'default',
    });
  }

  for (const activity of dbActivities) {
    const code = String(activity.code || '').trim();
    if (!code) continue;

    const existing = byCode.get(code);
    byCode.set(code, {
      name: activity.name || existing?.name || code,
      code,
      aliases: Array.from(new Set([
        ...(existing?.aliases || []),
        ...(Array.isArray(activity.aliases) ? activity.aliases : []),
        activity.name,
        activity.code,
      ].filter(Boolean))),
      isActive: typeof activity.isActive === 'boolean' ? activity.isActive : (existing?.isActive ?? true),
      source: existing ? 'default+custom' : 'custom',
    });
  }

  return Array.from(byCode.values());
};

const getActivityCatalog = async ({ includeInactive = false } = {}) => {
  const query = includeInactive ? {} : { isActive: { $ne: false } };
  const activities = await Activity.find(query).select('name code aliases isActive').lean();
  return mergeCatalog(activities).filter((activity) => includeInactive || activity.isActive !== false);
};

const normalizeActivityType = async (value, catalog) => {
  const v = normalizeActivityText(value);
  if (!v) return null;
  const sourceCatalog = catalog || await getActivityCatalog();

  for (const activity of sourceCatalog) {
    for (const alias of activity.aliases || []) {
      if (normalizeActivityText(alias) === v) return activity.code;
    }
  }

  return null;
};

const activityQueryValues = async (value, catalog) => {
  const sourceCatalog = catalog || await getActivityCatalog();
  const code = await normalizeActivityType(value, sourceCatalog);
  if (!code) return [String(value)];

  const activity = sourceCatalog.find((item) => item.code === code);
  if (!activity) return [String(value)];
  return Array.from(new Set([activity.code, ...(activity.aliases || [])]));
};

const normalizeRateChart = async (rateChart) => {
  const items = Array.isArray(rateChart) ? rateChart : [];
  const catalog = await getActivityCatalog({ includeInactive: true });
  const invalid = [];
  const normalized = [];

  for (const item of items) {
    const code = await normalizeActivityType(item?.activityName, catalog);
    if (!code) {
      invalid.push(item?.activityName);
      continue;
    }

    normalized.push({
      ...item,
      activityName: code,
      center: item?.center || null,
    });
  }

  return { invalid, normalized, catalog };
};

const resolveActivityRate = (project, activityCode, centerId) => {
  const normalizedCenterId = centerId ? String(centerId) : '';
  const activeItems = Array.isArray(project?.rateChart)
    ? project.rateChart.filter((item) => item.status === 'active' && String(item.activityName) === String(activityCode))
    : [];

  const centerSpecific = activeItems.find((item) => item.center && String(item.center) === normalizedCenterId);
  if (centerSpecific) return Number(centerSpecific.rate || 0);

  const projectLevel = activeItems.find((item) => !item.center);
  if (projectLevel) return Number(projectLevel.rate || 0);

  if (String(activityCode) === 'SCAN') return Number(project?.scanRate || 0);
  return 0;
};

const hasConfiguredRate = (project, activityCode, centerId) => {
  const rate = resolveActivityRate(project, activityCode, centerId);
  return String(activityCode) === 'SCAN' ? rate >= 0 : rate > 0;
};

module.exports = {
  DEFAULT_ACTIVITIES,
  normalizeActivityText,
  getActivityCatalog,
  normalizeActivityType,
  activityQueryValues,
  normalizeRateChart,
  resolveActivityRate,
  hasConfiguredRate,
};

