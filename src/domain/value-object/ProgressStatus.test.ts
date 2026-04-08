import { ProgressStatus } from './ProgressStatus'

describe('ProgressStatus', () => {
  it('未着手を生成できる', () => {
    const status = ProgressStatus.notStarted()
    expect(status.value).toBe('NOT_STARTED')
  })

  it('レビュー待ちを生成できる', () => {
    const status = ProgressStatus.awaitingReview()
    expect(status.value).toBe('AWAITING_REVIEW')
  })

  it('完了を生成できる', () => {
    const status = ProgressStatus.completed()
    expect(status.value).toBe('COMPLETED')
  })

  describe('ステータス遷移', () => {
    it('未着手 → レビュー待ちに変更できる', () => {
      const current = ProgressStatus.notStarted()
      const next = ProgressStatus.awaitingReview()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('未着手 → 完了に変更できる', () => {
      const current = ProgressStatus.notStarted()
      const next = ProgressStatus.completed()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('レビュー待ち → 完了に変更できる', () => {
      const current = ProgressStatus.awaitingReview()
      const next = ProgressStatus.completed()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('レビュー待ち → 未着手に変更できる', () => {
      const current = ProgressStatus.awaitingReview()
      const next = ProgressStatus.notStarted()
      expect(() => current.canTransitionTo(next)).not.toThrow()
    })

    it('完了 → 未着手に変更できない', () => {
      const current = ProgressStatus.completed()
      const next = ProgressStatus.notStarted()
      expect(() => current.canTransitionTo(next)).toThrow('完了した課題のステータスは変更できません')
    })

    it('完了 → レビュー待ちに変更できない', () => {
      const current = ProgressStatus.completed()
      const next = ProgressStatus.awaitingReview()
      expect(() => current.canTransitionTo(next)).toThrow('完了した課題のステータスは変更できません')
    })
  })
})
