import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { BaeCardRegistry } from "../typechain-types";

describe("BaeCardRegistry", () => {
  // Rarity enum: Common=0, Rare=1, Epic=2, Legend=3
  const Rarity = { Common: 0, Rare: 1, Epic: 2, Legend: 3 };

  async function deployFixture() {
    const [admin, minter, alice, bob, attacker, market] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BaeCardRegistry");
    const reg = (await Factory.deploy(admin.address)) as BaeCardRegistry;

    // Grant minter role to minter signer
    const MINTER_ROLE = await reg.MINTER_ROLE();
    await reg.connect(admin).grantRole(MINTER_ROLE, minter.address);

    const BURNER_ROLE = await reg.BURNER_ROLE();
    await reg.connect(admin).grantRole(BURNER_ROLE, minter.address);

    const MARKET_ROLE = await reg.MARKET_ROLE();
    await reg.connect(admin).grantRole(MARKET_ROLE, market.address);

    return { reg, admin, minter, alice, bob, attacker, market, MINTER_ROLE, BURNER_ROLE, MARKET_ROLE };
  }

  describe("mintCard()", () => {
    it("mints a card with correct info", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      const tokenId = await reg.connect(minter).mintCard.staticCall(alice.address, Rarity.Common);
      expect(tokenId).to.equal(1n);

      await reg.connect(minter).mintCard(alice.address, Rarity.Common);

      const info = await reg.getCardInfo(1);
      expect(info.subject).to.equal(alice.address);
      expect(info.rarity).to.equal(Rarity.Common);
    });

    it("emits CardMinted event", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await expect(reg.connect(minter).mintCard(alice.address, Rarity.Rare))
        .to.emit(reg, "CardMinted")
        .withArgs(alice.address, 1n, Rarity.Rare);
    });

    it("supports multiple cards per subject with different rarities", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await reg.connect(minter).mintCard(alice.address, Rarity.Epic);
      const subjectCards = await reg.getSubjectCards(alice.address);
      expect(subjectCards.length).to.equal(2);
    });

    it("reverts without MINTER_ROLE", async () => {
      const { reg, attacker, alice } = await loadFixture(deployFixture);
      await expect(
        reg.connect(attacker).mintCard(alice.address, Rarity.Common)
      ).to.be.reverted;
    });

    it("reverts for zero subject address", async () => {
      const { reg, minter } = await loadFixture(deployFixture);
      await expect(
        reg.connect(minter).mintCard(ethers.ZeroAddress, Rarity.Common)
      ).to.be.revertedWith("BaeCardRegistry: zero subject");
    });

    it("minted card is owned by the minter (msg.sender)", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Legend);
      expect(await reg.ownerOf(1)).to.equal(minter.address);
    });
  });

  describe("burnCard()", () => {
    it("burns the card and removes it from subject list", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);

      await reg.connect(minter).burnCard(1);
      const subjectCards = await reg.getSubjectCards(alice.address);
      expect(subjectCards.length).to.equal(0);
    });

    it("emits CardBurned event", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await expect(reg.connect(minter).burnCard(1))
        .to.emit(reg, "CardBurned")
        .withArgs(1n, minter.address);
    });

    it("reverts without BURNER_ROLE", async () => {
      const { reg, minter, alice, attacker } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await expect(reg.connect(attacker).burnCard(1)).to.be.reverted;
    });

    it("correctly pops the right card from a multi-card subject list", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);   // tokenId 1
      await reg.connect(minter).mintCard(alice.address, Rarity.Rare);     // tokenId 2
      await reg.connect(minter).mintCard(alice.address, Rarity.Epic);     // tokenId 3

      await reg.connect(minter).burnCard(2); // burn middle card
      const remaining = await reg.getSubjectCards(alice.address);
      expect(remaining.length).to.equal(2);
      expect(remaining).to.not.include(2n);
    });
  });

  describe("recordRoyalty() / consumeRoyalties()", () => {
    it("accrues royalty for card subject", async () => {
      const { reg, minter, alice, market } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await reg.connect(market).recordRoyalty(1, ethers.parseEther("15"));
      expect(await reg.pendingRoyalties(alice.address)).to.equal(ethers.parseEther("15"));
    });

    it("emits RoyaltyAccrued event", async () => {
      const { reg, minter, alice, market } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await expect(reg.connect(market).recordRoyalty(1, ethers.parseEther("10")))
        .to.emit(reg, "RoyaltyAccrued")
        .withArgs(alice.address, ethers.parseEther("10"));
    });

    it("accumulates multiple royalty records", async () => {
      const { reg, minter, alice, market } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await reg.connect(market).recordRoyalty(1, ethers.parseEther("10"));
      await reg.connect(market).recordRoyalty(1, ethers.parseEther("5"));
      expect(await reg.pendingRoyalties(alice.address)).to.equal(ethers.parseEther("15"));
    });

    it("consumeRoyalties returns the amount and resets to zero", async () => {
      const { reg, minter, alice, market } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await reg.connect(market).recordRoyalty(1, ethers.parseEther("20"));

      const amount = await reg.connect(market).consumeRoyalties.staticCall(alice.address);
      expect(amount).to.equal(ethers.parseEther("20"));

      await reg.connect(market).consumeRoyalties(alice.address);
      expect(await reg.pendingRoyalties(alice.address)).to.equal(0n);
    });

    it("consumeRoyalties reverts if nothing to claim", async () => {
      const { reg, alice, market } = await loadFixture(deployFixture);
      await expect(
        reg.connect(market).consumeRoyalties(alice.address)
      ).to.be.revertedWith("BaeCardRegistry: nothing to claim");
    });

    it("reverts recordRoyalty without MARKET_ROLE", async () => {
      const { reg, minter, alice, attacker } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      await expect(
        reg.connect(attacker).recordRoyalty(1, ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });

  describe("getMultiplier()", () => {
    it("returns 100 for Common", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      expect(await reg.getMultiplier(1)).to.equal(100n);
    });

    it("returns 180 for Rare", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Rare);
      expect(await reg.getMultiplier(1)).to.equal(180n);
    });

    it("returns 320 for Epic", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Epic);
      expect(await reg.getMultiplier(1)).to.equal(320n);
    });

    it("returns 600 for Legend", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Legend);
      expect(await reg.getMultiplier(1)).to.equal(600n);
    });
  });

  describe("tokenURI()", () => {
    it("common card URI contains 'common'", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Common);
      expect(await reg.tokenURI(1)).to.equal("https://api.bae4u.com/cards/common/1.json");
    });

    it("rare card URI contains 'rare'", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Rare);
      expect(await reg.tokenURI(1)).to.equal("https://api.bae4u.com/cards/rare/1.json");
    });

    it("epic card URI contains 'epic'", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Epic);
      expect(await reg.tokenURI(1)).to.equal("https://api.bae4u.com/cards/epic/1.json");
    });

    it("legend card URI contains 'legend'", async () => {
      const { reg, minter, alice } = await loadFixture(deployFixture);
      await reg.connect(minter).mintCard(alice.address, Rarity.Legend);
      expect(await reg.tokenURI(1)).to.equal("https://api.bae4u.com/cards/legend/1.json");
    });

    it("reverts for nonexistent token", async () => {
      const { reg } = await loadFixture(deployFixture);
      await expect(reg.tokenURI(999)).to.be.revertedWith("BaeCardRegistry: nonexistent token");
    });
  });

  describe("ERC-721 compliance", () => {
    it("supportsInterface returns true for ERC-721", async () => {
      const { reg } = await loadFixture(deployFixture);
      expect(await reg.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });
});
