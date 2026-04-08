export type ParticipantTaskDTO = {
  id: string
  name: string
  email: string
}

export type PaginatedResult<T> = {
  data: T[]
  totalCount: number
  page: number
  perPage: number
}

export interface IParticipantTaskQueryService {
  findByTaskProgress(
    taskMasterIds: string[],
    progressStatus: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedResult<ParticipantTaskDTO>>
}
