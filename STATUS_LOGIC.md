# Status Logic

Defined in assets/js/status.js

## Status Categories
NORMAL   — dose < 100 nSv/h
ELEVATED — dose 100–149 nSv/h
ALERT    — dose >= 150 nSv/h
NO DATA  — null/NaN/missing

## Colors
NORMAL:   #4ade80 (green)
ELEVATED: #fbbf24 (amber)
ALERT:    #f87171 (red)
NO DATA:  #475569 (gray)

## Important Disclaimer
These thresholds are visual display categories only.
They are NOT official health or emergency thresholds.
Background radiation varies significantly by elevation and geology.
Normal US background: 60–120 nSv/h.
Denver typically reads 110+ nSv/h at NORMAL levels.

## Changing Thresholds
Edit STATUS_THRESHOLDS in assets/js/status.js.
Update the legend in index.html and methodology.html to match.
