import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework'
import { MessageEmbed } from 'discord.js'
import type { ButtonInteraction, Message } from 'discord.js'

export class EnterGiveawayButtonHandler extends InteractionHandler {
  public constructor(ctx: InteractionHandler.Context) {
    super(ctx, { interactionHandlerType: InteractionHandlerTypes.Button })
  }

  public async run(interaction: ButtonInteraction, giveawayId: number) {
    const giveawayMessage = interaction.message as Message

    try {
      await this.container.database.giveawayEntry.create({
        data: {
          userId: interaction.user.id,
          giveawayId: giveawayId
        }
      })
    } catch (err) {
      // TODO: Actually start catch other errors
      await interaction.reply({
        ephemeral: true,
        content: `⚠️ You have been entered to this giveaway already!`
      })

      return
    }

    const giveawayData = await this.container.database.giveaway.findUniqueOrThrow({
      where: { id: giveawayId },
      select: { until: true }
    })
    if (giveawayData.until < new Date()) {
      await interaction.reply({
        ephemeral: true,
        content: `⚠️ This giveaway has ended!`
      })
    }

    const entriesCount = await this.container.database.giveawayEntry.aggregate({
      _count: {
        giveawayId: true
      },
      where: {
        giveawayId
      }
    })

    await giveawayMessage.edit({
      embeds: [
        new MessageEmbed(giveawayMessage.embeds[0]).setFooter({
          text: `🎉 ${entriesCount._count.giveawayId} people have joined the giveaway!`
        })
      ]
    })

    await interaction.reply({
      ephemeral: true,
      content: `✅ You are now entered to the giveaway`
    })
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('enter_giveaway')) return this.none()
    return this.some(parseInt(interaction.customId.split(':')[1]))
  }
}
