import { UpdateTaskProgressUseCase } from './UpdateTaskProgressUseCase'
import { TaskProgress } from '../../domain/entity/TaskProgress'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'

describe('UpdateTaskProgressUseCase', () => {
  const createMockRepo = (taskProgress: TaskProgress | null): ITaskProgressRepository => ({
    findById: jest.fn().mockResolvedValue(taskProgress),
    findByParticipantId: jest.fn(),
    save: jest.fn(),
    bulkCreate: jest.fn(),
  })

  it('所有者が進捗ステータスを変更できる', async () => {
    const tp = TaskProgress.create({
      id: 'tp-1', participantId: 'p-1', taskMasterId: 'tm-1',
      status: ProgressStatus.notStarted(),
    })
    const repo = createMockRepo(tp)
    const useCase = new UpdateTaskProgressUseCase(repo)
    await useCase.execute({ taskProgressId: 'tp-1', operatorId: 'p-1', newStatus: 'AWAITING_REVIEW' })
    expect(repo.save).toHaveBeenCalledWith(tp)
    expect(tp.status.value).toBe('AWAITING_REVIEW')
  })

  it('課題進捗が見つからない場合エラー', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateTaskProgressUseCase(repo)
    await expect(
      useCase.execute({ taskProgressId: 'not-found', operatorId: 'p-1', newStatus: 'AWAITING_REVIEW' }),
    ).rejects.toThrow('課題進捗が見つかりません')
  })

  it('所有者以外が変更するとエラー', async () => {
    const tp = TaskProgress.create({
      id: 'tp-1', participantId: 'p-1', taskMasterId: 'tm-1',
      status: ProgressStatus.notStarted(),
    })
    const repo = createMockRepo(tp)
    const useCase = new UpdateTaskProgressUseCase(repo)
    await expect(
      useCase.execute({ taskProgressId: 'tp-1', operatorId: 'other-user', newStatus: 'AWAITING_REVIEW' }),
    ).rejects.toThrow('課題の進捗ステータスを変更できるのは所有者のみです')
  })
})
