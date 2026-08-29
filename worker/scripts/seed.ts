import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { FixturesFileSchema } from '@chata/shared'

/**
 * Generates `.seed/seed.sql` from the root fixtures.json. Executed against local
 * D1 by the `seed` package script (cwd = worker/). Kept idempotent (DELETE before
 * INSERT) so it can be re-run to reset state between eval runs.
 */

const escapeSql = (value: string) => value.replace(/'/g, "''")

const workerDir = process.cwd()
const raw = JSON.parse(readFileSync(resolve(workerDir, '..', 'fixtures.json'), 'utf8'))
const fixtures = FixturesFileSchema.parse(raw)

const statements = [
  'DELETE FROM catalog_items;',
  'DELETE FROM payment_records;',
  ...fixtures.store_catalog.map(
    (item) =>
      `INSERT INTO catalog_items (sku, name, price_ngn, stock) VALUES ('${escapeSql(item.sku)}', '${escapeSql(item.name)}', ${item.price_ngn}, ${item.stock});`,
  ),
  ...fixtures.payment_records.map(
    (payment) =>
      `INSERT INTO payment_records (id, amount_ngn, sender_ref, timestamp, matched) VALUES ('${escapeSql(payment.id)}', ${payment.amount_ngn}, '${escapeSql(payment.sender_ref)}', '${escapeSql(payment.timestamp)}', ${payment.matched ? 1 : 0});`,
  ),
]

const outDir = resolve(workerDir, '.seed')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'seed.sql'), `${statements.join('\n')}\n`)

console.log(
  `Wrote ${statements.length} statements (${fixtures.store_catalog.length} catalog items, ${fixtures.payment_records.length} payments) to .seed/seed.sql`,
)
