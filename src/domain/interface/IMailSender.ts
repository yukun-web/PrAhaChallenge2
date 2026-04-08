export interface IMailSender {
  send(to: string, subject: string, body: string): Promise<void>
}
