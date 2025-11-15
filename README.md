# Tuning the backend Contest 2025

## ディレクトリ構造
```
.
├── .da        　　　  # SSL証明書などの保管場所
├── benchmarker  　　　# ベンチマーカー
├── documents    　　　# 各種ドキュメント
├── hint_docs    　　　# ヒント用ドキュメント
├── pre_lecture_docs  # 事前講義で使用したドキュメント
└── webapp      　　　 # バックエンド、フロントエンド、Nginx、MySQL、E2Eテストの実装
```

## 環境構築

1. このリポジトリを、チームの代表者 1 名の GitHub アカウントの **Public** リポジトリに fork してください。fork したリポジトリは`チーム名`を 含めた下記フォーマットで作成すること。

   ```
   forkしたリポジトリ名：{チーム名}-HiroUniv-Tuning-2511
   例：dreamarts-HiroUniv-Tuning-2511
   ```

   <div align="center">
       <img src="./documents/md/img/3.png" alt="fork">
   </div>

   **※チューニングの成果物は fork したリポジトリの main ブランチにコミットしてください。**

2. 下記の手順をもとにローカル・VM環境を構築する。
- 1. [ローカル環境の構築](documents/md/setup/01_Local.md)
- 2. [V環境の構築(※)](documents/md/setup/02_VM.md)
※：Vm環境の構築は、チームの代表者一人が実施すること

3. そのほか、競技内容や注意事項は、[ドキュメント](./documents/README.md)を参照してください。
