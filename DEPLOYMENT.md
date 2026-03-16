# Deployment Guide

## Option A — Cloudflare Pages (Recommended)

### First Deploy (Drag & Drop)
1. Go to https://dash.cloudflare.com

3. Authorize GitHub, select your repo
4. Build settings: Framework = None, Build command = blank, Output = /
5. Save and Deploy
6. Every git push auto-deploys

## Option B — Enable Live EPA Data (CORS Proxy)

### Deploy Cloudflare Worker
1. Go to Cloudflare → Workers & Pages → Create → Worker
2. Click Edit Code
3. Paste contents of _worker.js
4. Click Save and Deploy
5. Copy your worker URL (e.g. https://rad-proxy.yourname.workers.dev)

### Connect Worker to App
1. Open assets/js/radnet.js
2. Set PROXY_BASE to your worker URL
3. Set USE_PROXY = true
4. Commit and push — Cloudflare Pages redeploys automatically

## Custom Domain
1. Cloudflare Pages → your project → Custom domains
2. Add your domain (must be on Cloudflare DNS)
3. Cloudflare handles SSL automatically

## Environment
No environment variables needed for V1 static deploy.
Worker does not require any secrets.

## Cost
Cloudflare Pages: Free (unlimited bandwidth)
Cloudflare Workers: Free tier (100,000 requests/day)
Domain: ~$10/year if registering new
