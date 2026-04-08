import { TaskProgress } from './TaskProgress'
import { ProgressStatus } from '../value-object/ProgressStatus'

describe('TaskProgress', () => {
  const createTaskProgress = (overrides?: { status?: ProgressStatus }) => {
    return TaskProgress.create({
      id: 'tp-1',
      participantId: 'p-1',
      taskMasterId: 'tm-1',
      status: overrides?.status ?? ProgressStatus.notStarted(),
    })
  }

  it('課題進捗を生成できる', () => {
    const tp = createTaskProgress()
    expect(tp.id).toBe('tp-1')
    expect(tp.participantId).toBe('p-1')
    expect(tp.status.value).toBe('NOT_STARTED')
  })

  it('所有者がステータスを変更できる', () => {
    const tp = createTaskProgress()
    tp.changeStatus(ProgressStatus.awaitingReview(), 'p-1')
    expect(tp.status.value).toBe('AWAITING_REVIEW')
  })

  it('所有者以外はステータスを変更できない', () => {
    const tp = createTaskProgress()
    expect(() => tp.changeStatus(ProgressStatus.awaitingReview(), 'other-user')).toThrow(
      '課題の進捗ステータスを変更できるのは所有者のみです',
    )
  })

  it('完了からは他のステータスに変更できない', () => {
    const tp = createTaskProgress({ status: ProgressStatus.completed() })
    expect(() => tp.changeStatus(ProgressStatus.notStarted(), 'p-1')).toThrow(
      '完了した課題のステータスは変更できません',
    )
  })
})
