# プラハチャレンジ管理サービス 設計書

## 概要

プラハチャレンジの進捗管理をAirtableから自前のWebサービスに移行するためのAPIサーバー。
Node.js + TypeScript + Express + Prismaで、オニオンアーキテクチャに沿って実装する。

## 技術選定

| 項目 | 選定 |
|---|---|
| ランタイム | Node.js + TypeScript |
| フレームワーク | Express |
| ORM | Prisma |
| DB | PostgreSQL（Docker） |
| テスト | Jest |
| ベース | [praha-challenge-template](https://github.com/praha-inc/praha-challenge-template) |
| DI | 手動コンストラクタ注入（Composition Root） |
| メール送信 | コンソールログで代替（インターフェースは定義） |
| 初期データ | Prisma seedスクリプトで投入 |

## アーキテクチャ方針

- **オニオンアーキテクチャ** をベースとする
- 参照系の複雑なクエリ（課題進捗条件での参加者検索）のみ **CQSパターン** を採用し、QueryServiceで直接DBクエリを発行する
- コマンド系（変更操作）はUseCase → Repository → Domain Entityの標準的な流れ

## ドメインモデル

### エンティティ

#### Participant（参加者）
- `id`: UniqueID
- `name`: string
- `email`: Email（値オブジェクト）
- `status`: EnrollmentStatus（在籍中 / 休会中 / 退会済）
- ルール: ステータスが「在籍中」以外のとき、チーム・ペアに所属できない

#### Team（チーム）
- `id`: UniqueID
- `name`: TeamName（数字のみ、3文字以下、重複不可）
- `pairs`: Pair[]
- ルール: チーム内参加者合計が3名未満になったら管理者にメール通知

#### Pair（ペア）
- `id`: UniqueID
- `name`: PairName（英小文字1文字）
- `memberIds`: ParticipantId[]（2〜3名）
- ルール:
  - メンバーは2〜3名
  - 1名になったら同チーム内の最少人数ペアに自動合流
  - 4名になったら自動分割
- ペアは必ず同じチームの参加者から構成される

#### TaskProgress（課題進捗）
- `id`: UniqueID
- `participantId`: ParticipantId
- `taskMasterId`: TaskMasterId
- `status`: ProgressStatus（未着手 / レビュー待ち / 完了）
- ルール:
  - 「完了」→「レビュー待ち」「未着手」への逆戻り不可
  - ステータス変更は課題の所有者のみ

#### TaskMaster（課題マスタ）
- `id`: UniqueID
- `name`: string
- 読み取り専用の参照データ

### 値オブジェクト

| 値オブジェクト | バリデーション |
|---|---|
| `Email` | メールアドレス形式のバリデーション |
| `EnrollmentStatus` | 在籍中 / 休会中 / 退会済 のいずれか |
| `TeamName` | 数字のみ、3文字以下 |
| `PairName` | 英小文字1文字 |
| `ProgressStatus` | 未着手 / レビュー待ち / 完了。完了からの逆戻り不可 |

### ドメインサービス

#### ParticipantTransferService

参加者の増減時のペア再編成・チーム割り当てロジックを担当。

**参加者減少時（休会・退会）:**
1. ペアから参加者を除外
2. ペアが1名になった場合 → 同チーム内の最少人数ペアに残りの参加者を自動合流
   - 同人数の場合はランダム選択
   - 合流可能なペアがない場合は管理者にメール通知
3. チーム全体が2名以下になった場合 → 管理者にメール通知

**参加者復帰時（在籍中に変更）:**
1. 最少人数のチームを選択（同数ならランダム）
2. そのチーム内の最少人数ペアに配置（同数ならランダム）
3. ペアが4名になった場合 → 自動的に2つのペアに分割（ランダム）

## ユースケース

### コマンド系

| ユースケース | 入力 | 処理 |
|---|---|---|
| `CreateParticipantUseCase` | 名前, メールアドレス | 参加者新規作成。全課題の進捗を「未着手」で一括作成。最少人数のチーム・ペアに自動配置 |
| `UpdateParticipantStatusUseCase` | 参加者ID, 新ステータス | 在籍ステータス変更。休会・退会時はペア/チームから除外しParticipantTransferServiceで再編成。復帰時は自動配置 |
| `UpdatePairMembersUseCase` | ペアID, 参加者ID[] | ペアの所属メンバーを手動変更（運営による調整用） |
| `UpdateTeamPairsUseCase` | チームID, ペアID[] | チームに所属するペアを手動変更（運営による調整用） |
| `UpdateTaskProgressUseCase` | 参加者ID（操作者）, 課題進捗ID, 新ステータス | 課題の進捗ステータス変更。所有者チェック・完了逆戻り不可チェック |

### クエリ系

| ユースケース | 入力 | 出力 |
|---|---|---|
| `GetParticipantsUseCase` | — | 参加者一覧 |
| `GetPairsUseCase` | — | ペア一覧（所属参加者含む） |
| `GetTeamsUseCase` | — | チーム一覧（所属ペア・参加者含む） |
| `SearchParticipantsByTaskProgressQueryService` | 課題ID[], 進捗ステータス, ページ番号 | 条件に合致する参加者を10件ずつページング返却 |

最後のクエリはCQSパターンに従い、UseCaseを経由せずQueryServiceで直接DBにクエリを発行する。

## DB設計（Prismaスキーマ）

```
Participant (参加者)
├── id: UUID (PK)
├── name: String
├── email: String (UNIQUE)
├── enrollmentStatus: Enum (ENROLLED / ON_LEAVE / WITHDRAWN)
├── pairId: UUID (FK, nullable)
├── createdAt, updatedAt

Team (チーム)
├── id: UUID (PK)
├── name: String (UNIQUE)
├── createdAt, updatedAt

Pair (ペア)
├── id: UUID (PK)
├── name: String
├── teamId: UUID (FK)
├── createdAt, updatedAt
└── UNIQUE(name, teamId)

TaskMaster (課題マスタ)
├── id: UUID (PK)
├── name: String

TaskProgress (課題進捗)
├── id: UUID (PK)
├── participantId: UUID (FK)
├── taskMasterId: UUID (FK)
├── progressStatus: Enum (NOT_STARTED / AWAITING_REVIEW / COMPLETED)
├── createdAt, updatedAt
└── UNIQUE(participantId, taskMasterId)
```

### リレーション
- 参加者 → ペア: 多対1（Participant.pairId）
- ペア → チーム: 多対1（Pair.teamId）
- 参加者 → チーム: ペアを経由した間接的な関係

## リポジトリインターフェース

| インターフェース | 主なメソッド |
|---|---|
| `IParticipantRepository` | `findById`, `findByEmail`, `save`, `delete` |
| `ITeamRepository` | `findById`, `findAll`, `findWithFewestMembers`, `save` |
| `IPairRepository` | `findById`, `findByTeamId`, `findWithFewestMembersInTeam`, `save`, `delete` |
| `ITaskProgressRepository` | `findByParticipantId`, `findById`, `save`, `bulkCreate` |
| `IMailSender` | `send(to, subject, body)` |

## QueryServiceインターフェース

| インターフェース | メソッド |
|---|---|
| `IParticipantTaskQueryService` | `findByTaskProgress(taskMasterIds, progressStatus, page, perPage)` → `{ participants, totalCount }` |

## APIエンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/participants` | 参加者一覧 |
| POST | `/participants` | 参加者新規追加 |
| PATCH | `/participants/:id/status` | 在籍ステータス変更 |
| GET | `/pairs` | ペア一覧 |
| PATCH | `/pairs/:id/members` | ペアのメンバー変更 |
| GET | `/teams` | チーム一覧 |
| PATCH | `/teams/:id/pairs` | チームのペア変更 |
| PATCH | `/task-progresses/:id` | 課題進捗ステータス変更 |
| GET | `/participants/search` | 課題進捗条件での参加者検索（ページング） |

## ディレクトリ構成

テストファイルはモジュールと同じディレクトリに `*.test.ts` として配置する（コロケーション方式）。

```
src/
├── app/                          # ユースケース層
│   ├── participant/
│   │   ├── CreateParticipantUseCase.ts
│   │   ├── CreateParticipantUseCase.test.ts
│   │   ├── UpdateParticipantStatusUseCase.ts
│   │   └── UpdateParticipantStatusUseCase.test.ts
│   ├── pair/
│   │   ├── UpdatePairMembersUseCase.ts
│   │   └── UpdatePairMembersUseCase.test.ts
│   ├── team/
│   │   ├── UpdateTeamPairsUseCase.ts
│   │   └── UpdateTeamPairsUseCase.test.ts
│   └── task/
│       ├── UpdateTaskProgressUseCase.ts
│       └── UpdateTaskProgressUseCase.test.ts
├── domain/
│   ├── entity/
│   │   ├── Participant.ts
│   │   ├── Participant.test.ts
│   │   ├── Team.ts
│   │   ├── Team.test.ts
│   │   ├── Pair.ts
│   │   ├── Pair.test.ts
│   │   ├── TaskProgress.ts
│   │   └── TaskProgress.test.ts
│   ├── value-object/
│   │   ├── Email.ts
│   │   ├── Email.test.ts
│   │   ├── EnrollmentStatus.ts
│   │   ├── EnrollmentStatus.test.ts
│   │   ├── TeamName.ts
│   │   ├── TeamName.test.ts
│   │   ├── PairName.ts
│   │   ├── PairName.test.ts
│   │   ├── ProgressStatus.ts
│   │   └── ProgressStatus.test.ts
│   ├── domain-service/
│   │   ├── ParticipantTransferService.ts
│   │   └── ParticipantTransferService.test.ts
│   └── interface/
│       ├── IParticipantRepository.ts
│       ├── ITeamRepository.ts
│       ├── IPairRepository.ts
│       ├── ITaskProgressRepository.ts
│       └── IMailSender.ts
├── infra/
│   ├── db/
│   │   ├── repository/
│   │   │   ├── PrismaParticipantRepository.ts
│   │   │   ├── PrismaTeamRepository.ts
│   │   │   ├── PrismaPairRepository.ts
│   │   │   └── PrismaTaskProgressRepository.ts
│   │   └── query-service/
│   │       └── PrismaParticipantTaskQueryService.ts
│   ├── mail/
│   │   └── ConsoleMailSender.ts
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── controller/
│   ├── ParticipantController.ts
│   ├── PairController.ts
│   ├── TeamController.ts
│   └── TaskController.ts
├── route/
│   └── index.ts
└── main.ts                       # Composition Root（手動DI）
```

## テスト方針

### Domain層
- **値オブジェクト**: バリデーション正常系 + 異常系（不正メール、完了→未着手の逆戻り不可 等）
- **Entity**: 生成、状態変更の正常系 + 主要な異常系
- **DomainService**: ペア再編成ロジック（合流・分割）の正常系 + 異常系

### UseCase層
- Repositoryをモックして注入
- 各ユースケースの正常系 + 主要な異常系（所有者チェック等）

### テストツール
- Jest
- テスト用のインメモリRepository実装、もしくはJestのモック

## メール通知

実際のメール送信は行わず、`IMailSender`インターフェースを定義し、`ConsoleMailSender`でコンソールログに出力する。

### 通知が必要な場面
1. チームが2名以下になった場合 → メール文面に「減った参加者名」「チーム名」「現在の参加者名」を含む
2. ペアの合流先がない場合 → メール文面に「減った参加者名」「合流先を探している参加者名」を含む

## 初期データ

Prisma seedスクリプトで以下を投入:
- 課題マスタ: 80件
- 参加者: 30名（在籍中）
- チーム: 5チーム（各6名）
- ペア: 各チーム2〜3ペア（各2〜3名）
- 課題進捗: 参加者30名 × 課題80件 = 2,400件（初期値は全て「未着手」）
