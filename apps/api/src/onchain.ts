import { createPublicClient, http, type Address, type Chain, type PublicClient } from "viem";
import { mainnet, sepolia } from "viem/chains";

const ERC721_ABI = [
  {
    inputs: [{ type: "uint256", name: "tokenId" }],
    name: "ownerOf",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ type: "address", name: "owner" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface OwnershipResult {
  ownsThisToken: boolean;
  balance: bigint;
}

export interface OwnershipChecker {
  check(tokenId: bigint, wallet: Address): Promise<OwnershipResult>;
}

/** Minimal viem PublicClient surface we depend on — eases mocking in tests. */
export interface MinimalPublicClient {
  readContract: (args: {
    address: Address;
    abi: typeof ERC721_ABI;
    functionName: "ownerOf" | "balanceOf";
    args: readonly [bigint] | readonly [Address];
  }) => Promise<unknown>;
}

function pickChain(chainId: number): Chain {
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  // Default: clone mainnet with the requested id so viem still works against
  // arbitrary EVM RPCs (anvil, base, etc.). The chain object only matters
  // for fee estimation and account tooling, not for `readContract`.
  return { ...mainnet, id: chainId, name: `chain-${chainId}` };
}

export function makePublicClient(chainId: number, rpcUrl: string): PublicClient {
  return createPublicClient({ chain: pickChain(chainId), transport: http(rpcUrl) });
}

/**
 * Build an OwnershipChecker that calls `ownerOf(tokenId)` and `balanceOf(wallet)`
 * on the configured ERC-721 contract via viem.
 */
export function makeOwnershipChecker(
  client: MinimalPublicClient,
  contract: Address,
): OwnershipChecker {
  return {
    async check(tokenId, wallet) {
      const [ownerResult, balanceResult] = await Promise.all([
        client
          .readContract({
            address: contract,
            abi: ERC721_ABI,
            functionName: "ownerOf",
            args: [tokenId],
          })
          .then((v) => v as Address)
          .catch(() => null),
        client
          .readContract({
            address: contract,
            abi: ERC721_ABI,
            functionName: "balanceOf",
            args: [wallet],
          })
          .then((v) => v as bigint)
          .catch(() => 0n),
      ]);
      const ownsThisToken =
        ownerResult !== null && ownerResult.toLowerCase() === wallet.toLowerCase();
      return { ownsThisToken, balance: balanceResult };
    },
  };
}
