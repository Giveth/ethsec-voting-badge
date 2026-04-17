# ETHSecurity Voting Badge

A badgeholder-only voting-address registry. Each badge (ERC-721) can submit a
single voting address. Addresses are encrypted in the browser with
**ML-KEM-768 + AES-256-GCM**, stored as ciphertext, and decrypted offline by
the admin after voting closes.

```
┌──────────────┐   signed+encrypted    ┌──────────┐        ┌──────────┐
│  Badgeholder ├──────────────────────►│   API    ├───────►│ Postgres │
│  (browser)   │   submission          │ Fastify  │        │          │
└──────────────┘                       └──────────┘        └──────────┘
                                             │
                                  CSV export │ (bearer-auth)
                                             ▼
                                  ┌────────────────────────┐
                                  │ Admin (Griff)          │
                                  │ decrypts with ML-KEM   │
                                  │ private key offline    │
                                  └────────────────────────┘
```

---

## For badgeholders — how to submit a voting address

1. Open the hosted URL in a normal browser (works on mobile too).
2. **Connect Wallet** → pick the wallet that holds your badge NFT.
3. The app reads your badge `tokenId` onchain and shows it.
4. Enter the voting address you want recorded → click Submit.
5. Sign the EIP-712 message. The app encrypts your address locally before
   it leaves your device.
6. You'll see a success checkmark. Done — you can close the tab.

One badge = one submission. Re-submitting from the same badge is rejected.

---

## For the admin (Griff) — full lifecycle

### Step 1 — Generate your keypair (do this ONCE, on your own machine)

```bash
pnpm install
pnpm --filter @ethsec/scripts keygen ./keys
```

Outputs:

- `./keys/public.key` — safe to share with anyone. Goes into env vars.
- `./keys/private.key` — **NEVER share, never commit, never upload.**
  Back it up somewhere only you control (1Password, hardware token, etc.).

If you lose `private.key` you can't decrypt any submissions. Ever.

### Step 2 — Generate the admin export token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output. This is the bearer token that gates the encrypted CSV
dump. Keep a copy for yourself and send another to the devs (out-of-band
— see "Secure hand-off" below).

### Step 3 — Hand off to the deployers

Give your devs these three values to set as env vars on the deployed
infrastructure:

| Env var                           | Source                         | Where it goes |
| --------------------------------- | ------------------------------ | ------------- |
| `ENCRYPTION_PUBLIC_KEY_HEX`       | contents of `keys/public.key`  | API server    |
| `VITE_ENCRYPTION_PUBLIC_KEY_HEX`  | contents of `keys/public.key`  | Web build     |
| `ADMIN_EXPORT_TOKEN`              | the hex token from Step 2      | API server    |

Plus the other boilerplate envs (`DATABASE_URL`, `BADGE_CONTRACT`,
`CHAIN_ID`, `RPC_URL`, `CORS_ALLOWED_ORIGIN`, `VITE_API_URL`) — see the
`.env.example` files in `apps/api/` and `apps/web/`.

**Keep locally (never upload):**

- `keys/private.key`
- A copy of `ADMIN_EXPORT_TOKEN`

### Step 4 — After voting closes, decrypt

Two options — pick whichever you prefer.

**Option A — in-browser admin page** (easiest)

1. Open `<deployed-url>/admin`
2. Paste `ADMIN_EXPORT_TOKEN` into the token field.
3. Paste the contents of `keys/private.key` into the private-key field.
4. Click "Fetch & Decrypt." The browser talks to the API, pulls the CSV,
   and decrypts locally. Neither secret hits a server.
5. Click "Download" for a CSV with plaintext `voting_address` per row.

**Option B — offline CLI script** (most paranoid)

```bash
# 1. Download encrypted CSV (can run from anywhere with the token)
curl -H "Authorization: Bearer $ADMIN_EXPORT_TOKEN" \
  https://<api-host>/admin/export -o encrypted-export.csv

# 2. Decrypt locally (air-gapped machine if you want)
pnpm --filter @ethsec/scripts decrypt \
  --in encrypted-export.csv \
  --key ./keys/private.key \
  --out decrypted.csv
```

Both options produce a CSV with a `voting_address` column holding the
plaintext addresses submitted by badgeholders.

---

## Secure hand-off — how to share secrets WITHOUT leaking them

**Never paste secrets into Telegram, Slack, or email.** Those channels
are not end-to-end encrypted; the server keeps copies.

Acceptable channels:

- Signal (free, e2e)
- 1Password shared vault
- Keybase encrypted chat
- `age -r <recipient-pubkey>` encrypted blob over any channel
- In person / USB stick

The `public.key` is safe to share anywhere — you can paste it into
Telegram, email it, tweet it. Only the `private.key` and
`ADMIN_EXPORT_TOKEN` need the secure channel.

---

## Architecture

| Package            | Role                                                         |
| ------------------ | ------------------------------------------------------------ |
| `apps/api`         | Fastify server. Routes: `/config`, `/submit`, `/token-status/:id`, `/admin/export`. Verifies EIP-712 signature + onchain ERC-721 ownership before insert. |
| `apps/web`         | Vite + React + RainbowKit. Submission flow + admin decrypt page. |
| `packages/shared`  | Hybrid encryption (ML-KEM-768 + AES-256-GCM). Browser- and Node-safe. |
| `scripts`          | `keygen` (ML-KEM keypair), `decrypt` (offline CSV decrypt). |

See `apps/api/README.md` for DB/driver details and routing specifics.

---

## Local development

```bash
pnpm install

# Start Postgres
docker compose -f apps/api/docker-compose.yml up -d

# Apply schema
pnpm --filter @ethsec/api db:push

# Run both servers
pnpm dev
# API  → http://localhost:3001
# Web  → http://localhost:5174
```

Verify:

```bash
pnpm test         # vitest across all packages
pnpm typecheck    # tsc --noEmit
```

---

## Security model — two-secret admin

The admin's power is split across two secrets held by the same person:

1. **`ADMIN_EXPORT_TOKEN`** — grants access to the encrypted CSV.
2. **ML-KEM-768 private key** — decrypts the ciphertexts.

An attacker who steals one without the other gets nothing useful:

- Token alone → ciphertext blobs, no way to read them.
- Private key alone → no way to fetch the blobs.

Both secrets live only on the admin's local machine. The browser-based
admin page performs decryption entirely client-side; the private key
never reaches a server.
