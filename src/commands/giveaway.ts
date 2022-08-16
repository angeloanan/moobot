import { Command, RegisterBehavior } from '@sapphire/framework'
import { Subcommand } from '@sapphire/plugin-subcommands'
import { stripIndent } from 'common-tags'
import type { TextChannel } from 'discord.js'
import parseDuration from 'parse-duration'

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
          chatInputRun: ''
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
              .setDescription('[ADMIN] Rerolls a giveaway')
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
        idHints: ['']
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

    this.container.logger.debug(interaction.options.getAttachment('image', false))

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
              custom_id: `enter_giveaway:${giveawayDbEntry.id}`
            }
          ]
        }
      ]
    })

    this.container.tasks.create('giveawayEnd', giveawayDbEntry.id, duration)

    await interaction.editReply({ content: 'Giveaway started!' })
  }
}
