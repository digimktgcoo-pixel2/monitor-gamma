/**
 * radnet.js
 * EPA RadNet data fetching and normalization — Section 7.13–7.18
 *
 * Data Source: U.S. Environmental Protection Agency (EPA) RadNet.
 * This site provides informational visualization only.
 * Not an official emergency alert system.
 */

const RADNET_CONFIG = {
  // Live CDX endpoint — requires CORS proxy for browser use
  // Format: /csv/{year}/fixed/{STATE}/{CITY}
  CDX_BASE: "https://radnet.epa.gov/cdx-radnet-rest/api/rest/csv",

  // Set to your Cloudflare Worker URL after deploying _worker.js
  // Example: "rad-proxy.digimktgcoo.workers.dev"
  PROXY_BASE: "",

  // Set true after deploying Cloudflare Worker proxy
  USE_PROXY: true,

  // Fetch timeout in ms
  TIMEOUT_MS: 9000,

  // How many stations to fetch in parallel
  BATCH_SIZE: 4,
};

/**
 * Fetch and normalize data for a single station.
 * Falls back to simulated baseline data on any error.
 * @param {object} station
 * @returns {object} normalized station data
 */
async function fetchStationData(station) {
  const year = new Date().getFullYear();
  const city = encodeURIComponent(station.city);
  const url = RADNET_CONFIG.USE_PROXY
    ? `${RADNET_CONFIG.PROXY_BASE}/radnet/${station.state}/${city}`
    : `${RADNET_CONFIG.CDX_BASE}/${year}/fixed/${station.state}/${city}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RADNET_CONFIG.TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    return normalizeCSV(text, station);

  } catch (err) {
    return simulateFallback(station);
  }
}

/**
 * Parse EPA RadNet CSV response into normalized object.
 * CSV columns: LOCATION_NAME, SAMPLE COLLECTION TIME,
 *   DOSE EQUIVALENT RATE (nSv/h), GAMMA COUNT RATE R02–R09 (CPM), STATUS
 * @param {string} csvText
 * @param {object} station
 * @returns {object}
 */
function normalizeCSV(csvText, station) {
  const lines = csvText.trim().split("\n").filter(l => l.trim().length > 0);

  // Need header + at least one data row
  if (lines.length < 2) throw new Error("Insufficient data");

  const lastLine = lines[lines.length - 1];
  const cols = lastLine.split(",");

  const dose = parseFloat(cols[2]);
  const cpm  = parseFloat(cols[3]);

  if (isNaN(dose)) throw new Error("Invalid dose value");

  const rawTimestamp = cols[1]?.trim() || null;
  const timestamp = parseTimestamp(rawTimestamp);

  const status = getStatus(dose);

  return {
    ...station,
    dose_nsvh:  Math.round(dose),
    cpm:        isNaN(cpm) ? null : Math.round(cpm),
    timestamp,
    rawTimestamp,
    epaStatus:  cols[cols.length - 1]?.trim() || "APPROVED",
    status,
    isLive:     true,
    isFallback: false,
  };
}

/**
 * Parse EPA timestamp string to ISO format.
 * EPA format: "MM/DD/YYYY HH:MM:SS"
 * @param {string|null} raw
 * @returns {string|null} ISO string or null
 */
function parseTimestamp(raw) {
  if (!raw) return null;
  try {
    // EPA timestamps are in UTC
    const [datePart, timePart] = raw.split(" ");
    const [month, day, year] = datePart.split("/");
    return new Date(`${year}-${month}-${day}T${timePart}Z`).toISOString();
  } catch {
    return null;
  }
}

/**
 * Generate realistic simulated fallback data when live fetch fails.
 * Uses station baseline + small variance.
 * @param {object} station
 * @returns {object}
 */
function simulateFallback(station) {
  const base = station.baseline || 82;
  const variance = (Math.random() - 0.5) * 18;
  const dose = Math.round(Math.max(40, base + variance));
  const cpm  = Math.round(dose * 31.5);
  const status = getStatus(dose);

  return {
    ...station,
    dose_nsvh:  dose,
    cpm,
    timestamp:  new Date().toISOString(),
    rawTimestamp: null,
    epaStatus:  "ESTIMATED",
    status,
    isLive:     false,
    isFallback: true,
  };
}

/**
 * Load all stations in batches.
 * Calls onStationLoaded(stationData) after each station completes.
 * Calls onComplete() when all are done.
 * @param {Array} stations
 * @param {Function} onStationLoaded
 * @param {Function} onComplete
 */
async function loadAllStations(stations, onStationLoaded, onComplete) {
  const { BATCH_SIZE } = RADNET_CONFIG;

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(s => fetchStationData(s)));
    results.forEach(r => onStationLoaded(r));
    // Small yield to keep UI responsive
    await new Promise(r => setTimeout(r, 50));
  }

  if (typeof onComplete === "function") onComplete();
}

/**
 * Format a timestamp for display.
 * @param {string|null} iso
 * @returns {string}
 */
function formatTimestamp(iso) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month:  "short",
      day:    "numeric",
      hour:   "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "Unknown";
  }
}
