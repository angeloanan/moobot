/**
 * Map<TimePassedInMs, RoleId>
 */
export const TIME_ROLE_PROGRESSION: [number, string][] =
  process.env.ENGLISH_SERVER === 'true'
    ? [
      // // Glaceon
      // [8, '893193643555434496'],
      // // Leafeon
      // [7, '893193594142355498'],

      // 2 Years - Sylveon
      [1000 * 60 * 60 * 24 * 30 * 12 * 2, '893193702267314247'],
      // 1.5 Year - Espeon
      [1000 * 60 * 60 * 24 * 30 * 12 * 1.5, '893139014515847198'],
      // 1 Year - Umbreon
      [1000 * 60 * 60 * 24 * 30 * 12, '893138891085869106'],
      // 9 Months - Vaporeon
      [1000 * 60 * 60 * 24 * 30 * 9, '893138766200467537'],
      // 6 Months - Jolteon
      [1000 * 60 * 60 * 24 * 30 * 6, '893139052352647198'],
      // 3 Months - Flareon
      [1000 * 60 * 60 * 24 * 30 * 3, '893138926234136627'],
      // 2 Months - Eevee
      [1000 * 60 * 60 * 24 * 30 * 2, '893080566054932502']
      // Eevee, Flareon, Jolteon, Vaporeon, Umbreon, Espeon, Sylveon
    ]
    : []
