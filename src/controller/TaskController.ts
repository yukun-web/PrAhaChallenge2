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
