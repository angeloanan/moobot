import { Command, RegisterBehavior } from '@sapphire/framework'
import { TOPICS } from '../constants/topics'

export class TopicCommand extends Command {
  public constructor(context: Command.Context, options: Command.Options) {
    super(context, options)
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName('topic')
          .setDescription('Generates a new topic to be sent to chat'),
      {
        behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        idHints: ['1007107177670004757']
      }
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputInteraction) {
    const topicCount = TOPICS.length
    const topicIndex = Math.floor(Math.random() * topicCount)

    interaction.reply({ content: TOPICS[topicIndex] })
  }
}
