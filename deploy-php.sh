#!/bin/bash
set -e

API_PHP_DIR="apps/api"
ZIP_FILE="$API_PHP_DIR/vendor.zip"
FTP_USER="psworld"
FTP_PASS="xv3DEXuHsHn969ducYT3"
FTP_HOST="ftp://poesyliang.net/domains/poesyliang.net/api"
DEPLOY_KEY="xv3DEXuHsHn969ducYT3"

# 1️⃣ Install dependencies locally
echo "Installing PHP dependencies locally..."
cd $API_PHP_DIR
composer install --no-dev --optimize-autoloader

# 2️⃣ Zip vendor folder
echo "Zipping vendor folder..."
zip -r -q vendor.zip vendor

# 3️⃣ Go back to repo root
cd ../../

# 4️⃣ Push changed files via git-ftp
echo "Uploading changed files via git-ftp..."
git add apps/api/vendor.zip
git commit -am "Add vendor.zip for deployment"
git ftp push

# 5️⃣ Upload vendor.zip via curl (FTP)
echo "Uploading vendor.zip..."
curl -T $ZIP_FILE $FTP_HOST/vendor.zip --user $FTP_USER:$FTP_PASS

# 6️⃣ Trigger extraction on server
echo "Triggering extraction on server..."
curl "$FTP_HOST/deploy.php?key=$DEPLOY_KEY"

# 7️⃣ Cleanup
rm $ZIP_FILE
echo "Deployment complete!"
