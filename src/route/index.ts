// src/route/index.ts
import { Router, Request, Response, NextFunction } from 'express'
import { ParticipantController } from '../controller/ParticipantController'
import { PairController } from '../controller/PairController'
import { TeamController } from '../controller/TeamController'
import { TaskController } from '../controller/TaskController'

const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next)

export const createRouter = (
  participantController: ParticipantController,
  pairController: PairController,
  teamController: TeamController,
  taskController: TaskController,
): Router => {
  const router = Router()

  // Participants
  router.get('/participants', asyncHandler((req, res) => participantController.getAll(req, res)))
  router.post('/participants', asyncHandler((req, res) => participantController.create(req, res)))
  // NOTE: /participants/search MUST be defined BEFORE /participants/:id/status to avoid route conflicts
  router.get('/participants/search', asyncHandler((req, res) =>
    participantController.search(req, res),
  ))
  router.patch('/participants/:id/status', asyncHandler((req, res) =>
    participantController.updateStatus(req, res),
  ))

  // Pairs
  router.get('/pairs', asyncHandler((req, res) => pairController.getAll(req, res)))
  router.patch('/pairs/:id/members', asyncHandler((req, res) =>
    pairController.updateMembers(req, res),
  ))

  // Teams
  router.get('/teams', asyncHandler((req, res) => teamController.getAll(req, res)))
  router.patch('/teams/:id/pairs', asyncHandler((req, res) =>
    teamController.updatePairs(req, res),
  ))

  // Task Progress
  router.patch('/task-progresses/:id', asyncHandler((req, res) =>
    taskController.updateProgress(req, res),
  ))

  return router
}
