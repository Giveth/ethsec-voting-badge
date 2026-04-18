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

## Two modes on the landing page

When you open the app, you pick one of two modes:

### Online mode — normal dApp flow

For badgeholders signing on a regular, internet-connected machine.

1. Open the hosted URL, click **Online**.
2. **Connect Wallet** → pick the wallet that holds your badge NFT.
3. The app auto-detects your badge `tokenId` from onchain `Transfer` logs.
4. Enter the voting address you want recorded.
5. Click **Encrypt & Sign** → sign the EIP-712 message. The voting address
   is encrypted in-browser and POSTed with the signature.
6. You'll see a success checkmark. Done.

One badge = one submission. Re-submitting from the same badge is rejected.

### Offline mode — airgapped signing

For badgeholders whose signing key lives on an airgapped machine. Sign the
voting message locally, export the signed blob, and come back to an online
machine to submit.

Two sub-flows, both on the same page:

**A. Sign here, submit later (or elsewhere)**

1. Click **Offline** on the landing page.
2. Fill in: holder wallet, badge token ID, voting address.
3. Click **Encrypt & prepare message**.
4. Pick a signing path:
   - **Connect wallet** — uses any wallet extension present on this machine
     (MetaMask, Rabby, Frame, or a hardware wallet plugged in). Signs via
     wagmi's normal EIP-712 flow.
   - **Sign externally** — copy the EIP-712 payload JSON, sign with your
     own tool, paste the `0x…` signature back into the form. Two ready-
     to-paste paths shown in the UI: Foundry's `cast wallet sign-typed-data`
     for that crowd, and our ethers-based `pnpm sign-offline` script (see
     `scripts/sign-offline.ts`, patterned after
     [pcaversaccio/raw-tx](https://github.com/pcaversaccio/raw-tx) — same
     ergonomics, just EIP-712 instead of raw-transaction). Anything that
     produces a valid EIP-712 signature works; the page verifies the
     signature recovers to the holder wallet before allowing export.
5. The signed blob downloads as `ethsec-submission-badge-<id>.json`.
6. When you reach an online machine, open this same app, pick **Offline**
   again, and use the **Submit a signed blob** section near the bottom to
   upload the file.

**B. Submit a pre-signed blob (online machine, bringing someone else's blob back)**

1. Open the app on any online machine, pick **Offline**.
2. Scroll to **Submit a signed blob**.
3. Pick the `.json` file. The server verifies the signature + onchain badge
   ownership and stores the submission.

What crosses the air gap: the signed JSON (signature + ciphertext). What
never leaves the signing machine: the wallet's private key and the
plaintext voting address.

### Running offline mode on a truly airgapped machine

```bash
# On an online machine:
git clone https://github.com/griffgiveth/ethsec-voting-badge.git
cd ethsec-voting-badge
pnpm install
pnpm --filter @ethsec/web build

# Copy apps/web/dist/ to USB, move to the airgapped machine, then:
npx --yes http-server apps/web/dist -p 5174
```

Open `http://localhost:5174` on the airgapped machine, pick **Offline**,
and follow sub-flow A above.

For the page to work without reaching the backend, set
`VITE_ENCRYPTION_PUBLIC_KEY_HEX` at build time to the public key you'll
eventually submit against. The offline page then encrypts locally instead
of fetching `/config`.

Alternative submit path from any terminal:

```bash
curl -X POST -H 'content-type: application/json' \
  --data-binary @ethsec-submission-badge-42.json \
  https://<hosted-api-url>/submit
```

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
