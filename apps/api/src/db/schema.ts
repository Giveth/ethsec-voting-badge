import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * `submissions` — one row per encrypted voting-address bundle.
 *
 * `tokenId` is `text` rather than `numeric` so the JS shape is stable across
 * the production driver and the in-memory test DB (pg-mem returns `numeric`
 * as a JS `number`, real Postgres via node-postgres returns `string`).
 * ERC-721 tokenIds are at most uint256 anyway — text storage is exact and
 * avoids precision loss; UNIQUE works the same.
 */
export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenId: text("token_id").notNull().unique(),
  holderWallet: text("holder_wallet").notNull(),
  signature: text("signature").notNull(),
  signaturePayloadJson: jsonb("signature_payload_json").notNull(),
  ciphertext: text("ciphertext").notNull(),
  ciphertextHash: text("ciphertext_hash").notNull(),
  nonce: text("nonce").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
