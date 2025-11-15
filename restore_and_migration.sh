#!/bin/bash

# ==================================
# リストアスクリプト・マイグレーションスクリプト。
# 途中でdockerコンテナの再起動も行う。
# ==================================

# リストア・マイグレーション開始
echo "MySQLのリストアを開始します。"

cd ./webapp

bash ./restart_container.sh $1
if [ $? -ne 0 ]; then
    echo -e "\n採点フロー中断します。"
    exit 1
fi

echo "データベースを再作成します..."
docker exec tuning-mysql mysql -u root -pmysql -e "DROP DATABASE IF EXISTS \`hiroshimauniv2511-db\`; CREATE DATABASE \`hiroshimauniv2511-db\`;"
if [ $? -ne 0 ]; then
    echo "データベースの再作成に失敗しました。"
    exit 1
fi

docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init.sql"
if [ $? -ne 0 ]; then
    echo "init.sqlの実行に失敗しました。"
    exit 1
fi

echo "リストアを実行します..."
if [ ! -z "$1" ]; then
    # 引数があれば(e2eを想定)、そのファイルをリストア
    docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init/restoreSQL/e2e_users.sql"
    docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init/restoreSQL/e2e_products.sql"
    docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init/restoreSQL/$1"
elif [[ $HOSTNAME == app-* ]]; then
    docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init/restoreSQL/remote_all.sql"
else
    docker exec -i tuning-mysql sh -c "mysql -u root -pmysql hiroshimauniv2511-db < /docker-entrypoint-initdb.d/init/restoreSQL/local_all.sql"
fi

if [ $? -ne 0 ]; then
    echo "リストアに失敗しました。"
    exit 1
else
    echo "リストアに成功しました。"
fi

next="0"
migrationDir="./mysql/migration"


echo "MySQLのマイグレーションを開始します。"
while :
do
    fileName=$(cd $migrationDir && ls ${next}_*.sql 2>/dev/null)
    if [ ! $fileName ]; then
        echo "マイグレーションに成功しました。"
        break
    fi

    echo "${fileName}を適用します..."
    docker exec tuning-mysql bash -c "mysql -u root -pmysql hiroshimauniv2511-db < /etc/mysql/migration/${fileName}"
    next=$(($next + 1))
done

if [ $? -ne 0 ]; then
    echo "リストアとマイグレーションに失敗しました。"
    exit 1
fi
