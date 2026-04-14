import type { Address, Hex } from "viem";

export const buildDomain = (chainId: number) => ({
  name: "ETHSecurity Voting Badge" as const,
  version: "1" as const,
  chainId,
});

export const VOTING_SUBMISSION_TYPES = {
  VotingAddressSubmission: [
    { name: "badgeContract",  type: "address" },
    { name: "tokenId",        type: "uint256" },
    { name: "holderWallet",   type: "address" },
    { name: "ciphertextHash", type: "bytes32" },
    { name: "nonce",          type: "bytes32" },
    { name: "issuedAt",       type: "uint256" },
    { name: "expiresAt",      type: "uint256" },
  ],
} as const;

export interface VotingAddressSubmission {
  badgeContract: Address;
  tokenId: bigint;
  holderWallet: Address;
  ciphertextHash: Hex;
  nonce: Hex;
  issuedAt: bigint;
  expiresAt: bigint;
}
