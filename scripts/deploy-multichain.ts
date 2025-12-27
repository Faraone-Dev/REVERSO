import { ethers, network } from "hardhat";
import * as fs from "fs";

/**
 * ██████╗ ███████╗██╗   ██╗███████╗██████╗ ███████╗ ██████╗ 
 * ██╔══██╗██╔════╝██║   ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗
 * ██████╔╝█████╗  ██║   ██║█████╗  ██████╔╝███████╗██║   ██║
 * ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║
 * ██║  ██║███████╗ ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝
 * ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ 
 * 
 * REVERSO Protocol - Multi-Chain Deployment Script
 */

interface ChainConfig {
  name: string;
  chainId: number;
  rpc: string;
}

interface DeploymentResult {
  chain: string;
  chainId: number;
  address: string;
  deployer: string;
  timestamp: string;
  txHash: string;
}

// All supported chains
const CHAINS: ChainConfig[] = [
  // Testnets
  { name: "sepolia", chainId: 11155111, rpc: "https://ethereum-sepolia-rpc.publicnode.com" },
  { name: "arbitrumSepolia", chainId: 421614, rpc: "https://sepolia-rollup.arbitrum.io/rpc" },
  { name: "baseSepolia", chainId: 84532, rpc: "https://sepolia.base.org" },
  
  // Mainnets
  { name: "ethereum", chainId: 1, rpc: "https://ethereum-rpc.publicnode.com" },
  { name: "arbitrum", chainId: 42161, rpc: "https://arb1.arbitrum.io/rpc" },
  { name: "optimism", chainId: 10, rpc: "https://mainnet.optimism.io" },
  { name: "base", chainId: 8453, rpc: "https://mainnet.base.org" },
  { name: "polygon", chainId: 137, rpc: "https://polygon-rpc.com" },
  { name: "bsc", chainId: 56, rpc: "https://bsc-dataseed.binance.org" },
  { name: "avalanche", chainId: 43114, rpc: "https://api.avax.network/ext/bc/C/rpc" },
  { name: "fantom", chainId: 250, rpc: "https://rpc.ftm.tools" },
  { name: "linea", chainId: 59144, rpc: "https://rpc.linea.build" },
];

async function deployToChain(chainName: string): Promise<DeploymentResult | null> {
  try {
    console.log(`\n🚀 Deploying to ${chainName}...`);
    
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    if (balance === 0n) {
      console.log(`⚠️  Skipping ${chainName}: No balance`);
      return null;
    }

    const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
    
    const ReversoVault = await ethers.getContractFactory("ReversoVault");
    const reversoVault = await ReversoVault.deploy(treasuryAddress);
    await reversoVault.waitForDeployment();
    
    const address = await reversoVault.getAddress();
    const deployTx = reversoVault.deploymentTransaction();
    
    console.log(`✅ ${chainName}: ${address}`);
    
    return {
      chain: chainName,
      chainId: (await ethers.provider.getNetwork()).chainId.toString() as unknown as number,
      address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      txHash: deployTx?.hash || "",
    };
  } catch (error: any) {
    console.log(`❌ ${chainName}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("              🔄 REVERSO MULTI-CHAIN DEPLOYMENT                ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("\n");

  const deployments: DeploymentResult[] = [];
  
  // Deploy to current network
  const result = await deployToChain(network.name);
  if (result) {
    deployments.push(result);
  }

  // Save deployments
  const deploymentsPath = "./deployments.json";
  let existingDeployments: DeploymentResult[] = [];
  
  if (fs.existsSync(deploymentsPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  }
  
  // Merge deployments
  for (const deployment of deployments) {
    const index = existingDeployments.findIndex(d => d.chainId === deployment.chainId);
    if (index >= 0) {
      existingDeployments[index] = deployment;
    } else {
      existingDeployments.push(deployment);
    }
  }
  
  fs.writeFileSync(deploymentsPath, JSON.stringify(existingDeployments, null, 2));
  
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                    DEPLOYMENT COMPLETE                         ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`📁 Saved to: ${deploymentsPath}`);
  console.log("\n");
  
  // Print table
  console.log("Chain            | Address");
  console.log("-----------------+--------------------------------------------");
  for (const d of existingDeployments) {
    console.log(`${d.chain.padEnd(16)} | ${d.address}`);
  }
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
