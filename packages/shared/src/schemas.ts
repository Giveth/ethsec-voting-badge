import { z } from "zod";

export const AddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "not an EVM address")
  .transform((s) => s.toLowerCase() as `0x${string}`);

export const NonZeroAddressSchema = AddressSchema
  .refine((s) => s !== "0x" + "0".repeat(40), "zero address not allowed");

export const Hex32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "not a 32-byte hex string");
export const HexSigSchema = z.string().regex(/^0x[a-fA-F0-9]{130}$/, "not a 65-byte signature");

export const PlaintextPayloadSchema = z.object({
  votingAddress: NonZeroAddressSchema,
  tokenId: z.string().regex(/^\d+$/),
  holderWallet: AddressSchema,
  timestamp: z.string().datetime(),
});
export type PlaintextPayload = z.infer<typeof PlaintextPayloadSchema>;

export const SubmitRequestSchema = z.object({
  badgeContract: AddressSchema,
  tokenId: z.string().regex(/^\d+$/),
  holderWallet: AddressSchema,
  ciphertext: z.string().min(1),
  ciphertextHash: Hex32Schema,
  nonce: Hex32Schema,
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  signature: HexSigSchema,
});
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;
