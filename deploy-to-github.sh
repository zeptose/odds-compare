#!/bin/bash
# Run from sports_value_app folder
# Usage: ./deploy-to-github.sh YOUR_GITHUB_USERNAME
# Or: GITHUB_USER=yourusername ./deploy-to-github.sh

USER="${1:-$GITHUB_USER}"
if [ -z "$USER" ]; then
  echo "Usage: ./deploy-to-github.sh YOUR_GITHUB_USERNAME"
  echo "Or: GITHUB_USER=yourusername ./deploy-to-github.sh"
  exit 1
fi

REPO="odds-compare"
URL="https://github.com/$USER/$REPO.git"

echo "1. Create repo on GitHub first: https://github.com/new?name=$REPO"
echo "   (Leave it empty — no README)"
echo ""
read -p "Press Enter after you've created the repo..."

git remote remove origin 2>/dev/null
git remote add origin "$URL"
git push -u origin main

echo ""
echo "Done. Now deploy on Vercel: https://vercel.com → Import $USER/$REPO"
echo "Add ODDS_API_KEY in Environment Variables."
