import request from 'supertest'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { setupE2E, teardownE2E } from './setup'

let app: express.Express
let prisma: PrismaClient

beforeAll(async () => {
  const ctx = await setupE2E()
  app = ctx.app
  prisma = ctx.prisma
}, 60_000)

afterAll(async () => {
  await teardownE2E()
})

// =============================================
// 参加者の一覧取得、新規追加
// =============================================
describe('参加者', () => {
  describe('GET /api/participants 一覧取得', () => {
    it('seedデータの参加者30名を返す', async () => {
      const res = await request(app).get('/api/participants')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(30)
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('email')
      expect(res.body[0]).toHaveProperty('status')
      expect(res.body[0]).toHaveProperty('pairId')
      res.body.forEach((p: any) => {
        expect(p.status).toBe('ENROLLED')
      })
    })
  })

  describe('POST /api/participants 新規追加', () => {
    it('新規参加者を作成し、チーム・ペアに自動配置される', async () => {
      const res = await request(app)
        .post('/api/participants')
        .send({ name: '新規参加者', email: 'new@example.com' })
      expect(res.status).toBe(201)
      expect(res.body.message).toBe('参加者を作成しました')

      const listRes = await request(app).get('/api/participants')
      const newParticipant = listRes.body.find(
        (p: any) => p.email === 'new@example.com',
      )
      expect(newParticipant).toBeDefined()
      expect(newParticipant.name).toBe('新規参加者')
      expect(newParticipant.pairId).not.toBeNull()
    })

    it('メールアドレスの重複は許容されない', async () => {
      const res = await request(app)
        .post('/api/participants')
        .send({ name: 'dup', email: 'participant1@example.com' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('このメールアドレスは既に使用されています')
    })
  })
})

// =============================================
// 在籍ステータス変更（参加者の増減に関する仕様）
// =============================================
describe('在籍ステータス変更', () => {
  it('休会にするとペアから離脱する（在籍中でない場合ペアに所属してはいけない）', async () => {
    const listRes = await request(app).get('/api/participants')
    const participant = listRes.body.find(
      (p: any) => p.status === 'ENROLLED' && p.pairId !== null,
    )

    const res = await request(app)
      .patch(`/api/participants/${participant.id}/status`)
      .send({ status: 'ON_LEAVE' })
    expect(res.status).toBe(200)

    const updatedList = await request(app).get('/api/participants')
    const updated = updatedList.body.find((p: any) => p.id === participant.id)
    expect(updated.status).toBe('ON_LEAVE')
    expect(updated.pairId).toBeNull()
  })

  it('ペアが1名になった場合、残った参加者は同チーム内の他ペアに自動合流する', async () => {
    // 2名ペアを探す
    const pairsRes = await request(app).get('/api/pairs')
    const twoPair = pairsRes.body.find((p: any) => p.memberIds.length === 2)
    if (!twoPair) return // テストデータ状態により2名ペアがなければスキップ

    const memberToLeave = twoPair.memberIds[0]
    const memberToStay = twoPair.memberIds[1]

    // 1名を休会にする
    await request(app)
      .patch(`/api/participants/${memberToLeave}/status`)
      .send({ status: 'ON_LEAVE' })

    // 残った参加者が別のペアに合流していることを確認
    const updatedParticipants = await request(app).get('/api/participants')
    const stayingMember = updatedParticipants.body.find(
      (p: any) => p.id === memberToStay,
    )
    // 合流先のペアに所属しているはず（元のペアIDとは異なる）
    expect(stayingMember.pairId).not.toBeNull()
    expect(stayingMember.pairId).not.toBe(twoPair.id)
  })

  it('休会中の参加者が復帰すると最少人数のチーム・ペアに自動配置される', async () => {
    // 休会中の参加者を探す
    const listRes = await request(app).get('/api/participants')
    const onLeave = listRes.body.find((p: any) => p.status === 'ON_LEAVE')
    if (!onLeave) return

    // 復帰
    const res = await request(app)
      .patch(`/api/participants/${onLeave.id}/status`)
      .send({ status: 'ENROLLED' })
    expect(res.status).toBe(200)

    // ペアに自動配置されていることを確認
    const updatedList = await request(app).get('/api/participants')
    const restored = updatedList.body.find((p: any) => p.id === onLeave.id)
    expect(restored.status).toBe('ENROLLED')
    expect(restored.pairId).not.toBeNull()
  })

  it('不正なステータスで400エラー', async () => {
    const listRes = await request(app).get('/api/participants')
    const participant = listRes.body.find(
      (p: any) => p.status === 'ENROLLED',
    )

    const res = await request(app)
      .patch(`/api/participants/${participant.id}/status`)
      .send({ status: 'INVALID' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('不正な在籍ステータス')
  })
})

// =============================================
// ペアの一覧取得、更新
// =============================================
describe('ペア', () => {
  describe('GET /api/pairs 一覧取得', () => {
    it('ペア一覧を取得できる', async () => {
      const res = await request(app).get('/api/pairs')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id')
        expect(res.body[0]).toHaveProperty('name')
        expect(res.body[0]).toHaveProperty('teamId')
        expect(res.body[0]).toHaveProperty('memberIds')
      }
    })
  })

  describe('PATCH /api/pairs/:id/members ペアの参加者変更', () => {
    it('ペアの参加者を2名に変更できる', async () => {
      const pairsRes = await request(app).get('/api/pairs')
      const pair = pairsRes.body.find((p: any) => p.memberIds.length >= 2)
      const twoMembers = pair.memberIds.slice(0, 2)

      const res = await request(app)
        .patch(`/api/pairs/${pair.id}/members`)
        .send({ memberIds: twoMembers })
      expect(res.status).toBe(200)
    })

    it('1名のペアは存在できない', async () => {
      const pairsRes = await request(app).get('/api/pairs')
      const pair = pairsRes.body[0]

      const res = await request(app)
        .patch(`/api/pairs/${pair.id}/members`)
        .send({ memberIds: [pair.memberIds[0]] })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('ペアのメンバーは2〜3名でなければいけません')
    })

    it('4名のペアは存在できない', async () => {
      // 在籍中の参加者を4名集める
      const participantsRes = await request(app).get('/api/participants')
      const enrolled = participantsRes.body.filter(
        (p: any) => p.status === 'ENROLLED',
      )
      if (enrolled.length < 4) return

      const pairsRes = await request(app).get('/api/pairs')
      const pair = pairsRes.body[0]
      const fourMembers = enrolled.slice(0, 4).map((p: any) => p.id)

      const res = await request(app)
        .patch(`/api/pairs/${pair.id}/members`)
        .send({ memberIds: fourMembers })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('ペアのメンバーは2〜3名でなければいけません')
    })
  })
})

// =============================================
// チームの一覧取得、更新
// =============================================
describe('チーム', () => {
  describe('GET /api/teams 一覧取得', () => {
    it('チーム一覧を取得できる（ペア・参加者情報を含む）', async () => {
      const res = await request(app).get('/api/teams')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('pairs')
      expect(res.body[0]).toHaveProperty('totalMembers')
    })
  })

  describe('PATCH /api/teams/:id/pairs チームのペア変更', () => {
    it('チームに所属するペアを変更できる', async () => {
      const teamsRes = await request(app).get('/api/teams')
      const team = teamsRes.body.find((t: any) => t.pairs.length >= 1)
      const pairIds = team.pairs.map((p: any) => p.id)

      const res = await request(app)
        .patch(`/api/teams/${team.id}/pairs`)
        .send({ pairIds })
      expect(res.status).toBe(200)
      expect(res.body.message).toBe('チームのペアを更新しました')
    })
  })
})

// =============================================
// 課題の更新（進捗ステータス変更）
// =============================================
describe('課題進捗', () => {
  let taskProgressId: string
  let participantId: string
  let otherParticipantId: string

  beforeAll(async () => {
    const tp = await prisma.taskProgress.findFirst({
      where: { progressStatus: 'NOT_STARTED' },
    })
    taskProgressId = tp!.id
    participantId = tp!.participantId

    const other = await prisma.participant.findFirst({
      where: { id: { not: participantId } },
    })
    otherParticipantId = other!.id
  })

  it('課題の所有者が進捗ステータスを変更できる', async () => {
    const res = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'AWAITING_REVIEW' })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('進捗ステータスを更新しました')
  })

  it('課題の所有者以外はステータスを変更できない', async () => {
    const res = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: otherParticipantId, status: 'COMPLETED' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain(
      '課題の進捗ステータスを変更できるのは所有者のみです',
    )
  })

  it('完了にした進捗ステータスをレビュー待ち・未着手に戻すことはできない', async () => {
    // まず完了にする
    await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'COMPLETED' })

    // レビュー待ちへの逆戻り
    const res1 = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'AWAITING_REVIEW' })
    expect(res1.status).toBe(400)
    expect(res1.body.error).toContain('完了した課題のステータスは変更できません')

    // 未着手への逆戻り
    const res2 = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'NOT_STARTED' })
    expect(res2.status).toBe(400)
    expect(res2.body.error).toContain('完了した課題のステータスは変更できません')
  })
})

// =============================================
// 課題進捗条件での参加者検索（ページネーション）
// =============================================
describe('参加者検索（課題進捗条件・ページネーション）', () => {
  let taskMasterId1: string
  let taskMasterId2: string
  let searchTargetParticipantId: string

  beforeAll(async () => {
    // 2つの異なる課題マスタを取得
    const taskMasters = await prisma.taskMaster.findMany({ take: 2 })
    taskMasterId1 = taskMasters[0]!.id
    taskMasterId2 = taskMasters[1]!.id

    // ある参加者の2つの課題をAWAITING_REVIEWにする
    const participant = await prisma.participant.findFirst({
      where: { enrollmentStatus: 'ENROLLED' },
    })
    searchTargetParticipantId = participant!.id

    const tp1 = await prisma.taskProgress.findFirst({
      where: {
        participantId: searchTargetParticipantId,
        taskMasterId: taskMasterId1,
      },
    })
    const tp2 = await prisma.taskProgress.findFirst({
      where: {
        participantId: searchTargetParticipantId,
        taskMasterId: taskMasterId2,
      },
    })

    await request(app)
      .patch(`/api/task-progresses/${tp1!.id}`)
      .send({ operatorId: searchTargetParticipantId, status: 'AWAITING_REVIEW' })
    await request(app)
      .patch(`/api/task-progresses/${tp2!.id}`)
      .send({ operatorId: searchTargetParticipantId, status: 'AWAITING_REVIEW' })
  })

  it('単一課題の進捗条件で参加者を検索できる', async () => {
    const res = await request(app)
      .get('/api/participants/search')
      .query({
        taskMasterIds: taskMasterId1,
        progressStatus: 'AWAITING_REVIEW',
        page: '1',
      })
    expect(res.status).toBe(200)
    expect(res.body.perPage).toBe(10)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    const found = res.body.data.find(
      (p: any) => p.id === searchTargetParticipantId,
    )
    expect(found).toBeDefined()
  })

  it('複数課題の進捗条件で参加者を検索できる（AND条件）', async () => {
    const res = await request(app)
      .get('/api/participants/search')
      .query({
        taskMasterIds: `${taskMasterId1},${taskMasterId2}`,
        progressStatus: 'AWAITING_REVIEW',
        page: '1',
      })
    expect(res.status).toBe(200)
    // 両方の課題がAWAITING_REVIEWの参加者のみ返る
    const found = res.body.data.find(
      (p: any) => p.id === searchTargetParticipantId,
    )
    expect(found).toBeDefined()
  })

  it('10人単位でページングして取得する', async () => {
    // 全参加者のある課題をNOT_STARTEDで検索（seedデータは全てNOT_STARTED）
    const anyTask = await prisma.taskMaster.findFirst()
    const res = await request(app)
      .get('/api/participants/search')
      .query({
        taskMasterIds: anyTask!.id,
        progressStatus: 'NOT_STARTED',
        page: '1',
      })
    expect(res.status).toBe(200)
    expect(res.body.perPage).toBe(10)
    expect(res.body.data.length).toBeLessThanOrEqual(10)
    expect(res.body.totalCount).toBeGreaterThan(10) // 30名近くいるはず
    expect(res.body.page).toBe(1)

    // 2ページ目も取得できる
    const res2 = await request(app)
      .get('/api/participants/search')
      .query({
        taskMasterIds: anyTask!.id,
        progressStatus: 'NOT_STARTED',
        page: '2',
      })
    expect(res2.status).toBe(200)
    expect(res2.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res2.body.page).toBe(2)

    // 1ページ目と2ページ目のデータが重複しない
    const page1Ids = res.body.data.map((p: any) => p.id)
    const page2Ids = res2.body.data.map((p: any) => p.id)
    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id))
    expect(overlap).toHaveLength(0)
  })
})
