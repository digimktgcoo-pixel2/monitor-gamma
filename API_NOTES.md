# API Notes

## EPA RadNet CDX REST API
Endpoint: https://radnet.epa.gov/cdx-radnet-rest/api/rest/csv/{year}/fixed/{STATE}/{CITY}

### Parameters
- year: 4-digit year (e.g. 2025)
- STATE: 2-letter state code (e.g. CA, TX, FL)
- CITY: City name in uppercase (e.g. LOS ANGELES)

### Response
CSV format with columns:
LOCATION_NAME, SAMPLE COLLECTION TIME, DOSE EQUIVALENT RATE (nSv/h),
GAMMA COUNT RATE R02-R09 (CPM), STATUS

### CORS
Direct browser fetch is blocked by CORS. Deploy _worker.js as a Cloudflare
Worker and set USE_PROXY = true in assets/js/radnet.js.

### Rate Limits
EPA does not publish formal rate limits. Batch fetches of 4 stations at a time
with 50ms yield between batches. Do not hammer the API.

### Fallback
On any fetch error, the app falls back to simulated data based on regional
baselines defined in data/fallback-stations.json. Simulated readings are
labeled clearly in the UI.

## Envirofacts RadNet Database (Historical)
Endpoint: https://enviro.epa.gov/enviro/ef_metadata_html.ef_metadata_table
Useful for historical data queries. Not used in V1.

## AirNow API (V2 — Air Quality)
Free key: https://docs.airnowapi.org/account/request/
Endpoint: https://www.airnowapi.org/aq/observation/latLong/current/
Planned for V2 air quality overlay.
