import { Command, RegisterBehavior } from '@sapphire/framework'
import { stripIndents } from 'common-tags'
import { MessageEmbed } from 'discord.js'
import { experienceToLevel } from '../constants/expLevel.js'

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
      orderBy: {
        exp: 'desc'
      },
      take: 10
    })

    const leaderboardStrings = leaderboardUsers.map((user, i) => {
      return `**${i + 1}.** <@${user.userId}> - Level ${experienceToLevel(
        user.exp
      )} (${NumberFormatter.format(user.exp)} EXP)`
    })

    interaction.editReply({
      content: `Showing the leaderboard of users with the top EXP in the server`,
      embeds: [
        new MessageEmbed()
          .setColor('#d946ef')
          .setTitle('LEADERBOARD - Top 10 users with highest EXP')
          .setDescription(
            stripIndents`
              ${leaderboardStrings.join('\n')}
            `
          )
          .setTimestamp(interaction.createdTimestamp)
          .setFooter({ text: 'Updated at', iconURL: interaction.user.displayAvatarURL() })
      ]
    })
  }
}
