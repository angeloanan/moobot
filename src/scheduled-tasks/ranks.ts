import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'
import { GUILD_ID } from '../constants/guild'
import { TIME_ROLE_PROGRESSION } from '../constants/roles'

export class RankUpdateTask extends ScheduledTask {
  public constructor(context: ScheduledTask.Context, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'rankUpdate',
      interval: 60 * 60 * 1000 // Every hour
    })
  }

  public async run() {
    try {
      this.container.logger.debug('[CRON] Updating ranks...')

      const guild = await this.container.client.guilds.cache.get(GUILD_ID)

      if (!guild) {
        this.container.logger.fatal(`Could not find guild with ID ${GUILD_ID}`)
        return
      }

      const allMembers = await guild.members.fetch()

      const filteredMembers = allMembers.filter((u) => !u.user.bot)
      // const allCount = filteredMembers.size
      // const count = 0

      for await (const [, user] of filteredMembers) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        // this.container.logger.debug(`Processing user ${user.user.tag} (${count++} / ${allCount})`)
        const userJoinTime = user.joinedAt
        const userRoles = user.roles.cache

        if (!userJoinTime) {
          this.container.logger.error(
            `Could not find join time for user ${user.user.tag} (${user.user.id})`
          )
          return
        }

        // this.container.logger.debug(`${user.user.tag} joined on ${userJoinTime.toISOString()}`)

        for await (const [timePassed, roleId] of TIME_ROLE_PROGRESSION) {
          if (
            userJoinTime.getTime() + timePassed < new Date().getTime() &&
            !userRoles.has(roleId)
          ) {
            await user.roles.add(
              roleId,
              `Time progression - User has been in the server for long enough (${timePassed} ms)`
            )

            this.container.logger.debug(`[CRON] Added role ${roleId} to ${user.user.tag}`)
          } else if (
            // Removing extra roles
            userRoles.has(roleId) &&
            userJoinTime.getTime() + timePassed >= new Date().getTime()
          ) {
            await user.roles.remove(
              roleId,
              `Time progression - User doesn't have enough time in the server (${timePassed} ms)`
            )

            this.container.logger.debug(`[CRON] Removed role ${roleId} from ${user.user.tag}`)
          }
        }
      }
    } catch (e) {
      this.container.logger.error(e)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    cron: never
  }
}
