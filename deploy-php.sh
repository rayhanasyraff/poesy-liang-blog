#!/bin/bash
set -e

API_PHP_DIR="apps/api"
ZIP_FILE="$API_PHP_DIR/vendor.zip"
FTP_URL="ftp://poesyliang.net:21/domains/poesyliang.net/public_html/api"
FTP_USER="psworld"
FTP_PASS="xv3DEXuHsHn969ducYT3"
API_URL="http://poesyliang.net/api"
DEPLOY_KEY="xv3DEXuHsHn969ducYT3"

# ── 0. Temporarily allow vendor folder in git ────────────────────────────────
echo "Unignoring vendor folder..."
sed -i '/^\*\*\/vendor$/d' .gitignore

# ── 1. Install PHP dependencies and regenerate autoloader ─────────────────────
echo "Installing PHP dependencies..."
GIT_CA_BUNDLE="/c/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt"
(cd "$API_PHP_DIR" && COMPOSER_ALLOW_SUPERUSER=1 CURL_CA_BUNDLE="$GIT_CA_BUNDLE" php -d curl.cainfo="$GIT_CA_BUNDLE" /c/composer/composer.phar install --no-dev --optimize-autoloader --ignore-platform-req=ext-fileinfo --ignore-platform-req=ext-sockets --ignore-platform-req=ext-pcntl --ignore-platform-req=ext-posix)

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

# ── 7. Upload vendor.zip and .env to server via FTP ──────────────────────────
echo "Uploading vendor.zip..."
curl -s -T "$ZIP_FILE" "$FTP_URL/vendor.zip" --user "$FTP_USER:$FTP_PASS"
echo ""

echo "Uploading .env..."
curl -s -T "$API_PHP_DIR/.env" "$FTP_URL/.env" --user "$FTP_USER:$FTP_PASS"
echo ""

# ── 8. Trigger vendor extraction on server ───────────────────────────────────
echo "Extracting vendor on server..."
curl -s "$API_URL/deploy.php?key=$DEPLOY_KEY"
echo ""

# ── 9. Clean up local vendor.zip ──────────────────────────────────────────────
echo "Cleaning up..."
rm -f "$ZIP_FILE"

# ── 10. Restore vendor folder to .gitignore ───────────────────────────────────
echo "Re-ignoring vendor folder..."
echo '**/vendor' >> .gitignore

echo ""
echo "Deployment complete → $API_URL"
