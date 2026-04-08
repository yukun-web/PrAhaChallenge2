# プラハチャレンジ管理サービス 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プラハチャレンジの進捗管理APIサーバーをオニオンアーキテクチャで実装する

**Architecture:** Express + TypeScript + Prisma + PostgreSQL。オニオンアーキテクチャ（Domain → App → Infra → Controller）。手動コンストラクタ注入による DI。参照系の複雑なクエリのみ CQS パターンで QueryService を使用。

**Tech Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL (Docker), Jest

**設計書:** `docs/superpowers/specs/2026-04-08-praha-challenge-design.md`

---

## Task 1: プロジェクト初期セットアップ

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.docker/docker-compose.yml`
- Create: `.local.env`
- Create: `.test.env`
- Create: `.gitignore`
- Create: `.prettierrc`
- Create: `jest.config.js`

- [ ] **Step 1: Git リポジトリを初期化**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git init
```

- [ ] **Step 2: package.json を作成**

```json
{
  "name": "praha-challenge",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "dotenv -e .local.env -- ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/src/main.js",
    "lint": "eslint 'src/**/*.ts'",
    "test": "dotenv -e .test.env -- jest",
    "migrate:dev": "dotenv -e .local.env -- prisma migrate dev",
    "migrate:test": "dotenv -e .test.env -- prisma migrate reset --force",
    "seed": "dotenv -e .local.env -- ts-node prisma/seed.ts",
    "generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "express": "^4.18.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "dotenv-cli": "^7.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0",
    "prisma": "^5.0.0",
    "prettier": "^3.0.0"
  }
}
```

- [ ] **Step 3: tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "module": "commonjs",
    "target": "es2020",
    "outDir": "./dist",
    "baseUrl": "./",
    "sourceMap": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "paths": {
      "src/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: docker-compose.yml を作成**

```yaml
version: '3.7'
services:
  prisma-db:
    container_name: prisma-db
    image: postgres:15
    ports:
      - '5403:5432'
    volumes:
      - prisma-store:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: prisma2020
      POSTGRES_DB: prisma
      TZ: 'Asia/Tokyo'

  prisma-test-db:
    container_name: prisma-test-db
    image: postgres:15
    ports:
      - '5402:5432'
    volumes:
      - prisma-test-store:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: prisma2020
      POSTGRES_DB: prisma
      TZ: 'Asia/Tokyo'

volumes:
  prisma-store:
  prisma-test-store:
```

- [ ] **Step 5: 環境変数ファイルを作成**

`.local.env`:
```
DATABASE_URL="postgresql://root:prisma2020@localhost:5403/prisma"
```

`.test.env`:
```
DATABASE_URL="postgresql://root:prisma2020@localhost:5402/prisma"
```

- [ ] **Step 6: .gitignore を作成**

```
node_modules/
dist/
.env
*.env.local
coverage/
```

- [ ] **Step 7: .prettierrc を作成**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
```

- [ ] **Step 8: jest.config.js を作成**

```javascript
module.exports = {
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
}
```

- [ ] **Step 9: 依存関係をインストール**

```bash
npm install
```

- [ ] **Step 10: コミット**

```bash
git add -A
git commit -m "chore: initial project setup with Express, Prisma, Jest"
```

---

## Task 2: Prisma スキーマとマイグレーション

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: prisma/schema.prisma を作成**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum EnrollmentStatus {
  ENROLLED
  ON_LEAVE
  WITHDRAWN
}

enum ProgressStatus {
  NOT_STARTED
  AWAITING_REVIEW
  COMPLETED
}

model Team {
  id        String   @id @default(uuid())
  name      String   @unique
  pairs     Pair[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Pair {
  id           String        @id @default(uuid())
  name         String
  teamId       String
  team         Team          @relation(fields: [teamId], references: [id])
  participants Participant[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([name, teamId])
}

model Participant {
  id               String           @id @default(uuid())
  name             String
  email            String           @unique
  enrollmentStatus EnrollmentStatus @default(ENROLLED)
  pairId           String?
  pair             Pair?            @relation(fields: [pairId], references: [id])
  taskProgresses   TaskProgress[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model TaskMaster {
  id             String         @id @default(uuid())
  name           String
  taskProgresses TaskProgress[]
}

model TaskProgress {
  id              String         @id @default(uuid())
  participantId   String
  participant     Participant    @relation(fields: [participantId], references: [id])
  taskMasterId    String
  taskMaster      TaskMaster     @relation(fields: [taskMasterId], references: [id])
  progressStatus  ProgressStatus @default(NOT_STARTED)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([participantId, taskMasterId])
}
```

- [ ] **Step 2: Docker コンテナを起動**

```bash
cd .docker && docker-compose up -d && cd ..
```

- [ ] **Step 3: Prisma クライアント生成とマイグレーション実行**

```bash
npx dotenv -e .local.env -- npx prisma migrate dev --name init
```

Expected: マイグレーションが成功し、`prisma/migrations/` にSQLファイルが生成される

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "feat: add Prisma schema with all domain models"
```

---

## Task 3: Email 値オブジェクト

**Files:**
- Create: `src/domain/value-object/Email.ts`
- Test: `src/domain/value-object/Email.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/value-object/Email.test.ts
import { Email } from './Email'

describe('Email', () => {
  it('有効なメールアドレスで生成できる', () => {
    const email = Email.create('test@example.com')
    expect(email.value).toBe('test@example.com')
  })

  it('不正な形式のメールアドレスでエラーになる', () => {
    expect(() => Email.create('invalid')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => Email.create('')).toThrow()
  })

  it('同じアドレスのEmailは等価', () => {
    const email1 = Email.create('test@example.com')
    const email2 = Email.create('test@example.com')
    expect(email1.equals(email2)).toBe(true)
  })

  it('異なるアドレスのEmailは等価でない', () => {
    const email1 = Email.create('a@example.com')
    const email2 = Email.create('b@example.com')
    expect(email1.equals(email2)).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/value-object/Email.test.ts
```

Expected: FAIL — `Cannot find module './Email'`

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/value-object/Email.ts
export class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`不正なメールアドレス: ${value}`)
    }
    return new Email(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/value-object/Email.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: コミット**

```bash
git add src/domain/value-object/Email.ts src/domain/value-object/Email.test.ts
git commit -m "feat: add Email value object with validation"
```

---

## Task 4: EnrollmentStatus 値オブジェクト

**Files:**
- Create: `src/domain/value-object/EnrollmentStatus.ts`
- Test: `src/domain/value-object/EnrollmentStatus.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/value-object/EnrollmentStatus.test.ts
import { EnrollmentStatus } from './EnrollmentStatus'

describe('EnrollmentStatus', () => {
  it('在籍中を生成できる', () => {
    const status = EnrollmentStatus.enrolled()
    expect(status.value).toBe('ENROLLED')
    expect(status.isEnrolled()).toBe(true)
  })

  it('休会中を生成できる', () => {
    const status = EnrollmentStatus.onLeave()
    expect(status.value).toBe('ON_LEAVE')
    expect(status.isEnrolled()).toBe(false)
  })

  it('退会済を生成できる', () => {
    const status = EnrollmentStatus.withdrawn()
    expect(status.value).toBe('WITHDRAWN')
    expect(status.isEnrolled()).toBe(false)
  })

  it('同じステータスは等価', () => {
    expect(EnrollmentStatus.enrolled().equals(EnrollmentStatus.enrolled())).toBe(true)
  })

  it('異なるステータスは等価でない', () => {
    expect(EnrollmentStatus.enrolled().equals(EnrollmentStatus.onLeave())).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/value-object/EnrollmentStatus.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/value-object/EnrollmentStatus.ts
const VALID_STATUSES = ['ENROLLED', 'ON_LEAVE', 'WITHDRAWN'] as const
type EnrollmentStatusValue = (typeof VALID_STATUSES)[number]

export class EnrollmentStatus {
  private constructor(private readonly _value: EnrollmentStatusValue) {}

  static enrolled(): EnrollmentStatus {
    return new EnrollmentStatus('ENROLLED')
  }

  static onLeave(): EnrollmentStatus {
    return new EnrollmentStatus('ON_LEAVE')
  }

  static withdrawn(): EnrollmentStatus {
    return new EnrollmentStatus('WITHDRAWN')
  }

  static fromString(value: string): EnrollmentStatus {
    if (!VALID_STATUSES.includes(value as EnrollmentStatusValue)) {
      throw new Error(`不正な在籍ステータス: ${value}`)
    }
    return new EnrollmentStatus(value as EnrollmentStatusValue)
  }

  get value(): EnrollmentStatusValue {
    return this._value
  }

  isEnrolled(): boolean {
    return this._value === 'ENROLLED'
  }

  equals(other: EnrollmentStatus): boolean {
    return this._value === other._value
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/value-object/EnrollmentStatus.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/value-object/EnrollmentStatus.ts src/domain/value-object/EnrollmentStatus.test.ts
git commit -m "feat: add EnrollmentStatus value object"
```

---

## Task 5: TeamName 値オブジェクト

**Files:**
- Create: `src/domain/value-object/TeamName.ts`
- Test: `src/domain/value-object/TeamName.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/value-object/TeamName.test.ts
import { TeamName } from './TeamName'

describe('TeamName', () => {
  it('数字で生成できる', () => {
    const name = TeamName.create('1')
    expect(name.value).toBe('1')
  })

  it('3文字以下の数字で生成できる', () => {
    const name = TeamName.create('123')
    expect(name.value).toBe('123')
  })

  it('4文字以上でエラーになる', () => {
    expect(() => TeamName.create('1234')).toThrow()
  })

  it('数字以外の文字でエラーになる', () => {
    expect(() => TeamName.create('abc')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => TeamName.create('')).toThrow()
  })

  it('同じ名前は等価', () => {
    expect(TeamName.create('1').equals(TeamName.create('1'))).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/value-object/TeamName.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/value-object/TeamName.ts
export class TeamName {
  private constructor(private readonly _value: string) {}

  static create(value: string): TeamName {
    if (!value || !/^\d+$/.test(value)) {
      throw new Error(`チーム名は数字でなければいけません: ${value}`)
    }
    if (value.length > 3) {
      throw new Error(`チーム名は3文字以下でなければいけません: ${value}`)
    }
    return new TeamName(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: TeamName): boolean {
    return this._value === other._value
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/value-object/TeamName.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/value-object/TeamName.ts src/domain/value-object/TeamName.test.ts
git commit -m "feat: add TeamName value object"
```

---

## Task 6: PairName 値オブジェクト

**Files:**
- Create: `src/domain/value-object/PairName.ts`
- Test: `src/domain/value-object/PairName.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/value-object/PairName.test.ts
import { PairName } from './PairName'

describe('PairName', () => {
  it('英小文字1文字で生成できる', () => {
    const name = PairName.create('a')
    expect(name.value).toBe('a')
  })

  it('2文字以上でエラーになる', () => {
    expect(() => PairName.create('ab')).toThrow()
  })

  it('大文字でエラーになる', () => {
    expect(() => PairName.create('A')).toThrow()
  })

  it('数字でエラーになる', () => {
    expect(() => PairName.create('1')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => PairName.create('')).toThrow()
  })

  it('同じ名前は等価', () => {
    expect(PairName.create('a').equals(PairName.create('a'))).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/value-object/PairName.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/value-object/PairName.ts
export class PairName {
  private constructor(private readonly _value: string) {}

  static create(value: string): PairName {
    if (!value || !/^[a-z]$/.test(value)) {
      throw new Error(`ペア名は英小文字1文字でなければいけません: ${value}`)
    }
    return new PairName(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: PairName): boolean {
    return this._value === other._value
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/value-object/PairName.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/value-object/PairName.ts src/domain/value-object/PairName.test.ts
git commit -m "feat: add PairName value object"
```

---

## Task 7: ProgressStatus 値オブジェクト

**Files:**
- Create: `src/domain/value-object/ProgressStatus.ts`
- Test: `src/domain/value-object/ProgressStatus.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/value-object/ProgressStatus.test.ts
import { ProgressStatus } from './ProgressStatus'

describe('ProgressStatus', () => {
  it('未着手を生成できる', () => {
    const status = ProgressStatus.notStarted()
    expect(status.value).toBe('NOT_STARTED')
  })

  it('レビュー待ちを生成できる', () => {
    const status = ProgressStatus.awaitingReview()
    expect(status.value).toBe('AWAITING_REVIEW')
  })

  it('完了を生成できる', () => {
    const status = ProgressStatus.completed()
    expect(status.value).toBe('COMPLETED')
  })

  describe('ステータス遷移', () => {
    it('未着手 → レビュー待ちに変更できる', () => {
      const current = ProgressStatus.notStarted()
      const next = ProgressStatus.awaitingReview()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('未着手 → 完了に変更できる', () => {
      const current = ProgressStatus.notStarted()
      const next = ProgressStatus.completed()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('レビュー待ち → 完了に変更できる', () => {
      const current = ProgressStatus.awaitingReview()
      const next = ProgressStatus.completed()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('レビュー待ち → 未着手に変更できる', () => {
      const current = ProgressStatus.awaitingReview()
      const next = ProgressStatus.notStarted()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('完了 → 未着手に変更できない', () => {
      const current = ProgressStatus.completed()
      const next = ProgressStatus.notStarted()
      expect(() => current.canTransitionTo(next)).toThrow('完了した課題のステータスは変更できません')
    })

    it('完了 → レビュー待ちに変更できない', () => {
      const current = ProgressStatus.completed()
      const next = ProgressStatus.awaitingReview()
      expect(() => current.canTransitionTo(next)).toThrow('完了した課題のステータスは変更できません')
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/value-object/ProgressStatus.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/value-object/ProgressStatus.ts
const VALID_STATUSES = ['NOT_STARTED', 'AWAITING_REVIEW', 'COMPLETED'] as const
type ProgressStatusValue = (typeof VALID_STATUSES)[number]

export class ProgressStatus {
  private constructor(private readonly _value: ProgressStatusValue) {}

  static notStarted(): ProgressStatus {
    return new ProgressStatus('NOT_STARTED')
  }

  static awaitingReview(): ProgressStatus {
    return new ProgressStatus('AWAITING_REVIEW')
  }

  static completed(): ProgressStatus {
    return new ProgressStatus('COMPLETED')
  }

  static fromString(value: string): ProgressStatus {
    if (!VALID_STATUSES.includes(value as ProgressStatusValue)) {
      throw new Error(`不正な進捗ステータス: ${value}`)
    }
    return new ProgressStatus(value as ProgressStatusValue)
  }

  get value(): ProgressStatusValue {
    return this._value
  }

  isCompleted(): boolean {
    return this._value === 'COMPLETED'
  }

  canTransitionTo(next: ProgressStatus): void {
    if (this.isCompleted()) {
      throw new Error('完了した課題のステータスは変更できません')
    }
  }

  equals(other: ProgressStatus): boolean {
    return this._value === other._value
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/value-object/ProgressStatus.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/value-object/ProgressStatus.ts src/domain/value-object/ProgressStatus.test.ts
git commit -m "feat: add ProgressStatus value object with transition rules"
```

---

## Task 8: Participant エンティティ

**Files:**
- Create: `src/domain/entity/Participant.ts`
- Test: `src/domain/entity/Participant.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/entity/Participant.test.ts
import { Participant } from './Participant'
import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

describe('Participant', () => {
  const createParticipant = (overrides?: {
    status?: EnrollmentStatus
    pairId?: string | null
  }) => {
    return Participant.create({
      id: 'participant-1',
      name: 'テスト太郎',
      email: Email.create('test@example.com'),
      status: overrides?.status ?? EnrollmentStatus.enrolled(),
      pairId: overrides?.pairId ?? null,
    })
  }

  it('参加者を生成できる', () => {
    const participant = createParticipant()
    expect(participant.id).toBe('participant-1')
    expect(participant.name).toBe('テスト太郎')
    expect(participant.email.value).toBe('test@example.com')
    expect(participant.status.isEnrolled()).toBe(true)
    expect(participant.pairId).toBeNull()
  })

  it('在籍ステータスを変更できる', () => {
    const participant = createParticipant()
    participant.changeStatus(EnrollmentStatus.onLeave())
    expect(participant.status.value).toBe('ON_LEAVE')
  })

  it('在籍中でない参加者にペアを割り当てるとエラーになる', () => {
    const participant = createParticipant({ status: EnrollmentStatus.onLeave() })
    expect(() => participant.assignToPair('pair-1')).toThrow(
      '在籍中でない参加者はペアに所属できません',
    )
  })

  it('在籍中の参加者にペアを割り当てられる', () => {
    const participant = createParticipant()
    participant.assignToPair('pair-1')
    expect(participant.pairId).toBe('pair-1')
  })

  it('ペアから離脱できる', () => {
    const participant = createParticipant({ pairId: 'pair-1' })
    participant.leavePair()
    expect(participant.pairId).toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/entity/Participant.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/entity/Participant.ts
import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

type ParticipantProps = {
  id: string
  name: string
  email: Email
  status: EnrollmentStatus
  pairId: string | null
}

export class Participant {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _email: Email,
    private _status: EnrollmentStatus,
    private _pairId: string | null,
  ) {}

  static create(props: ParticipantProps): Participant {
    return new Participant(props.id, props.name, props.email, props.status, props.pairId)
  }

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get email(): Email {
    return this._email
  }

  get status(): EnrollmentStatus {
    return this._status
  }

  get pairId(): string | null {
    return this._pairId
  }

  changeStatus(newStatus: EnrollmentStatus): void {
    this._status = newStatus
    if (!newStatus.isEnrolled()) {
      this._pairId = null
    }
  }

  assignToPair(pairId: string): void {
    if (!this._status.isEnrolled()) {
      throw new Error('在籍中でない参加者はペアに所属できません')
    }
    this._pairId = pairId
  }

  leavePair(): void {
    this._pairId = null
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/entity/Participant.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/entity/Participant.ts src/domain/entity/Participant.test.ts
git commit -m "feat: add Participant entity"
```

---

## Task 9: Pair エンティティ

**Files:**
- Create: `src/domain/entity/Pair.ts`
- Test: `src/domain/entity/Pair.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/entity/Pair.test.ts
import { Pair } from './Pair'
import { PairName } from '../value-object/PairName'

describe('Pair', () => {
  const createPair = (memberIds: string[] = ['p1', 'p2']) => {
    return Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds,
    })
  }

  it('2名のペアを生成できる', () => {
    const pair = createPair(['p1', 'p2'])
    expect(pair.memberIds).toEqual(['p1', 'p2'])
    expect(pair.memberCount).toBe(2)
  })

  it('3名のペアを生成できる', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(pair.memberCount).toBe(3)
  })

  it('1名のペアは生成できない', () => {
    expect(() => createPair(['p1'])).toThrow('ペアのメンバーは2〜3名でなければいけません')
  })

  it('4名のペアは生成できない', () => {
    expect(() => createPair(['p1', 'p2', 'p3', 'p4'])).toThrow(
      'ペアのメンバーは2〜3名でなければいけません',
    )
  })

  it('メンバーを追加できる', () => {
    const pair = createPair(['p1', 'p2'])
    pair.addMember('p3')
    expect(pair.memberIds).toContain('p3')
    expect(pair.memberCount).toBe(3)
  })

  it('4名以上にはできない', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(() => pair.addMember('p4')).toThrow()
  })

  it('メンバーを除外できる', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    pair.removeMember('p3')
    expect(pair.memberIds).not.toContain('p3')
    expect(pair.memberCount).toBe(2)
  })

  it('isFull は3名のとき true', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(pair.isFull()).toBe(true)
  })

  it('isFull は2名のとき false', () => {
    const pair = createPair(['p1', 'p2'])
    expect(pair.isFull()).toBe(false)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/entity/Pair.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/entity/Pair.ts
import { PairName } from '../value-object/PairName'

type PairProps = {
  id: string
  name: PairName
  teamId: string
  memberIds: string[]
}

export class Pair {
  private static readonly MIN_MEMBERS = 2
  private static readonly MAX_MEMBERS = 3

  private constructor(
    private readonly _id: string,
    private _name: PairName,
    private _teamId: string,
    private _memberIds: string[],
  ) {}

  static create(props: PairProps): Pair {
    if (
      props.memberIds.length < Pair.MIN_MEMBERS ||
      props.memberIds.length > Pair.MAX_MEMBERS
    ) {
      throw new Error('ペアのメンバーは2〜3名でなければいけません')
    }
    return new Pair(props.id, props.name, props.teamId, [...props.memberIds])
  }

  get id(): string {
    return this._id
  }

  get name(): PairName {
    return this._name
  }

  get teamId(): string {
    return this._teamId
  }

  get memberIds(): string[] {
    return [...this._memberIds]
  }

  get memberCount(): number {
    return this._memberIds.length
  }

  isFull(): boolean {
    return this._memberIds.length >= Pair.MAX_MEMBERS
  }

  addMember(participantId: string): void {
    if (this._memberIds.length >= Pair.MAX_MEMBERS) {
      throw new Error('ペアのメンバーは3名までです')
    }
    this._memberIds.push(participantId)
  }

  removeMember(participantId: string): void {
    this._memberIds = this._memberIds.filter((id) => id !== participantId)
  }

  hasMember(participantId: string): boolean {
    return this._memberIds.includes(participantId)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/entity/Pair.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/entity/Pair.ts src/domain/entity/Pair.test.ts
git commit -m "feat: add Pair entity with member constraints"
```

---

## Task 10: Team エンティティ

**Files:**
- Create: `src/domain/entity/Team.ts`
- Test: `src/domain/entity/Team.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/entity/Team.test.ts
import { Team } from './Team'
import { TeamName } from '../value-object/TeamName'
import { Pair } from './Pair'
import { PairName } from '../value-object/PairName'

const createPair = (id: string, name: string, teamId: string, memberIds: string[]) =>
  Pair.create({ id, name: PairName.create(name), teamId, memberIds })

describe('Team', () => {
  it('チームを生成できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [],
    })
    expect(team.id).toBe('team-1')
    expect(team.name.value).toBe('1')
  })

  it('全メンバー数を取得できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [
        createPair('p1', 'a', 'team-1', ['m1', 'm2']),
        createPair('p2', 'b', 'team-1', ['m3', 'm4', 'm5']),
      ],
    })
    expect(team.totalMemberCount).toBe(5)
  })

  it('最少人数のペアを取得できる', () => {
    const pair1 = createPair('p1', 'a', 'team-1', ['m1', 'm2'])
    const pair2 = createPair('p2', 'b', 'team-1', ['m3', 'm4', 'm5'])
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [pair1, pair2],
    })
    expect(team.findPairWithFewestMembers()?.id).toBe('p1')
  })

  it('ペアを追加できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [],
    })
    const pair = createPair('p1', 'a', 'team-1', ['m1', 'm2'])
    team.addPair(pair)
    expect(team.pairs).toHaveLength(1)
  })

  it('ペアを削除できる', () => {
    const pair = createPair('p1', 'a', 'team-1', ['m1', 'm2'])
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [pair],
    })
    team.removePair('p1')
    expect(team.pairs).toHaveLength(0)
  })

  it('チーム人数が2名以下かどうかを判定できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [createPair('p1', 'a', 'team-1', ['m1', 'm2'])],
    })
    expect(team.isUnderMinimumMembers()).toBe(true)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/entity/Team.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/entity/Team.ts
import { TeamName } from '../value-object/TeamName'
import { Pair } from './Pair'

type TeamProps = {
  id: string
  name: TeamName
  pairs: Pair[]
}

export class Team {
  private static readonly MIN_MEMBERS = 3

  private constructor(
    private readonly _id: string,
    private _name: TeamName,
    private _pairs: Pair[],
  ) {}

  static create(props: TeamProps): Team {
    return new Team(props.id, props.name, [...props.pairs])
  }

  get id(): string {
    return this._id
  }

  get name(): TeamName {
    return this._name
  }

  get pairs(): Pair[] {
    return [...this._pairs]
  }

  get totalMemberCount(): number {
    return this._pairs.reduce((sum, pair) => sum + pair.memberCount, 0)
  }

  isUnderMinimumMembers(): boolean {
    return this.totalMemberCount < Team.MIN_MEMBERS
  }

  findPairWithFewestMembers(): Pair | null {
    if (this._pairs.length === 0) return null
    const minCount = Math.min(...this._pairs.map((p) => p.memberCount))
    const candidates = this._pairs.filter((p) => p.memberCount === minCount)
    return candidates[Math.floor(Math.random() * candidates.length)]!
  }

  addPair(pair: Pair): void {
    this._pairs.push(pair)
  }

  removePair(pairId: string): void {
    this._pairs = this._pairs.filter((p) => p.id !== pairId)
  }

  getPairById(pairId: string): Pair | undefined {
    return this._pairs.find((p) => p.id === pairId)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/entity/Team.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/entity/Team.ts src/domain/entity/Team.test.ts
git commit -m "feat: add Team entity"
```

---

## Task 11: TaskProgress エンティティ

**Files:**
- Create: `src/domain/entity/TaskProgress.ts`
- Test: `src/domain/entity/TaskProgress.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/entity/TaskProgress.test.ts
import { TaskProgress } from './TaskProgress'
import { ProgressStatus } from '../value-object/ProgressStatus'

describe('TaskProgress', () => {
  const createTaskProgress = (overrides?: { status?: ProgressStatus }) => {
    return TaskProgress.create({
      id: 'tp-1',
      participantId: 'p-1',
      taskMasterId: 'tm-1',
      status: overrides?.status ?? ProgressStatus.notStarted(),
    })
  }

  it('課題進捗を生成できる', () => {
    const tp = createTaskProgress()
    expect(tp.id).toBe('tp-1')
    expect(tp.participantId).toBe('p-1')
    expect(tp.status.value).toBe('NOT_STARTED')
  })

  it('所有者がステータスを変更できる', () => {
    const tp = createTaskProgress()
    tp.changeStatus(ProgressStatus.awaitingReview(), 'p-1')
    expect(tp.status.value).toBe('AWAITING_REVIEW')
  })

  it('所有者以外はステータスを変更できない', () => {
    const tp = createTaskProgress()
    expect(() => tp.changeStatus(ProgressStatus.awaitingReview(), 'other-user')).toThrow(
      '課題の進捗ステータスを変更できるのは所有者のみです',
    )
  })

  it('完了からは他のステータスに変更できない', () => {
    const tp = createTaskProgress({ status: ProgressStatus.completed() })
    expect(() => tp.changeStatus(ProgressStatus.notStarted(), 'p-1')).toThrow(
      '完了した課題のステータスは変更できません',
    )
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/entity/TaskProgress.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/entity/TaskProgress.ts
import { ProgressStatus } from '../value-object/ProgressStatus'

type TaskProgressProps = {
  id: string
  participantId: string
  taskMasterId: string
  status: ProgressStatus
}

export class TaskProgress {
  private constructor(
    private readonly _id: string,
    private readonly _participantId: string,
    private readonly _taskMasterId: string,
    private _status: ProgressStatus,
  ) {}

  static create(props: TaskProgressProps): TaskProgress {
    return new TaskProgress(props.id, props.participantId, props.taskMasterId, props.status)
  }

  get id(): string {
    return this._id
  }

  get participantId(): string {
    return this._participantId
  }

  get taskMasterId(): string {
    return this._taskMasterId
  }

  get status(): ProgressStatus {
    return this._status
  }

  changeStatus(newStatus: ProgressStatus, operatorId: string): void {
    if (this._participantId !== operatorId) {
      throw new Error('課題の進捗ステータスを変更できるのは所有者のみです')
    }
    this._status.canTransitionTo(newStatus)
    this._status = newStatus
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/entity/TaskProgress.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/entity/TaskProgress.ts src/domain/entity/TaskProgress.test.ts
git commit -m "feat: add TaskProgress entity with ownership check"
```

---

## Task 12: リポジトリ・サービスインターフェース

**Files:**
- Create: `src/domain/interface/IParticipantRepository.ts`
- Create: `src/domain/interface/ITeamRepository.ts`
- Create: `src/domain/interface/IPairRepository.ts`
- Create: `src/domain/interface/ITaskProgressRepository.ts`
- Create: `src/domain/interface/IMailSender.ts`
- Create: `src/domain/interface/IParticipantTaskQueryService.ts`

- [ ] **Step 1: IParticipantRepository を作成**

```typescript
// src/domain/interface/IParticipantRepository.ts
import { Participant } from '../entity/Participant'

export interface IParticipantRepository {
  findById(id: string): Promise<Participant | null>
  findByEmail(email: string): Promise<Participant | null>
  findAll(): Promise<Participant[]>
  save(participant: Participant): Promise<void>
}
```

- [ ] **Step 2: ITeamRepository を作成**

```typescript
// src/domain/interface/ITeamRepository.ts
import { Team } from '../entity/Team'

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>
  findAll(): Promise<Team[]>
  findWithFewestMembers(): Promise<Team | null>
  save(team: Team): Promise<void>
}
```

- [ ] **Step 3: IPairRepository を作成**

```typescript
// src/domain/interface/IPairRepository.ts
import { Pair } from '../entity/Pair'

export interface IPairRepository {
  findById(id: string): Promise<Pair | null>
  findByTeamId(teamId: string): Promise<Pair[]>
  save(pair: Pair): Promise<void>
  delete(id: string): Promise<void>
}
```

- [ ] **Step 4: ITaskProgressRepository を作成**

```typescript
// src/domain/interface/ITaskProgressRepository.ts
import { TaskProgress } from '../entity/TaskProgress'

export interface ITaskProgressRepository {
  findById(id: string): Promise<TaskProgress | null>
  findByParticipantId(participantId: string): Promise<TaskProgress[]>
  save(taskProgress: TaskProgress): Promise<void>
  bulkCreate(taskProgresses: TaskProgress[]): Promise<void>
}
```

- [ ] **Step 5: IMailSender を作成**

```typescript
// src/domain/interface/IMailSender.ts
export interface IMailSender {
  send(to: string, subject: string, body: string): Promise<void>
}
```

- [ ] **Step 6: IParticipantTaskQueryService を作成**

```typescript
// src/domain/interface/IParticipantTaskQueryService.ts
export type ParticipantTaskDTO = {
  id: string
  name: string
  email: string
}

export type PaginatedResult<T> = {
  data: T[]
  totalCount: number
  page: number
  perPage: number
}

export interface IParticipantTaskQueryService {
  findByTaskProgress(
    taskMasterIds: string[],
    progressStatus: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ParticipantTaskDTO>>
}
```

- [ ] **Step 7: コミット**

```bash
git add src/domain/interface/
git commit -m "feat: add repository and service interfaces"
```

---

## Task 13: ParticipantTransferService ドメインサービス

**Files:**
- Create: `src/domain/domain-service/ParticipantTransferService.ts`
- Test: `src/domain/domain-service/ParticipantTransferService.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/domain/domain-service/ParticipantTransferService.test.ts
import { ParticipantTransferService } from './ParticipantTransferService'
import { Team } from '../entity/Team'
import { Pair } from '../entity/Pair'
import { Participant } from '../entity/Participant'
import { TeamName } from '../value-object/TeamName'
import { PairName } from '../value-object/PairName'
import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

const createParticipant = (id: string, pairId: string | null = null) =>
  Participant.create({
    id,
    name: `参加者${id}`,
    email: Email.create(`${id}@example.com`),
    status: EnrollmentStatus.enrolled(),
    pairId,
  })

const createPair = (id: string, name: string, teamId: string, memberIds: string[]) =>
  Pair.create({ id, name: PairName.create(name), teamId, memberIds })

const createTeam = (id: string, name: string, pairs: Pair[]) =>
  Team.create({ id, name: TeamName.create(name), pairs })

describe('ParticipantTransferService', () => {
  let service: ParticipantTransferService
  let sentMails: { to: string; subject: string; body: string }[]

  beforeEach(() => {
    sentMails = []
    const mockMailSender = {
      send: async (to: string, subject: string, body: string) => {
        sentMails.push({ to, subject, body })
      },
    }
    service = new ParticipantTransferService(mockMailSender, 'admin@example.com')
  })

  describe('removeParticipantFromPair', () => {
    it('3名ペアから1名減っても再編成は不要', async () => {
      const pair = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair])

      const result = await service.removeParticipantFromPair('m3', team)

      expect(result.updatedTeam.pairs[0]!.memberCount).toBe(2)
      expect(result.removedPairId).toBeNull()
    })

    it('2名ペアから1名減ると残りの1名が他ペアに合流する', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const pair2 = createPair('p2', 'b', 't1', ['m3', 'm4'])
      const team = createTeam('t1', '1', [pair1, pair2])

      const result = await service.removeParticipantFromPair('m1', team)

      // pair1が削除され、m2がpair2に合流
      expect(result.removedPairId).toBe('p1')
      const remainingPair = result.updatedTeam.pairs.find((p) => p.id === 'p2')
      expect(remainingPair!.memberCount).toBe(3)
      expect(remainingPair!.hasMember('m2')).toBe(true)
    })

    it('合流先がない場合は管理者にメール通知', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const team = createTeam('t1', '1', [pair1])

      await service.removeParticipantFromPair('m1', team)

      expect(sentMails).toHaveLength(1)
      expect(sentMails[0]!.to).toBe('admin@example.com')
      expect(sentMails[0]!.body).toContain('m2')
    })

    it('チームが2名以下になったら管理者にメール通知', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair1])

      await service.removeParticipantFromPair('m3', team)

      expect(sentMails).toHaveLength(1)
      expect(sentMails[0]!.body).toContain('t1')
    })
  })

  describe('assignParticipantToPair', () => {
    it('最少人数のペアに配置される', () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const pair2 = createPair('p2', 'b', 't1', ['m3', 'm4', 'm5'])
      const team = createTeam('t1', '1', [pair1, pair2])

      const result = service.assignParticipantToPair('new-member', team)

      expect(result.assignedPairId).toBe('p1')
    })

    it('ペアが4名になったら自動分割される', () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair1])

      const result = service.assignParticipantToPair('m4', team)

      expect(result.updatedTeam.pairs).toHaveLength(2)
      result.updatedTeam.pairs.forEach((pair) => {
        expect(pair.memberCount).toBeGreaterThanOrEqual(2)
        expect(pair.memberCount).toBeLessThanOrEqual(3)
      })
    })
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/domain/domain-service/ParticipantTransferService.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/domain/domain-service/ParticipantTransferService.ts
import { Team } from '../entity/Team'
import { Pair } from '../entity/Pair'
import { PairName } from '../value-object/PairName'
import { IMailSender } from '../interface/IMailSender'
import { v4 as uuidv4 } from 'uuid'

type RemoveResult = {
  updatedTeam: Team
  removedPairId: string | null
  relocatedMemberId: string | null
}

type AssignResult = {
  updatedTeam: Team
  assignedPairId: string
  newPair: Pair | null
}

export class ParticipantTransferService {
  constructor(
    private readonly mailSender: IMailSender,
    private readonly adminEmail: string,
  ) {}

  async removeParticipantFromPair(
    participantId: string,
    team: Team,
  ): Promise<RemoveResult> {
    const pair = team.pairs.find((p) => p.hasMember(participantId))
    if (!pair) {
      throw new Error(`参加者${participantId}はこのチームのどのペアにも所属していません`)
    }

    pair.removeMember(participantId)

    let removedPairId: string | null = null
    let relocatedMemberId: string | null = null

    // ペアが1名になった場合の処理
    if (pair.memberCount === 1) {
      const remainingMemberId = pair.memberIds[0]!
      const otherPairs = team.pairs.filter((p) => p.id !== pair.id)

      if (otherPairs.length === 0) {
        // 合流先がない
        await this.mailSender.send(
          this.adminEmail,
          'ペア合流先がありません',
          `参加者${participantId}が減ったことにより、参加者${remainingMemberId}の合流先がありません。チーム${team.id}で対応が必要です。`,
        )
      } else {
        // 最少人数のペアに合流
        const minCount = Math.min(...otherPairs.map((p) => p.memberCount))
        const candidates = otherPairs.filter((p) => p.memberCount === minCount)
        const targetPair = candidates[Math.floor(Math.random() * candidates.length)]!
        targetPair.addMember(remainingMemberId)
        relocatedMemberId = remainingMemberId
      }

      // 元のペアを削除
      team.removePair(pair.id)
      removedPairId = pair.id
    }

    // チームが2名以下になったら通知
    if (team.isUnderMinimumMembers()) {
      const memberNames = team.pairs
        .flatMap((p) => p.memberIds)
        .join(', ')
      await this.mailSender.send(
        this.adminEmail,
        'チームが2名以下になりました',
        `参加者${participantId}が減ったことにより、チーム${team.name.value}が${team.totalMemberCount}名になりました。現在の参加者: ${memberNames}`,
      )
    }

    return { updatedTeam: team, removedPairId, relocatedMemberId }
  }

  assignParticipantToPair(
    participantId: string,
    team: Team,
  ): AssignResult {
    const targetPair = team.findPairWithFewestMembers()
    if (!targetPair) {
      throw new Error('チームにペアがありません')
    }

    targetPair.addMember(participantId)

    let newPair: Pair | null = null

    // 4名になったら分割
    if (targetPair.memberCount > 3) {
      const members = targetPair.memberIds
      targetPair.removeMember(members[2]!)
      targetPair.removeMember(members[3]!)

      const existingNames = team.pairs.map((p) => p.name.value)
      const nextName = 'abcdefghijklmnopqrstuvwxyz'
        .split('')
        .find((c) => !existingNames.includes(c))
      if (!nextName) {
        throw new Error('利用可能なペア名がありません')
      }

      newPair = Pair.create({
        id: uuidv4(),
        name: PairName.create(nextName),
        teamId: team.id,
        memberIds: [members[2]!, members[3]!],
      })
      team.addPair(newPair)
    }

    return { updatedTeam: team, assignedPairId: targetPair.id, newPair }
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/domain/domain-service/ParticipantTransferService.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/domain/domain-service/ParticipantTransferService.ts src/domain/domain-service/ParticipantTransferService.test.ts
git commit -m "feat: add ParticipantTransferService with pair reorganization logic"
```

---

## Task 14: UpdateTaskProgressUseCase

**Files:**
- Create: `src/app/task/UpdateTaskProgressUseCase.ts`
- Test: `src/app/task/UpdateTaskProgressUseCase.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/app/task/UpdateTaskProgressUseCase.test.ts
import { UpdateTaskProgressUseCase } from './UpdateTaskProgressUseCase'
import { TaskProgress } from '../../domain/entity/TaskProgress'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'

describe('UpdateTaskProgressUseCase', () => {
  const createMockRepo = (taskProgress: TaskProgress | null): ITaskProgressRepository => ({
    findById: jest.fn().mockResolvedValue(taskProgress),
    findByParticipantId: jest.fn(),
    save: jest.fn(),
    bulkCreate: jest.fn(),
  })

  it('所有者が進捗ステータスを変更できる', async () => {
    const tp = TaskProgress.create({
      id: 'tp-1',
      participantId: 'p-1',
      taskMasterId: 'tm-1',
      status: ProgressStatus.notStarted(),
    })
    const repo = createMockRepo(tp)
    const useCase = new UpdateTaskProgressUseCase(repo)

    await useCase.execute({
      taskProgressId: 'tp-1',
      operatorId: 'p-1',
      newStatus: 'AWAITING_REVIEW',
    })

    expect(repo.save).toHaveBeenCalledWith(tp)
    expect(tp.status.value).toBe('AWAITING_REVIEW')
  })

  it('課題進捗が見つからない場合エラー', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateTaskProgressUseCase(repo)

    await expect(
      useCase.execute({
        taskProgressId: 'not-found',
        operatorId: 'p-1',
        newStatus: 'AWAITING_REVIEW',
      }),
    ).rejects.toThrow('課題進捗が見つかりません')
  })

  it('所有者以外が変更するとエラー', async () => {
    const tp = TaskProgress.create({
      id: 'tp-1',
      participantId: 'p-1',
      taskMasterId: 'tm-1',
      status: ProgressStatus.notStarted(),
    })
    const repo = createMockRepo(tp)
    const useCase = new UpdateTaskProgressUseCase(repo)

    await expect(
      useCase.execute({
        taskProgressId: 'tp-1',
        operatorId: 'other-user',
        newStatus: 'AWAITING_REVIEW',
      }),
    ).rejects.toThrow('課題の進捗ステータスを変更できるのは所有者のみです')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/app/task/UpdateTaskProgressUseCase.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/app/task/UpdateTaskProgressUseCase.ts
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'

type UpdateTaskProgressInput = {
  taskProgressId: string
  operatorId: string
  newStatus: string
}

export class UpdateTaskProgressUseCase {
  constructor(private readonly taskProgressRepo: ITaskProgressRepository) {}

  async execute(input: UpdateTaskProgressInput): Promise<void> {
    const taskProgress = await this.taskProgressRepo.findById(input.taskProgressId)
    if (!taskProgress) {
      throw new Error('課題進捗が見つかりません')
    }

    const newStatus = ProgressStatus.fromString(input.newStatus)
    taskProgress.changeStatus(newStatus, input.operatorId)
    await this.taskProgressRepo.save(taskProgress)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/app/task/UpdateTaskProgressUseCase.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/task/
git commit -m "feat: add UpdateTaskProgressUseCase"
```

---

## Task 15: CreateParticipantUseCase

**Files:**
- Create: `src/app/participant/CreateParticipantUseCase.ts`
- Test: `src/app/participant/CreateParticipantUseCase.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/app/participant/CreateParticipantUseCase.test.ts
import { CreateParticipantUseCase } from './CreateParticipantUseCase'
import { Participant } from '../../domain/entity/Participant'
import { Team } from '../../domain/entity/Team'
import { Pair } from '../../domain/entity/Pair'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { TeamName } from '../../domain/value-object/TeamName'
import { PairName } from '../../domain/value-object/PairName'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'

describe('CreateParticipantUseCase', () => {
  const createTeamWithPair = () => {
    const pair = Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds: ['existing-1', 'existing-2'],
    })
    return Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [pair],
    })
  }

  const taskMasterIds = ['tm-1', 'tm-2']

  const createMocks = (team: Team) => {
    const participantRepo: IParticipantRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      save: jest.fn(),
    }
    const teamRepo: ITeamRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findWithFewestMembers: jest.fn().mockResolvedValue(team),
      save: jest.fn(),
    }
    const pairRepo: IPairRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const taskProgressRepo: ITaskProgressRepository = {
      findById: jest.fn(),
      findByParticipantId: jest.fn(),
      save: jest.fn(),
      bulkCreate: jest.fn(),
    }
    return { participantRepo, teamRepo, pairRepo, taskProgressRepo }
  }

  it('参加者を新規作成し、チーム・ペアに配置し、全課題の進捗を作成する', async () => {
    const team = createTeamWithPair()
    const mocks = createMocks(team)
    const useCase = new CreateParticipantUseCase(
      mocks.participantRepo,
      mocks.teamRepo,
      mocks.pairRepo,
      mocks.taskProgressRepo,
      taskMasterIds,
    )

    await useCase.execute({ name: 'テスト太郎', email: 'test@example.com' })

    expect(mocks.participantRepo.save).toHaveBeenCalled()
    expect(mocks.taskProgressRepo.bulkCreate).toHaveBeenCalled()
    const bulkCreateArg = (mocks.taskProgressRepo.bulkCreate as jest.Mock).mock.calls[0][0]
    expect(bulkCreateArg).toHaveLength(2) // 課題マスタ2件分
    expect(mocks.pairRepo.save).toHaveBeenCalled()
  })

  it('メールアドレスが重複している場合エラー', async () => {
    const team = createTeamWithPair()
    const mocks = createMocks(team)
    const existing = Participant.create({
      id: 'existing',
      name: '既存ユーザー',
      email: Email.create('test@example.com'),
      status: EnrollmentStatus.enrolled(),
      pairId: null,
    })
    ;(mocks.participantRepo.findByEmail as jest.Mock).mockResolvedValue(existing)

    const useCase = new CreateParticipantUseCase(
      mocks.participantRepo,
      mocks.teamRepo,
      mocks.pairRepo,
      mocks.taskProgressRepo,
      taskMasterIds,
    )

    await expect(
      useCase.execute({ name: 'テスト太郎', email: 'test@example.com' }),
    ).rejects.toThrow('このメールアドレスは既に使用されています')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/app/participant/CreateParticipantUseCase.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/app/participant/CreateParticipantUseCase.ts
import { Participant } from '../../domain/entity/Participant'
import { TaskProgress } from '../../domain/entity/TaskProgress'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'
import { ParticipantTransferService } from '../../domain/domain-service/ParticipantTransferService'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'
import { v4 as uuidv4 } from 'uuid'

type CreateParticipantInput = {
  name: string
  email: string
}

export class CreateParticipantUseCase {
  constructor(
    private readonly participantRepo: IParticipantRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
    private readonly taskProgressRepo: ITaskProgressRepository,
    private readonly taskMasterIds: string[],
  ) {}

  async execute(input: CreateParticipantInput): Promise<void> {
    const email = Email.create(input.email)

    const existing = await this.participantRepo.findByEmail(email.value)
    if (existing) {
      throw new Error('このメールアドレスは既に使用されています')
    }

    const participantId = uuidv4()
    const participant = Participant.create({
      id: participantId,
      name: input.name,
      email,
      status: EnrollmentStatus.enrolled(),
      pairId: null,
    })

    // 最少人数のチームを取得し、ペアに配置
    const team = await this.teamRepo.findWithFewestMembers()
    if (!team) {
      throw new Error('配置可能なチームがありません')
    }

    const transferService = new ParticipantTransferService(
      { send: async () => {} }, // 新規作成時はメール不要
      '',
    )
    const result = transferService.assignParticipantToPair(participantId, team)
    participant.assignToPair(result.assignedPairId)

    // 保存
    await this.participantRepo.save(participant)
    await this.teamRepo.save(result.updatedTeam)

    // 対象ペアを保存
    const assignedPair = result.updatedTeam.pairs.find((p) => p.id === result.assignedPairId)
    if (assignedPair) {
      await this.pairRepo.save(assignedPair)
    }
    if (result.newPair) {
      await this.pairRepo.save(result.newPair)
    }

    // 全課題の進捗を作成
    const taskProgresses = this.taskMasterIds.map((taskMasterId) =>
      TaskProgress.create({
        id: uuidv4(),
        participantId,
        taskMasterId,
        status: ProgressStatus.notStarted(),
      }),
    )
    await this.taskProgressRepo.bulkCreate(taskProgresses)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/app/participant/CreateParticipantUseCase.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/participant/CreateParticipantUseCase.ts src/app/participant/CreateParticipantUseCase.test.ts
git commit -m "feat: add CreateParticipantUseCase"
```

---

## Task 16: UpdateParticipantStatusUseCase

**Files:**
- Create: `src/app/participant/UpdateParticipantStatusUseCase.ts`
- Test: `src/app/participant/UpdateParticipantStatusUseCase.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/app/participant/UpdateParticipantStatusUseCase.test.ts
import { UpdateParticipantStatusUseCase } from './UpdateParticipantStatusUseCase'
import { Participant } from '../../domain/entity/Participant'
import { Team } from '../../domain/entity/Team'
import { Pair } from '../../domain/entity/Pair'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { TeamName } from '../../domain/value-object/TeamName'
import { PairName } from '../../domain/value-object/PairName'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IMailSender } from '../../domain/interface/IMailSender'

describe('UpdateParticipantStatusUseCase', () => {
  const createParticipant = (pairId: string) =>
    Participant.create({
      id: 'p-1',
      name: 'テスト太郎',
      email: Email.create('test@example.com'),
      status: EnrollmentStatus.enrolled(),
      pairId,
    })

  const createTeamWithPairs = () => {
    const pair1 = Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds: ['p-1', 'p-2', 'p-3'],
    })
    const pair2 = Pair.create({
      id: 'pair-2',
      name: PairName.create('b'),
      teamId: 'team-1',
      memberIds: ['p-4', 'p-5'],
    })
    return Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [pair1, pair2],
    })
  }

  const createMocks = (participant: Participant, team: Team) => {
    const participantRepo: IParticipantRepository = {
      findById: jest.fn().mockResolvedValue(participant),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    }
    const teamRepo: ITeamRepository = {
      findById: jest.fn().mockResolvedValue(team),
      findAll: jest.fn().mockResolvedValue([team]),
      findWithFewestMembers: jest.fn().mockResolvedValue(team),
      save: jest.fn(),
    }
    const pairRepo: IPairRepository = {
      findById: jest.fn().mockResolvedValue(team.pairs[0]),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const mailSender: IMailSender = {
      send: jest.fn(),
    }
    return { participantRepo, teamRepo, pairRepo, mailSender }
  }

  it('休会に変更するとペアから離脱する', async () => {
    const participant = createParticipant('pair-1')
    const team = createTeamWithPairs()
    const mocks = createMocks(participant, team)

    const useCase = new UpdateParticipantStatusUseCase(
      mocks.participantRepo,
      mocks.teamRepo,
      mocks.pairRepo,
      mocks.mailSender,
      'admin@example.com',
    )

    await useCase.execute({ participantId: 'p-1', newStatus: 'ON_LEAVE' })

    expect(participant.status.value).toBe('ON_LEAVE')
    expect(participant.pairId).toBeNull()
    expect(mocks.participantRepo.save).toHaveBeenCalled()
  })

  it('参加者が見つからない場合エラー', async () => {
    const team = createTeamWithPairs()
    const mocks = createMocks(null as any, team)
    ;(mocks.participantRepo.findById as jest.Mock).mockResolvedValue(null)

    const useCase = new UpdateParticipantStatusUseCase(
      mocks.participantRepo,
      mocks.teamRepo,
      mocks.pairRepo,
      mocks.mailSender,
      'admin@example.com',
    )

    await expect(
      useCase.execute({ participantId: 'not-found', newStatus: 'ON_LEAVE' }),
    ).rejects.toThrow('参加者が見つかりません')
  })

  it('休会中から在籍中に復帰するとペアに自動配置される', async () => {
    const participant = Participant.create({
      id: 'p-1',
      name: 'テスト太郎',
      email: Email.create('test@example.com'),
      status: EnrollmentStatus.onLeave(),
      pairId: null,
    })
    const team = createTeamWithPairs()
    const mocks = createMocks(participant, team)

    const useCase = new UpdateParticipantStatusUseCase(
      mocks.participantRepo,
      mocks.teamRepo,
      mocks.pairRepo,
      mocks.mailSender,
      'admin@example.com',
    )

    await useCase.execute({ participantId: 'p-1', newStatus: 'ENROLLED' })

    expect(participant.status.isEnrolled()).toBe(true)
    expect(participant.pairId).not.toBeNull()
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/app/participant/UpdateParticipantStatusUseCase.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/app/participant/UpdateParticipantStatusUseCase.ts
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { ParticipantTransferService } from '../../domain/domain-service/ParticipantTransferService'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IMailSender } from '../../domain/interface/IMailSender'

type UpdateParticipantStatusInput = {
  participantId: string
  newStatus: string
}

export class UpdateParticipantStatusUseCase {
  constructor(
    private readonly participantRepo: IParticipantRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
    private readonly mailSender: IMailSender,
    private readonly adminEmail: string,
  ) {}

  async execute(input: UpdateParticipantStatusInput): Promise<void> {
    const participant = await this.participantRepo.findById(input.participantId)
    if (!participant) {
      throw new Error('参加者が見つかりません')
    }

    const newStatus = EnrollmentStatus.fromString(input.newStatus)
    const wasEnrolled = participant.status.isEnrolled()
    const willBeEnrolled = newStatus.isEnrolled()

    // changeStatusでpairIdがnullになるので先に保持
    const oldPairId = participant.pairId

    participant.changeStatus(newStatus)

    // 在籍中 → 非在籍（休会・退会）: ペアから離脱
    if (wasEnrolled && !willBeEnrolled && oldPairId) {
      const pair = await this.pairRepo.findById(oldPairId)
      if (pair) {
        const team = await this.teamRepo.findById(pair.teamId)
        if (team) {
          const transferService = new ParticipantTransferService(
            this.mailSender,
            this.adminEmail,
          )
          const result = await transferService.removeParticipantFromPair(
            input.participantId,
            team,
          )

          await this.teamRepo.save(result.updatedTeam)
          if (result.removedPairId) {
            await this.pairRepo.delete(result.removedPairId)
          }
          // 合流先のペアを保存
          if (result.relocatedMemberId) {
            for (const p of result.updatedTeam.pairs) {
              if (p.hasMember(result.relocatedMemberId)) {
                await this.pairRepo.save(p)
                // 合流した参加者のpairIdを更新
                const relocatedParticipant = await this.participantRepo.findById(
                  result.relocatedMemberId,
                )
                if (relocatedParticipant) {
                  relocatedParticipant.assignToPair(p.id)
                  await this.participantRepo.save(relocatedParticipant)
                }
                break
              }
            }
          }
        }
      }
    }

    // 非在籍 → 在籍中（復帰）: ペアに自動配置
    if (!wasEnrolled && willBeEnrolled) {
      const team = await this.teamRepo.findWithFewestMembers()
      if (team) {
        const transferService = new ParticipantTransferService(
          this.mailSender,
          this.adminEmail,
        )
        const result = transferService.assignParticipantToPair(input.participantId, team)
        participant.assignToPair(result.assignedPairId)

        await this.teamRepo.save(result.updatedTeam)
        const assignedPair = result.updatedTeam.pairs.find(
          (p) => p.id === result.assignedPairId,
        )
        if (assignedPair) {
          await this.pairRepo.save(assignedPair)
        }
        if (result.newPair) {
          await this.pairRepo.save(result.newPair)
        }
      }
    }

    await this.participantRepo.save(participant)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/app/participant/UpdateParticipantStatusUseCase.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/participant/UpdateParticipantStatusUseCase.ts src/app/participant/UpdateParticipantStatusUseCase.test.ts
git commit -m "feat: add UpdateParticipantStatusUseCase with pair reorganization"
```

---

## Task 17: UpdatePairMembersUseCase

**Files:**
- Create: `src/app/pair/UpdatePairMembersUseCase.ts`
- Test: `src/app/pair/UpdatePairMembersUseCase.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/app/pair/UpdatePairMembersUseCase.test.ts
import { UpdatePairMembersUseCase } from './UpdatePairMembersUseCase'
import { Pair } from '../../domain/entity/Pair'
import { PairName } from '../../domain/value-object/PairName'
import { Participant } from '../../domain/entity/Participant'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

describe('UpdatePairMembersUseCase', () => {
  const createPair = () =>
    Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds: ['p-1', 'p-2'],
    })

  const createParticipant = (id: string) =>
    Participant.create({
      id,
      name: `参加者${id}`,
      email: Email.create(`${id}@example.com`),
      status: EnrollmentStatus.enrolled(),
      pairId: null,
    })

  it('ペアのメンバーを変更できる', async () => {
    const pair = createPair()
    const pairRepo: IPairRepository = {
      findById: jest.fn().mockResolvedValue(pair),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const participantRepo: IParticipantRepository = {
      findById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve(createParticipant(id)),
      ),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    }
    const useCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)

    await useCase.execute({ pairId: 'pair-1', memberIds: ['p-3', 'p-4', 'p-5'] })

    expect(pairRepo.save).toHaveBeenCalled()
  })

  it('ペアが見つからない場合エラー', async () => {
    const pairRepo: IPairRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const participantRepo: IParticipantRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
    }
    const useCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)

    await expect(
      useCase.execute({ pairId: 'not-found', memberIds: ['p-1', 'p-2'] }),
    ).rejects.toThrow('ペアが見つかりません')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/app/pair/UpdatePairMembersUseCase.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/app/pair/UpdatePairMembersUseCase.ts
import { Pair } from '../../domain/entity/Pair'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

type UpdatePairMembersInput = {
  pairId: string
  memberIds: string[]
}

export class UpdatePairMembersUseCase {
  constructor(
    private readonly pairRepo: IPairRepository,
    private readonly participantRepo: IParticipantRepository,
  ) {}

  async execute(input: UpdatePairMembersInput): Promise<void> {
    const pair = await this.pairRepo.findById(input.pairId)
    if (!pair) {
      throw new Error('ペアが見つかりません')
    }

    // 新しいペアを再構築（バリデーション込み）
    const newPair = Pair.create({
      id: pair.id,
      name: pair.name,
      teamId: pair.teamId,
      memberIds: input.memberIds,
    })

    // 各参加者のpairIdを更新
    // 旧メンバーのpairIdをクリア
    for (const oldMemberId of pair.memberIds) {
      if (!input.memberIds.includes(oldMemberId)) {
        const participant = await this.participantRepo.findById(oldMemberId)
        if (participant) {
          participant.leavePair()
          await this.participantRepo.save(participant)
        }
      }
    }
    // 新メンバーのpairIdをセット
    for (const newMemberId of input.memberIds) {
      const participant = await this.participantRepo.findById(newMemberId)
      if (participant) {
        participant.assignToPair(newPair.id)
        await this.participantRepo.save(participant)
      }
    }

    await this.pairRepo.save(newPair)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/app/pair/UpdatePairMembersUseCase.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/pair/
git commit -m "feat: add UpdatePairMembersUseCase"
```

---

## Task 18: UpdateTeamPairsUseCase

**Files:**
- Create: `src/app/team/UpdateTeamPairsUseCase.ts`
- Test: `src/app/team/UpdateTeamPairsUseCase.test.ts`

- [ ] **Step 1: テストを書く**

```typescript
// src/app/team/UpdateTeamPairsUseCase.test.ts
import { UpdateTeamPairsUseCase } from './UpdateTeamPairsUseCase'
import { Team } from '../../domain/entity/Team'
import { Pair } from '../../domain/entity/Pair'
import { TeamName } from '../../domain/value-object/TeamName'
import { PairName } from '../../domain/value-object/PairName'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'

describe('UpdateTeamPairsUseCase', () => {
  it('チームのペアを変更できる', async () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [],
    })
    const pair = Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds: ['p-1', 'p-2'],
    })
    const teamRepo: ITeamRepository = {
      findById: jest.fn().mockResolvedValue(team),
      findAll: jest.fn(),
      findWithFewestMembers: jest.fn(),
      save: jest.fn(),
    }
    const pairRepo: IPairRepository = {
      findById: jest.fn().mockResolvedValue(pair),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const useCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)

    await useCase.execute({ teamId: 'team-1', pairIds: ['pair-1'] })

    expect(teamRepo.save).toHaveBeenCalled()
  })

  it('チームが見つからない場合エラー', async () => {
    const teamRepo: ITeamRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findWithFewestMembers: jest.fn(),
      save: jest.fn(),
    }
    const pairRepo: IPairRepository = {
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    }
    const useCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)

    await expect(
      useCase.execute({ teamId: 'not-found', pairIds: [] }),
    ).rejects.toThrow('チームが見つかりません')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest src/app/team/UpdateTeamPairsUseCase.test.ts
```

Expected: FAIL

- [ ] **Step 3: 実装を書く**

```typescript
// src/app/team/UpdateTeamPairsUseCase.ts
import { Team } from '../../domain/entity/Team'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'

type UpdateTeamPairsInput = {
  teamId: string
  pairIds: string[]
}

export class UpdateTeamPairsUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
  ) {}

  async execute(input: UpdateTeamPairsInput): Promise<void> {
    const team = await this.teamRepo.findById(input.teamId)
    if (!team) {
      throw new Error('チームが見つかりません')
    }

    const pairs = await Promise.all(
      input.pairIds.map(async (pairId) => {
        const pair = await this.pairRepo.findById(pairId)
        if (!pair) {
          throw new Error(`ペアが見つかりません: ${pairId}`)
        }
        return pair
      }),
    )

    const newTeam = Team.create({
      id: team.id,
      name: team.name,
      pairs,
    })

    await this.teamRepo.save(newTeam)
  }
}
```

- [ ] **Step 4: テストが成功することを確認**

```bash
npx jest src/app/team/UpdateTeamPairsUseCase.test.ts
```

Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/team/
git commit -m "feat: add UpdateTeamPairsUseCase"
```

---

## Task 19: Get系ユースケース

**Files:**
- Create: `src/app/participant/GetParticipantsUseCase.ts`
- Create: `src/app/pair/GetPairsUseCase.ts`
- Create: `src/app/team/GetTeamsUseCase.ts`

- [ ] **Step 1: GetParticipantsUseCase を作成**

```typescript
// src/app/participant/GetParticipantsUseCase.ts
import { Participant } from '../../domain/entity/Participant'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

export class GetParticipantsUseCase {
  constructor(private readonly participantRepo: IParticipantRepository) {}

  async execute(): Promise<Participant[]> {
    return this.participantRepo.findAll()
  }
}
```

- [ ] **Step 2: GetPairsUseCase を作成**

```typescript
// src/app/pair/GetPairsUseCase.ts
import { Pair } from '../../domain/entity/Pair'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'

export type PairWithTeam = {
  pair: Pair
  teamId: string
}

export class GetPairsUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
  ) {}

  async execute(): Promise<PairWithTeam[]> {
    const teams = await this.teamRepo.findAll()
    return teams.flatMap((team) =>
      team.pairs.map((pair) => ({ pair, teamId: team.id })),
    )
  }
}
```

- [ ] **Step 3: GetTeamsUseCase を作成**

```typescript
// src/app/team/GetTeamsUseCase.ts
import { Team } from '../../domain/entity/Team'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'

export class GetTeamsUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}

  async execute(): Promise<Team[]> {
    return this.teamRepo.findAll()
  }
}
```

- [ ] **Step 4: コミット**

```bash
git add src/app/participant/GetParticipantsUseCase.ts src/app/pair/GetPairsUseCase.ts src/app/team/GetTeamsUseCase.ts
git commit -m "feat: add Get use cases for participants, pairs, teams"
```

---

## Task 20: Prisma リポジトリ実装

**Files:**
- Create: `src/infra/db/repository/PrismaParticipantRepository.ts`
- Create: `src/infra/db/repository/PrismaTeamRepository.ts`
- Create: `src/infra/db/repository/PrismaPairRepository.ts`
- Create: `src/infra/db/repository/PrismaTaskProgressRepository.ts`

- [ ] **Step 1: PrismaParticipantRepository を作成**

```typescript
// src/infra/db/repository/PrismaParticipantRepository.ts
import { PrismaClient } from '@prisma/client'
import { Participant } from '../../../domain/entity/Participant'
import { Email } from '../../../domain/value-object/Email'
import { EnrollmentStatus } from '../../../domain/value-object/EnrollmentStatus'
import { IParticipantRepository } from '../../../domain/interface/IParticipantRepository'

export class PrismaParticipantRepository implements IParticipantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Participant | null> {
    const data = await this.prisma.participant.findUnique({ where: { id } })
    if (!data) return null
    return Participant.create({
      id: data.id,
      name: data.name,
      email: Email.create(data.email),
      status: EnrollmentStatus.fromString(data.enrollmentStatus),
      pairId: data.pairId,
    })
  }

  async findByEmail(email: string): Promise<Participant | null> {
    const data = await this.prisma.participant.findUnique({ where: { email } })
    if (!data) return null
    return Participant.create({
      id: data.id,
      name: data.name,
      email: Email.create(data.email),
      status: EnrollmentStatus.fromString(data.enrollmentStatus),
      pairId: data.pairId,
    })
  }

  async findAll(): Promise<Participant[]> {
    const dataList = await this.prisma.participant.findMany()
    return dataList.map((data) =>
      Participant.create({
        id: data.id,
        name: data.name,
        email: Email.create(data.email),
        status: EnrollmentStatus.fromString(data.enrollmentStatus),
        pairId: data.pairId,
      }),
    )
  }

  async save(participant: Participant): Promise<void> {
    await this.prisma.participant.upsert({
      where: { id: participant.id },
      update: {
        name: participant.name,
        email: participant.email.value,
        enrollmentStatus: participant.status.value,
        pairId: participant.pairId,
      },
      create: {
        id: participant.id,
        name: participant.name,
        email: participant.email.value,
        enrollmentStatus: participant.status.value,
        pairId: participant.pairId,
      },
    })
  }
}
```

- [ ] **Step 2: PrismaTeamRepository を作成**

```typescript
// src/infra/db/repository/PrismaTeamRepository.ts
import { PrismaClient } from '@prisma/client'
import { Team } from '../../../domain/entity/Team'
import { Pair } from '../../../domain/entity/Pair'
import { TeamName } from '../../../domain/value-object/TeamName'
import { PairName } from '../../../domain/value-object/PairName'
import { ITeamRepository } from '../../../domain/interface/ITeamRepository'

export class PrismaTeamRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private toEntity(
    data: {
      id: string
      name: string
      pairs: {
        id: string
        name: string
        teamId: string
        participants: { id: string }[]
      }[]
    },
  ): Team {
    const pairs = data.pairs.map((p) =>
      Pair.create({
        id: p.id,
        name: PairName.create(p.name),
        teamId: p.teamId,
        memberIds: p.participants.map((m) => m.id),
      }),
    )
    return Team.create({
      id: data.id,
      name: TeamName.create(data.name),
      pairs,
    })
  }

  private includeClause() {
    return {
      pairs: {
        include: {
          participants: { select: { id: true } },
        },
      },
    }
  }

  async findById(id: string): Promise<Team | null> {
    const data = await this.prisma.team.findUnique({
      where: { id },
      include: this.includeClause(),
    })
    if (!data) return null
    return this.toEntity(data)
  }

  async findAll(): Promise<Team[]> {
    const dataList = await this.prisma.team.findMany({
      include: this.includeClause(),
    })
    return dataList.map((data) => this.toEntity(data))
  }

  async findWithFewestMembers(): Promise<Team | null> {
    const teams = await this.findAll()
    if (teams.length === 0) return null
    const minCount = Math.min(...teams.map((t) => t.totalMemberCount))
    const candidates = teams.filter((t) => t.totalMemberCount === minCount)
    return candidates[Math.floor(Math.random() * candidates.length)]!
  }

  async save(team: Team): Promise<void> {
    await this.prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name.value },
      create: { id: team.id, name: team.name.value },
    })
  }
}
```

- [ ] **Step 3: PrismaPairRepository を作成**

```typescript
// src/infra/db/repository/PrismaPairRepository.ts
import { PrismaClient } from '@prisma/client'
import { Pair } from '../../../domain/entity/Pair'
import { PairName } from '../../../domain/value-object/PairName'
import { IPairRepository } from '../../../domain/interface/IPairRepository'

export class PrismaPairRepository implements IPairRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Pair | null> {
    const data = await this.prisma.pair.findUnique({
      where: { id },
      include: { participants: { select: { id: true } } },
    })
    if (!data) return null
    return Pair.create({
      id: data.id,
      name: PairName.create(data.name),
      teamId: data.teamId,
      memberIds: data.participants.map((p) => p.id),
    })
  }

  async findByTeamId(teamId: string): Promise<Pair[]> {
    const dataList = await this.prisma.pair.findMany({
      where: { teamId },
      include: { participants: { select: { id: true } } },
    })
    return dataList.map((data) =>
      Pair.create({
        id: data.id,
        name: PairName.create(data.name),
        teamId: data.teamId,
        memberIds: data.participants.map((p) => p.id),
      }),
    )
  }

  async save(pair: Pair): Promise<void> {
    await this.prisma.pair.upsert({
      where: { id: pair.id },
      update: {
        name: pair.name.value,
        teamId: pair.teamId,
      },
      create: {
        id: pair.id,
        name: pair.name.value,
        teamId: pair.teamId,
      },
    })

    // メンバーの更新: pairId を設定
    await this.prisma.participant.updateMany({
      where: { pairId: pair.id },
      data: { pairId: null },
    })
    if (pair.memberIds.length > 0) {
      await this.prisma.participant.updateMany({
        where: { id: { in: pair.memberIds } },
        data: { pairId: pair.id },
      })
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.participant.updateMany({
      where: { pairId: id },
      data: { pairId: null },
    })
    await this.prisma.pair.delete({ where: { id } })
  }
}
```

- [ ] **Step 4: PrismaTaskProgressRepository を作成**

```typescript
// src/infra/db/repository/PrismaTaskProgressRepository.ts
import { PrismaClient } from '@prisma/client'
import { TaskProgress } from '../../../domain/entity/TaskProgress'
import { ProgressStatus } from '../../../domain/value-object/ProgressStatus'
import { ITaskProgressRepository } from '../../../domain/interface/ITaskProgressRepository'

export class PrismaTaskProgressRepository implements ITaskProgressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<TaskProgress | null> {
    const data = await this.prisma.taskProgress.findUnique({ where: { id } })
    if (!data) return null
    return TaskProgress.create({
      id: data.id,
      participantId: data.participantId,
      taskMasterId: data.taskMasterId,
      status: ProgressStatus.fromString(data.progressStatus),
    })
  }

  async findByParticipantId(participantId: string): Promise<TaskProgress[]> {
    const dataList = await this.prisma.taskProgress.findMany({
      where: { participantId },
    })
    return dataList.map((data) =>
      TaskProgress.create({
        id: data.id,
        participantId: data.participantId,
        taskMasterId: data.taskMasterId,
        status: ProgressStatus.fromString(data.progressStatus),
      }),
    )
  }

  async save(taskProgress: TaskProgress): Promise<void> {
    await this.prisma.taskProgress.upsert({
      where: { id: taskProgress.id },
      update: {
        progressStatus: taskProgress.status.value,
      },
      create: {
        id: taskProgress.id,
        participantId: taskProgress.participantId,
        taskMasterId: taskProgress.taskMasterId,
        progressStatus: taskProgress.status.value,
      },
    })
  }

  async bulkCreate(taskProgresses: TaskProgress[]): Promise<void> {
    await this.prisma.taskProgress.createMany({
      data: taskProgresses.map((tp) => ({
        id: tp.id,
        participantId: tp.participantId,
        taskMasterId: tp.taskMasterId,
        progressStatus: tp.status.value,
      })),
    })
  }
}
```

- [ ] **Step 5: コミット**

```bash
git add src/infra/db/repository/
git commit -m "feat: add Prisma repository implementations"
```

---

## Task 21: QueryService と ConsoleMailSender

**Files:**
- Create: `src/infra/db/query-service/PrismaParticipantTaskQueryService.ts`
- Create: `src/infra/mail/ConsoleMailSender.ts`

- [ ] **Step 1: PrismaParticipantTaskQueryService を作成**

```typescript
// src/infra/db/query-service/PrismaParticipantTaskQueryService.ts
import { PrismaClient } from '@prisma/client'
import {
  IParticipantTaskQueryService,
  ParticipantTaskDTO,
  PaginatedResult,
} from '../../../domain/interface/IParticipantTaskQueryService'

export class PrismaParticipantTaskQueryService implements IParticipantTaskQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTaskProgress(
    taskMasterIds: string[],
    progressStatus: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ParticipantTaskDTO>> {
    const skip = (page - 1) * perPage

    // 全ての指定課題が指定ステータスになっている参加者を検索
    const where = {
      AND: taskMasterIds.map((taskMasterId) => ({
        taskProgresses: {
          some: {
            taskMasterId,
            progressStatus: progressStatus as any,
          },
        },
      })),
    }

    const [participants, totalCount] = await Promise.all([
      this.prisma.participant.findMany({
        where,
        skip,
        take: perPage,
        select: { id: true, name: true, email: true },
      }),
      this.prisma.participant.count({ where }),
    ])

    return {
      data: participants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
      })),
      totalCount,
      page,
      perPage,
    }
  }
}
```

- [ ] **Step 2: ConsoleMailSender を作成**

```typescript
// src/infra/mail/ConsoleMailSender.ts
import { IMailSender } from '../../domain/interface/IMailSender'

export class ConsoleMailSender implements IMailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log('========== MAIL ==========')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${body}`)
    console.log('==========================')
  }
}
```

- [ ] **Step 3: コミット**

```bash
git add src/infra/db/query-service/ src/infra/mail/
git commit -m "feat: add QueryService and ConsoleMailSender"
```

---

## Task 22: Controller 層

**Files:**
- Create: `src/controller/ParticipantController.ts`
- Create: `src/controller/PairController.ts`
- Create: `src/controller/TeamController.ts`
- Create: `src/controller/TaskController.ts`

- [ ] **Step 1: ParticipantController を作成**

```typescript
// src/controller/ParticipantController.ts
import { Request, Response } from 'express'
import { GetParticipantsUseCase } from '../app/participant/GetParticipantsUseCase'
import { CreateParticipantUseCase } from '../app/participant/CreateParticipantUseCase'
import { UpdateParticipantStatusUseCase } from '../app/participant/UpdateParticipantStatusUseCase'
import { IParticipantTaskQueryService } from '../domain/interface/IParticipantTaskQueryService'

export class ParticipantController {
  constructor(
    private readonly getParticipantsUseCase: GetParticipantsUseCase,
    private readonly createParticipantUseCase: CreateParticipantUseCase,
    private readonly updateParticipantStatusUseCase: UpdateParticipantStatusUseCase,
    private readonly participantTaskQueryService: IParticipantTaskQueryService,
  ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const participants = await this.getParticipantsUseCase.execute()
    res.json(
      participants.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email.value,
        status: p.status.value,
        pairId: p.pairId,
      })),
    )
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name, email } = req.body
    await this.createParticipantUseCase.execute({ name, email })
    res.status(201).json({ message: '参加者を作成しました' })
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { status } = req.body
    await this.updateParticipantStatusUseCase.execute({
      participantId: id!,
      newStatus: status,
    })
    res.json({ message: 'ステータスを更新しました' })
  }

  async search(req: Request, res: Response): Promise<void> {
    const taskMasterIds = (req.query.taskMasterIds as string)?.split(',') ?? []
    const progressStatus = req.query.progressStatus as string
    const page = Number(req.query.page) || 1
    const perPage = 10

    const result = await this.participantTaskQueryService.findByTaskProgress(
      taskMasterIds,
      progressStatus,
      page,
      perPage,
    )
    res.json(result)
  }
}
```

- [ ] **Step 2: PairController を作成**

```typescript
// src/controller/PairController.ts
import { Request, Response } from 'express'
import { GetPairsUseCase } from '../app/pair/GetPairsUseCase'
import { UpdatePairMembersUseCase } from '../app/pair/UpdatePairMembersUseCase'

export class PairController {
  constructor(
    private readonly getPairsUseCase: GetPairsUseCase,
    private readonly updatePairMembersUseCase: UpdatePairMembersUseCase,
  ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const pairsWithTeam = await this.getPairsUseCase.execute()
    res.json(
      pairsWithTeam.map(({ pair, teamId }) => ({
        id: pair.id,
        name: pair.name.value,
        teamId,
        memberIds: pair.memberIds,
      })),
    )
  }

  async updateMembers(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { memberIds } = req.body
    await this.updatePairMembersUseCase.execute({ pairId: id!, memberIds })
    res.json({ message: 'ペアメンバーを更新しました' })
  }
}
```

- [ ] **Step 3: TeamController を作成**

```typescript
// src/controller/TeamController.ts
import { Request, Response } from 'express'
import { GetTeamsUseCase } from '../app/team/GetTeamsUseCase'
import { UpdateTeamPairsUseCase } from '../app/team/UpdateTeamPairsUseCase'

export class TeamController {
  constructor(
    private readonly getTeamsUseCase: GetTeamsUseCase,
    private readonly updateTeamPairsUseCase: UpdateTeamPairsUseCase,
  ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const teams = await this.getTeamsUseCase.execute()
    res.json(
      teams.map((team) => ({
        id: team.id,
        name: team.name.value,
        pairs: team.pairs.map((pair) => ({
          id: pair.id,
          name: pair.name.value,
          memberIds: pair.memberIds,
        })),
        totalMembers: team.totalMemberCount,
      })),
    )
  }

  async updatePairs(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { pairIds } = req.body
    await this.updateTeamPairsUseCase.execute({ teamId: id!, pairIds })
    res.json({ message: 'チームのペアを更新しました' })
  }
}
```

- [ ] **Step 4: TaskController を作成**

```typescript
// src/controller/TaskController.ts
import { Request, Response } from 'express'
import { UpdateTaskProgressUseCase } from '../app/task/UpdateTaskProgressUseCase'

export class TaskController {
  constructor(
    private readonly updateTaskProgressUseCase: UpdateTaskProgressUseCase,
  ) {}

  async updateProgress(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { operatorId, status } = req.body
    await this.updateTaskProgressUseCase.execute({
      taskProgressId: id!,
      operatorId,
      newStatus: status,
    })
    res.json({ message: '進捗ステータスを更新しました' })
  }
}
```

- [ ] **Step 5: コミット**

```bash
git add src/controller/
git commit -m "feat: add Express controllers"
```

---

## Task 23: ルーティングと Composition Root

**Files:**
- Create: `src/route/index.ts`
- Create: `src/main.ts`

- [ ] **Step 1: ルーティングを作成**

```typescript
// src/route/index.ts
import { Router } from 'express'
import { ParticipantController } from '../controller/ParticipantController'
import { PairController } from '../controller/PairController'
import { TeamController } from '../controller/TeamController'
import { TaskController } from '../controller/TaskController'

export const createRouter = (
  participantController: ParticipantController,
  pairController: PairController,
  teamController: TeamController,
  taskController: TaskController,
): Router => {
  const router = Router()

  // Participants
  router.get('/participants', (req, res) => participantController.getAll(req, res))
  router.post('/participants', (req, res) => participantController.create(req, res))
  router.patch('/participants/:id/status', (req, res) =>
    participantController.updateStatus(req, res),
  )
  router.get('/participants/search', (req, res) =>
    participantController.search(req, res),
  )

  // Pairs
  router.get('/pairs', (req, res) => pairController.getAll(req, res))
  router.patch('/pairs/:id/members', (req, res) =>
    pairController.updateMembers(req, res),
  )

  // Teams
  router.get('/teams', (req, res) => teamController.getAll(req, res))
  router.patch('/teams/:id/pairs', (req, res) =>
    teamController.updatePairs(req, res),
  )

  // Task Progress
  router.patch('/task-progresses/:id', (req, res) =>
    taskController.updateProgress(req, res),
  )

  return router
}
```

- [ ] **Step 2: Composition Root (main.ts) を作成**

```typescript
// src/main.ts
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { createRouter } from './route'

// Repositories
import { PrismaParticipantRepository } from './infra/db/repository/PrismaParticipantRepository'
import { PrismaTeamRepository } from './infra/db/repository/PrismaTeamRepository'
import { PrismaPairRepository } from './infra/db/repository/PrismaPairRepository'
import { PrismaTaskProgressRepository } from './infra/db/repository/PrismaTaskProgressRepository'

// QueryService
import { PrismaParticipantTaskQueryService } from './infra/db/query-service/PrismaParticipantTaskQueryService'

// Mail
import { ConsoleMailSender } from './infra/mail/ConsoleMailSender'

// UseCases
import { GetParticipantsUseCase } from './app/participant/GetParticipantsUseCase'
import { CreateParticipantUseCase } from './app/participant/CreateParticipantUseCase'
import { UpdateParticipantStatusUseCase } from './app/participant/UpdateParticipantStatusUseCase'
import { GetPairsUseCase } from './app/pair/GetPairsUseCase'
import { UpdatePairMembersUseCase } from './app/pair/UpdatePairMembersUseCase'
import { GetTeamsUseCase } from './app/team/GetTeamsUseCase'
import { UpdateTeamPairsUseCase } from './app/team/UpdateTeamPairsUseCase'
import { UpdateTaskProgressUseCase } from './app/task/UpdateTaskProgressUseCase'

// Controllers
import { ParticipantController } from './controller/ParticipantController'
import { PairController } from './controller/PairController'
import { TeamController } from './controller/TeamController'
import { TaskController } from './controller/TaskController'

const prisma = new PrismaClient()
const ADMIN_EMAIL = 'admin@example.com'

async function main() {
  // --- Infra ---
  const participantRepo = new PrismaParticipantRepository(prisma)
  const teamRepo = new PrismaTeamRepository(prisma)
  const pairRepo = new PrismaPairRepository(prisma)
  const taskProgressRepo = new PrismaTaskProgressRepository(prisma)
  const queryService = new PrismaParticipantTaskQueryService(prisma)
  const mailSender = new ConsoleMailSender()

  // 課題マスタIDを取得
  const taskMasters = await prisma.taskMaster.findMany({ select: { id: true } })
  const taskMasterIds = taskMasters.map((tm) => tm.id)

  // --- UseCases ---
  const getParticipantsUseCase = new GetParticipantsUseCase(participantRepo)
  const createParticipantUseCase = new CreateParticipantUseCase(
    participantRepo,
    teamRepo,
    pairRepo,
    taskProgressRepo,
    taskMasterIds,
  )
  const updateParticipantStatusUseCase = new UpdateParticipantStatusUseCase(
    participantRepo,
    teamRepo,
    pairRepo,
    mailSender,
    ADMIN_EMAIL,
  )
  const getPairsUseCase = new GetPairsUseCase(teamRepo)
  const updatePairMembersUseCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)
  const getTeamsUseCase = new GetTeamsUseCase(teamRepo)
  const updateTeamPairsUseCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)
  const updateTaskProgressUseCase = new UpdateTaskProgressUseCase(taskProgressRepo)

  // --- Controllers ---
  const participantController = new ParticipantController(
    getParticipantsUseCase,
    createParticipantUseCase,
    updateParticipantStatusUseCase,
    queryService,
  )
  const pairController = new PairController(getPairsUseCase, updatePairMembersUseCase)
  const teamController = new TeamController(getTeamsUseCase, updateTeamPairsUseCase)
  const taskController = new TaskController(updateTaskProgressUseCase)

  // --- Express ---
  const app = express()
  app.use(express.json())
  app.use('/api', createRouter(participantController, pairController, teamController, taskController))

  app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000')
  })
}

main().catch(console.error)
```

- [ ] **Step 3: コミット**

```bash
git add src/route/ src/main.ts
git commit -m "feat: add routing and composition root with manual DI"
```

---

## Task 24: Seed データ

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: seed.ts を作成**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

const TASK_NAMES = [
  'HTML/CSS基礎', 'JavaScript基礎', 'TypeScript基礎', 'React基礎', 'Next.js基礎',
  'Git/GitHub', 'テスト基礎', 'Jest入門', 'テスト設計', 'TDD入門',
  'データベース基礎', 'SQL基礎', 'DBモデリング1', 'DBモデリング2', 'DBモデリング3',
  'インデックス', 'トランザクション', 'N+1問題', 'REST API設計', 'APIセキュリティ',
  '設計原則(SOLID)', 'デザインパターン1', 'デザインパターン2', 'クリーンアーキテクチャ',
  'DDD基礎', 'オニオンアーキテクチャ', 'CQRS', 'イベント駆動', 'マイクロサービス基礎',
  'Docker入門', 'Docker Compose', 'CI/CD基礎', 'GitHub Actions', 'AWS基礎',
  'ネットワーク基礎', 'HTTP/HTTPS', 'DNS', 'ロードバランサー', 'CDN',
  'セキュリティ基礎', 'XSS対策', 'CSRF対策', 'SQLインジェクション対策', '認証・認可',
  'OAuth', 'JWT', 'Cookie/Session', 'パフォーマンス最適化', 'キャッシュ戦略',
  'ログ設計', '監視設計', 'エラーハンドリング', 'リトライ戦略', '冪等性',
  'GraphQL基礎', 'WebSocket', 'SSE', 'gRPC基礎', 'メッセージキュー',
  'Redis入門', 'Elasticsearch入門', 'フルテキスト検索', 'ページネーション',
  'ファイルアップロード', '画像処理', 'PDF生成', 'CSV処理', 'メール送信',
  'バッチ処理', 'スケジューリング', 'レート制限', 'サーキットブレーカー',
  'アジャイル開発', 'スクラム', 'ペアプログラミング', 'コードレビュー',
  'リファクタリング', '技術的負債', 'ドキュメント作成', 'プレゼンテーション',
]

async function main() {
  // Clean up
  await prisma.taskProgress.deleteMany()
  await prisma.participant.deleteMany()
  await prisma.pair.deleteMany()
  await prisma.team.deleteMany()
  await prisma.taskMaster.deleteMany()

  // Create task masters
  const taskMasters = TASK_NAMES.map((name) => ({
    id: uuidv4(),
    name,
  }))
  await prisma.taskMaster.createMany({ data: taskMasters })

  // Create teams
  const teams = Array.from({ length: 5 }, (_, i) => ({
    id: uuidv4(),
    name: String(i + 1),
  }))
  await prisma.team.createMany({ data: teams })

  // Create pairs (2-3 per team)
  const pairNames = ['a', 'b', 'c']
  const pairs: { id: string; name: string; teamId: string }[] = []
  for (const team of teams) {
    for (let j = 0; j < 2; j++) {
      pairs.push({ id: uuidv4(), name: pairNames[j]!, teamId: team.id })
    }
  }
  await prisma.pair.createMany({ data: pairs })

  // Create 30 participants (6 per team, 3 per pair)
  const participants: {
    id: string
    name: string
    email: string
    enrollmentStatus: 'ENROLLED'
    pairId: string
  }[] = []
  let pairIndex = 0
  for (let i = 0; i < 30; i++) {
    const pair = pairs[pairIndex]!
    participants.push({
      id: uuidv4(),
      name: `参加者${i + 1}`,
      email: `participant${i + 1}@example.com`,
      enrollmentStatus: 'ENROLLED',
      pairId: pair.id,
    })
    // 3人ごとに次のペアへ
    if ((i + 1) % 3 === 0) pairIndex++
  }
  await prisma.participant.createMany({ data: participants })

  // Create task progresses (30 participants x 80 tasks)
  const taskProgresses: {
    id: string
    participantId: string
    taskMasterId: string
    progressStatus: 'NOT_STARTED'
  }[] = []
  for (const participant of participants) {
    for (const taskMaster of taskMasters) {
      taskProgresses.push({
        id: uuidv4(),
        participantId: participant.id,
        taskMasterId: taskMaster.id,
        progressStatus: 'NOT_STARTED',
      })
    }
  }
  // バッチで挿入（Prisma createMany は一括処理）
  await prisma.taskProgress.createMany({ data: taskProgresses })

  console.log('Seed completed successfully!')
  console.log(`- ${taskMasters.length} task masters`)
  console.log(`- ${teams.length} teams`)
  console.log(`- ${pairs.length} pairs`)
  console.log(`- ${participants.length} participants`)
  console.log(`- ${taskProgresses.length} task progresses`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: package.json に prisma seed 設定を追加**

`package.json` の末尾に以下を追加:

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 3: seed を実行して確認**

```bash
npm run seed
```

Expected: "Seed completed successfully!" と各データの件数が表示される

- [ ] **Step 4: コミット**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed data with 30 participants, 5 teams, 80 tasks"
```

---

## Task 25: エラーハンドリングミドルウェアと動作確認

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: main.ts にエラーハンドリングミドルウェアを追加**

`src/main.ts` の `app.listen` の前に以下を追加:

```typescript
  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack)
    res.status(400).json({ error: err.message })
  })
```

また、各Controllerメソッドをtry-catchで包むため、`src/route/index.ts` のハンドラーをラップするヘルパーを追加:

```typescript
// src/route/index.ts の先頭に追加
import { Request, Response, NextFunction } from 'express'

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next)
```

そしてルーティングの各ハンドラーを `asyncHandler` で包む:

```typescript
  router.get('/participants', asyncHandler((req, res) => participantController.getAll(req, res)))
  router.post('/participants', asyncHandler((req, res) => participantController.create(req, res)))
  // ... 他も同様
```

- [ ] **Step 2: サーバーを起動して動作確認**

```bash
npm run dev
```

別ターミナルで:

```bash
curl http://localhost:3000/api/participants | head -c 200
curl http://localhost:3000/api/teams | head -c 200
curl http://localhost:3000/api/pairs | head -c 200
```

Expected: JSON レスポンスが返る

- [ ] **Step 3: コミット**

```bash
git add src/route/index.ts src/main.ts
git commit -m "feat: add error handling middleware and async handler"
```

---

## Task 26: 全テスト実行と最終確認

- [ ] **Step 1: 全テストを実行**

```bash
npx jest
```

Expected: 全テストが PASS

- [ ] **Step 2: APIの統合的な動作確認**

```bash
# 参加者の作成
curl -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -d '{"name":"新規参加者","email":"new@example.com"}'

# ステータス変更（休会）
curl -X PATCH http://localhost:3000/api/participants/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"ON_LEAVE"}'

# 課題進捗条件での参加者検索
curl "http://localhost:3000/api/participants/search?taskMasterIds=<tm-id>&progressStatus=NOT_STARTED&page=1"
```

Expected: 各エンドポイントが正しくレスポンスを返す

- [ ] **Step 3: 最終コミット**

```bash
git add -A
git commit -m "chore: final cleanup and verification"
```
