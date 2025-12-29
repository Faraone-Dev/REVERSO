import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying TestToken from: ${deployer.address}`);

  const TestToken = await ethers.getContractFactory("TestToken");
  const token = await TestToken.deploy("TestToken", "TTK", ethers.parseUnits("1000000", 18));
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log(`✅ TestToken deployed to: ${tokenAddress}`);
  console.log(`Minted 1,000,000 TTK to deployer.`);
  console.log(`npx hardhat verify --network ${network.name} ${tokenAddress} \"TestToken\" \"TTK\" 1000000000000000000000000`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
