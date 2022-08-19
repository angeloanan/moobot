import { Command, RegisterBehavior } from '@sapphire/framework'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { stripIndent } from 'common-tags'
import type { TextChannel } from 'discord.js'
import parseDuration from 'parse-duration'
import { experienceToLevel } from '../constants/expLevel'

export class GiveawayCommand extends Subcommand {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, {
      ...options,
      subcommands: [
        {
          name: 'start',
          type: 'method',
          chatInputRun: 'giveawayStart'
        },
        {
          name: 'reroll',
          type: 'method',
          chatInputRun: 'giveawayReroll'
        },
        {
          name: 'end',
          type: 'method',
          chatInputRun: ''
        }
      ]
    })
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder
          .setName('giveaway')
          .setDescription('[ADMIN] Manages giveaways')
          .addSubcommand((input) =>
            input
              .setName('start')
              .setDescription('[ADMIN] Starts a new giveaway')
              .addStringOption((input) =>
                input
                  .setName('title')
                  .setDescription('The title of the giveaway (i.e, what will you be giving away)')
                  .setRequired(true)
              )
              .addStringOption((input) =>
                input
                  .setName('description')
                  .setDescription('[OPTIONAL] The description of the giveaway')
                  .setRequired(false)
              )
              .addStringOption((input) =>
                input
                  .setName('duration')
                  .setDescription('[Default: 1d] How long should the giveaway be held for')
                  .setRequired(false)
              )
              .addIntegerOption((input) =>
                input
                  .setName('winner_count')
                  .setDescription('[Default: 1] The number of winners to be chosen')
                  .setMinValue(0)
                  .setRequired(false)
              )
              .addAttachmentOption((input) =>
                input
                  .setName('image')
                  .setDescription('[OPTIONAL] An image to be shown on the giveaway message')
                  .setRequired(false)
              )
          )
          .addSubcommand((input) =>
            input
              .setName('reroll')
              .setDescription('[ADMIN] Rerolls ONE winner of a giveaway')
              .addIntegerOption((input) =>
                input
                  .setName('id')
                  .setDescription('The ID of the giveaway to reroll')
                  .setAutocomplete(true)
                  .setRequired(true)
              )
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['1009183635594825820']
      }
    )
  }

  public async giveawayStart(interaction: Subcommand.ChatInputInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const channel = interaction.channel as TextChannel
    const title = interaction.options.getString('title', true)
    const description = interaction.options.getString('description', false)
    const attachment = interaction.options.getAttachment('image', false)
    const duration =
      interaction.options.getString('duration', false) != null
        ? parseDuration(interaction.options.getString('duration', false) as string)
        : 1000 * 60 * 60 * 24
    const winnerCount = interaction.options.getInteger('winner_count', false) || 1

    const endTime = new Date(interaction.createdTimestamp + duration)

    const giveawayDbEntry = await this.container.database.giveaway.create({
      data: {
        title: title,
        description: description,
        hoster: interaction.user.id,
        winnerCount,
        createdAt: interaction.createdAt,
        until: endTime,
        channelId: channel.id
      }
    })

    await channel.send({
      embeds: [
        {
          title: title,
          description: stripIndent`
            ${description != null ? description : ''}
            ---
            **${winnerCount} winner will be chosen**
            Ends <t:${Math.floor(endTime.getTime() / 1000)}:R> (<t:${Math.floor(
            endTime.getTime() / 1000
          )}:F>)
            *Started by <@${interaction.user.id}>*
          `,
          thumbnail: {
            url: attachment?.url,
            proxy_url: attachment?.proxyURL
          },
          color: '#5865f2'
        }
      ],
      components: [
        {
          type: 'ACTION_ROW',
          components: [
            {
              type: 'BUTTON',
              style: 'PRIMARY',
              emoji: '🎉',
              label: 'Join',
              custom_id: `enter_giveaway:${giveawayDbEntry.id}`
            }
          ]
        }
      ]
    })

    this.container.tasks.create('giveawayEnd', giveawayDbEntry.id, duration)

    await interaction.editReply({ content: 'Giveaway started!' })
  }

  public async giveawayReroll(interaction: Subcommand.ChatInputInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const id = interaction.options.getInteger('id', true)
    const [giveawayData, giveawayParticipants] = await Promise.all([
      await this.container.database.giveaway.findUnique({
        where: { id }
      }),
      await this.container.database.giveawayEntry.findMany({
        where: { giveawayId: id }
      })
    ])

    if (giveawayData == null) {
      await interaction.editReply({ content: 'Giveaway not found!' })
      return
    }

    if (giveawayData.until > new Date()) {
      await interaction.editReply({ content: 'Giveaway did not end yet!' })
      return
    }

    // REFACTOR: Duplicate code
    const choiceArrays: string[] = []
    await Promise.all(
      giveawayParticipants.map(async (user) => {
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

    const winner = choiceArrays[Math.floor(Math.random() * choiceArrays.length)]
    const winnerUser = await this.container.client.users.fetch(winner)

    await interaction.channel?.send(
      stripIndent`
        > 🎉 **Congratulations <@${winnerUser.id}>**
        You won the re-roll for ${giveawayData.title}!
      `
    )

    await interaction.editReply({ content: 'Giveaway rerolled!' })
  }
}
