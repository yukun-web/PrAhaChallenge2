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
