import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import express from 'express'
import { createApp } from '../main'

let app: express.Express
let prisma: PrismaClient

export async function setupE2E(): Promise<{
  app: express.Express
  prisma: PrismaClient
}> {
  execSync('npx dotenv -e .test.env -- prisma migrate reset --force', {
    stdio: 'pipe',
  })

  prisma = new PrismaClient()
  app = await createApp(prisma)
  return { app, prisma }
}

export async function teardownE2E(): Promise<void> {
  await prisma.$disconnect()
}
