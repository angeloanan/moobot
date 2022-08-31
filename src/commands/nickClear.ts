import { Command, RegisterBehavior } from '@sapphire/framework'

export class ClearNickCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, options)
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) => builder.setName('clearnick').setDescription("[ADMIN] Clear everyone's nick"),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: []
      }
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.reply({ content: '👍' })

    const guild = await this.container.client.guilds.fetch(interaction.guildId!)
    const allMembers = await guild.members.fetch()

    for await (const [_, m] of allMembers) {
      if (m.nickname != null) {
        await m.setNickname(null, 'Clearing nick')
      }
    }
  }
}
