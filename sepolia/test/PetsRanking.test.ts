import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PetsRanking } from "../typechain-types";

describe("PetsRanking", () => {
  // Tier enum: None=0, Bronze=1, Silver=2, Gold=3, Diamond=4, Master=5
  const Tier = { None: 0, Bronze: 1, Silver: 2, Gold: 3, Diamond: 4, Master: 5 };

  async function deployFixture() {
    const [admin, issuer, alice, bob, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PetsRanking");
    const ranking = (await Factory.deploy(admin.address, issuer.address)) as PetsRanking;

    const network = await ethers.provider.getNetwork();
    const domain = {
      name: "Bae4U",
      version: "1",
      chainId: network.chainId,
      verifyingContract: await ranking.getAddress(),
    };

    const types = {
      BadgeClaim: [
        { name: "user",       type: "address" },
        { name: "tier",       type: "uint8"   },
        { name: "snapshotTs", type: "uint256"  },
      ],
    };

    async function signBadge(user: string, tier: number, snapshotTs: number) {
      return issuer.signTypedData(domain, types, { user, tier, snapshotTs });
    }

    return { ranking, admin, issuer, alice, bob, attacker, signBadge };
  }

  describe("issueBadge()", () => {
    it("mints a Bronze badge to the user", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Bronze, snap);

      await ranking.connect(alice).issueBadge(alice.address, Tier.Bronze, snap, sig);

      expect(await ranking.balanceOf(alice.address, Tier.Bronze)).to.equal(1n);
      expect(await ranking.getActiveBadge(alice.address)).to.equal(Tier.Bronze);
    });

    it("mints a Silver badge", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Silver, snap);

      await ranking.connect(alice).issueBadge(alice.address, Tier.Silver, snap, sig);
      expect(await ranking.getActiveBadge(alice.address)).to.equal(Tier.Silver);
    });

    it("mints a Master badge", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Master, snap);

      await ranking.connect(alice).issueBadge(alice.address, Tier.Master, snap, sig);
      expect(await ranking.getActiveBadge(alice.address)).to.equal(Tier.Master);
    });

    it("emits BadgeIssued event", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Gold, snap);

      await expect(ranking.connect(alice).issueBadge(alice.address, Tier.Gold, snap, sig))
        .to.emit(ranking, "BadgeIssued")
        .withArgs(alice.address, Tier.Gold, snap);
    });

    it("burns previous badge before issuing new one", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);

      // Issue Bronze
      const snap1 = await time.latest();
      await ranking.connect(alice).issueBadge(
        alice.address, Tier.Bronze, snap1,
        await signBadge(alice.address, Tier.Bronze, snap1)
      );

      expect(await ranking.balanceOf(alice.address, Tier.Bronze)).to.equal(1n);

      // Upgrade to Silver
      const snap2 = await time.latest() + 1;
      await ranking.connect(alice).issueBadge(
        alice.address, Tier.Silver, snap2,
        await signBadge(alice.address, Tier.Silver, snap2)
      );

      expect(await ranking.balanceOf(alice.address, Tier.Bronze)).to.equal(0n); // burned
      expect(await ranking.balanceOf(alice.address, Tier.Silver)).to.equal(1n);
      expect(await ranking.getActiveBadge(alice.address)).to.equal(Tier.Silver);
    });

    it("reverts for Tier.None", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.None, snap);
      await expect(
        ranking.connect(alice).issueBadge(alice.address, Tier.None, snap, sig)
      ).to.be.revertedWith("PetsRanking: invalid tier");
    });

    it("reverts on proof replay", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Bronze, snap);
      await ranking.connect(alice).issueBadge(alice.address, Tier.Bronze, snap, sig);

      const snap2 = await time.latest() + 1;
      const sig2  = await signBadge(alice.address, Tier.Silver, snap2);
      await ranking.connect(alice).issueBadge(alice.address, Tier.Silver, snap2, sig2);

      // Re-use first sig
      await expect(
        ranking.connect(alice).issueBadge(alice.address, Tier.Bronze, snap, sig)
      ).to.be.revertedWith("PetsRanking: proof already used");
    });

    it("reverts on invalid signer", async () => {
      const { ranking, alice, attacker } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const network = await ethers.provider.getNetwork();
      const domain = {
        name: "Bae4U",
        version: "1",
        chainId: network.chainId,
        verifyingContract: await ranking.getAddress(),
      };
      const types = {
        BadgeClaim: [
          { name: "user",       type: "address" },
          { name: "tier",       type: "uint8"   },
          { name: "snapshotTs", type: "uint256"  },
        ],
      };
      const badSig = await attacker.signTypedData(domain, types, {
        user: alice.address, tier: Tier.Gold, snapshotTs: snap,
      });
      await expect(
        ranking.connect(alice).issueBadge(alice.address, Tier.Gold, snap, badSig)
      ).to.be.revertedWith("PetsRanking: invalid sig");
    });

    it("two different users can each get their own badge", async () => {
      const { ranking, alice, bob, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();

      await ranking.connect(alice).issueBadge(
        alice.address, Tier.Diamond, snap,
        await signBadge(alice.address, Tier.Diamond, snap)
      );

      const snap2 = snap + 1;
      await ranking.connect(bob).issueBadge(
        bob.address, Tier.Bronze, snap2,
        await signBadge(bob.address, Tier.Bronze, snap2)
      );

      expect(await ranking.getActiveBadge(alice.address)).to.equal(Tier.Diamond);
      expect(await ranking.getActiveBadge(bob.address)).to.equal(Tier.Bronze);
    });
  });

  describe("weeklyReset()", () => {
    it("updates lastReset timestamp", async () => {
      const { ranking, issuer } = await loadFixture(deployFixture);
      const before = await ranking.lastReset();
      await time.increase(7 * 24 * 3600);
      await ranking.connect(issuer).weeklyReset();
      const after = await ranking.lastReset();
      expect(after).to.be.gt(before);
    });

    it("emits WeeklyReset event", async () => {
      const { ranking, issuer } = await loadFixture(deployFixture);
      await expect(ranking.connect(issuer).weeklyReset())
        .to.emit(ranking, "WeeklyReset");
    });

    it("reverts without AUTOMATION_ROLE", async () => {
      const { ranking, attacker } = await loadFixture(deployFixture);
      await expect(ranking.connect(attacker).weeklyReset()).to.be.reverted;
    });
  });

  describe("ERC-1155 compliance", () => {
    it("balanceOf returns 1 after badge issue", async () => {
      const { ranking, alice, signBadge } = await loadFixture(deployFixture);
      const snap = await time.latest();
      const sig  = await signBadge(alice.address, Tier.Gold, snap);
      await ranking.connect(alice).issueBadge(alice.address, Tier.Gold, snap, sig);
      expect(await ranking.balanceOf(alice.address, Tier.Gold)).to.equal(1n);
    });

    it("supportsInterface returns true for ERC-1155", async () => {
      const { ranking } = await loadFixture(deployFixture);
      expect(await ranking.supportsInterface("0xd9b67a26")).to.be.true;
    });
  });
});
