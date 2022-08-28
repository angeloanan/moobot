import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

// Resets everyone's daily voice chat exp limit
export class VoiceChatExpReset extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'VoiceChatExpReset',
      interval: 1000 * 60 * 60 * 24 // Every 1 day
    })
  }

  public async run() {
    try {
      this.container.logger.debug('[CRON] Resetting Users EXP limit for Voice Chat')

      await this.container.database.userExp.updateMany({
        data: {
          voiceExpLeft: 1000
        }
      })
    } catch (e) {
      this.container.logger.error(e)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    VoiceChatExpReset: never
  }
}
