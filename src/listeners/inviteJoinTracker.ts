import { Point } from '@influxdata/influxdb-client'
import { Listener } from '@sapphire/framework'
import type { Collection, GuildMember, Invite } from 'discord.js'
import { MEASUREMENT_NAMES } from '../constants/analytics'

const trackedGuild = '998384312065994782'

let oldInvitesCollection: Collection<string, Invite>

export class InitialInvitePropagator extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'ready',
      once: true
    })
  }

  async run(): Promise<void> {
    const guild = await this.container.client.guilds.fetch(trackedGuild)
    oldInvitesCollection = await guild.invites.fetch()
  }
}

export class InviteJoinListener extends Listener {
  public constructor(context: Listener.Context, options: Listener.Options) {
    super(context, {
      ...options,
      event: 'guildMemberAdd'
    })
  }

  async run(member: GuildMember): Promise<void> {
    if (trackedGuild !== member.guild.id) return

    const currentInviteCollection = await member.guild.invites.fetch()

    // Find difference in invite's uses
    const usedInvite = currentInviteCollection.find((newInvite, key) => {
      const oldInvite = oldInvitesCollection.get(key)

      // Invite might not be created yet
      if (oldInvite == null) return false
      return oldInvite.uses != newInvite.uses
    })

    // Early set due to early returns
    oldInvitesCollection = currentInviteCollection

    if (usedInvite == null)
      return this.container.logger.warn(`No invite found for ${member.user.tag}.`)

    if (usedInvite.inviterId == null) {
      return this.container.logger.warn(
        `Can't find the inviter for invite code ${usedInvite.code}. Are they joining through a vanity link?`
      )
    }

    this.container.logger.info(`${member.user.tag} joined using ${usedInvite.code}`)
    await this.container.database.userInvites.upsert({
      where: {
        userId: usedInvite.inviterId
      },
      update: {
        inviteCount: {
          increment: 1
        }
      },
      create: {
        userId: usedInvite.inviterId,
        inviteCount: 1
      }
    })

    this.container.analytics.write.writePoint(
      new Point(MEASUREMENT_NAMES.INVITE)
        .stringField('joinedUser', member.user.id)
        .timestamp(member.joinedTimestamp!)
        .tag('code', usedInvite.code)
        .tag('user', member.user.id)
    )
  }
}
