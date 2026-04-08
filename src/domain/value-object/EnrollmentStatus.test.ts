import { EnrollmentStatus } from './EnrollmentStatus'

describe('EnrollmentStatus', () => {
  it('在籍中を生成できる', () => {
    const status = EnrollmentStatus.enrolled()
    expect(status.value).toBe('ENROLLED')
    expect(status.isEnrolled()).toBe(true)
  })

  it('休会中を生成できる', () => {
    const status = EnrollmentStatus.onLeave()
    expect(status.value).toBe('ON_LEAVE')
    expect(status.isEnrolled()).toBe(false)
  })

  it('退会済を生成できる', () => {
    const status = EnrollmentStatus.withdrawn()
    expect(status.value).toBe('WITHDRAWN')
    expect(status.isEnrolled()).toBe(false)
  })

  it('同じステータスは等価', () => {
    expect(EnrollmentStatus.enrolled().equals(EnrollmentStatus.enrolled())).toBe(true)
  })

  it('異なるステータスは等価でない', () => {
    expect(EnrollmentStatus.enrolled().equals(EnrollmentStatus.onLeave())).toBe(false)
  })
})
