// src/controller/PairController.ts
import { Request, Response } from 'express'
import { GetPairsUseCase } from '../app/pair/GetPairsUseCase'
import { UpdatePairMembersUseCase } from '../app/pair/UpdatePairMembersUseCase'

export class PairController {
  constructor(
    private readonly getPairsUseCase: GetPairsUseCase,
    private readonly updatePairMembersUseCase: UpdatePairMembersUseCase,
  ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const pairsWithTeam = await this.getPairsUseCase.execute()
    res.json(
      pairsWithTeam.map(({ pair, teamId }) => ({
        id: pair.id,
        name: pair.name.value,
        teamId,
        memberIds: pair.memberIds,
      })),
    )
  }

  async updateMembers(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { memberIds } = req.body
    await this.updatePairMembersUseCase.execute({ pairId: id!, memberIds })
    res.json({ message: 'ペアメンバーを更新しました' })
  }
}
