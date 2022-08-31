import type { UserExp } from '@prisma/client'
import { Listener } from '@sapphire/framework'
import type { GuildMember, Snowflake, TextChannel } from 'discord.js'
import { experienceToLevel, LEVEL_ROLES_MAP } from '../constants/expLevel'

const LEVEL_LOG_CHANNEL: Snowflake =
  process.env.ENGLISH_SERVER === 'true' ? '1014229599737094244' : '1007273746903617706'

export class UserLevelUpListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'userLevelUp'
    })
  }

  async run(_oldMember: GuildMember, data: UserExp): Promise<void> {
    const logChannel = (await this.container.client.channels.fetch(
      LEVEL_LOG_CHANNEL
    )) as TextChannel
    const currentLevel = experienceToLevel(data.exp)
    const member = await _oldMember.fetch()

    await logChannel.send({
      content: `⬆ <@${member.id}> (\`${member.id}\`) is now **Level ${currentLevel}**!`,
      allowedMentions: {
        parse: []
      }
    })

    if (process.env.ENGLISH_SERVER == 'true') {
      Object.entries(LEVEL_ROLES_MAP).forEach((values) => {
        const [levelStr, roleId] = values
        const level = parseInt(levelStr)

        if (currentLevel >= level && !member.roles.cache.has(roleId)) {
          // If user's level is high enough to get the role, give it to them
          member.roles.add(roleId)
        } else if (currentLevel < level && member.roles.cache.has(roleId)) {
          // If user's level is too low to get the role, remove it from them
          member.roles.remove(roleId)
        }
      })
    }
  }
}
