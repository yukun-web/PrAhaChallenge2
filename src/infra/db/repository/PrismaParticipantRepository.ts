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
