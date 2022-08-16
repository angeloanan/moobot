import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import type { TextChannel } from 'discord.js'
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
        await this.container.database.giveaway.findUnique({
          where: { id },
          rejectOnNotFound: true
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

      // 1 chance = 1 entry in choiceArrays
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

          for (let i = 0; i <= userLevel; i++) {
            choiceArrays.push(userId)
          }
        })
      )

      const channel = (await this.container.client.channels.fetch(
        giveawayData.channelId
      )) as TextChannel

      // Randomly select a winner
      for (let i = 0; i < giveawayData.winnerCount; i++) {
        const winner = choiceArrays[Math.floor(Math.random() * choiceArrays.length)]
        channel.send(
          `**🎉 CONGRATULATIONS <@${winner}>** won the giveaway for ${giveawayData.title}!`
        )
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
