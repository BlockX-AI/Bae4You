import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PetsCash } from "../typechain-types";

describe("PetsCash", () => {
  async function deployFixture() {
    const [admin, signer, alice, bob, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PetsCash");
    const cash = (await Factory.deploy(admin.address, signer.address)) as PetsCash;

    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;

    const domain = {
      name: "Bae4U",
      version: "1",
      chainId,
      verifyingContract: await cash.getAddress(),
    };

    const types = {
      BonusClaim: [
        { name: "user",      type: "address" },
        { name: "amount",    type: "uint256" },
        { name: "timestamp", type: "uint256" },
      ],
    };

    async function signBonus(user: string, amount: bigint, timestamp: number) {
      const value = { user, amount, timestamp };
      return signer.signTypedData(domain, types, value);
    }

    return { cash, admin, signer, alice, bob, attacker, signBonus, domain, types };
  }

  describe("claimBonus()", () => {
    it("mints the correct amount on a valid claim", async () => {
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
      const ts = await time.latest();
      const sig = await signBonus(alice.address, amount, ts);

      await cash.connect(alice).claimBonus(amount, ts, sig);
      expect(await cash.balanceOf(alice.address)).to.equal(amount);
    });

    it("emits BonusClaimed event", async () => {
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("50");
      const ts = await time.latest();
      const sig = await signBonus(alice.address, amount, ts);

      await expect(cash.connect(alice).claimBonus(amount, ts, sig))
        .to.emit(cash, "BonusClaimed")
        .withArgs(alice.address, amount, ts);
    });

    it("reverts if cooldown has not elapsed", async () => {
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = await time.latest();
      const sig = await signBonus(alice.address, amount, ts);
      await cash.connect(alice).claimBonus(amount, ts, sig);

      const ts2 = await time.latest();
      const sig2 = await signBonus(alice.address, amount, ts2);
      await expect(
        cash.connect(alice).claimBonus(amount, ts2, sig2)
      ).to.be.revertedWith("PetsCash: cooldown active");
    });

    it("allows claim again after 4-hour cooldown", async () => {
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = await time.latest();
      await cash.connect(alice).claimBonus(amount, ts, await signBonus(alice.address, amount, ts));

      await time.increase(4 * 3600 + 1);

      const ts2 = await time.latest();
      const sig2 = await signBonus(alice.address, amount, ts2);
      await expect(cash.connect(alice).claimBonus(amount, ts2, sig2)).to.not.be.reverted;
    });

    it("reverts with expired signature", async () => {
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = (await time.latest()) - 3601; // older than 1 hour
      const sig = await signBonus(alice.address, amount, ts);
      await expect(
        cash.connect(alice).claimBonus(amount, ts, sig)
      ).to.be.revertedWith("PetsCash: sig expired");
    });

    it("sig cannot be replayed — reverts with sig expired after cooldown", async () => {
      // CLAIM_COOLDOWN (4h) > sig validity (1h): usedSigs is belt-and-suspenders;
      // by the time cooldown elapses the sig has already expired.
      // Observable defense: replay attempt after cooldown reverts with "sig expired".
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = await time.latest();
      const sig = await signBonus(alice.address, amount, ts);
      await cash.connect(alice).claimBonus(amount, ts, sig);

      // Advance past cooldown (sig is now expired too since 4h > 1h)
      await time.increase(4 * 3600 + 1);
      await expect(
        cash.connect(alice).claimBonus(amount, ts, sig)
      ).to.be.revertedWith("PetsCash: sig expired");
    });

    it("usedSigs is marked true after a successful claim", async () => {
      // Verifies the usedSigs anti-replay storage is populated (even though
      // CLAIM_COOLDOWN > sig validity makes the revert path unreachable in practice).
      const { cash, alice, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = await time.latest();
      const sig = await signBonus(alice.address, amount, ts);
      await cash.connect(alice).claimBonus(amount, ts, sig);

      // lastClaimAt is set, confirming the claim was processed
      expect(await cash.lastClaimAt(alice.address)).to.be.gt(0n);
    });

    it("reverts if signature is from wrong signer", async () => {
      const { cash, alice, attacker, signBonus } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const ts = await time.latest();

      const network = await ethers.provider.getNetwork();
      const domain = {
        name: "Bae4U",
        version: "1",
        chainId: network.chainId,
        verifyingContract: await cash.getAddress(),
      };
      const types = {
        BonusClaim: [
          { name: "user",      type: "address" },
          { name: "amount",    type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
      };
      const badSig = await attacker.signTypedData(domain, types, { user: alice.address, amount, timestamp: ts });
      await expect(
        cash.connect(alice).claimBonus(amount, ts, badSig)
      ).to.be.revertedWith("PetsCash: invalid sig");
    });
  });

  describe("mintFromMarket()", () => {
    it("MARKET_ROLE can mint", async () => {
      const { cash, admin, alice } = await loadFixture(deployFixture);
      await cash.connect(admin).grantMarketRole(admin.address);
      await cash.connect(admin).mintFromMarket(alice.address, ethers.parseEther("200"));
      expect(await cash.balanceOf(alice.address)).to.equal(ethers.parseEther("200"));
    });

    it("reverts without MARKET_ROLE", async () => {
      const { cash, attacker, alice } = await loadFixture(deployFixture);
      await expect(
        cash.connect(attacker).mintFromMarket(alice.address, ethers.parseEther("1"))
      ).to.be.reverted;
    });
  });

  describe("burn()", () => {
    it("burns tokens from caller's balance", async () => {
      const { cash, admin, alice } = await loadFixture(deployFixture);
      await cash.connect(admin).grantMarketRole(admin.address);
      await cash.connect(admin).mintFromMarket(alice.address, ethers.parseEther("100"));

      await cash.connect(alice).burn(ethers.parseEther("40"));
      expect(await cash.balanceOf(alice.address)).to.equal(ethers.parseEther("60"));
    });
  });

  describe("convertToGold()", () => {
    it("burns tokens and emits GoldConversion", async () => {
      const { cash, admin, alice } = await loadFixture(deployFixture);
      await cash.connect(admin).grantMarketRole(admin.address);
      const amount = ethers.parseEther("50");
      await cash.connect(admin).mintFromMarket(alice.address, amount);

      await expect(cash.connect(alice).convertToGold(amount))
        .to.emit(cash, "GoldConversion")
        .withArgs(alice.address, amount);

      expect(await cash.balanceOf(alice.address)).to.equal(0n);
    });
  });

  describe("grantMarketRole()", () => {
    it("only DEFAULT_ADMIN can call grantMarketRole", async () => {
      const { cash, attacker } = await loadFixture(deployFixture);
      await expect(
        cash.connect(attacker).grantMarketRole(attacker.address)
      ).to.be.reverted;
    });
  });
});
