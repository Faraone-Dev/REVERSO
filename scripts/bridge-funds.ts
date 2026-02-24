import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";

/**
 * REVERSO Protocol — Cross-Chain Bridge via Relay Protocol
 * 
 * Prende ETH da Ethereum Mainnet e li bridge su:
 *   • BSC (→ BNB)
 *   • Base (→ ETH)
 *   • Arbitrum (→ ETH)
 *   • Polygon (→ POL)
 * 
 * Usa la Relay Protocol API (relay.link) — bridge istantaneo, no API key necessaria.
 * 
 * Usage:
 *   npx ts-node scripts/bridge-funds.ts                   # Solo quote (dry-run)
 *   npx ts-node scripts/bridge-funds.ts --execute          # Esegui i bridge
 *   npx ts-node scripts/bridge-funds.ts --execute --chain base   # Solo una chain
 */

// ═══════════════════════════════════════════════════════════════
//                      CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const RELAY_API = "https://api.relay.link";
const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000";

// How much to send to each destination (in destination native token, target EXACT_OUTPUT)
// Based on deployment cost estimation + generous margin
interface ChainTarget {
  name: string;
  chainId: number;
  symbol: string;
  amountWei: string;     // amount in wei to receive on destination
  amountHuman: string;   // human-readable amount
  rpcUrl: string;
}

const CHAIN_TARGETS: ChainTarget[] = [
  {
    name: "BSC",
    chainId: 56,
    symbol: "BNB",
    amountWei: ethers.parseEther("0.001").toString(),   // 0.001 BNB (~$0.58)
    amountHuman: "0.001 BNB",
    rpcUrl: process.env.BSC_RPC || "https://bsc-dataseed.binance.org",
  },
  {
    name: "Base",
    chainId: 8453,
    symbol: "ETH",
    amountWei: ethers.parseEther("0.0005").toString(),  // 0.0005 ETH (~$0.91)
    amountHuman: "0.0005 ETH",
    rpcUrl: process.env.BASE_RPC || "https://mainnet.base.org",
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    symbol: "ETH",
    amountWei: ethers.parseEther("0.0005").toString(),  // 0.0005 ETH (~$0.91)
    amountHuman: "0.0005 ETH",
    rpcUrl: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
  },
  {
    name: "Polygon",
    chainId: 137,
    symbol: "POL",
    amountWei: ethers.parseEther("5").toString(),       // 5 POL (~$1.25)
    amountHuman: "5 POL",
    rpcUrl: process.env.POLYGON_RPC || "https://polygon-bor-rpc.publicnode.com",
  },
];

// ═══════════════════════════════════════════════════════════════
//                      RELAY API HELPERS
// ═══════════════════════════════════════════════════════════════

interface RelayQuote {
  steps: {
    id: string;
    action: string;
    description: string;
    kind: string;
    requestId: string;
    items: {
      status: string;
      data: {
        from: string;
        to: string;
        data: string;
        value: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        gasLimit?: string;
        chainId: number;
      };
      check: {
        endpoint: string;
        method: string;
      };
    }[];
  }[];
  fees: {
    gas: { amountFormatted: string; amountUsd: string };
    relayer: { amountFormatted: string; amountUsd: string };
    relayerGas: { amountFormatted: string; amountUsd: string };
    relayerService: { amountFormatted: string; amountUsd: string };
  };
  details: {
    currencyIn: { amount: string; amountFormatted: string; amountUsd: string };
    currencyOut: { amount: string; amountFormatted: string; amountUsd: string };
    timeEstimate: number;
    rate: string;
  };
}

async function getRelayQuote(
  userAddress: string,
  originChainId: number,
  destinationChainId: number,
  amount: string,
  tradeType: "EXACT_INPUT" | "EXACT_OUTPUT" = "EXACT_OUTPUT"
): Promise<RelayQuote> {
  const body = {
    user: userAddress,
    originChainId,
    destinationChainId,
    originCurrency: NATIVE_CURRENCY,
    destinationCurrency: NATIVE_CURRENCY,
    amount,
    tradeType,
  };

  const response = await fetch(`${RELAY_API}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Relay API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function checkIntentStatus(requestId: string): Promise<any> {
  const response = await fetch(
    `${RELAY_API}/intents/status?requestId=${requestId}`,
    { method: "GET" }
  );
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
//                         MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes("--execute");
  const chainFilter = args.includes("--chain")
    ? args[args.indexOf("--chain") + 1]?.toLowerCase()
    : null;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("      🌉 REVERSO — CROSS-CHAIN BRIDGE (Relay Protocol)        ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!executeMode) {
    console.log("  📋 MODALITÀ: Solo quote (dry-run)");
    console.log("  Per eseguire: npx ts-node scripts/bridge-funds.ts --execute\n");
  } else {
    console.log("  🚀 MODALITÀ: ESECUZIONE BRIDGE\n");
  }

  // ── Setup wallet ──
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY non trovata in .env");

  const ethRpc = process.env.ETHEREUM_RPC || "https://ethereum-rpc.publicnode.com";
  const ethProvider = new ethers.JsonRpcProvider(ethRpc);
  const wallet = new ethers.Wallet(privateKey, ethProvider);

  const balance = await ethProvider.getBalance(wallet.address);
  console.log(`  👤 Wallet: ${wallet.address}`);
  console.log(`  💰 ETH su Mainnet: ${ethers.formatEther(balance)} ETH\n`);

  // Filter chains if requested
  const targets = chainFilter
    ? CHAIN_TARGETS.filter((c) => c.name.toLowerCase() === chainFilter)
    : CHAIN_TARGETS;

  if (targets.length === 0) {
    console.log(`  ❌ Chain "${chainFilter}" non trovata. Opzioni: bsc, base, arbitrum, polygon`);
    return;
  }

  // ── Check destination balances ──
  console.log("───────────────────────────────────────────────────────────────");
  console.log("               SALDI ATTUALI SULLE DESTINAZIONI               ");
  console.log("───────────────────────────────────────────────────────────────\n");

  for (const target of targets) {
    try {
      const destProvider = new ethers.JsonRpcProvider(target.rpcUrl);
      const destBalance = await destProvider.getBalance(wallet.address);
      console.log(`  ${target.name.padEnd(10)} ${ethers.formatEther(destBalance)} ${target.symbol}`);
    } catch {
      console.log(`  ${target.name.padEnd(10)} ⚠️  RPC non raggiungibile`);
    }
  }

  // ── Get quotes ──
  console.log("\n───────────────────────────────────────────────────────────────");
  console.log("               QUOTES DA RELAY PROTOCOL                       ");
  console.log("───────────────────────────────────────────────────────────────\n");

  interface QuoteResult {
    target: ChainTarget;
    quote: RelayQuote;
    ethCostWei: bigint;  // total ETH to spend on mainnet
  }

  const quotes: QuoteResult[] = [];

  for (const target of targets) {
    console.log(`  🔍 ${target.name} — richiedendo ${target.amountHuman}...`);
    try {
      const quote = await getRelayQuote(
        wallet.address,
        1,  // Ethereum mainnet
        target.chainId,
        target.amountWei,
        "EXACT_OUTPUT"
      );

      const depositStep = quote.steps?.find((s) => s.id === "deposit");
      const depositItem = depositStep?.items?.[0];
      const txValue = depositItem?.data?.value ?? "0";
      const ethCostWei = BigInt(txValue);

      quotes.push({ target, quote, ethCostWei });

      const inUsd = quote.details?.currencyIn?.amountUsd ?? "?";
      const outFormatted = quote.details?.currencyOut?.amountFormatted ?? "?";
      const timeEst = quote.details?.timeEstimate ?? 0;
      const relayerFee = quote.fees?.relayerService?.amountUsd ?? "?";

      console.log(`     ✅ Invii:    ${ethers.formatEther(ethCostWei)} ETH ($${inUsd})`);
      console.log(`     📥 Ricevi:   ${outFormatted} ${target.symbol}`);
      console.log(`     💸 Fee:      $${relayerFee}`);
      console.log(`     ⏱️  Tempo:    ~${timeEst}s\n`);
    } catch (err: any) {
      console.log(`     ❌ Errore: ${err.message}\n`);
    }
  }

  if (quotes.length === 0) {
    console.log("  ❌ Nessun quote ottenuto. Controlla la connessione.\n");
    return;
  }

  // ── Summary ──
  const totalEthWei = quotes.reduce((sum, q) => sum + q.ethCostWei, 0n);
  // We also need gas for each bridge tx on mainnet (~100k gas each)
  const gasPrice = (await ethProvider.getFeeData()).maxFeePerGas ?? 0n;
  const estimatedGasPerBridge = 150000n; // conservative
  const totalMainnetGas = estimatedGasPerBridge * BigInt(quotes.length) * gasPrice;
  const grandTotal = totalEthWei + totalMainnetGas;

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                        RIEPILOGO TOTALE                      ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`  Bridge values:          ${ethers.formatEther(totalEthWei)} ETH`);
  console.log(`  Gas mainnet (~${quotes.length} tx):    ~${ethers.formatEther(totalMainnetGas)} ETH`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  TOTALE NECESSARIO:      ~${ethers.formatEther(grandTotal)} ETH`);
  console.log(`  Saldo disponibile:      ${ethers.formatEther(balance)} ETH`);
  console.log("");

  if (grandTotal > balance) {
    const deficit = grandTotal - balance;
    console.log(`  ❌ FONDI INSUFFICIENTI! Servono ancora ~${ethers.formatEther(deficit)} ETH\n`);
    if (!executeMode) return;
    console.log("  ⚠️  WARNING: procedo comunque in execute mode (le tx falliranno se non ci sono fondi)\n");
  } else {
    const remaining = balance - grandTotal;
    console.log(`  ✅ FONDI SUFFICIENTI!`);
    console.log(`  Saldo residuo dopo bridge: ~${ethers.formatEther(remaining)} ETH\n`);
  }

  // ── Execute if requested ──
  if (!executeMode) {
    console.log("  Per eseguire i bridge, aggiungi --execute:");
    console.log("    npx ts-node scripts/bridge-funds.ts --execute");
    console.log("    npx ts-node scripts/bridge-funds.ts --execute --chain base");
    console.log("");
    return;
  }

  console.log("───────────────────────────────────────────────────────────────");
  console.log("               ESECUZIONE BRIDGE                              ");
  console.log("───────────────────────────────────────────────────────────────\n");

  for (const { target, quote, ethCostWei } of quotes) {
    const depositStep = quote.steps?.find((s) => s.id === "deposit");
    const depositItem = depositStep?.items?.[0];

    if (!depositItem?.data) {
      console.log(`  ❌ ${target.name}: nessun dato di transazione nel quote\n`);
      continue;
    }

    const txData = depositItem.data;
    console.log(`  🚀 Bridging a ${target.name}...`);
    console.log(`     To: ${txData.to}`);
    console.log(`     Value: ${ethers.formatEther(ethCostWei)} ETH`);

    try {
      // Build and send the transaction
      const tx: ethers.TransactionRequest = {
        to: txData.to,
        data: txData.data,
        value: BigInt(txData.value),
        chainId: 1,
      };

      // Use EIP-1559 if available
      if (txData.maxFeePerGas) {
        tx.maxFeePerGas = BigInt(txData.maxFeePerGas);
        tx.maxPriorityFeePerGas = BigInt(txData.maxPriorityFeePerGas ?? "0");
      }

      // Estimate gas
      const gasEstimate = await ethProvider.estimateGas({
        ...tx,
        from: wallet.address,
      });
      tx.gasLimit = gasEstimate + (gasEstimate * 20n / 100n); // +20% margin

      console.log(`     Gas: ${gasEstimate.toString()}`);

      // Send transaction
      const sentTx = await wallet.sendTransaction(tx);
      console.log(`     ✅ TX Hash: ${sentTx.hash}`);
      console.log(`     ⏳ Aspetto conferma...`);

      const receipt = await sentTx.wait();
      console.log(`     ✅ Confermata nel blocco ${receipt?.blockNumber}`);

      // Monitor intent status
      const requestId = depositStep?.requestId;
      if (requestId) {
        console.log(`     🔄 Monitorando intent ${requestId.slice(0, 16)}...`);
        
        // Poll status for up to 5 minutes
        const startTime = Date.now();
        const timeout = 5 * 60 * 1000; // 5 min
        
        while (Date.now() - startTime < timeout) {
          await new Promise((r) => setTimeout(r, 10000)); // wait 10s
          
          try {
            const status = await checkIntentStatus(requestId);
            const state = status?.status ?? status?.state ?? "unknown";
            console.log(`     Status: ${state}`);
            
            if (state === "success" || state === "completed" || state === "filled") {
              console.log(`     ✅ Bridge ${target.name} COMPLETATO!\n`);
              break;
            } else if (state === "failed" || state === "expired") {
              console.log(`     ❌ Bridge ${target.name} FALLITO: ${state}\n`);
              break;
            }
          } catch {
            // Status check failed, keep trying
          }
        }
      }
    } catch (err: any) {
      console.log(`     ❌ Errore: ${err.message}\n`);
    }
  }

  // ── Final balances ──
  console.log("\n───────────────────────────────────────────────────────────────");
  console.log("               SALDI FINALI                                   ");
  console.log("───────────────────────────────────────────────────────────────\n");

  const ethFinal = await ethProvider.getBalance(wallet.address);
  console.log(`  ETH Mainnet: ${ethers.formatEther(ethFinal)} ETH`);

  for (const target of targets) {
    try {
      const destProvider = new ethers.JsonRpcProvider(target.rpcUrl);
      const destBalance = await destProvider.getBalance(wallet.address);
      console.log(`  ${target.name.padEnd(10)}    ${ethers.formatEther(destBalance)} ${target.symbol}`);
    } catch {
      console.log(`  ${target.name.padEnd(10)}    ⚠️  RPC non raggiungibile`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("❌ Errore:", error.message || error);
  process.exit(1);
});
