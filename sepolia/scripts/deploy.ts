import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("=================================");
  console.log("Bae4U Full Contract Deployment");
  console.log("  (v2 — Fantasy Bae Layer)");
  console.log("=================================");
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH");
  console.log("Network  :", (await ethers.provider.getNetwork()).name);
  console.log("=================================\n");

  if (balance < ethers.parseEther("0.0003")) {
    throw new Error("Need at least 0.0003 ETH — get testnet ETH from https://www.alchemy.com/faucets/base-sepolia");
  }

  const STARTING_PRICE = ethers.parseEther("1000");
  const signerAddress  = deployer.address;
  const treasury       = deployer.address;

  // ── 1. PetsCash ─────────────────────────────────────────────────────────────
  console.log("1/7  Deploying PetsCash...");
  const PetsCash = await ethers.getContractFactory("PetsCash");
  const petsCash = await PetsCash.deploy(deployer.address, signerAddress);
  await petsCash.waitForDeployment();
  const cashAddr = await petsCash.getAddress();
  console.log("     ✓ PetsCash:", cashAddr);

  // ── 2. PetsRegistry (ERC-721 NFT) ───────────────────────────────────────────
  console.log("2/7  Deploying PetsRegistry (ERC-721)...");
  const PetsRegistry = await ethers.getContractFactory("PetsRegistry");
  const registry = await PetsRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const regAddr = await registry.getAddress();
  console.log("     ✓ PetsRegistry:", regAddr);

  // ── 3. PetsMarket ────────────────────────────────────────────────────────────
  console.log("3/7  Deploying PetsMarket...");
  const PetsMarket = await ethers.getContractFactory("PetsMarket");
  const market = await PetsMarket.deploy(cashAddr, regAddr, treasury, deployer.address);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("     ✓ PetsMarket:", marketAddr);

  // ── 4. PetsRanking ───────────────────────────────────────────────────────────
  console.log("4/7  Deploying PetsRanking...");
  const PetsRanking = await ethers.getContractFactory("PetsRanking");
  const ranking = await PetsRanking.deploy(deployer.address, signerAddress);
  await ranking.waitForDeployment();
  const rankAddr = await ranking.getAddress();
  console.log("     ✓ PetsRanking:", rankAddr);

  // ── 5. BaeCardRegistry ───────────────────────────────────────────────────────
  console.log("5/7  Deploying BaeCardRegistry...");
  const BaeCardRegistry = await ethers.getContractFactory("BaeCardRegistry");
  const cardRegistry = await BaeCardRegistry.deploy(deployer.address);
  await cardRegistry.waitForDeployment();
  const cardRegAddr = await cardRegistry.getAddress();
  console.log("     ✓ BaeCardRegistry:", cardRegAddr);

  // ── 6. BaeCardMarket ─────────────────────────────────────────────────────────
  console.log("6/7  Deploying BaeCardMarket...");
  const BaeCardMarket = await ethers.getContractFactory("BaeCardMarket");
  const cardMarket = await BaeCardMarket.deploy(cashAddr, cardRegAddr, treasury, deployer.address);
  await cardMarket.waitForDeployment();
  const cardMarketAddr = await cardMarket.getAddress();
  console.log("     ✓ BaeCardMarket:", cardMarketAddr);

  // ── 7. TournamentEngine ──────────────────────────────────────────────────────
  console.log("7/7  Deploying TournamentEngine...");
  const TournamentEngine = await ethers.getContractFactory("TournamentEngine");
  const tournament = await TournamentEngine.deploy(cashAddr, cardRegAddr, deployer.address);
  await tournament.waitForDeployment();
  const tournamentAddr = await tournament.getAddress();
  console.log("     ✓ TournamentEngine:", tournamentAddr);

  // ── 7b. CoupleCard ───────────────────────────────────────────────────────────
  console.log("7b/7 Deploying CoupleCard...");
  const CoupleCard = await ethers.getContractFactory("CoupleCard");
  const coupleCard = await CoupleCard.deploy(cashAddr, deployer.address, signerAddress);
  await coupleCard.waitForDeployment();
  const coupleCardAddr = await coupleCard.getAddress();
  console.log("     ✓ CoupleCard:", coupleCardAddr);

  // ── Wire roles ───────────────────────────────────────────────────────────────
  console.log("\nConfiguring roles...");

  const MARKET_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("MARKET_ROLE"));
  const MINTER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE  = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));

  let tx;

  tx = await petsCash.grantMarketRole(marketAddr);
  await tx.wait();
  console.log("  ✓ MARKET_ROLE → PetsMarket on PetsCash");

  tx = await petsCash.grantMarketRole(tournamentAddr);
  await tx.wait();
  console.log("  ✓ MARKET_ROLE → TournamentEngine on PetsCash");

  tx = await petsCash.grantMarketRole(cardMarketAddr);
  await tx.wait();
  console.log("  ✓ MARKET_ROLE → BaeCardMarket on PetsCash");

  tx = await cardRegistry.grantRole(MINTER_ROLE, cardMarketAddr);
  await tx.wait();
  console.log("  ✓ MINTER_ROLE → BaeCardMarket on BaeCardRegistry");

  tx = await cardRegistry.grantRole(BURNER_ROLE, cardMarketAddr);
  await tx.wait();
  console.log("  ✓ BURNER_ROLE → BaeCardMarket on BaeCardRegistry");

  tx = await cardRegistry.grantRole(MARKET_ROLE, cardMarketAddr);
  await tx.wait();
  console.log("  ✓ MARKET_ROLE → BaeCardMarket on BaeCardRegistry");

  const addresses = {
    network:         (await ethers.provider.getNetwork()).name,
    chainId:         Number((await ethers.provider.getNetwork()).chainId),
    deployer:        deployer.address,
    signerAddress,
    treasury,
    PetsCash:        cashAddr,
    PetsRegistry:    regAddr,
    PetsMarket:      marketAddr,
    PetsRanking:     rankAddr,
    BaeCardRegistry: cardRegAddr,
    BaeCardMarket:   cardMarketAddr,
    TournamentEngine:tournamentAddr,
    CoupleCard:      coupleCardAddr,
    startingPrice:   STARTING_PRICE.toString(),
    deployedAt:      new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));

  console.log("\n=================================");
  console.log("✅ All 8 contracts deployed!");
  console.log("=================================");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\nNext — verify all contracts:");
  console.log("  pnpm --filter=contracts verify");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
