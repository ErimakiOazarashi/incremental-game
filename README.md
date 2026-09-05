# 眠りの跡

夢の階層を潜るインクリメンタルゲーム。眠って、潜って、目覚めて、また眠る。

- 深い階層ほど夢の中の時間が加速し、生産が跳ね上がる
- 「目覚め」がプレステージ。夢は消えるが「記憶」が残り、次の眠りを強くする
- 明晰夢（自動化）、悪夢（イベント）、レム睡眠（周期バフ）、夢日記（実績）

仕様書: [docs/SPEC.md](docs/SPEC.md)

## 開発

```powershell
npm install
npm run dev      # 開発サーバー
npm test         # コアロジックのテスト
npm run build    # 型チェック + 本番ビルド (dist/)
```

`main` ブランチへの push で GitHub Actions が GitHub Pages に自動デプロイします
（リポジトリ設定の Pages で Source: GitHub Actions を選択しておくこと）。
