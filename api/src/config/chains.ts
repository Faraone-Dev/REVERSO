import fs from 'fs';
import path from 'path';

type ChainEntry = {
  name: string;
  chainId: number;
  rpcEnv: string;
  defaultRpc: string;
  explorer: string;
  contractEnv: string;
  contract: string;
};

export type ChainConfig = {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  contract: string;
};

let cached: Record<number, ChainConfig> | null = null;

export function loadChains(): Record<number, ChainConfig> {
  if (cached) return cached;
  const jsonPath = path.join(__dirname, '../../config/chains.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const entries: ChainEntry[] = JSON.parse(raw);
  const result: Record<number, ChainConfig> = {};

  for (const entry of entries) {
    const rpc = process.env[entry.rpcEnv] || entry.defaultRpc;
    const contract = process.env[entry.contractEnv] || entry.contract;
    result[entry.chainId] = {
      name: entry.name,
      chainId: entry.chainId,
      rpc,
      explorer: entry.explorer,
      contract
    };
  }

  cached = result;
  return result;
}

export function getChain(chainId: number): ChainConfig | undefined {
  const chains = loadChains();
  return chains[chainId];
}
