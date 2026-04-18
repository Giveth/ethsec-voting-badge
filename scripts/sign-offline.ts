#!/usr/bin/env tsx
/**
 * Offline EIP-712 signer for voting-badge submissions.
 *
 * Patterned after pcaversaccio/raw-tx's `scripts/sign.ts` — same operational
 * ergonomics (load PRIVATE_KEY from a local .env, sign locally, emit a JSON
 * file to carry across the air gap). The difference is the payload we sign
 * is an EIP-712 typed-data message (not a raw transaction), because the
 * voting badge delivers its submission via an API POST, not a mempool
 * broadcast.
 *
 * Usage:
 *
 *   # 1. Produce the EIP-712 payload on the offline web UI (Section 1,
 *   #    "Sign externally" tab, "Copy payload JSON" button). Save it locally
 *   #    as e.g. payload.json.
 *
 *   # 2. Set your PRIVATE_KEY in .env (never commit this file):
 *   echo "PRIVATE_KEY=0xabc123..." > .env
 *
 *   # 3. Sign:
 *   pnpm --filter @ethsec/scripts sign-offline --in payload.json --out sig.txt
 *
 *   # 4. Paste sig.txt's contents (the 0x… signature) back into the web UI
 *   #    "Paste signature" field. The UI verifies the signature recovers
 *   #    to the holder wallet before letting you download the final blob.
 */
import fs from "node:fs";
import path from "node:path";
import { Wallet, TypedDataField } from "ethers";

/* ----- env loader (no external dep) ----- */
function loadDotenv(file: string): void {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotenv(path.join(process.cwd(), ".env"));

/* ----- argv ----- */
function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const inPath = arg("--in");
const outPath = arg("--out") ?? "signature.txt";
if (!inPath) {
  console.error("usage: sign-offline --in <payload.json> [--out <signature.txt>]");
  process.exit(1);
}

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("PRIVATE_KEY not set. Put it in a local .env file or export it.");
  process.exit(1);
}

/* ----- payload ----- */
interface Payload {
  domain: { name: string; version: string; chainId: number };
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, string | number>;
}

const payload: Payload = JSON.parse(fs.readFileSync(inPath, "utf8"));

/**
 * ethers' signTypedData wants the `types` object WITHOUT the EIP-712 meta
 * "EIP712Domain" entry (if it happens to be in our payload) — it recomputes
 * the domain separator itself. Strip it defensively.
 */
const types = { ...payload.types };
delete types.EIP712Domain;

/* ----- sign ----- */
const wallet = new Wallet(privateKey);
const signature = await wallet.signTypedData(payload.domain, types, payload.message);

fs.writeFileSync(outPath, signature + "\n", { mode: 0o600 });
console.log("signer    :", wallet.address);
console.log("primary   :", payload.primaryType);
console.log("chainId   :", payload.domain.chainId);
console.log("signature :", signature);
console.log(`(written to ${outPath})`);
