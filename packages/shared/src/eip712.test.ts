import { describe, it, expect } from "vitest";
import { buildDomain, VOTING_SUBMISSION_TYPES, type VotingAddressSubmission } from "./eip712.js";

describe("EIP-712", () => {
  it("builds mainnet domain", () => {
    const d = buildDomain(1);
    expect(d).toEqual({ name: "ETHSecurity Voting Badge", version: "1", chainId: 1 });
  });
  it("builds sepolia domain", () => {
    expect(buildDomain(11155111).chainId).toBe(11155111);
  });
  it("exposes correct field order on VotingAddressSubmission type", () => {
    const fields = VOTING_SUBMISSION_TYPES.VotingAddressSubmission.map((f) => f.name);
    expect(fields).toEqual([
      "badgeContract", "tokenId", "holderWallet",
      "ciphertextHash", "nonce", "issuedAt", "expiresAt",
    ]);
  });
  it("type shape compiles", () => {
    const s: VotingAddressSubmission = {
      badgeContract: "0x0000000000000000000000000000000000000001",
      tokenId: 1n,
      holderWallet: "0x0000000000000000000000000000000000000002",
      ciphertextHash: "0x" + "00".repeat(32) as `0x${string}`,
      nonce: "0x" + "00".repeat(32) as `0x${string}`,
      issuedAt: 1n,
      expiresAt: 2n,
    };
    expect(s.tokenId).toBe(1n);
  });
});
