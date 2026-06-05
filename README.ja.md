# HUST TKB — 時間割作成支援ツール

ハノイ工科大学（HUST）の学生向けに、予定時間割 Excel から授業登録用の時間割を視覚的に作成する Web アプリケーションです。

[English README](./README.md)

---

## プロジェクトの目的

学生が履修登録を効率化できるよう、Excel 形式の予定時間割を取り込み、科目コードの検索・授業タイプ（LT/BT/TN など）の選択・週間グリッド上での確認を一つの画面で行えるようにします。個人の希望（午前を空ける、週に 1 日完全休みなど）に応じた AI による時間割提案にも対応します。

---

## 主な機能

- **Excel アップロード** — `.xlsx` / `.xls` をブラウザ上で読み込み、科目・クラス情報を解析
- **科目検索** — 科目コード・科目名での検索とオートコンプリート
- **科目チップ** — 登録したい科目をチップで管理（科目コードのみ表示）
- **時間割グリッド** — 曜日 × 時間帯のグリッドでクラスを表示・選択
- **複数授業タイプ** — LT / BT / TN など、科目ごとに必要なタイプを選択
- **重複表示** — 同一時間帯のクラスを重ねて表示し、ユーザーが判断可能
- **ブラウザ保存** — `localStorage` にデータを保存し、次回アクセス時に復元
- **Excel エクスポート** — 選択したクラス一覧を Excel ファイルで出力
- **AI 時間割提案** — 自然言語で希望を入力し、Gemini API によるクラス組み合わせを適用

---

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | HTML5, CSS3, Vanilla JavaScript |
| データ処理 | SheetJS (`xlsx-js-style`) |
| ストレージ | `localStorage`, LZ-String（圧縮） |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| バックエンド | Vercel Serverless Functions（API キー保護用プロキシ） |
| デプロイ | Vercel, Git / GitHub |

---

## プロジェクト構成

```
WebsiteTKB/
├── index.html          # エントリーポイント
├── css/style.css
├── api/
│   └── ai-schedule.js  # Gemini API プロキシ
├── js/
│   ├── app.js          # 初期化・イベント
│   ├── core/           # state, storage, utils
│   ├── data/           # Excel 解析・アップロード
│   ├── courses/        # 検索・チップ・結果表示
│   ├── export/         # Excel 出力
│   ├── timetable/      # 時間割グリッド
│   └── ai/             # AI パネル・API 呼び出し
└── test/               # テスト用 Excel
```

---

## ローカルでの実行

### 静的ファイルのみ（AI 機能なし）

`index.html` をブラウザで開くか、任意の静的サーバーで配信してください。

### AI 機能を含む開発

1. [Google AI Studio](https://aistudio.google.com/apikey) で `GEMINI_API_KEY` を取得
2. プロジェクトルートに `.env.local` を作成:

```
GEMINI_API_KEY=your_api_key_here
```

3. Vercel CLI で起動:

```bash
npm install -g vercel
vercel login
vercel dev
```

4. ブラウザで `http://localhost:3000` を開く

---

## Vercel へのデプロイ

```bash
vercel
```

Vercel ダッシュボード → **Settings → Environment Variables** に `GEMINI_API_KEY` を設定し、再デプロイしてください。

---

## 使い方（概要）

1. EsHUST から予定時間割 Excel を取得し、アップロード
2. 科目コードまたは科目名で検索し、登録したい科目を追加
3. **クラス検索** をクリックして時間割グリッドを表示
4. グリッド上でクラスをクリックして LT / BT / TN などを選択
5. （任意）**AI で並べ替え** → 希望を入力 → **送信**
6. **ブラウザに保存** または **Excel エクスポート**

---

## ブランチ運用

| ブランチ | 用途 |
|----------|------|
| `main` | 本番・リリース |
| `developer` | 統合・検証 |
| `fea/*`, `fix/*` | 機能開発・修正 → `developer` へ PR |

---

## ライセンス・連絡先

学内プロジェクト（モノホック用途）。  
お問い合わせ: リポジトリの Issues またはプロジェクト担当者まで。
