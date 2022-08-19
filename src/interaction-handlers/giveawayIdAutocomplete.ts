import { InteractionHandler, InteractionHandlerTypes, PieceContext } from '@sapphire/framework'
import type { AutocompleteInteraction } from 'discord.js'

export class GiveawayIdAutocomplete extends InteractionHandler {
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Autocomplete
    })
  }

  public override async parse(interaction: AutocompleteInteraction) {
    if (interaction.commandName != 'giveaway') return this.none()

    const focusedOption = interaction.options.getFocused(true)

    switch (focusedOption.name) {
      case 'id': {
        const giveaways = await this.container.database.giveaway.findMany({
          select: {
            id: true,
            title: true,
            createdAt: true
          },
          where: {
            until: {
              lte: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        })

        return this.some(
          giveaways.map((g) => ({
            name: `${g.title} (Started ${g.createdAt.toUTCString()})`,
            value: g.id
          }))
        )
      }
      default:
        return this.none()
    }
  }

  public override async run(
    interaction: AutocompleteInteraction,
    result: InteractionHandler.ParseResult<this>
  ) {
    return interaction.respond(result)
  }
}
