import { Listener } from '@sapphire/framework'
import type { RateLimitData } from 'discord.js'

export class RateLimitListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'rateLimit'
    })
  }

  async run(data: RateLimitData): Promise<void> {
    this.container.logger.warn(
      `Rate limit exceeded: ${data.method.toUpperCase()} ${data.path} (${data.timeout}ms -> ${data.limit
      } request)`
    )
  }
}
