// src/controller/TeamController.ts
import { Request, Response } from 'express'
import { GetTeamsUseCase } from '../app/team/GetTeamsUseCase'
import { UpdateTeamPairsUseCase } from '../app/team/UpdateTeamPairsUseCase'

export class TeamController {
  constructor(
    private readonly getTeamsUseCase: GetTeamsUseCase,
    private readonly updateTeamPairsUseCase: UpdateTeamPairsUseCase,
  ) {}

  async getAll(req: Request, res: Response): Promise<void> {
    const teams = await this.getTeamsUseCase.execute()
    res.json(
      teams.map((team) => ({
        id: team.id,
        name: team.name.value,
        pairs: team.pairs.map((pair) => ({
          id: pair.id,
          name: pair.name.value,
          memberIds: pair.memberIds,
        })),
        totalMembers: team.totalMemberCount,
      })),
    )
  }

  async updatePairs(req: Request, res: Response): Promise<void> {
    const { id } = req.params
    const { pairIds } = req.body
    await this.updateTeamPairsUseCase.execute({ teamId: id!, pairIds })
    res.json({ message: 'チームのペアを更新しました' })
  }
}
