#!/bin/bash

# ==================================
# E2Eテストスクリプト。
# ==================================

if [[ $HOSTNAME == hutc2511-* ]];
then
	BASE_URL="https://${HOSTNAME}.hutc2511.dabaas.net"
else
	BASE_URL="http://tuning-nginx"
fi

# E2Eテスト開始
echo "E2Eテストを開始します。"


# E2E成功時にトークンを生成（コンテナ内で実行）
docker run --name e2e --rm --network webapp-network \
    -e BASE_URL=${BASE_URL} \
    -v "$(pwd)/tokens:/usr/src/e2e/tokens" \
    -v "$PWD/tsconfig.json:/usr/src/e2e/tsconfig.json:ro" \
    -v "$PWD/tests:/usr/src/e2e/tests" \
    -v "$PWD/playwright.config.ts:/usr/src/e2e/playwright.config.ts:ro" \
    -it hiroshimauniv2511.azurecr.io/e2e:latest \
    yarn test


if [ $? -ne 0 ]; then
    echo "E2Eのテストに失敗しました。"
    exit 1
fi
