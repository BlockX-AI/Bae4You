import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { CoupleCard, PetsCash } from "../typechain-types";

describe("CoupleCard", () => {
  async function deployFixture() {
    const [admin, minter, alice, bob, carol, dave] = await ethers.getSigners();

    const CashFactory = await ethers.getContractFactory("PetsCash");
    const cash = (await CashFactory.deploy(admin.address, admin.address)) as PetsCash;

    const Factory = await ethers.getContractFactory("CoupleCard");
    const couple = (await Factory.deploy(
      await cash.getAddress(),
      admin.address,
      minter.address
    )) as CoupleCard;

    // Grant MARKET_ROLE to admin for recordRoyalty tests
    const MARKET_ROLE = await couple.MARKET_ROLE();
    // admin already has MARKET_ROLE from constructor

    const network = await ethers.provider.getNetwork();
    const domain = {
      name: "Bae4U",
      version: "1",
      chainId: network.chainId,
      verifyingContract: await couple.getAddress(),
    };

    const types = {
      CoupleProof: [
        { name: "userA",     type: "address" },
        { name: "userB",     type: "address" },
        { name: "matchId",   type: "bytes32"  },
        { name: "timestamp", type: "uint256"  },
      ],
    };

    async function signCouple(
      userA: string,
      userB: string,
      matchId: string,
      timestamp: number
    ) {
      return minter.signTypedData(domain, types, { userA, userB, matchId, timestamp });
    }

    const matchId = ethers.encodeBytes32String("match_001");

    return { couple, cash, admin, minter, alice, bob, carol, dave, signCouple, matchId };
  }

  describe("mintCouple()", () => {
    it("mints two NFTs — one per partner", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);

      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      expect(await couple.ownerOf(1)).to.equal(alice.address);
      expect(await couple.ownerOf(2)).to.equal(bob.address);
    });

    it("stores correct coupleInfo for both tokens", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      const infoA = await couple.coupleInfo(1);
      const infoB = await couple.coupleInfo(2);

      expect(infoA.userA).to.equal(alice.address);
      expect(infoA.userB).to.equal(bob.address);
      expect(infoA.matchId).to.equal(matchId);
      expect(infoA.partnerId).to.equal(2n);
      expect(infoA.active).to.be.true;

      expect(infoB.partnerId).to.equal(1n);
      expect(infoB.active).to.be.true;
    });

    it("emits CoupleMinted event", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);

      await expect(
        couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig)
      ).to.emit(couple, "CoupleMinted")
        .withArgs(alice.address, bob.address, matchId, 1n, 2n);
    });

    it("reverts on expired proof (>1 hour old)", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = (await time.latest()) - 3601;
      const sig = await signCouple(alice.address, bob.address, matchId, ts);

      await expect(
        couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig)
      ).to.be.revertedWith("CoupleCard: proof expired");
    });

    it("reverts on duplicate matchId", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      await time.increase(10);
      const ts2 = await time.latest();
      const sig2 = await signCouple(alice.address, bob.address, matchId, ts2);
      await expect(
        couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts2, sig2)
      ).to.be.revertedWith("CoupleCard: already minted");
    });

    it("reverts on invalid signer (wrong minter key)", async () => {
      const { couple, alice, bob, matchId, admin } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const network = await ethers.provider.getNetwork();
      const domain = {
        name: "Bae4U",
        version: "1",
        chainId: network.chainId,
        verifyingContract: await couple.getAddress(),
      };
      const types = {
        CoupleProof: [
          { name: "userA", type: "address" },
          { name: "userB", type: "address" },
          { name: "matchId", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
        ],
      };
      const badSig = await admin.signTypedData(domain, types, {
        userA: alice.address, userB: bob.address, matchId, timestamp: ts,
      });
      await expect(
        couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, badSig)
      ).to.be.revertedWith("CoupleCard: invalid sig");
    });

    it("either partner can submit the proof", async () => {
      const { couple, alice, bob, signCouple } = await loadFixture(deployFixture);
      const matchId2 = ethers.encodeBytes32String("match_bob");
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId2, ts);
      // Bob submits, not Alice
      await expect(
        couple.connect(bob).mintCouple(alice.address, bob.address, matchId2, ts, sig)
      ).to.not.be.reverted;
    });
  });

  describe("burnCouple()", () => {
    async function mintedFixture() {
      const base = await deployFixture();
      const ts = await time.latest();
      const sig = await base.signCouple(base.alice.address, base.bob.address, base.matchId, ts);
      await base.couple.connect(base.alice).mintCouple(
        base.alice.address, base.bob.address, base.matchId, ts, sig
      );
      return base;
    }

    it("burns both tokens on unmatch", async () => {
      const { couple, alice, matchId } = await mintedFixture();
      await couple.connect(alice).burnCouple(matchId);

      await expect(couple.ownerOf(1)).to.be.reverted; // burned
      await expect(couple.ownerOf(2)).to.be.reverted; // burned
    });

    it("either partner can burn", async () => {
      const base = await deployFixture();
      const matchId2 = ethers.encodeBytes32String("match_002");
      const ts = await time.latest();
      const sig = await base.signCouple(base.alice.address, base.bob.address, matchId2, ts);
      await base.couple.connect(base.alice).mintCouple(
        base.alice.address, base.bob.address, matchId2, ts, sig
      );
      // Bob burns, not Alice
      await expect(base.couple.connect(base.bob).burnCouple(matchId2)).to.not.be.reverted;
    });

    it("emits CoupleCardBurned event", async () => {
      const { couple, alice, matchId } = await mintedFixture();
      await expect(couple.connect(alice).burnCouple(matchId))
        .to.emit(couple, "CoupleCardBurned")
        .withArgs(matchId, 1n, 2n);
    });

    it("reverts if non-partner tries to burn", async () => {
      const { couple, carol, matchId } = await mintedFixture();
      await expect(
        couple.connect(carol).burnCouple(matchId)
      ).to.be.revertedWith("CoupleCard: not a partner");
    });

    it("reverts on already burned", async () => {
      const { couple, alice, matchId } = await mintedFixture();
      await couple.connect(alice).burnCouple(matchId);
      await expect(
        couple.connect(alice).burnCouple(matchId)
      ).to.be.revertedWith("CoupleCard: already burned");
    });

    it("marks coupleInfo as inactive", async () => {
      const { couple, alice, matchId } = await mintedFixture();
      await couple.connect(alice).burnCouple(matchId);
      expect(await couple.isActive(matchId)).to.be.false;
    });
  });

  describe("recordRoyalty()", () => {
    it("accrues 0.75% to each partner", async () => {
      const { couple, alice, bob, admin, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      const saleAmount = ethers.parseEther("1000");
      const each = (saleAmount * 75n) / 10000n; // 0.75%

      await couple.connect(admin).recordRoyalty(1, saleAmount);

      expect(await couple.pendingRoyalties(alice.address)).to.equal(each);
      expect(await couple.pendingRoyalties(bob.address)).to.equal(each);
    });

    it("emits CoupleRoyaltyAccrued for each partner", async () => {
      const { couple, alice, bob, admin, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      const saleAmount = ethers.parseEther("100");
      const each = (saleAmount * 75n) / 10000n;

      await expect(couple.connect(admin).recordRoyalty(1, saleAmount))
        .to.emit(couple, "CoupleRoyaltyAccrued")
        .withArgs(alice.address, each);
    });
  });

  describe("claimRoyalties()", () => {
    it("transfers accumulated royalties to the caller", async () => {
      const { couple, cash, alice, bob, admin, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);

      // Fund couple contract with PCASH for payout
      await cash.connect(admin).grantMarketRole(admin.address);
      const royaltyFund = ethers.parseEther("100");
      await cash.connect(admin).mintFromMarket(await couple.getAddress(), royaltyFund);

      const saleAmount = ethers.parseEther("1000");
      await couple.connect(admin).recordRoyalty(1, saleAmount);

      const each = (saleAmount * 75n) / 10000n;
      const aliceBefore = await cash.balanceOf(alice.address);
      await couple.connect(alice).claimRoyalties();
      const aliceAfter = await cash.balanceOf(alice.address);

      expect(aliceAfter - aliceBefore).to.equal(each);
      expect(await couple.pendingRoyalties(alice.address)).to.equal(0n);
    });

    it("reverts if nothing to claim", async () => {
      const { couple, alice } = await loadFixture(deployFixture);
      await expect(couple.connect(alice).claimRoyalties())
        .to.be.revertedWith("CoupleCard: nothing to claim");
    });
  });

  describe("isActive()", () => {
    it("returns false for unknown matchId", async () => {
      const { couple } = await loadFixture(deployFixture);
      const unknown = ethers.encodeBytes32String("unknown");
      expect(await couple.isActive(unknown)).to.be.false;
    });

    it("returns true after minting", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);
      expect(await couple.isActive(matchId)).to.be.true;
    });
  });

  describe("tokenURI()", () => {
    it("returns correct couple metadata URL", async () => {
      const { couple, alice, bob, signCouple, matchId } = await loadFixture(deployFixture);
      const ts = await time.latest();
      const sig = await signCouple(alice.address, bob.address, matchId, ts);
      await couple.connect(alice).mintCouple(alice.address, bob.address, matchId, ts, sig);
      expect(await couple.tokenURI(1)).to.equal("https://api.bae4u.com/couples/1.json");
      expect(await couple.tokenURI(2)).to.equal("https://api.bae4u.com/couples/2.json");
    });
  });
});
