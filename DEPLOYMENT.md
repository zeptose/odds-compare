# Deploy Odds Compare · +EV Finder

## Deploy to Vercel (recommended)

### 1. Push to GitHub

```bash
cd sports_value_app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/odds-compare.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Root directory: `sports_value_app` (or `.` if repo root)
5. Framework: Next.js (auto-detected)
6. Click **Deploy**

### 3. Add environment variables

1. In Vercel: **Project** → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ODDS_API_KEY`
   - **Value:** your key from [the-odds-api.com](https://the-odds-api.com)
   - **Environments:** Production, Preview, Development

### 4. Redeploy

After adding env vars, trigger a new deployment from the **Deployments** tab.

---

## Custom domain

1. **Project** → **Settings** → **Domains**
2. Add your domain (e.g. `oddcompare.com`)
3. Follow Vercel’s DNS instructions for your registrar

---

## Costs

- **Vercel:** Free tier (Hobby) for personal projects
- **Odds API:** 500 requests/month free; ~$30/mo for 20K requests
- **Polymarket:** Free (no key)

---

## Affiliate links

Replace direct sportsbook URLs in `src/lib/book-links.ts` with your affiliate links once you join each program:

- DraftKings Affiliate
- FanDuel Affiliate
- BetMGM Affiliate
- etc.
