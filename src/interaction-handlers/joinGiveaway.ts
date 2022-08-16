import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import type { ButtonInteraction } from 'discord.js'

export class EnterGiveawayButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.Context) {
    super(ctx, { interactionHandlerType: InteractionHandlerTypes.Button })
  }

  // We'll look a little later in this guide on how to type this method, but for now, we'll type it as any.
  public async run(interaction: ButtonInteraction, giveawayId: number) {
    await interaction.reply({
      content: `You have been entered into the giveaway!`,
      ephemeral: true
    })

    await this.container.database.giveawayEntry
      .create({
        data: {
          userId: interaction.user.id,
          giveawayId: giveawayId
        }
      })
      .catch((err) => {
        this.container.logger.debug('Failed to add user to the giveaway', err)
      })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('enter_giveaway')) return this.none()
    return this.some(parseInt(interaction.customId.split(':')[1]))
  }
}
