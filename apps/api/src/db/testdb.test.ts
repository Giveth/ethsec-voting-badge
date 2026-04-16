import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { makeTestDb } from "./testdb.js";
import { submissions } from "./schema.js";

describe("makeTestDb (pg-mem + drizzle/node-postgres)", () => {
  it("inserts and queries a row", async () => {
    const { db, dispose } = await makeTestDb();
    try {
      await db.insert(submissions).values({
        tokenId: "1",
        holderWallet: "0x" + "a".repeat(40),
        signature: "0x" + "b".repeat(130),
        signaturePayloadJson: { hello: "world" },
        ciphertext: "ct",
        ciphertextHash: "0x" + "c".repeat(64),
        nonce: "0x" + "d".repeat(64),
      });
      const rows = await db.select().from(submissions);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenId).toBe("1");
      expect(rows[0]?.signaturePayloadJson).toEqual({ hello: "world" });
      expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    } finally {
      await dispose();
    }
  });

  it("enforces UNIQUE(token_id)", async () => {
    const { db, dispose } = await makeTestDb();
    try {
      const row = {
        tokenId: "42",
        holderWallet: "0x" + "a".repeat(40),
        signature: "0x" + "b".repeat(130),
        signaturePayloadJson: {},
        ciphertext: "ct",
        ciphertextHash: "0x" + "c".repeat(64),
        nonce: "0x" + "d".repeat(64),
      };
      await db.insert(submissions).values(row);
      await expect(db.insert(submissions).values(row)).rejects.toThrow(/duplicate key|unique/i);
    } finally {
      await dispose();
    }
  });

  it("reset() truncates", async () => {
    const { db, reset, dispose } = await makeTestDb();
    try {
      await db.insert(submissions).values({
        tokenId: "7",
        holderWallet: "0x" + "a".repeat(40),
        signature: "0x" + "b".repeat(130),
        signaturePayloadJson: {},
        ciphertext: "ct",
        ciphertextHash: "0x" + "c".repeat(64),
        nonce: "0x" + "d".repeat(64),
      });
      await reset();
      const rows = await db.select().from(submissions).where(eq(submissions.tokenId, "7"));
      expect(rows).toHaveLength(0);
    } finally {
      await dispose();
    }
  });
});
