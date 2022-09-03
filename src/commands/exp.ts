import { RegisterBehavior } from '@sapphire/framework'
import { Subcommand } from '@sapphire/plugin-subcommands'
import type { TextChannel } from 'discord.js'

const logChannelId =
  process.env.ENGLISH_SERVER == 'true' ? '893136213765144627' : '998384313584336999'

export class ExpCommand extends Subcommand {
  public constructor(context: Subcommand.Context, options: Subcommand.Options) {
    super(context, {
      ...options,
      subcommands: [
        {
          name: 'increment',
          type: 'method',
          chatInputRun: 'incrementExp'
        },
        {
          name: 'decrement',
          type: 'method',
          chatInputRun: 'decrementExp'
        }
      ]
    })
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName('exp')
          .setDescription("[ADMIN] Manipulate user's EXP")
          .addSubcommand((command) =>
            command
              .setName('increment')
              .setDescription("Increment an user's EXP")
              .addUserOption((input) =>
                input.setName('user').setDescription('Target user to modify').setRequired(true)
              )
              .addIntegerOption((input) =>
                input.setName('amount').setDescription('Amount to increment by').setRequired(true)
              )
          )
          .addSubcommand((command) =>
            command
              .setName('decrement')
              .setDescription("Decrement an user's EXP")
              .addUserOption((input) =>
                input.setName('user').setDescription('Target user to modify').setRequired(true)
              )
              .addIntegerOption((input) =>
                input.setName('amount').setDescription('Amount to decrement by').setRequired(true)
              )
          ),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['']
      }
    )
  }

  public async incrementExp(interaction: Subcommand.ChatInputInteraction) {
    const user = interaction.options.getUser('user', true)
    const amount = interaction.options.getInteger('amount', true)

    const { exp: newExp } = await this.container.database.userExp.update({
      where: {
        userId: user.id
      },
      data: {
        exp: {
          increment: amount
        }
      },
      select: {
        exp: true
      }
    })

    const oldExp = newExp - amount
    const replyMessage = `Incremented <@${user.id}>'s EXP by ${amount} (\`${oldExp}\` -> \`${newExp}\`)`

    await interaction.reply({
      content: replyMessage
    })

    const logChannel = (await this.container.client.channels.fetch(logChannelId)) as TextChannel
    logChannel.send({ content: `<@${interaction.user.id}> ` + replyMessage })
  }

  public async decrementExp(interaction: Subcommand.ChatInputInteraction) {
    const user = interaction.options.getUser('user', true)
    const amount = interaction.options.getInteger('amount', true)

    const { exp: newExp } = await this.container.database.userExp.update({
      where: {
        userId: user.id
      },
      data: {
        exp: {
          decrement: amount
        }
      },
      select: {
        exp: true
      }
    })

    const oldExp = newExp - amount
    const replyMessage = `Decremented <@${user.id}>'s EXP by \`${amount}\` (\`${oldExp}\`xp -> \`${newExp}\`xp)`

    await interaction.reply({
      content: replyMessage
    })

    const logChannel = (await this.container.client.channels.fetch(logChannelId)) as TextChannel
    logChannel.send({ content: `<@${interaction.user.id}> ` + replyMessage })
  }
}
