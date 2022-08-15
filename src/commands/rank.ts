import { Command, RegisterBehavior } from '@sapphire/framework'
import { stripIndents } from 'common-tags'
import { MessageEmbed } from 'discord.js'
import { experienceToLevel, levelExpTotal } from '../constants/expLevel.js'

export class RankCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, options)
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('rank')
          .setDescription('Displays your current detailed rank information')
          .addUserOption((builder) =>
            builder
              .setName('user')
              .setDescription('[Default: You] The user to display rank information')
              .setRequired(false)
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['1007232904021155870']
      }
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply()

    const queryUser = interaction.options.getUser('user', false)?.id ?? interaction.user.id
    const userDiscordData = await this.container.client.users.fetch(queryUser)
    const memberData = await interaction.guild!.members.fetch(queryUser)!

    let userRankData = await this.container.database.userExp.findUnique({
      where: { userId: queryUser }
    })

    if (!userRankData) {
      userRankData = await this.container.database.userExp.create({
        data: {
          userId: queryUser
        }
      })
    }

    const userIsBoosting = memberData?.roles.premiumSubscriberRole != null
    const currentUserLevel = Math.floor(experienceToLevel(userRankData.exp))
    const expToLevelUp = levelExpTotal(currentUserLevel + 1) - userRankData.exp
    const prestigeText =
      userRankData.prestige === 0 ? 'No prestige' : `Prestige ${userRankData.prestige}`

    interaction.editReply({
      content: `Showing information for <@${userRankData.userId}>'s rank`,
      embeds: [
        new MessageEmbed()
          .setColor('#d946ef')
          .setAuthor({
            name: `${userDiscordData.tag} Rank Information`,
            url: `https://discord.com/users/${userRankData.userId}`
          })
          .setThumbnail(userDiscordData.displayAvatarURL()) //
          .setDescription(stripIndents`
            **\`🏆  PRESTIGE:\`** ${prestigeText}
            ------------------------------
            **\`🏅     LEVEL:\`** ${currentUserLevel}
            **\`🥗       EXP:\`** ${userRankData.exp} EXP (${expToLevelUp} to level up)
            **\`🚀 EXP BOOST:\`** ${userIsBoosting ? '1.2x' : '1.0x'}
            **\`🗓️ JOIN DATE:\`** <t:${Math.round(memberData.joinedAt!.getTime() / 1000)}:f>
          `)
      ]
    })
  }
}
