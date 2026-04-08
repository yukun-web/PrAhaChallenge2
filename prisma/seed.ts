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

  // Create pairs (2 per team)
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
