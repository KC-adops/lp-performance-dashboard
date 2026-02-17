# Google Sheets API セットアップガイド

このアプリをあなたのGoogle Sheetsと連携させるための手順です。

## 📋 必要な準備

### 1. Google Cloud Consoleでの設定

#### ステップ1: プロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを使用）

#### ステップ2: Google Sheets APIの有効化
1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

#### ステップ3: APIキーの作成
1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」をクリック
3. 作成されたAPIキーをコピー（後で使用します）
4. （推奨）「キーを制限」をクリックし、「Google Sheets API」のみに制限

### 2. スプレッドシートの共有設定

1. あなたのスプレッドシートを開く
   - URL: https://docs.google.com/spreadsheets/d/1Cf615_iFbLIWHPBrbizr1aRZTLQSAPsFq4SQMqSut50/
2. 右上の「共有」ボタンをクリック
3. 「リンクを知っている全員」に変更
4. 権限を「閲覧者」に設定
5. 「完了」をクリック

### 3. アプリの設定

1. `client/.env.local`ファイルを開く
2. 以下のように編集：

```
VITE_GOOGLE_SHEETS_API_KEY=あなたのAPIキーをここに貼り付け
VITE_SPREADSHEET_ID=1Cf615_iFbLIWHPBrbizr1aRZTLQSAPsFq4SQMqSut50
```

3. ファイルを保存

### 4. 開発サーバーの再起動

環境変数を読み込むため、開発サーバーを再起動してください：

```bash
# 現在のサーバーを停止（Ctrl+C）
# 再度起動
cd client
npm run dev
```

## ✅ 動作確認

1. ブラウザで http://localhost:5173/ を開く
2. ブラウザのコンソールを開く（F12キー）
3. 以下のようなメッセージが表示されればOK：
   - `Fetched Summary Report from Google Sheets: XX rows`
   - `Fetched PV Data from Google Sheets: XX rows`

## ⚠️ トラブルシューティング

### 「Using mock data」と表示される場合
- `.env.local`ファイルのAPIキーが正しく設定されているか確認
- 開発サーバーを再起動したか確認

### 「API Error」が表示される場合
- スプレッドシートが「リンクを知っている全員」に共有されているか確認
- Google Sheets APIが有効化されているか確認
- APIキーの制限設定を確認

### データが正しく表示されない場合
- スプレッドシートのタブ名が正しいか確認：
  - `AFAD_LP_Summary_Report`
  - `SquadBeyond_Data`
  - コストデータのタブ名（現在は`Acom_Cost`に設定）

## 📝 コストデータのタブ名について

現在、コストデータは`Acom_Cost`タブから取得するように設定されています。
実際のタブ名が異なる場合は、`src/services/dataService.js`の153行目を修正してください：

```javascript
const data = await fetchAndParseSheet('実際のタブ名'); // ここを変更
```

複数の媒体のコストデータを統合する必要がある場合は、お知らせください。
