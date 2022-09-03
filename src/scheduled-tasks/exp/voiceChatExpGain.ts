import { Point } from '@influxdata/influxdb-client'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import type { GuildMember, VoiceChannel } from 'discord.js'
import { EXP_GAIN_EVENTS, MEASUREMENT_NAMES } from '../../constants/analytics'
import { experienceToLevel, generateExp } from '../../constants/expLevel'

const TRACKED_GUILD_ID =
  process.env.ENGLISH_SERVER === 'true' ? '887126730060484648' : '998384312065994782'
const EXCLUDED_CHANNEL_IDS = ['1012983228354801684', '1014610268380205057']

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
      const guild = await this.container.client.guilds.fetch(TRACKED_GUILD_ID)

      if (!guild) {
        this.container.logger.fatal(`Could not find guild with ID ${TRACKED_GUILD_ID}`)
        return
      }

      const usersToAddEXP = new Set<GuildMember>()
      const voiceChannels = guild.channels.cache
        .filter((c) => c.isVoice())
        .filter((vc) => !EXCLUDED_CHANNEL_IDS.includes(vc.id)) // Filter out excluded channels

      await Promise.all(
        voiceChannels.map(async (vc) => {
          const newVcData = (await vc.fetch(true)) as VoiceChannel

          // Allows for at least 2 non-bot users in the channel
          if (newVcData.members.filter((m) => !m.user.bot).size < 2) return
          for (const [, member] of newVcData.members) {
            usersToAddEXP.add(member)
          }
        })
      )

      for (const member of usersToAddEXP) {
        const expGained = generateExp()

        let userExpData = await this.container.database.userExp.findUnique({
          where: {
            userId: member.id
          },
          select: {
            voiceExpLeft: true,
            exp: true
          }
        })

        if (userExpData == null) {
          userExpData = await this.container.database.userExp.create({
            data: {
              userId: member.id
            }
          })
        }

        if (userExpData.voiceExpLeft - expGained > 0) continue

        const updatedUserExpData = await this.container.database.userExp.upsert({
          where: {
            userId: member.id
          },
          update: {
            voiceExpLeft: {
              decrement: expGained
            },
            exp: {
              increment: expGained
            }
          },
          create: {
            userId: member.id,
            exp: expGained,
            voiceExpLeft: 1000 - expGained
          }
        })

        if (experienceToLevel(userExpData.exp) != experienceToLevel(userExpData.exp + expGained)) {
          this.container.client.emit('userLevelUp', member, updatedUserExpData)
        }

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
