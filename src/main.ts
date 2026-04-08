// src/main.ts
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { createRouter } from './route'

// Repositories
import { PrismaParticipantRepository } from './infra/db/repository/PrismaParticipantRepository'
import { PrismaTeamRepository } from './infra/db/repository/PrismaTeamRepository'
import { PrismaPairRepository } from './infra/db/repository/PrismaPairRepository'
import { PrismaTaskProgressRepository } from './infra/db/repository/PrismaTaskProgressRepository'

// QueryService
import { PrismaParticipantTaskQueryService } from './infra/db/query-service/PrismaParticipantTaskQueryService'

// Mail
import { ConsoleMailSender } from './infra/mail/ConsoleMailSender'

// UseCases
import { GetParticipantsUseCase } from './app/participant/GetParticipantsUseCase'
import { CreateParticipantUseCase } from './app/participant/CreateParticipantUseCase'
import { UpdateParticipantStatusUseCase } from './app/participant/UpdateParticipantStatusUseCase'
import { GetPairsUseCase } from './app/pair/GetPairsUseCase'
import { UpdatePairMembersUseCase } from './app/pair/UpdatePairMembersUseCase'
import { GetTeamsUseCase } from './app/team/GetTeamsUseCase'
import { UpdateTeamPairsUseCase } from './app/team/UpdateTeamPairsUseCase'
import { UpdateTaskProgressUseCase } from './app/task/UpdateTaskProgressUseCase'

// Controllers
import { ParticipantController } from './controller/ParticipantController'
import { PairController } from './controller/PairController'
import { TeamController } from './controller/TeamController'
import { TaskController } from './controller/TaskController'

const ADMIN_EMAIL = 'admin@example.com'

export async function createApp(prisma: PrismaClient): Promise<express.Express> {
  // --- Infra ---
  const participantRepo = new PrismaParticipantRepository(prisma)
  const teamRepo = new PrismaTeamRepository(prisma)
  const pairRepo = new PrismaPairRepository(prisma)
  const taskProgressRepo = new PrismaTaskProgressRepository(prisma)
  const queryService = new PrismaParticipantTaskQueryService(prisma)
  const mailSender = new ConsoleMailSender()

  // 課題マスタIDを取得
  const taskMasters = await prisma.taskMaster.findMany({ select: { id: true } })
  const taskMasterIds = taskMasters.map((tm) => tm.id)

  // --- UseCases ---
  const getParticipantsUseCase = new GetParticipantsUseCase(participantRepo)
  const createParticipantUseCase = new CreateParticipantUseCase(
    participantRepo,
    teamRepo,
    pairRepo,
    taskProgressRepo,
    taskMasterIds,
  )
  const updateParticipantStatusUseCase = new UpdateParticipantStatusUseCase(
    participantRepo,
    teamRepo,
    pairRepo,
    mailSender,
    ADMIN_EMAIL,
  )
  const getPairsUseCase = new GetPairsUseCase(teamRepo)
  const updatePairMembersUseCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)
  const getTeamsUseCase = new GetTeamsUseCase(teamRepo)
  const updateTeamPairsUseCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)
  const updateTaskProgressUseCase = new UpdateTaskProgressUseCase(taskProgressRepo)

  // --- Controllers ---
  const participantController = new ParticipantController(
    getParticipantsUseCase,
    createParticipantUseCase,
    updateParticipantStatusUseCase,
    queryService,
  )
  const pairController = new PairController(getPairsUseCase, updatePairMembersUseCase)
  const teamController = new TeamController(getTeamsUseCase, updateTeamPairsUseCase)
  const taskController = new TaskController(updateTaskProgressUseCase)

  // --- Express ---
  const app = express()
  app.use(express.json())
  app.use('/api', createRouter(participantController, pairController, teamController, taskController))

  // Error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack)
    res.status(400).json({ error: err.message })
  })

  return app
}

if (require.main === module) {
  const prisma = new PrismaClient()

  async function main() {
    const app = await createApp(prisma)
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000')
    })
  }

  main().catch(console.error)
}
