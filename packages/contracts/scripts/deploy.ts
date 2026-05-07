import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("=================================");
  console.log("Bae4U Contract Deployment");
  console.log("=================================");
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH");
  console.log("Network  :", (await ethers.provider.getNetwork()).name);
  console.log("=================================\n");

  if (balance < ethers.parseEther("0.0005")) {
    throw new Error("Need at least 0.0005 ETH — get testnet ETH from https://www.alchemy.com/faucets/base-sepolia");
  }

  // Starting price for a new user's pet: 1000 PCASH (18 decimals)
  const STARTING_PRICE = ethers.parseEther("1000");

  // 1. PetsCash — signer is the deployer wallet for testnet
  //    In production, SIGNER_PRIVATE_KEY is a separate wallet
  const signerAddress = deployer.address;

  console.log("1/4  Deploying PetsCash...");
  const PetsCash = await ethers.getContractFactory("PetsCash");
  const petsCash = await PetsCash.deploy(deployer.address, signerAddress);
  await petsCash.waitForDeployment();
  const cashAddr = await petsCash.getAddress();
  console.log("     ✓ PetsCash:", cashAddr);

  console.log("2/4  Deploying PetsRegistry...");
  const PetsRegistry = await ethers.getContractFactory("PetsRegistry");
  const registry = await PetsRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const regAddr = await registry.getAddress();
  console.log("     ✓ PetsRegistry:", regAddr);

  // Treasury = deployer for testnet. Use a Gnosis Safe multisig on mainnet.
  console.log("3/4  Deploying PetsMarket...");
  const PetsMarket = await ethers.getContractFactory("PetsMarket");
  const market = await PetsMarket.deploy(cashAddr, regAddr, deployer.address, deployer.address);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("     ✓ PetsMarket:", marketAddr);

  console.log("4/4  Deploying PetsRanking...");
  const PetsRanking = await ethers.getContractFactory("PetsRanking");
  const ranking = await PetsRanking.deploy(deployer.address, signerAddress);
  await ranking.waitForDeployment();
  const rankAddr = await ranking.getAddress();
  console.log("     ✓ PetsRanking:", rankAddr);

  // Wire roles
  console.log("\nConfiguring roles...");
  const tx1 = await petsCash.grantMarketRole(marketAddr);
  await tx1.wait();
  console.log("  ✓ MARKET_ROLE granted to PetsMarket on PetsCash");

  const tx2 = await registry.grantRole(
    ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
    deployer.address
  );
  await tx2.wait();
  console.log("  ✓ MINTER_ROLE confirmed on PetsRegistry");

  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    signerAddress,
    PetsCash:      cashAddr,
    PetsRegistry:  regAddr,
    PetsMarket:    marketAddr,
    PetsRanking:   rankAddr,
    startingPrice: STARTING_PRICE.toString(),
    deployedAt: new Date().toISOString()
  };

  const outPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\n=================================");
  console.log("✅ Deployment complete!");
  console.log("=================================");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\nNext steps:");
  console.log("1. Copy the addresses above into your .env file");
  console.log("2. Run: pnpm --filter=api dev");
  console.log("3. Verify on Basescan: npx hardhat verify --network base-sepolia <address> <args>");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
