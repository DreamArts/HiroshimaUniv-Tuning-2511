# 競技の概要と環境

## 競技概要
規定時間までに、課題アプリケーションである「StoreLink」のバックエンドをチューニングし、パフォーマンスを改善してください。

各チームは専用の採点モジュールを使ってパフォーマンスを採点できます。課題提出の締め切りまでに運営に送信されたスコアが最も高いチームが優勝です。
採点は何度も実施可能で、**レギュレーションに違反していない**一番高いスコアが最終結果として利用されます。

レギュレーションは[別文書](../rules/02_Regulation.md)にまとめています。

## 競技環境構成
<div align="center">
<img src="../img/architecture.png" alt="構成図">
</div>

<br>

本コンテストで参加者がチューニングするサーバはAPサーバです。
APサーバ内の各サービスは docker compose 上の複数のコンテナによって構成されてます。各コンテナの役割は以下の通りです。

- nginx: http/https リクエストの受付、また、 frontend または backend へのプロキシ
- mysql: データを保管
- frontend: Next.js + Typescript で実装、ビルドされた html/javascript コードを提供
- backend: クライアント向けの API を提供。Go で実装

Web ブラウザは frontend からのコードを実行し、クライアントとして動作します。

クライアントは backend から提供された API を利用することで、ユーザに機能を提供します。

サービス利用が開始されているため、ユーザ・商品情報・注文情報などのデータや添付ファイル等はすでに登録されているものとします。

### インフラ情報ß
競技環境は Azure で構築しています。

- APサーバ
  - VM: Standard D2as v4 (2 vcpu 数、8 GiB メモリ)
  - ディスク: Standard HDD LRS
- 負荷試験サーバ
  - VM: Standard D2as v4 (2 vcpu 数、8 GiB メモリ)
  - ディスク: Standard HDD LRS

---

[目次](../../README.md)
