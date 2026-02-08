# Vercel Setup — Copy/Paste Values

## 1. Import project

1. Go to: **https://vercel.com/new**
2. **Import Git Repository** → select **zeptose/odds-compare**
3. Configure:

| Field | Value |
|-------|--------|
| **Project Name** | `odds-compare` |
| **Framework Preset** | Next.js (auto) |
| **Root Directory** | `./` (leave default) |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | (default) |

## 2. Environment Variable

Before clicking **Deploy**, click **Environment Variables** and add:

| Name | Value |
|------|--------|
| **ODDS_API_KEY** | *(in .env.local — paste that value)* |

- Environments: ☑ Production ☑ Preview ☑ Development

## 3. Deploy

Click **Deploy**. Wait ~1–2 min.

## 4. Your URL

After deploy: `https://odds-compare-XXXX.vercel.app` (or your custom domain)
