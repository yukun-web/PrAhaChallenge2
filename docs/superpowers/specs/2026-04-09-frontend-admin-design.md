# プラハチャレンジ管理画面 フロントエンド設計書

## 概要

プラハチャレンジ管理APIに対する運営向け管理画面。参加者の管理、チーム・ペア構成の確認・編集、課題進捗条件での参加者検索を提供する。

## 技術選定

| 項目 | 選定 |
|---|---|
| フレームワーク | React 18 + Vite + TypeScript |
| UIライブラリ | shadcn/ui + Tailwind CSS |
| ルーティング | React Router v6 |
| 状態管理 | useState / useEffect（グローバルステートなし） |
| API通信 | fetch（Viteプロキシ経由） |
| 配置 | `frontend/` ディレクトリとしてモノレポ内に配置 |

## ディレクトリ構成

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts            ← API呼び出し関数（fetch wrapper）
│   ├── components/
│   │   ├── Layout.tsx           ← サイドバーレイアウト
│   │   └── ui/                  ← shadcn/ui コンポーネント
│   ├── pages/
│   │   ├── ParticipantsPage.tsx ← 参加者管理
│   │   ├── TeamsPage.tsx        ← チーム・ペア管理
│   │   └── TaskSearchPage.tsx   ← 課題検索
│   ├── App.tsx                  ← React Router
│   └── main.tsx                 ← エントリポイント
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## レイアウト

サイドバーレイアウトを採用。

- 左側に常時表示のサイドバー（ロゴ + ナビゲーション3項目）
- 右側にメインコンテンツ

ナビゲーション項目:
- 参加者管理（`/participants`）
- チーム・ペア（`/teams`）
- 課題検索（`/tasks`）

デフォルトルート `/` は `/participants` にリダイレクト。

## ページ仕様

### 1. 参加者管理ページ（`/participants`）

**機能:**
- 参加者一覧をテーブル表示（名前、メールアドレス、ステータス、チーム、ペア、操作）
- ステータスフィルター（全て / 在籍中 / 休会中 / 退会済）でフィルタリング
- 各行のドロップダウンで在籍ステータスを変更（変更時にAPIを呼び出し、一覧を再取得）
- 「+ 新規参加者を追加」ボタンでモーダルダイアログを表示
  - 入力項目: 名前、メールアドレス
  - 追加成功時にモーダルを閉じて一覧を再取得

**使用API:**
- `GET /api/participants` — 一覧取得
- `GET /api/teams` — チーム・ペア情報を取得（参加者のチーム名・ペア名を表示するため）
- `POST /api/participants` — 新規追加
- `PATCH /api/participants/:id/status` — ステータス変更

**チーム・ペア名の解決:**
参加者には `pairId` しかないため、`GET /api/teams` の結果からペアID→チーム名・ペア名のマッピングを構築して表示に使用する。

### 2. チーム・ペア管理ページ（`/teams`）

**機能:**
- チームをレスポンシブグリッドで表示（`grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))`）
- 各チームカード内にペアを縦並びで表示
- 各ペア内にメンバー名を一覧表示
- チーム名、人数を表示

**使用API:**
- `GET /api/teams` — チーム一覧（ペア・メンバー情報を含む）

**操作:**
- 初期リリースでは閲覧のみ。ペアメンバー変更やチームのペア変更は参加者管理ページのステータス変更で自動的に反映される。

### 3. 課題検索ページ（`/tasks`）

**機能:**
- 課題を複数選択できるタグ入力（コンボボックス形式、選択済みの課題はチップ表示、✕で削除）
- 進捗ステータスのドロップダウン（未着手 / レビュー待ち / 完了）
- 検索ボタンで条件に合致する参加者を検索
- 結果をテーブル表示（名前、メールアドレス）
- ページネーション（10件/ページ、ページ番号をクリックで移動）
- 検索結果件数を表示

**使用API:**
- `GET /api/task-masters` — 課題マスタ一覧（タグ入力のオプション用。**新規追加が必要**）
- `GET /api/participants/search` — 検索（taskMasterIds, progressStatus, page）

## バックエンドの追加変更

課題検索ページで課題マスタの一覧が必要なため、以下を追加する:

**新規エンドポイント:**
- `GET /api/task-masters` — 全課題マスタの `id` と `name` を返す

**変更ファイル:**
- `src/controller/TaskController.ts` — `getTaskMasters` メソッド追加
- `src/route/index.ts` — `GET /task-masters` ルート追加
- `src/main.ts` — PrismaClientから直接取得（UseCaseは不要、単純な参照のみ）

## API通信

### fetch wrapper（`src/api/client.ts`）

```typescript
const API_BASE = '/api'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'APIエラー')
  }
  return res.json()
}
```

各ページからは `fetchApi('/participants')` のように呼び出す。

### Viteプロキシ設定

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

## エラーハンドリング

- API呼び出し失敗時はトースト通知（shadcn/uiのtoast）でエラーメッセージを表示
- エラー内容はAPIレスポンスの `error` フィールドをそのまま表示（日本語メッセージが含まれるため）

## 開発・起動方法

```bash
# バックエンド
cd .docker && docker-compose up -d
npm run migrate:dev
npm run seed
npm run dev                    # localhost:3000

# フロントエンド（別ターミナル）
cd frontend
npm install
npm run dev                    # localhost:5173 (Viteデフォルト)
```
