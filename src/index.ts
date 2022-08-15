import 'dotenv/config'

import { container, LogLevel, SapphireClient } from '@sapphire/framework'
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis'
import type { ScheduledTaskRedisStrategyJob } from '@sapphire/plugin-scheduled-tasks/register-redis'
import type { Queue } from 'bullmq'
import { PrismaClient } from '@prisma/client'

export class BotClient extends SapphireClient {
  public constructor() {
    super({
      intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MEMBERS'],
      allowedMentions: { parse: ['roles', 'users'] },
      presence: {
        afk: true,
        status: 'idle',
        activities: [
          {
            name: 'for the ready signal',
            type: 'WATCHING'
          }
        ]
      },
      tasks: {
        strategy: new ScheduledTaskRedisStrategy({
          bull: {
            connection: {
              host: process.env.REDIS_HOST,
              username: process.env.REDIS_USER,
              port: 6379,
              password: process.env.REDIS_PASSWORD
            }
          }
        })
      },
      logger: { level: process.env.NODE_ENV === 'production' ? LogLevel.Info : LogLevel.Debug }
    })
  }

  public override async login(token?: string) {
    container.logger.info('Connecting to database...')
    container.database = new PrismaClient()
    await container.database.$connect()
    container.logger.info(`Connected to database.`)
    container.logger.info(`Bot logging in...`)
    return super.login(token)
  }

  public override async destroy() {
    container.logger.info(`Disconnecting from database...`)
    await container.database.$disconnect()
    container.logger.info(`Disconnected from database.`)

    const queueClient = this.options.tasks?.strategy
      .client as Queue<ScheduledTaskRedisStrategyJob | null>
    await queueClient?.close()

    return super.destroy()
  }
}

// Module augmentation for container
declare module '@sapphire/pieces' {
  interface Container {
    database: PrismaClient
  }
}

// Module augmentation for Discord
declare module 'discord.js' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ClientEvents {
    // TODO: Augment custom events here
    // CustomEvent: {}
  }
}

const client = new BotClient()

// Handle graceful exit
process.on('SIGUSR2', () => {
  console.log('[nodemon] restarting process, shutting down gracefully')
  client.destroy()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  client.destroy()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  client.destroy()
  process.exit(0)
})

client.login(process.env.BOT_TOKEN).catch((e) => console.error(e))
