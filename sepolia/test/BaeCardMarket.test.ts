import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { BaeCardMarket, BaeCardRegistry, PetsCash } from "../typechain-types";

describe("BaeCardMarket", () => {
  const Rarity = { Common: 0, Rare: 1, Epic: 2, Legend: 3 };

  async function deployFixture() {
    const [admin, alice, bob, carol, treasury] = await ethers.getSigners();

    const CashFactory = await ethers.getContractFactory("PetsCash");
    const cash = (await CashFactory.deploy(admin.address, admin.address)) as PetsCash;

    const RegFactory = await ethers.getContractFactory("BaeCardRegistry");
    const reg = (await RegFactory.deploy(admin.address)) as BaeCardRegistry;

    const MarketFactory = await ethers.getContractFactory("BaeCardMarket");
    const market = (await MarketFactory.deploy(
      await cash.getAddress(),
      await reg.getAddress(),
      treasury.address,
      admin.address
    )) as BaeCardMarket;

    // Grant market role on registry for royalty accounting
    const MARKET_ROLE_REG = await reg.MARKET_ROLE();
    await reg.connect(admin).grantRole(MARKET_ROLE_REG, await market.getAddress());

    // Grant burner role to market for upgradeCards
    const BURNER_ROLE = await reg.BURNER_ROLE();
    await reg.connect(admin).grantRole(BURNER_ROLE, await market.getAddress());

    // Grant minter role to market for upgradeCards mint
    const MINTER_ROLE = await reg.MINTER_ROLE();
    await reg.connect(admin).grantRole(MINTER_ROLE, await market.getAddress());

    // Grant MARKET_ROLE on cash for mintFromMarket
    await cash.connect(admin).grantMarketRole(admin.address);

    const CARD_BASE = ethers.parseEther("200"); // Common base price

    // Mint a card for alice subject, list it on market owned by market contract
    // First mint card (minter = admin, card goes to admin)
    await reg.connect(admin).mintCard(alice.address, Rarity.Common); // tokenId 1
    await market.connect(admin).listCard(1, admin.address, CARD_BASE);

    // Give bob enough cash to buy
    await cash.connect(admin).mintFromMarket(bob.address, ethers.parseEther("10000"));
    await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

    // Give carol enough cash
    await cash.connect(admin).mintFromMarket(carol.address, ethers.parseEther("10000"));
    await cash.connect(carol).approve(await market.getAddress(), ethers.MaxUint256);

    return { cash, reg, market, admin, alice, bob, carol, treasury, CARD_BASE };
  }

  describe("listCard()", () => {
    it("stores initial card state", async () => {
      const { market, admin, CARD_BASE } = await loadFixture(deployFixture);
      const state = await market.states(1);
      expect(state.owner).to.equal(admin.address);
      expect(state.price).to.equal(CARD_BASE);
      expect(state.totalTrades).to.equal(0n);
    });

    it("reverts on double listing", async () => {
      const { market, admin, alice, CARD_BASE } = await loadFixture(deployFixture);
      await expect(
        market.connect(admin).listCard(1, alice.address, CARD_BASE)
      ).to.be.revertedWith("BaeCardMarket: already listed");
    });

    it("reverts without ADMIN_ROLE", async () => {
      const { reg, market, admin, alice, bob } = await loadFixture(deployFixture);
      await reg.connect(admin).mintCard(alice.address, Rarity.Rare); // tokenId 2
      await expect(
        market.connect(bob).listCard(2, bob.address, ethers.parseEther("600"))
      ).to.be.reverted;
    });
  });

  describe("buyCard()", () => {
    it("transfers card ownership to buyer", async () => {
      const { market, bob } = await loadFixture(deployFixture);
      await market.connect(bob).buyCard(1);
      const state = await market.states(1);
      expect(state.owner).to.equal(bob.address);
    });

    it("applies 8% price increase after purchase", async () => {
      const { market, bob, CARD_BASE } = await loadFixture(deployFixture);
      await market.connect(bob).buyCard(1);
      const state = await market.states(1);
      const expected = (CARD_BASE * 10800n) / 10000n;
      expect(state.price).to.equal(expected);
    });

    it("increments totalTrades", async () => {
      const { market, bob } = await loadFixture(deployFixture);
      await market.connect(bob).buyCard(1);
      const state = await market.states(1);
      expect(state.totalTrades).to.equal(1n);
    });

    it("deducts fee (2.5%) and royalty (1.5%) correctly", async () => {
      const { cash, market, bob, treasury, alice, CARD_BASE } = await loadFixture(deployFixture);
      const treasuryBefore = await cash.balanceOf(treasury.address);
      const royaltyBefore  = await market.cash().then(() => 0n); // placeholder

      await market.connect(bob).buyCard(1);

      const fee     = (CARD_BASE * 250n) / 10000n;
      const royalty = (CARD_BASE * 150n) / 10000n;

      const treasuryAfter = await cash.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(fee);

      const aliceRoyalty = await market.registry().then(async () => {
        const regAddr = await market.registry();
        const reg = await ethers.getContractAt("BaeCardRegistry", regAddr);
        return reg.pendingRoyalties(alice.address);
      });
      expect(aliceRoyalty).to.equal(royalty);
    });

    it("reverts when buyer has insufficient PCASH", async () => {
      const { market, treasury } = await loadFixture(deployFixture);
      // treasury has no PCASH and does not own card 1
      await expect(market.connect(treasury).buyCard(1)).to.be.revertedWith("BaeCardMarket: insufficient PCASH");
    });

    it("reverts if buyer already owns the card", async () => {
      const { market, bob } = await loadFixture(deployFixture);
      await market.connect(bob).buyCard(1);
      await expect(market.connect(bob).buyCard(1)).to.be.revertedWith("BaeCardMarket: already own");
    });

    it("emits CardPurchased event", async () => {
      const { market, bob, admin, CARD_BASE } = await loadFixture(deployFixture);
      const newPrice = (CARD_BASE * 10800n) / 10000n;
      await expect(market.connect(bob).buyCard(1))
        .to.emit(market, "CardPurchased")
        .withArgs(1n, admin.address, bob.address, CARD_BASE, newPrice);
    });
  });

  describe("upgradeCards()", () => {
    // NOTE: upgradeCards() checks registry.ownerOf(), NOT market CardState.owner.
    // buyCard() only updates internal market state; it never calls registry.transferFrom.
    // Therefore upgrade tests must grant ERC-721 ownership to bob via direct transfer.

    async function mintAndTransferToUser(
      reg: BaeCardRegistry,
      admin: any,
      subject: string,
      rarity: number,
      recipient: string,
      count: number
    ): Promise<bigint[]> {
      const ids: bigint[] = [];
      for (let i = 0; i < count; i++) {
        await reg.connect(admin).mintCard(subject, rarity);
        const tid = await reg.totalSupply();
        await reg.connect(admin).transferFrom(admin.address, recipient, tid);
        ids.push(tid);
      }
      return ids;
    }

    it("burns 3 Common cards and mints 1 Rare", async () => {
      const { reg, market, cash, admin, alice, bob } = await loadFixture(deployFixture);
      const ids = await mintAndTransferToUser(reg, admin, alice.address, Rarity.Common, bob.address, 3);
      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

      const newId = await market.connect(bob).upgradeCards.staticCall(
        ids as [bigint, bigint, bigint], alice.address
      );
      await market.connect(bob).upgradeCards(ids as [bigint, bigint, bigint], alice.address);

      expect(await reg.getMultiplier(newId)).to.equal(180n); // Rare multiplier
    });

    it("emits CardUpgraded event", async () => {
      const { reg, market, cash, admin, alice, bob } = await loadFixture(deployFixture);
      const ids = await mintAndTransferToUser(reg, admin, alice.address, Rarity.Common, bob.address, 3);
      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

      await expect(market.connect(bob).upgradeCards(ids as [bigint, bigint, bigint], alice.address))
        .to.emit(market, "CardUpgraded");
    });

    it("reverts if trying to upgrade Legend cards", async () => {
      const { reg, market, cash, admin, alice, bob } = await loadFixture(deployFixture);
      const ids = await mintAndTransferToUser(reg, admin, alice.address, Rarity.Legend, bob.address, 3);
      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

      await expect(
        market.connect(bob).upgradeCards(ids as [bigint, bigint, bigint], alice.address)
      ).to.be.revertedWith("BaeCardMarket: cannot upgrade Legend");
    });

    it("reverts on rarity mismatch (2 Common + 1 Rare)", async () => {
      const { reg, market, cash, admin, alice, bob } = await loadFixture(deployFixture);

      // 2 Common
      const commons = await mintAndTransferToUser(reg, admin, alice.address, Rarity.Common, bob.address, 2);
      // 1 Rare
      const rares = await mintAndTransferToUser(reg, admin, alice.address, Rarity.Rare, bob.address, 1);
      const ids = [...commons, ...rares] as [bigint, bigint, bigint];

      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);
      await expect(
        market.connect(bob).upgradeCards(ids, alice.address)
      ).to.be.revertedWith("BaeCardMarket: rarity mismatch");
    });

    it("reverts when bob doesn't own the cards", async () => {
      const { reg, market, cash, admin, alice, carol } = await loadFixture(deployFixture);
      // Mint cards but DON'T transfer to carol — admin keeps them
      const ids: bigint[] = [];
      for (let i = 0; i < 3; i++) {
        await reg.connect(admin).mintCard(alice.address, Rarity.Common);
        ids.push(await reg.totalSupply());
      }
      await cash.connect(carol).approve(await market.getAddress(), ethers.MaxUint256);
      await expect(
        market.connect(carol).upgradeCards(ids as [bigint, bigint, bigint], alice.address)
      ).to.be.revertedWith("BaeCardMarket: not owner");
    });
  });

  describe("claimRoyalties()", () => {
    it("alice can claim accumulated card royalties", async () => {
      const { cash, market, reg, admin, alice, bob } = await loadFixture(deployFixture);

      // Second buy (carol) to accrue royalties
      await market.connect(bob).buyCard(1);
      const newPrice = await market.getCardPrice(1);
      const royalty  = (newPrice * 150n) / 10000n;

      // Give carol enough
      const [,,,, carol] = await ethers.getSigners();
      await cash.connect(admin).mintFromMarket(carol.address, ethers.parseEther("10000"));
      await cash.connect(carol).approve(await market.getAddress(), ethers.MaxUint256);
      await market.connect(carol).buyCard(1);

      const royaltyAmt = await (async () => {
        const regAddr = await market.registry();
        const r = await ethers.getContractAt("BaeCardRegistry", regAddr);
        return r.pendingRoyalties(alice.address);
      })();

      const aliceBefore = await cash.balanceOf(alice.address);
      await market.connect(alice).claimRoyalties();
      const aliceAfter = await cash.balanceOf(alice.address);

      expect(aliceAfter - aliceBefore).to.equal(royaltyAmt);
    });
  });

  describe("currentPackPrice()", () => {
    it("starts at PACK_BASE_PRICE (500 PCASH)", async () => {
      const { market } = await loadFixture(deployFixture);
      expect(await market.currentPackPrice()).to.equal(ethers.parseEther("500"));
    });
  });

  describe("pause()", () => {
    it("admin can pause and unpause buyCard", async () => {
      const { market, admin, bob } = await loadFixture(deployFixture);
      await market.connect(admin).pause();
      await expect(market.connect(bob).buyCard(1)).to.be.reverted;
      await market.connect(admin).unpause();
      await expect(market.connect(bob).buyCard(1)).to.not.be.reverted;
    });
  });
});
