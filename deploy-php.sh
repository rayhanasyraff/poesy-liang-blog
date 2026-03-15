#!/bin/bash
set -e

API_PHP_DIR="apps/api"
ZIP_FILE="$API_PHP_DIR/vendor.zip"
FTP_URL="ftp://poesyliang.net:21/domains/poesyliang.net/public_html/api"
FTP_USER="psworld"
FTP_PASS="xv3DEXuHsHn969ducYT3"
API_URL="http://poesyliang.net/api"
DEPLOY_KEY="xv3DEXuHsHn969ducYT3"

# ── 1. Install PHP dependencies and regenerate autoloader ─────────────────────
echo "Installing PHP dependencies..."
(cd "$API_PHP_DIR" && composer install --no-dev --optimize-autoloader)

# ── 2. Package vendor directory into vendor.zip ───────────────────────────────
echo "Packaging vendor..."
(cd "$API_PHP_DIR" && zip -r -q vendor.zip vendor/)

# ── 3. Stage all PHP API source changes (vendor.zip is .gitignored) ──────────
echo "Staging changes..."
git add apps/api/

# ── 4. Commit if there are staged changes ─────────────────────────────────────
if ! git diff --cached --quiet; then
    git commit -m "Deploy PHP API: sync source files"
else
    echo "Nothing new to commit."
fi

# ── 5. Push to remote origin (GitHub) ────────────────────────────────────────
# echo "Pushing to origin..."
# git push

# ── 6. Deploy changed PHP source files to server via git-ftp ─────────────────
echo "Deploying to server via git-ftp..."
git ftp push

# ── 7. Upload vendor.zip to server via FTP ───────────────────────────────────
echo "Uploading vendor.zip..."
curl -s -T "$ZIP_FILE" "$FTP_URL/vendor.zip" --user "$FTP_USER:$FTP_PASS"
echo ""

# ── 8. Trigger vendor extraction on server ───────────────────────────────────
echo "Extracting vendor on server..."
curl -s "$API_URL/deploy.php?key=$DEPLOY_KEY"
echo ""

# ── 9. Clean up local vendor.zip ──────────────────────────────────────────────
echo "Cleaning up..."
rm -f "$ZIP_FILE"

echo ""
echo "Deployment complete → $API_URL"
