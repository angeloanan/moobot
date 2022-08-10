import { Command, RegisterBehavior } from '@sapphire/framework'
import { ApplicationCommandType } from 'discord-api-types/v9'
import { TranslateClient } from '../lib/translate'
import assert from 'assert'

export class TranslateContextMenu extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, options)
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerContextMenuCommand(
      (builder) =>
        builder //
          .setName('Translate to English')
          .setType(ApplicationCommandType.Message),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['1002566269448499300']
      }
    )
  }

  public override async contextMenuRun(interaction: Command.ContextMenuInteraction) {
    assert(interaction.isMessageContextMenu())

    try {
      await interaction.deferReply({ ephemeral: true, fetchReply: true })

      const message = interaction.targetMessage

      const [translatedText] = await TranslateClient.translate(message.content, { to: 'en' })

      await interaction.editReply({ content: translatedText })
    } catch (e) {
      interaction.editReply('Something went wrong: ' + e)
    }
  }
}
