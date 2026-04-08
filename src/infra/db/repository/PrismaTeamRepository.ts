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
