FROM mysql:9.4

RUN microdnf install -y glibc-langpack-ja

ENV LANG=ja_JP.UTF-8
ENV LC_ALL=ja_JP.UTF-8

# カスタムエントリーポイントスクリプトをコピー
COPY entrypoint.sh /usr/local/bin/custom-entrypoint.sh
RUN chmod +x /usr/local/bin/custom-entrypoint.sh

# カスタムエントリーポイントを使用
ENTRYPOINT ["/usr/local/bin/custom-entrypoint.sh"]
CMD ["mysqld"]
