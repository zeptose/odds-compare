# Deploy Odds Compare · +EV Finder

**Status:** Git initialized and committed. Push to GitHub, then import on Vercel.

## Deploy to Vercel (recommended)

### 1. Create GitHub repo & push

1. Go to [github.com/new?name=odds-compare](https://github.com/new?name=odds-compare)
2. **Don't** initialize with README (repo is already committed)
3. Run (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd sports_value_app
./deploy-to-github.sh YOUR_USERNAME
```

Or manually:

```bash
cd sports_value_app
git remote add origin https://github.com/YOUR_USERNAME/odds-compare.git
git branch -M main
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

**If you see "Invalid Odds API key":**

- **Local:** Create `.env.local` with `ODDS_API_KEY=your_key` (get key from [the-odds-api.com](https://the-odds-api.com))
- **Vercel:** Add `ODDS_API_KEY` in Project → Settings → Environment Variables, then **Redeploy** (env vars only apply to new deploys)

### 4. Redeploy

After adding env vars, trigger a new deployment from the **Deployments** tab.

### 5. Change the URL (remove "beige", get odds-compare.vercel.app)

1. In Vercel: **Project** → **Settings** → **General**
2. Under **Project Name**, change `odds-compare-beige` → `odds-compare`
3. Save. Your site will be at **https://odds-compare.vercel.app**

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
