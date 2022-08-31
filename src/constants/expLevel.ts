// https://gamedev.stackexchange.com/questions/20934/how-to-create-adjustable-formula-for-rpg-level-up-requirements

import type { Snowflake } from 'discord.js'

// Intended total level
const TOTAL_LEVEL = 100
const FIRST_LEVEL_EXP = 1_000
const LAST_LEVEL_EXP = 1_000_000

// Internal constants below
const B = Math.log(LAST_LEVEL_EXP / FIRST_LEVEL_EXP) / (TOTAL_LEVEL - 1)
const A = FIRST_LEVEL_EXP / (Math.exp(B) - 1)

/**
 * Returns a random exp constraining between Lower and Upper bound.
 * Designed to be called every time a user gains an exp (1 chat per minute)
 * @returns {number} Random EXP between lowerBound and upperBound
 */
export const generateExp = (): number => {
  const lowerBound = 75
  const upperBound = 100

  return Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound
}

/**
 * Query the amount of exp needed to reach a certain level
 * @param level Level needed
 * @returns The EXP needed to reached this level
 */
export const levelExpTotal = (level: number): number => {
  return Math.round(A * Math.exp(B * level) - A)
}

/**
 * Determine the current user's level based on their experience level
 * @param experience The amount of exp to be counted
 */
export const experienceToLevel = (experience: number): number => {
  return Math.floor(Math.log((experience + A) / A) / B)
}

/**
 * Query the amount of exp needed to reach `level` if you're at `level - 1`
 * @param level Level to be reached
 * @param currentLevel Current level to start calculating
 * @returns The EXP needed to reach this level if you are at `level - 1` level
 */
export const experienceNeededToLevelUp = (
  level: number,
  currentLevel: number = level - 1
): number => {
  return levelExpTotal(level) - levelExpTotal(currentLevel)
}

export const LEVEL_ROLES_MAP: Record<number, Snowflake> = {
  100: '1014585354117984318',
  90: '1014585360380067951',
  80: '1014585364213674086',
  70: '1014585367883689988',
  60: '1014585371373355058',
  50: '1014585371373355063',
  40: '1014585374825250846',
  30: '1014585378939875328',
  20: '1014585382291116102',
  10: '1014585385013235865'
}
