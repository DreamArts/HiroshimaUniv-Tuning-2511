#!/bin/bash
set -eo pipefail
shopt -s nullglob

# オリジナルのdocker-entrypoint.shを呼び出すが、ログを削減
if [ "$1" = 'mysqld' ]; then
    # 元のエントリーポイントを実行するが、出力を制御
    exec /usr/local/bin/docker-entrypoint.sh "$@" 2>&1 | \
    grep -v "MySQL Server Initialization" | \
    grep -v "InnoDB initialization" | \
    grep -v "Channel mysql_main configured" | \
    grep -v "X Plugin ready for connections" | \
    grep -v "CA certificate ca.pem is self signed" | \
    grep -v "Insecure configuration for --pid-file" | \
    grep -v "Warning: Unable to load" | \
    grep -v "socket:" | \
    grep -v "Temporary server" | \
    grep -v "Creating database\|Creating user\|Giving user" | \
    grep -v "MySQL init process done" | \
    grep -v "ready for connections" | \
    head -20  # 最初の20行のみ表示
else
    exec /usr/local/bin/docker-entrypoint.sh "$@"
fi