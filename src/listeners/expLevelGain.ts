import { Point } from '@influxdata/influxdb-client'
import { Listener } from '@sapphire/framework'
import { Time } from '@sapphire/time-utilities'
import assert from 'assert'
import type { Message, Snowflake } from 'discord.js'
import { EXP_GAIN_EVENTS, MEASUREMENT_NAMES } from '../constants/analytics'
import { experienceToLevel, generateExp } from '../constants/expLevel'

const TRACKED_SERVER_ID: Snowflake[] = ['998384312065994782']
const LEVEL_LOG_CHANNEL: Snowflake = '1007273746903617706'

export class ExpLevelGainListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'messageCreate'
    })
  }

  async run(message: Message<true>): Promise<void> {
    if (message.author.bot) return
    if (!message.guild) return
    if (!TRACKED_SERVER_ID.some((id) => id === message.guild.id)) return

    let userExpData = await this.container.database.userExp.findUnique({
      where: {
        userId: message.author.id
      },
      select: {
        exp: true,
        timeoutUntil: true
      }
    })

    if (userExpData == null) {
      userExpData = await this.container.database.userExp.create({
        data: {
          userId: message.author.id
        },
        select: {
          exp: true,
          timeoutUntil: true
        }
      })
    }

    if (userExpData.timeoutUntil.getTime() > Date.now()) return

    let expGained = generateExp()

    // TODO: Resolve multiplier later
    // Boosting users will get 1.2x exp
    if (message.member?.roles.premiumSubscriberRole != null) {
      expGained *= 1.2
    }

    this.container.analytics.write.writePoint(
      new Point(MEASUREMENT_NAMES.EXP_GAIN)
        .intField('exp', expGained)
        .timestamp(message.createdAt)
        .tag('userId', message.author.id)
        .tag('event', EXP_GAIN_EVENTS.CHAT)
    )

    // TODO: Separate logic to custom events
    // If user gains a level
    if (experienceToLevel(userExpData.exp) != experienceToLevel(userExpData.exp + expGained)) {
      const logChannel = await this.container.client.channels.fetch(LEVEL_LOG_CHANNEL)
      assert(logChannel?.isText())

      logChannel.send({
        content: `⬆ <@${message.author.id}> (\`${message.author.id
          }\`) is now **Level ${experienceToLevel(userExpData.exp + expGained)}**!`,
        allowedMentions: {}
      })
    }

    await this.container.database.userExp.upsert({
      create: {
        userId: message.author.id,
        exp: expGained
      },
      update: {
        exp: {
          increment: expGained
        },
        timeoutUntil: {
          set: new Date(Date.now() + Time.Minute * 1)
        }
      },
      where: {
        userId: message.author.id
      }
    })
  }
}
