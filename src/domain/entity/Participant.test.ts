import { Participant } from './Participant'
import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

describe('Participant', () => {
  const createParticipant = (overrides?: {
    status?: EnrollmentStatus
    pairId?: string | null
  }) => {
    return Participant.create({
      id: 'participant-1',
      name: 'テスト太郎',
      email: Email.create('test@example.com'),
      status: overrides?.status ?? EnrollmentStatus.enrolled(),
      pairId: overrides?.pairId ?? null,
    })
  }

  it('参加者を生成できる', () => {
    const participant = createParticipant()
    expect(participant.id).toBe('participant-1')
    expect(participant.name).toBe('テスト太郎')
    expect(participant.email.value).toBe('test@example.com')
    expect(participant.status.isEnrolled()).toBe(true)
    expect(participant.pairId).toBeNull()
  })

  it('在籍ステータスを変更できる', () => {
    const participant = createParticipant()
    participant.changeStatus(EnrollmentStatus.onLeave())
    expect(participant.status.value).toBe('ON_LEAVE')
  })

  it('在籍中でない参加者にペアを割り当てるとエラーになる', () => {
    const participant = createParticipant({ status: EnrollmentStatus.onLeave() })
    expect(() => participant.assignToPair('pair-1')).toThrow(
      '在籍中でない参加者はペアに所属できません',
    )
  })

  it('在籍中の参加者にペアを割り当てられる', () => {
    const participant = createParticipant()
    participant.assignToPair('pair-1')
    expect(participant.pairId).toBe('pair-1')
  })

  it('ペアから離脱できる', () => {
    const participant = createParticipant({ pairId: 'pair-1' })
    participant.leavePair()
    expect(participant.pairId).toBeNull()
  })
})
