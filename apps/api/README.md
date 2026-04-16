# `@ethsec/api`

Fastify backend for the ETHSecurity Voting Badge: receives encrypted
voting-address submissions, verifies the EIP-712 signature, checks ERC-721
ownership onchain, and stores the ciphertext bundle in Postgres for later
batch decryption by the trusted operator.

## Routes

| Method | Path                       | Purpose                                                                |
| ------ | -------------------------- | ---------------------------------------------------------------------- |
| GET    | `/health`                  | Liveness                                                               |
| GET    | `/config`                  | Public ML-KEM-768 key + EIP-712 domain (consumed by the FE)            |
| GET    | `/token-status/:tokenId`   | Has this badge tokenId already submitted?                              |
| POST   | `/submit`                  | Submit ciphertext bundle + signed EIP-712 envelope                     |
| GET    | `/admin/export`            | CSV dump of all submissions, bearer-auth (`ADMIN_EXPORT_TOKEN`)        |

## Local development

```bash
# 1. Spin up Postgres
docker compose -f apps/api/docker-compose.yml up -d

# 2. Apply schema
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ethsec \
  pnpm --filter @ethsec/api db:push

# 3. Set env (see .env.example) and run
pnpm --filter @ethsec/api dev
# → listens on $PORT (default 3001)
```

## Database choice (production + tests)

- **Production:** node-postgres (`pg`) + `drizzle-orm/node-postgres`.
- **Tests:** [`pg-mem`](https://github.com/oguimbal/pg-mem) — in-process
  Postgres-compatible mock — wrapped via `pg-mem`'s `createPg()` adapter and
  injected into the same Drizzle code path the production server uses.
  See `src/db/testdb.ts`.

We picked node-postgres over the postgres-js driver specifically because
pg-mem's `createPostgresJsTag()` adapter is broken in `pg-mem@3.0.14`
(`require('postgres').default` returns undefined for postgres@3 ESM-default
exports), and its TCP `bindServer()` adapter swallows UNIQUE-violation
error frames so duplicate-insert tests hang. The `createPg()` adapter is
stable; we only had to add a tiny shim in `testdb.ts` that translates
Drizzle's `rowMode: "array"` queries (which pg-mem doesn't support) into
the equivalent object-mode call and then reorders the result columns by
the row's own keys.

### Why `tokenId` is `text`, not `numeric`

Postgres `numeric` round-trips as different JS types depending on the
driver: real Postgres via node-postgres returns `string`; pg-mem's `Pool`
returns `number`. Storing as `text` keeps behavior identical across both,
sidesteps any chance of float-precision loss for full uint256 ERC-721
ids, and the `UNIQUE` constraint behaves identically. Submissions always
carry tokenId as a digit-string anyway (zod `^\d+$`), so callers see no
difference.

## Verification

From the repo root:

```bash
pnpm test         # vitest, all packages
pnpm typecheck    # tsc --noEmit, all packages
pnpm build        # tsc emit
pnpm lint         # tsc --noEmit (placeholder; eslint TBD)
```
