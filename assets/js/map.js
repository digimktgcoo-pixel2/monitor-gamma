/**
 * map.js
 * Leaflet map initialization and station markers — Section 7.19–7.22
 */

let _map = null;
let _markers = {};  // id → Leaflet marker
let _onStationClick = null;

/**
 * Initialize the Leaflet map.
 * @param {string} containerId — DOM element id
 * @param {Function} onStationClick — callback(stationId)
 */
function initMap(containerId, onStationClick) {
  _onStationClick = onStationClick;

  _map = L.map(containerId, {
    center: [39.5, -98.35],
    zoom: 4,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
  });

  // Dark CartoDB basemap
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
  }).addTo(_map);

  // Custom zoom control position
  L.control.zoom({ position: "bottomright" }).addTo(_map);

  // Attribution
  L.control.attribution({ position: "bottomleft", prefix: "" })
    .addAttribution(
      'Data: <a href="https://www.epa.gov/radnet" target="_blank" rel="noopener">EPA RadNet</a>'
    )
    .addTo(_map);
}

/**
 * Add a station marker to the map in loading state.
 * @param {object} station
 */
function addStationMarker(station) {
  const icon = _makeIcon(station.id, "dot-loading");
  const marker = L.marker([station.lat, station.lng], { icon, title: station.name });

  marker.on("click", () => {
    if (_onStationClick) _onStationClick(station.id);
  });

  marker.addTo(_map);
  _markers[station.id] = marker;
}

/**
 * Update a station marker after data loads.
 * @param {object} stationData — normalized station data from radnet.js
 */
function updateStationMarker(stationData) {
  const marker = _markers[stationData.id];
  if (!marker) return;

  const cfg = getStatusConfig(stationData.status);
  const dotClass = cfg.dotClass;

  const newIcon = _makeIcon(stationData.id, dotClass);
  marker.setIcon(newIcon);
}

/**
 * Highlight selected station, deselect others.
 * @param {string} stationId
 */
function selectMarker(stationId) {
  Object.entries(_markers).forEach(([id, marker]) => {
    const dot = document.getElementById(`mdot-${id}`);
    if (!dot) return;
    if (id === stationId) dot.classList.add("dot-selected");
    else dot.classList.remove("dot-selected");
  });
}

/**
 * Pan and zoom map to a station.
 * @param {object} station
 */
function flyToStation(station) {
  _map.flyTo([station.lat, station.lng], 8, { duration: 0.8 });
}

/**
 * Build a DivIcon for a station dot.
 */
function _makeIcon(stationId, dotClass) {
  return L.divIcon({
    className: "",
    html: `<div class="map-dot ${dotClass}" id="mdot-${stationId}"></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

/**
 * Get the Leaflet map instance (for external use if needed).
 */
function getMap() {
  return _map;
}
