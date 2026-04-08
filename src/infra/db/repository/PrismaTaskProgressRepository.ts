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
