import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { stripIndent } from 'common-tags'
import { MessageEmbed, TextChannel } from 'discord.js'
import { experienceToLevel } from '../constants/expLevel'

export class GiveawayEndTask extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'giveawayEnd'
    })
  }

  public async run(id: number) {
    try {
      const [giveawayData, userGiveawayEntries] = await Promise.all([
        await this.container.database.giveaway.findUniqueOrThrow({
          where: { id }
        }),
        await this.container.database.giveawayEntry.findMany({
          where: {
            giveawayId: id
          },
          select: {
            userId: true
          }
        })
      ])

      // TODO: Silent error
      if (giveawayData.ended) return

      await this.container.database.giveaway.update({
        where: { id },
        data: { ended: true }
      })

      /**
       * Array of user ids
       */
      const choiceArrays: string[] = []
      await Promise.all(
        userGiveawayEntries.map(async (user) => {
          const userId = user.userId

          const userLevelData = await this.container.database.userExp.findUnique({
            where: { userId },
            select: { exp: true }
          })

          const userLevel = userLevelData?.exp != null ? experienceToLevel(userLevelData.exp) : 0

          // Add 1 extra chance per 10 level
          // Level 0 = only 1 chance
          for (let i = 0; i <= userLevel; i += 10) {
            choiceArrays.push(userId)
          }
        })
      )

      const channel = (await this.container.client.channels.fetch(
        giveawayData.channelId
      )) as TextChannel

      const originalGiveawayMessage = await channel.messages.fetch(giveawayData.messageId)
      await originalGiveawayMessage.edit({
        components: [],
        embeds: [
          new MessageEmbed(originalGiveawayMessage.embeds[0])
            .setColor('#2F3136')
            .setDescription(
              // TODO: Duplicated code - make this a function!
              stripIndent`
                ${giveawayData.description != null ? giveawayData.description : ''}
                ---
                **${giveawayData.winnerCount} winner will be chosen**
                Ended <t:${Math.floor(giveawayData.until.getTime() / 1000)}:R>
                *Started by <@${giveawayData.hoster}>*
              `
            )
            .setFooter({
              text: 'ENDED | ' + originalGiveawayMessage.embeds[0].footer?.text
            })
        ]
      })

      if (choiceArrays.length === 0) {
        await channel.send(`Nobody entered the giveaway for ${giveawayData.title}. So, nobody won!`)
      }

      // Randomly select a winner
      for (let i = 0; i < giveawayData.winnerCount; i++) {
        const winner = choiceArrays[Math.floor(Math.random() * choiceArrays.length)]
        await channel.send({
          content: `**🎉 CONGRATULATIONS <@${winner}>** won the giveaway for ${giveawayData.title}!`,
          reply: {
            messageReference: originalGiveawayMessage,
            failIfNotExists: false
          }
        })
      }
    } catch (e) {
      this.container.logger.error(e)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    giveawayEnd: never
  }
}
