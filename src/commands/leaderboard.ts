import { Command, RegisterBehavior } from '@sapphire/framework'
import { MessageEmbed } from 'discord.js'
import { experienceToLevel } from '../constants/expLevel'
import { setTimeout } from 'timers/promises'

const NumberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact' })

export class LeaderboardCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, options)
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder.setName('leaderboard').setDescription('Shows the current EXP leaderboard'),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['1008734083939061810']
      }
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply()

    const leaderboardUsers = await this.container.database.userExp.findMany({
      select: {
        userId: true,
        exp: true
      },
      orderBy: {
        exp: 'desc'
      },
      take: 10
    })

    // TODO: Shared functions - Put this somewhere else
    const leaderboardStrings = leaderboardUsers.map((user, i) => {
      return `**${i + 1}.** <@${user.userId}> - Level ${experienceToLevel(
        user.exp
      )} (${NumberFormatter.format(user.exp)} EXP)`
    })

    await interaction.editReply({
      content: `The following is the leaderboard for server EXP:`,
      embeds: [
        new MessageEmbed()
          .setColor('#d946ef')
          .setAuthor({ name: '🏆 EXP Leaderboard' })
          .setTitle('Showing users with highest EXP')
          .setDescription(leaderboardStrings.join('\n'))
          .setTimestamp(interaction.createdTimestamp)
          .setFooter({ text: 'Page 1 | Updated at', iconURL: interaction.user.displayAvatarURL() })
      ],
      components: [
        {
          type: 'ACTION_ROW',
          components: [
            {
              customId: 'leaderboard_scroll:prev',
              type: 'BUTTON',
              style: 'SECONDARY',
              emoji: '⬅️',
              label: 'Previous page'
            },
            {
              customId: 'leaderboard_scroll:next',
              type: 'BUTTON',
              style: 'SECONDARY',
              emoji: '➡',
              label: 'Next page'
            }
          ]
        }
      ]
    })

    this.queueClearMessageButtons(interaction)
  }

  async queueClearMessageButtons(interaction: Command.ChatInputInteraction) {
    await setTimeout(1000 * 60 * 3)
    interaction.editReply({
      components: []
    })
  }
}
