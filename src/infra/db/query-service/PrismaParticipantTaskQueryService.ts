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
