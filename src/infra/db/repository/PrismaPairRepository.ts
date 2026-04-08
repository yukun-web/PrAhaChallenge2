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
