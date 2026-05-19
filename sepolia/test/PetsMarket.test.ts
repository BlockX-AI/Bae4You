import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PetsCash, PetsRegistry, PetsMarket } from "../typechain-types";

describe("PetsMarket", () => {
  async function deployFixture() {
    const [admin, alice, bob, carol, treasury] = await ethers.getSigners();

    const PetsCashFactory = await ethers.getContractFactory("PetsCash");
    const cash = (await PetsCashFactory.deploy(admin.address, admin.address)) as PetsCash;

    const RegistryFactory = await ethers.getContractFactory("PetsRegistry");
    const reg = (await RegistryFactory.deploy(admin.address)) as PetsRegistry;

    const MarketFactory = await ethers.getContractFactory("PetsMarket");
    const market = (await MarketFactory.deploy(
      await cash.getAddress(),
      await reg.getAddress(),
      treasury.address,
      admin.address
    )) as PetsMarket;

    await cash.grantMarketRole(await market.getAddress());

    const STARTING = ethers.parseEther("1000");

    // Mint profiles + init on market
    const aliceTokenId = await reg.connect(admin).mintProfile.staticCall(alice.address, STARTING);
    await reg.connect(admin).mintProfile(alice.address, STARTING);
    await market.connect(admin).initPet(aliceTokenId, alice.address, STARTING);

    // Give bob and carol enough PetsCash to buy
    const MARKET_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKET_ROLE"));
    await cash.grantRole(MARKET_ROLE, admin.address);
    await cash.connect(admin).mintFromMarket(bob.address, ethers.parseEther("5000"));
    await cash.connect(admin).mintFromMarket(carol.address, ethers.parseEther("5000"));

    // Bob must approve market to spend his PetsCash
    await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);
    await cash.connect(carol).approve(await market.getAddress(), ethers.MaxUint256);

    return { cash, reg, market, admin, alice, bob, carol, treasury, aliceTokenId, STARTING };
  }

  describe("buy()", () => {
    it("transfers ownership correctly", async () => {
      const { market, bob, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      const state = await market.states(aliceTokenId);
      expect(state.owner).to.equal(bob.address);
    });

    it("applies 10% price increase", async () => {
      const { market, bob, aliceTokenId, STARTING } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      const state = await market.states(aliceTokenId);
      // new price = 1000 * 11000 / 10000 = 1100
      expect(state.price).to.equal((STARTING * 11000n) / 10000n);
    });

    it("splits profit 50/50 between petProfile and prevOwner", async () => {
      const { cash, market, alice, bob, carol, aliceTokenId, STARTING } = await loadFixture(deployFixture);

      const aliceBalBefore = await cash.balanceOf(alice.address);

      // First buy: bob buys alice's pet
      await market.connect(bob).buy(aliceTokenId);

      const aliceBalAfter = await cash.balanceOf(alice.address);

      // First sale: prevOwner IS alice (petProfile), so she gets all profit
      // fee = 1000 * 250/10000 = 25
      // afterFee = 975, cost = 0, profit = 975, half = 487
      // alice (as prevOwner) gets: 0 + 487 = 487
      // alice (as petProfile) gets: 487 + remainder(1) = 488
      // total alice receives = 975
      const received = aliceBalAfter - aliceBalBefore;
      expect(received).to.be.closeTo(
        ethers.parseEther("975"),
        ethers.parseEther("1") // allow 1 PCASH tolerance for rounding
      );
    });

    it("reverts when pet is locked", async () => {
      const { market, bob, carol, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);

      // Bob locks his newly acquired pet
      await market.connect(bob).lockPet(aliceTokenId, 1 * 24 * 60 * 60); // 1 day

      await expect(market.connect(carol).buy(aliceTokenId)).to.be.revertedWith("PetsMarket: locked");
    });

    it("reverts when buyer has insufficient balance", async () => {
      const { market, admin, aliceTokenId } = await loadFixture(deployFixture);
      // admin has no PetsCash
      await expect(market.connect(admin).buy(aliceTokenId)).to.be.revertedWith(
        "PetsMarket: insufficient balance"
      );
    });

    it("increments totalBuys on each purchase", async () => {
      const { market, cash, bob, carol, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);

      // Give carol more cash to afford the now-higher price
      const state1 = await market.states(aliceTokenId);
      await cash.connect(carol).approve(await market.getAddress(), ethers.MaxUint256);

      await market.connect(carol).buy(aliceTokenId);
      const state2 = await market.states(aliceTokenId);
      expect(state2.totalBuys).to.equal(2);
    });
  });

  describe("lockPet()", () => {
    it("prevents buying a locked pet", async () => {
      const { market, bob, carol, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      await market.connect(bob).lockPet(aliceTokenId, 3600);
      expect(await market.isLocked(aliceTokenId)).to.be.true;
      await expect(market.connect(carol).buy(aliceTokenId)).to.be.reverted;
    });

    it("non-owner cannot lock", async () => {
      const { market, bob, aliceTokenId } = await loadFixture(deployFixture);
      await expect(market.connect(bob).lockPet(aliceTokenId, 3600)).to.be.revertedWith(
        "PetsMarket: not owner"
      );
    });
  });

  describe("pause()", () => {
    it("admin can pause and unpause", async () => {
      const { market, admin, bob, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(admin).pause();
      await expect(market.connect(bob).buy(aliceTokenId)).to.be.revertedWith("Pausable: paused");
      await market.connect(admin).unpause();
      await expect(market.connect(bob).buy(aliceTokenId)).to.not.be.reverted;
    });
  });

  describe("initPet()", () => {
    it("reverts on double init", async () => {
      const { market, admin, alice, aliceTokenId, STARTING } = await loadFixture(deployFixture);
      await expect(
        market.connect(admin).initPet(aliceTokenId, alice.address, STARTING)
      ).to.be.revertedWith("PetsMarket: already init");
    });

    it("non-admin cannot initPet", async () => {
      const { reg, market, bob, STARTING } = await loadFixture(deployFixture);
      const bobTokenId = await reg.connect((await ethers.getSigners())[0]).mintProfile.staticCall(bob.address, STARTING);
      await reg.connect((await ethers.getSigners())[0]).mintProfile(bob.address, STARTING);
      await expect(
        market.connect(bob).initPet(bobTokenId, bob.address, STARTING)
      ).to.be.reverted;
    });
  });

  describe("lockPet() auto-expiry", () => {
    it("lock auto-expires after duration", async () => {
      const { market, bob, carol, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      await market.connect(bob).lockPet(aliceTokenId, 3600); // 1 hour

      expect(await market.isLocked(aliceTokenId)).to.be.true;

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await market.isLocked(aliceTokenId)).to.be.false;
      await expect(market.connect(carol).buy(aliceTokenId)).to.not.be.reverted;
    });

    it("reverts on duration exceeding MAX_LOCK", async () => {
      const { market, bob, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      const MAX_LOCK = 7 * 24 * 60 * 60;
      await expect(
        market.connect(bob).lockPet(aliceTokenId, MAX_LOCK + 1)
      ).to.be.revertedWith("PetsMarket: invalid duration");
    });
  });

  describe("giftCash()", () => {
    it("owner can gift PCASH to the pet profile", async () => {
      const { cash, market, alice, bob, aliceTokenId } = await loadFixture(deployFixture);

      await market.connect(bob).buy(aliceTokenId);
      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

      const aliceBalBefore = await cash.balanceOf(alice.address);
      const giftAmount = ethers.parseEther("50");
      await market.connect(bob).giftCash(aliceTokenId, giftAmount);

      const aliceBalAfter = await cash.balanceOf(alice.address);
      expect(aliceBalAfter - aliceBalBefore).to.equal(giftAmount);
    });

    it("non-owner cannot gift", async () => {
      const { market, carol, aliceTokenId } = await loadFixture(deployFixture);
      await expect(
        market.connect(carol).giftCash(aliceTokenId, ethers.parseEther("10"))
      ).to.be.revertedWith("PetsMarket: not owner");
    });

    it("enforces daily gift limit of 10", async () => {
      const { cash, market, bob, aliceTokenId } = await loadFixture(deployFixture);
      await market.connect(bob).buy(aliceTokenId);
      await cash.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

      const smallGift = ethers.parseEther("1");
      for (let i = 0; i < 10; i++) {
        await market.connect(bob).giftCash(aliceTokenId, smallGift);
      }

      await expect(
        market.connect(bob).giftCash(aliceTokenId, smallGift)
      ).to.be.revertedWith("PetsMarket: daily gift limit");
    });
  });

  describe("profit split — second buyer", () => {
    it("second buyer: prev owner (bob) earns cost + half profit", async () => {
      const { cash, market, bob, carol, aliceTokenId, STARTING } = await loadFixture(deployFixture);

      await market.connect(bob).buy(aliceTokenId);
      const newPrice = (STARTING * 11000n) / 10000n; // 1100

      const bobBalBefore = await cash.balanceOf(bob.address);
      await market.connect(carol).buy(aliceTokenId);
      const bobBalAfter = await cash.balanceOf(bob.address);

      // bob paid 1000, price now 1100
      // fee = 1100 * 250/10000 = 27 (floor)
      // afterFee = 1100 - 27 = 1073
      // cost = 1000 (bob paid 1000)
      // profit = 1073 - 1000 = 73
      // half = 36
      // bob gets: cost + half = 1000 + 36 = 1036
      const fee      = (newPrice * 250n) / 10000n;
      const afterFee = newPrice - fee;
      const cost     = STARTING;
      const profit   = afterFee - cost;
      const half     = profit / 2n;
      const expected = cost + half;

      expect(bobBalAfter - bobBalBefore).to.equal(expected);
    });
  });
});
