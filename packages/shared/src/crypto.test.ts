import { describe, it, expect } from "vitest";
import { ml_kem768 } from "@noble/post-quantum/ml-kem";
import { encryptPayload, decryptBundle, sha256Hex } from "./crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts round-trip with a fresh keypair", () => {
    const { publicKey, secretKey } = ml_kem768.keygen();
    const plaintext = { votingAddress: "0x" + "1".repeat(40), tokenId: "42", holderWallet: "0x" + "2".repeat(40), timestamp: "2026-04-14T00:00:00Z" };
    const { bundleB64, bundleHash } = encryptPayload(plaintext, publicKey);
    expect(bundleB64.length).toBeGreaterThan(0);
    expect(bundleHash).toMatch(/^0x[0-9a-f]{64}$/);
    const decrypted = decryptBundle(bundleB64, secretKey);
    expect(decrypted).toEqual(plaintext);
  });
  it("sha256Hex produces 0x-prefixed 32-byte hex", () => {
    expect(sha256Hex("hello")).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("rejects ciphertext tampering", () => {
    const { publicKey, secretKey } = ml_kem768.keygen();
    const { bundleB64 } = encryptPayload({ a: 1 }, publicKey);
    // flip one char in the base64
    const tampered = bundleB64.slice(0, -2) + (bundleB64.slice(-2) === "AA" ? "BB" : "AA");
    expect(() => decryptBundle(tampered, secretKey)).toThrow();
  });
});
