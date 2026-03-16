/**
 * status.js
 * Radiation status logic — Section 7.0 / STATUS_LOGIC.md
 *
 * Status categories: NORMAL | ELEVATED | ALERT | NO DATA
 * These are VISUAL INDICATORS ONLY.
 * Not an official emergency alert system.
 */

const STATUS = {
  NORMAL:   "NORMAL",
  ELEVATED: "ELEVATED",
  ALERT:    "ALERT",
  NO_DATA:  "NO DATA",
};

const STATUS_THRESHOLDS = {
  NORMAL_MAX:   99,   // nSv/h — below this = NORMAL
  ELEVATED_MAX: 149,  // nSv/h — below this = ELEVATED, else ALERT
};

const STATUS_CONFIG = {
  [STATUS.NORMAL]: {
    color:       "#4ade80",
    colorDim:    "#166534",
    colorBg:     "rgba(74,222,128,0.08)",
    label:       "NORMAL",
    description: "Radiation levels are within normal background range for this region.",
    dotClass:    "dot-normal",
  },
  [STATUS.ELEVATED]: {
    color:       "#fbbf24",
    colorDim:    "#713f12",
    colorBg:     "rgba(251,191,36,0.08)",
    label:       "ELEVATED",
    description: "Radiation is above typical background. No immediate health concern. EPA is monitoring.",
    dotClass:    "dot-elevated",
  },
  [STATUS.ALERT]: {
    color:       "#f87171",
    colorDim:    "#7f1d1d",
    colorBg:     "rgba(248,113,113,0.08)",
    label:       "ALERT",
    description: "Radiation is significantly above background. Check official alerts at epa.gov/radnet.",
    dotClass:    "dot-alert",
  },
  [STATUS.NO_DATA]: {
    color:       "#475569",
    colorDim:    "#1e293b",
    colorBg:     "rgba(71,85,105,0.08)",
    label:       "NO DATA",
    description: "No current data available for this station. May be offline or awaiting update.",
    dotClass:    "dot-nodata",
  },
};

/**
 * Determine status from dose rate in nSv/h
 * @param {number|null} dose
 * @returns {string} STATUS constant
 */
function getStatus(dose) {
  if (dose === null || dose === undefined || isNaN(dose)) return STATUS.NO_DATA;
  if (dose <= STATUS_THRESHOLDS.NORMAL_MAX)   return STATUS.NORMAL;
  if (dose <= STATUS_THRESHOLDS.ELEVATED_MAX) return STATUS.ELEVATED;
  return STATUS.ALERT;
}

/**
 * Get full config object for a status
 * @param {string} status
 * @returns {object}
 */
function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG[STATUS.NO_DATA];
}

/**
 * Get plain-English context for a given dose
 * @param {number|null} dose
 * @returns {string}
 */
function getDoseContext(dose) {
  if (!dose || isNaN(dose)) return "No data is currently available for this station.";
  if (dose < 80)  return "Well below average US background radiation. Common in coastal and low-elevation areas.";
  if (dose < 100) return "Normal background radiation. This is the level most Americans experience daily.";
  if (dose < 120) return "Normal background radiation for this region. High-altitude areas like Denver typically read here.";
  if (dose < 150) return "Slightly above average background — still within normal range for elevated terrain.";
  if (dose < 200) return "Above typical US background. EPA is monitoring. No immediate health risk established.";
  return "Significantly above normal background. Check official EPA RadNet and local emergency alerts immediately.";
}

/**
 * Format nSv/h to µSv/h for display
 * @param {number} nsvh
 * @returns {string}
 */
function formatDose(nsvh) {
  if (!nsvh || isNaN(nsvh)) return "—";
  if (nsvh >= 1000) return (nsvh / 1000).toFixed(2) + " µSv/h";
  return nsvh + " nSv/h";
}

/**
 * Compute national summary across all station data
 * @param {object} stationDataMap — id → station data object
 * @returns {object} { normal, elevated, alert, noData, avgDose }
 */
function getNationalSummary(stationDataMap) {
  const vals = Object.values(stationDataMap);
  const summary = { normal: 0, elevated: 0, alert: 0, noData: 0, avgDose: null };
  const doses = [];

  vals.forEach(d => {
    const s = d.status || STATUS.NO_DATA;
    if (s === STATUS.NORMAL)   summary.normal++;
    else if (s === STATUS.ELEVATED) summary.elevated++;
    else if (s === STATUS.ALERT)    summary.alert++;
    else                            summary.noData++;
    if (d.dose_nsvh) doses.push(d.dose_nsvh);
  });

  if (doses.length) {
    summary.avgDose = Math.round(doses.reduce((a, b) => a + b, 0) / doses.length);
  }

  return summary;
}
