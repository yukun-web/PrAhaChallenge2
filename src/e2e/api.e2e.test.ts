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

describe('GET endpoints', () => {
  it('GET /api/participants は30件のseedデータを返す', async () => {
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

  it('GET /api/pairs は10ペアを返す', async () => {
    const res = await request(app).get('/api/pairs')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(10)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('name')
    expect(res.body[0]).toHaveProperty('teamId')
    expect(res.body[0]).toHaveProperty('memberIds')
    res.body.forEach((p: any) => {
      expect(p.memberIds).toHaveLength(3)
    })
  })

  it('GET /api/teams は5チームを返す', async () => {
    const res = await request(app).get('/api/teams')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(5)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('name')
    expect(res.body[0]).toHaveProperty('pairs')
    expect(res.body[0]).toHaveProperty('totalMembers')
    res.body.forEach((t: any) => {
      expect(t.totalMembers).toBe(6)
    })
  })
})

describe('POST /api/participants', () => {
  it('新規参加者を作成できる', async () => {
    const res = await request(app)
      .post('/api/participants')
      .send({ name: '新規参加者', email: 'new@example.com' })
    expect(res.status).toBe(201)
    expect(res.body.message).toBe('参加者を作成しました')

    const listRes = await request(app).get('/api/participants')
    expect(listRes.body).toHaveLength(31)
    const newParticipant = listRes.body.find(
      (p: any) => p.email === 'new@example.com',
    )
    expect(newParticipant).toBeDefined()
    expect(newParticipant.name).toBe('新規参加者')
  })

  it('重複メールアドレスで400エラー', async () => {
    const res = await request(app)
      .post('/api/participants')
      .send({ name: 'dup', email: 'participant1@example.com' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('このメールアドレスは既に使用されています')
  })
})

describe('PATCH /api/participants/:id/status', () => {
  it('休会にするとペアから離脱する', async () => {
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

describe('PATCH /api/task-progresses/:id', () => {
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

  it('所有者が進捗ステータスを変更できる', async () => {
    const res = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'AWAITING_REVIEW' })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('進捗ステータスを更新しました')
  })

  it('非所有者は変更できない', async () => {
    const res = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: otherParticipantId, status: 'COMPLETED' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain(
      '課題の進捗ステータスを変更できるのは所有者のみです',
    )
  })

  it('完了した課題は逆戻りできない', async () => {
    // まず完了にする
    await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'COMPLETED' })

    // 逆戻りを試みる
    const res = await request(app)
      .patch(`/api/task-progresses/${taskProgressId}`)
      .send({ operatorId: participantId, status: 'AWAITING_REVIEW' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('完了した課題のステータスは変更できません')
  })
})

describe('GET /api/participants/search', () => {
  it('課題進捗条件でページネーション検索できる', async () => {
    // 別の課題進捗をAWAITING_REVIEWにする
    const tp = await prisma.taskProgress.findFirst({
      where: { progressStatus: 'NOT_STARTED' },
      include: { taskMaster: true },
    })
    await request(app)
      .patch(`/api/task-progresses/${tp!.id}`)
      .send({ operatorId: tp!.participantId, status: 'AWAITING_REVIEW' })

    const res = await request(app)
      .get('/api/participants/search')
      .query({
        taskMasterIds: tp!.taskMasterId,
        progressStatus: 'AWAITING_REVIEW',
        page: '1',
      })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('totalCount')
    expect(res.body).toHaveProperty('page')
    expect(res.body).toHaveProperty('perPage')
    expect(res.body.perPage).toBe(10)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    const found = res.body.data.find(
      (p: any) => p.id === tp!.participantId,
    )
    expect(found).toBeDefined()
  })
})

describe('PATCH /api/pairs/:id/members', () => {
  it('2名でペアメンバーを更新できる', async () => {
    const pairsRes = await request(app).get('/api/pairs')
    const pair = pairsRes.body.find((p: any) => p.memberIds.length >= 2)
    const twoMembers = pair.memberIds.slice(0, 2)

    const res = await request(app)
      .patch(`/api/pairs/${pair.id}/members`)
      .send({ memberIds: twoMembers })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('ペアメンバーを更新しました')
  })

  it('1名ではペアを構成できない', async () => {
    const pairsRes = await request(app).get('/api/pairs')
    const pair = pairsRes.body[0]

    const res = await request(app)
      .patch(`/api/pairs/${pair.id}/members`)
      .send({ memberIds: [pair.memberIds[0]] })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('ペアのメンバーは2〜3名でなければいけません')
  })
})
