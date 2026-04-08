import { Email } from './Email'

describe('Email', () => {
  it('有効なメールアドレスで生成できる', () => {
    const email = Email.create('test@example.com')
    expect(email.value).toBe('test@example.com')
  })

  it('不正な形式のメールアドレスでエラーになる', () => {
    expect(() => Email.create('invalid')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => Email.create('')).toThrow()
  })

  it('同じアドレスのEmailは等価', () => {
    const email1 = Email.create('test@example.com')
    const email2 = Email.create('test@example.com')
    expect(email1.equals(email2)).toBe(true)
  })

  it('異なるアドレスのEmailは等価でない', () => {
    const email1 = Email.create('a@example.com')
    const email2 = Email.create('b@example.com')
    expect(email1.equals(email2)).toBe(false)
  })
})
