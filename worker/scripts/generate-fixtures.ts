import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Generates `src/lib/fixtures.generated.ts` from the root fixtures.json.
 * Wrangler only bundles modules inside worker/, so the fixture payload is
 * embedded at build time. The root fixtures.json stays the single source of
 * truth; rerun via `bun scripts/generate-fixtures.ts` (wired into dev/test/deploy).
 */

const raw = JSON.parse(readFileSync(resolve(process.cwd(), '..', 'fixtures.json'), 'utf8'))
const out = `// GENERATED from ../../fixtures.json — do not edit by hand; run \`bun scripts/generate-fixtures.ts\`.\n\nexport const rawFixtures = ${JSON.stringify(raw, null, 2)} as const\n`

writeFileSync(resolve(process.cwd(), 'src/lib/fixtures.generated.ts'), out)
console.log('Wrote src/lib/fixtures.generated.ts from root fixtures.json')
