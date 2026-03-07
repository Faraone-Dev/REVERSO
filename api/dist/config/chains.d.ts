export type ChainConfig = {
    name: string;
    chainId: number;
    rpc: string;
    explorer: string;
    contract: string;
};
export declare function loadChains(): Record<number, ChainConfig>;
export declare function getChain(chainId: number): ChainConfig | undefined;
