import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { MessageEmbed } from 'discord.js'
import type { Message, ButtonInteraction } from 'discord.js'
import { experienceToLevel } from '../constants/expLevel'

const NumberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact' })

// TODO: Move this to `constants` and hook this to `commands/leaderboard`
const LEADERBOARD_ENTRY_PER_PAGE = 10

export class LeaderboardScrollButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.Context) {
    super(ctx, { interactionHandlerType: InteractionHandlerTypes.Button })
  }

  public async run(interaction: ButtonInteraction, scrollDir: 'prev' | 'next') {
    const originalMessage = interaction.message as Message

    const currentPageString =
      originalMessage.embeds[0].footer?.text?.match(/Page (\d+)/)?.[1] ?? '1'
    const currentPage = parseInt(currentPageString)

    let newPage = scrollDir === 'prev' ? currentPage - 1 : currentPage + 1
    if (newPage < 1) newPage = 1

    const leaderboardUsers = await this.container.database.userExp.findMany({
      select: {
        userId: true,
        exp: true
      },
      orderBy: {
        exp: 'desc'
      },
      skip: (newPage - 1) * LEADERBOARD_ENTRY_PER_PAGE,
      take: LEADERBOARD_ENTRY_PER_PAGE
    })

    const leaderboardStrings = leaderboardUsers.map((user, i) => {
      return `**${(newPage - 1) * LEADERBOARD_ENTRY_PER_PAGE + i + 1}.** <@${
        user.userId
      }> - Level ${experienceToLevel(user.exp)} (${NumberFormatter.format(user.exp)} EXP)`
    })

    await interaction.update({
      content: `The following is the leaderboard for server EXP:`,
      embeds: [
        new MessageEmbed(originalMessage.embeds[0])
          .setDescription(leaderboardStrings.join('\n'))
          .setTimestamp(new Date())
          .setFooter({
            text: `Page ${newPage} | Updated at`,
            iconURL: interaction.user.displayAvatarURL()
          })
      ]
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('leaderboard_scroll')) return this.none()
    return this.some(interaction.customId.split(':')[1])
  }
}
