import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { TournamentEngine, BaeCardRegistry, PetsCash } from "../typechain-types";

describe("TournamentEngine", () => {
  const Rarity = { Common: 0, Rare: 1, Epic: 2, Legend: 3 };
  const WEEK = 7 * 24 * 3600;

  async function deployFixture() {
    const [admin, oracle, alice, bob, carol, treasury] = await ethers.getSigners();

    const CashFactory = await ethers.getContractFactory("PetsCash");
    const cash = (await CashFactory.deploy(admin.address, admin.address)) as PetsCash;

    const RegFactory = await ethers.getContractFactory("BaeCardRegistry");
    const reg = (await RegFactory.deploy(admin.address)) as BaeCardRegistry;

    const EngineFactory = await ethers.getContractFactory("TournamentEngine");
    const engine = (await EngineFactory.deploy(
      await cash.getAddress(),
      await reg.getAddress(),
      admin.address
    )) as TournamentEngine;

    // Grant oracle role
    const ORACLE_ROLE = await engine.ORACLE_ROLE();
    await engine.connect(admin).grantRole(ORACLE_ROLE, oracle.address);

    // Fund cash
    await cash.connect(admin).grantMarketRole(admin.address);

    // Mint 5 cards owned by alice (MINTER_ROLE = admin)
    const cardIds: bigint[] = [];
    for (let i = 0; i < 5; i++) {
      await reg.connect(admin).mintCard(alice.address, Rarity.Common);
      cardIds.push(BigInt(i + 1));
    }

    // Mint 5 cards for bob
    const bobCardIds: bigint[] = [];
    for (let i = 5; i < 10; i++) {
      await reg.connect(admin).mintCard(bob.address, Rarity.Rare);
      bobCardIds.push(BigInt(i + 1));
    }

    // Note: cards are owned by admin (minter), need to transfer to alice/bob
    // BaeCardRegistry mints to msg.sender (admin) so we transfer them
    for (const id of cardIds) {
      await reg.connect(admin).transferFrom(admin.address, alice.address, id);
    }
    for (const id of bobCardIds) {
      await reg.connect(admin).transferFrom(admin.address, bob.address, id);
    }

    // Give alice and bob PCASH for entry fees
    await cash.connect(admin).mintFromMarket(alice.address, ethers.parseEther("1000"));
    await cash.connect(admin).mintFromMarket(bob.address, ethers.parseEther("1000"));
    await cash.connect(alice).approve(await engine.getAddress(), ethers.MaxUint256);
    await cash.connect(bob).approve(await engine.getAddress(), ethers.MaxUint256);

    return {
      engine, cash, reg, admin, oracle, alice, bob, carol,
      cardIds: cardIds as [bigint, bigint, bigint, bigint, bigint],
      bobCardIds: bobCardIds as [bigint, bigint, bigint, bigint, bigint],
    };
  }

  describe("openTournament()", () => {
    it("opens a tournament and sets activeTournamentId", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      expect(await engine.activeTournamentId()).to.equal(1n);
    });

    it("stores correct tournament data", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      const now = await time.latest();
      await engine.connect(admin).openTournament(WEEK);
      const t = await engine.getTournament(1);
      expect(t.id).to.equal(1n);
      expect(t.closed).to.be.false;
      expect(t.scoresSubmitted).to.be.false;
      expect(t.prizePool).to.equal(0n);
    });

    it("emits TournamentOpened event", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await expect(engine.connect(admin).openTournament(WEEK))
        .to.emit(engine, "TournamentOpened")
        .withArgs(1n, (v: bigint) => v > 0n, (v: bigint) => v > 0n);
    });

    it("reverts if a tournament is already active", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await expect(engine.connect(admin).openTournament(WEEK))
        .to.be.revertedWith("TournamentEngine: tournament already active");
    });

    it("reverts without ADMIN_ROLE", async () => {
      const { engine, carol } = await loadFixture(deployFixture);
      await expect(engine.connect(carol).openTournament(WEEK)).to.be.reverted;
    });
  });

  describe("lockDeck()", () => {
    it("locks a valid 5-card deck and deducts entry fee", async () => {
      const { engine, cash, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);

      const balBefore = await cash.balanceOf(alice.address);
      await engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]);
      const balAfter = await cash.balanceOf(alice.address);

      expect(balBefore - balAfter).to.equal(ethers.parseEther("10")); // ENTRY_FEE
    });

    it("adds entry fee to prize pool", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]);
      const t = await engine.getTournament(1);
      expect(t.prizePool).to.equal(ethers.parseEther("10"));
    });

    it("emits DeckLocked event", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await expect(engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]))
        .to.emit(engine, "DeckLocked")
        .withArgs(1n, alice.address, cardIds);
    });

    it("reverts if player submits deck twice", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]);
      await expect(
        engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint])
      ).to.be.revertedWith("TournamentEngine: deck already locked");
    });

    it("reverts if player doesn't own all cards", async () => {
      const { engine, admin, bob, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      // Bob doesn't own alice's cards (cardIds 1-5)
      await expect(
        engine.connect(bob).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint])
      ).to.be.revertedWith("TournamentEngine: not card owner");
    });

    it("reverts on duplicate card in deck", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      const dupDeck: [bigint, bigint, bigint, bigint, bigint] = [
        cardIds[0], cardIds[0], cardIds[2], cardIds[3], cardIds[4],
      ];
      await expect(
        engine.connect(alice).lockDeck(dupDeck)
      ).to.be.revertedWith("TournamentEngine: duplicate card");
    });

    it("reverts after tournament ended", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(60); // 60-second tournament
      await time.increase(61);
      await expect(
        engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint])
      ).to.be.revertedWith("TournamentEngine: tournament ended");
    });

    it("reverts with insufficient PCASH", async () => {
      const { engine, cash, admin, carol, reg } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);

      // Mint cards for carol
      const carolIds: bigint[] = [];
      for (let i = 0; i < 5; i++) {
        await reg.connect(admin).mintCard(carol.address, Rarity.Common);
        const tid = await reg.totalSupply();
        carolIds.push(tid);
        await reg.connect(admin).transferFrom(admin.address, carol.address, tid);
      }
      await cash.connect(carol).approve(await engine.getAddress(), ethers.MaxUint256);
      // carol has no PCASH

      await expect(
        engine.connect(carol).lockDeck(carolIds as unknown as [bigint, bigint, bigint, bigint, bigint])
      ).to.be.revertedWith("TournamentEngine: insufficient PCASH");
    });
  });

  describe("submitScores()", () => {
    it("stores the merkle root", async () => {
      const { engine, admin, oracle } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      const root = ethers.keccak256(ethers.toUtf8Bytes("test-root"));
      await engine.connect(oracle).submitScores(1, root);
      const t = await engine.getTournament(1);
      expect(t.merkleRoot).to.equal(root);
      expect(t.scoresSubmitted).to.be.true;
    });

    it("emits ScoresSubmitted event", async () => {
      const { engine, admin, oracle } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      const root = ethers.keccak256(ethers.toUtf8Bytes("root"));
      await expect(engine.connect(oracle).submitScores(1, root))
        .to.emit(engine, "ScoresSubmitted")
        .withArgs(1n, root);
    });

    it("reverts without ORACLE_ROLE", async () => {
      const { engine, admin, carol } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      const root = ethers.keccak256(ethers.toUtf8Bytes("root"));
      await expect(engine.connect(carol).submitScores(1, root)).to.be.reverted;
    });

    it("reverts on double score submission", async () => {
      const { engine, admin, oracle } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      const root = ethers.keccak256(ethers.toUtf8Bytes("root"));
      await engine.connect(oracle).submitScores(1, root);
      await expect(engine.connect(oracle).submitScores(1, root))
        .to.be.revertedWith("TournamentEngine: scores already submitted");
    });
  });

  describe("claimPrize()", () => {
    async function tournamentWithScores() {
      const base = await deployFixture();
      const { engine, cash, admin, oracle, alice, bob, cardIds, bobCardIds } = base;

      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]);
      await engine.connect(bob).lockDeck(bobCardIds as [bigint, bigint, bigint, bigint, bigint]);

      const prizePool = ethers.parseEther("20"); // 2 entries × 10 PCASH

      // Build merkle tree: two leaves
      const aliceLeaf = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256"],
        [alice.address, 1, 1000]
      );
      const bobLeaf = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256"],
        [bob.address, 2, 800]
      );

      // Compute root: sorted pairs
      const [left, right] = aliceLeaf < bobLeaf
        ? [aliceLeaf, bobLeaf]
        : [bobLeaf, aliceLeaf];
      const root = ethers.keccak256(ethers.concat([left, right]));

      await engine.connect(oracle).submitScores(1, root);

      return { ...base, root, aliceLeaf, bobLeaf, prizePool, left, right };
    }

    it("rank 1 claims 15% of prize pool", async () => {
      const { engine, cash, alice, left, right, aliceLeaf, prizePool } = await tournamentWithScores();

      const proof = aliceLeaf === left ? [right] : [left];
      const expected = (prizePool * 1500n) / 10000n;

      const aliceBefore = await cash.balanceOf(alice.address);
      await engine.connect(alice).claimPrize(1, 1, 1000, proof);
      const aliceAfter = await cash.balanceOf(alice.address);

      expect(aliceAfter - aliceBefore).to.equal(expected);
    });

    it("rank 2 claims 4% of prize pool", async () => {
      const { engine, cash, bob, left, right, bobLeaf, prizePool } = await tournamentWithScores();

      const proof = bobLeaf === left ? [right] : [left];
      const expected = (prizePool * 400n) / 10000n;

      const bobBefore = await cash.balanceOf(bob.address);
      await engine.connect(bob).claimPrize(1, 2, 800, proof);
      const bobAfter = await cash.balanceOf(bob.address);

      expect(bobAfter - bobBefore).to.equal(expected);
    });

    it("emits PrizeClaimed event", async () => {
      const { engine, alice, left, right, aliceLeaf, prizePool } = await tournamentWithScores();
      const proof = aliceLeaf === left ? [right] : [left];
      const expected = (prizePool * 1500n) / 10000n;

      await expect(engine.connect(alice).claimPrize(1, 1, 1000, proof))
        .to.emit(engine, "PrizeClaimed")
        .withArgs(1n, alice.address, expected, 1n);
    });

    it("reverts on double claim", async () => {
      const { engine, alice, left, right, aliceLeaf } = await tournamentWithScores();
      const proof = aliceLeaf === left ? [right] : [left];
      await engine.connect(alice).claimPrize(1, 1, 1000, proof);
      await expect(engine.connect(alice).claimPrize(1, 1, 1000, proof))
        .to.be.revertedWith("TournamentEngine: already claimed");
    });

    it("reverts with invalid merkle proof", async () => {
      const { engine, alice } = await tournamentWithScores();
      const fakeProof = [ethers.keccak256(ethers.toUtf8Bytes("fake"))];
      await expect(
        engine.connect(alice).claimPrize(1, 1, 1000, fakeProof)
      ).to.be.revertedWith("TournamentEngine: invalid proof");
    });

    it("reverts for rank outside prize range (rank 51)", async () => {
      const { engine, oracle, admin, carol, cash, reg } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);

      // Carol locks deck
      const carolIds: bigint[] = [];
      for (let i = 0; i < 5; i++) {
        await reg.connect(admin).mintCard(carol.address, Rarity.Common);
        const tid = await reg.totalSupply();
        carolIds.push(tid);
        await reg.connect(admin).transferFrom(admin.address, carol.address, tid);
      }
      await cash.connect(admin).mintFromMarket(carol.address, ethers.parseEther("100"));
      await cash.connect(carol).approve(await engine.getAddress(), ethers.MaxUint256);
      await engine.connect(carol).lockDeck(carolIds as unknown as [bigint, bigint, bigint, bigint, bigint]);

      const carolLeaf = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256"],
        [carol.address, 51, 10]
      );
      await engine.connect(oracle).submitScores(1, carolLeaf);

      await expect(
        engine.connect(carol).claimPrize(1, 51, 10, [])
      ).to.be.revertedWith("TournamentEngine: rank not in prize range");
    });
  });

  describe("closeTournament()", () => {
    it("marks tournament as closed and clears activeTournamentId", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(admin).closeTournament(1);
      const t = await engine.getTournament(1);
      expect(t.closed).to.be.true;
      expect(await engine.activeTournamentId()).to.equal(0n);
    });

    it("emits TournamentClosed event", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await expect(engine.connect(admin).closeTournament(1))
        .to.emit(engine, "TournamentClosed")
        .withArgs(1n);
    });

    it("allows opening a new tournament after close", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(admin).closeTournament(1);
      await expect(engine.connect(admin).openTournament(WEEK)).to.not.be.reverted;
      expect(await engine.activeTournamentId()).to.equal(2n);
    });

    it("reverts double close", async () => {
      const { engine, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(admin).closeTournament(1);
      await expect(engine.connect(admin).closeTournament(1))
        .to.be.revertedWith("TournamentEngine: already closed");
    });
  });

  describe("getDeck()", () => {
    it("returns the locked deck for a player", async () => {
      const { engine, admin, alice, cardIds } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);
      await engine.connect(alice).lockDeck(cardIds as [bigint, bigint, bigint, bigint, bigint]);
      const deck = await engine.getDeck(1, alice.address);
      expect(deck.map(v => v)).to.deep.equal(cardIds);
    });
  });

  describe("seedPrizePool()", () => {
    it("adds external PCASH to prize pool", async () => {
      const { engine, cash, admin } = await loadFixture(deployFixture);
      await engine.connect(admin).openTournament(WEEK);

      await cash.connect(admin).mintFromMarket(admin.address, ethers.parseEther("500"));
      await cash.connect(admin).approve(await engine.getAddress(), ethers.MaxUint256);
      await engine.connect(admin).seedPrizePool(1, ethers.parseEther("100"));

      const t = await engine.getTournament(1);
      expect(t.prizePool).to.equal(ethers.parseEther("100"));
    });
  });
});
