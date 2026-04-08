import { IMailSender } from '../../domain/interface/IMailSender'

export class ConsoleMailSender implements IMailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log('========== MAIL ==========')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${body}`)
    console.log('==========================')
  }
}
