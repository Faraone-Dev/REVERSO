"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadChains = loadChains;
exports.getChain = getChain;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let cached = null;
function loadChains() {
    if (cached)
        return cached;
    const jsonPath = path_1.default.join(__dirname, '../../config/chains.json');
    const raw = fs_1.default.readFileSync(jsonPath, 'utf-8');
    const entries = JSON.parse(raw);
    const result = {};
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
function getChain(chainId) {
    const chains = loadChains();
    return chains[chainId];
}
