import { type FixturesFile, FixturesFileSchema } from '@chata/shared'

import { rawFixtures } from './fixtures.generated'

let cachedFixtures: FixturesFile | null = null

/** Validates the generated fixture payload (bundled at build time). Single source of truth: root fixtures.json. */
export function loadFixtures(): FixturesFile {
  cachedFixtures ??= FixturesFileSchema.parse(rawFixtures)
  return cachedFixtures
}
