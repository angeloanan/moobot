import { Point } from '@influxdata/influxdb-client'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import type { Collection, GuildMember } from 'discord.js'
import { EXP_GAIN_EVENTS, MEASUREMENT_NAMES } from '../../constants/analytics'
import { generateExp } from '../../constants/expLevel'

const TRACKED_GUILD_ID = '998384312065994782'

export class VoiceChatExpGain extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'VoiceChatExpGain',
      interval: 1000 * 60 * 3 // Every 3 minutes
    })
  }

  public async run() {
    try {
      this.container.logger.debug('[CRON] Giving EXP to Voice Chat users')

      const currentTime = new Date()
      const guild = await this.container.client.guilds.cache.get(TRACKED_GUILD_ID)

      if (!guild) {
        this.container.logger.fatal(`Could not find guild with ID ${TRACKED_GUILD_ID}`)
        return
      }

      const usersToAddEXP = new Set<GuildMember>()
      const voiceChannels = guild.channels.cache.filter((c) => c.isVoice())
      voiceChannels.each((vc) =>
        (vc.members as Collection<string, GuildMember>).each((member) => usersToAddEXP.add(member))
      )

      for (const member of usersToAddEXP) {
        const expGained = generateExp()

        await this.container.database.userExp.upsert({
          where: {
            userId: member.id
          },
          update: {
            exp: {
              increment: expGained
            }
          },
          create: {
            userId: member.id,
            exp: expGained
          }
        })
        // TODO: Cap voice chat exp gains at 1000 exp per day
        // Need to add more field to userExp table to keep track of exp gained per day

        this.container.analytics.write.writePoint(
          new Point(MEASUREMENT_NAMES.EXP_GAIN)
            .intField('exp', expGained)
            .timestamp(currentTime)
            .tag('userId', member.id)
            .tag('event', EXP_GAIN_EVENTS.VOICE_CHAT)
        )
      }
    } catch (e) {
      this.container.logger.error(e)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    VoiceChatExpGain: never
  }
}
