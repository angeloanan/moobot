import type { GuildMember } from 'discord.js'

// Map<RoleID, MultiplierToAdd>
// More info: https://cdn.discordapp.com/attachments/896961989694345247/1012404583873650758/unknown.png
// TODO: Integrate roles with already existing lookup table in ./roles.ts
export const ROLE_EXP_FACTOR: [string, number][] = [
  // // Unused - Glaceon
  // ['893193643555434496'],
  // // Unused - Leafeon
  // ['893193594142355498'],
  // // 2 Years - Sylveon
  // ['893193702267314247'],
  // // 1.5 Year - Espeon
  // ['893139014515847198'],

  // 1 Year - Umbreon
  ['893138891085869106', 0.06],
  // 9 Months - Vaporeon
  ['893138766200467537', 0.03],
  // 6 Months - Jolteon
  ['893139052352647198', 0.03],
  // 3 Months - Flareon
  ['893138926234136627', 0.01],
  // 2 Months - Eevee
  ['893080566054932502', 0.02],

  // --- Server boost
  ['1013075673188945960', 0.05]

  // --- YouTube Members below
  //
  // //
  // ['', 0.05],
  // ['', 0.01],
  // ['', 0.03],
]

const rolesToMultiplier = new Map(ROLE_EXP_FACTOR)

/**
 * WARNING - Fetch GuildMember before passing members to this fn!
 */
export const resolveExpMultiplier = (user: GuildMember): number => {
  let multiplier = 1

  rolesToMultiplier.forEach((expFactor, roleId) => {
    if (user.roles.cache.has(roleId)) {
      multiplier += expFactor
    }
  })

  return multiplier
}
