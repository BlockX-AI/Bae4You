import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PetsRegistry } from "../typechain-types";

describe("PetsRegistry", () => {
  async function deployFixture() {
    const [admin, alice, bob, carol, attacker] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PetsRegistry");
    const reg = (await Factory.deploy(admin.address)) as PetsRegistry;

    return { reg, admin, alice, bob, carol, attacker };
  }

  describe("mintProfile()", () => {
    it("mints a token with correct tokenId, starting at 1", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      const price = ethers.parseEther("1000");

      const tokenId = await reg.connect(admin).mintProfile.staticCall(alice.address, price);
      expect(tokenId).to.equal(1n);

      await reg.connect(admin).mintProfile(alice.address, price);
      expect(await reg.ownerOf(1)).to.equal(alice.address);
    });

    it("stores profile correctly", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      const price = ethers.parseEther("500");
      await reg.connect(admin).mintProfile(alice.address, price);

      const profile = await reg.profiles(1);
      expect(profile.userAddress).to.equal(alice.address);
      expect(profile.startingPrice).to.equal(price);
      expect(profile.status).to.equal(0); // Active
    });

    it("creates address → tokenId mapping", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.addressToToken(alice.address)).to.equal(1n);
    });

    it("emits ProfileMinted event", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      const price = ethers.parseEther("1000");
      await expect(reg.connect(admin).mintProfile(alice.address, price))
        .to.emit(reg, "ProfileMinted")
        .withArgs(alice.address, 1n, price);
    });

    it("increments tokenId on each mint", async () => {
      const { reg, admin, alice, bob } = await loadFixture(deployFixture);
      const price = ethers.parseEther("100");
      await reg.connect(admin).mintProfile(alice.address, price);
      const bobId = await reg.connect(admin).mintProfile.staticCall(bob.address, price);
      expect(bobId).to.equal(2n);
    });

    it("reverts if wallet already has a profile", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      const price = ethers.parseEther("100");
      await reg.connect(admin).mintProfile(alice.address, price);
      await expect(
        reg.connect(admin).mintProfile(alice.address, price)
      ).to.be.revertedWith("PetsRegistry: already minted");
    });

    it("reverts without MINTER_ROLE", async () => {
      const { reg, alice, attacker } = await loadFixture(deployFixture);
      await expect(
        reg.connect(attacker).mintProfile(alice.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });

  describe("ghostProfile()", () => {
    it("owner can ghost their own profile", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await reg.connect(alice).ghostProfile(1);
      expect(await reg.getPetStatus(1)).to.equal(1); // Ghost
    });

    it("emits ProfileGhosted event", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await expect(reg.connect(alice).ghostProfile(1))
        .to.emit(reg, "ProfileGhosted")
        .withArgs(alice.address, 1n);
    });

    it("reverts if not the profile owner", async () => {
      const { reg, admin, alice, attacker } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await expect(
        reg.connect(attacker).ghostProfile(1)
      ).to.be.revertedWith("PetsRegistry: not your profile");
    });

    it("reverts if profile already ghost", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await reg.connect(alice).ghostProfile(1);
      await expect(
        reg.connect(alice).ghostProfile(1)
      ).to.be.revertedWith("PetsRegistry: not active");
    });
  });

  describe("view helpers", () => {
    it("getTokenByAddress returns the correct tokenId", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.getTokenByAddress(alice.address)).to.equal(1n);
    });

    it("getUserAddress returns the profile's user address", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.getUserAddress(1)).to.equal(alice.address);
    });

    it("getPetStatus returns Active for new mint", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.getPetStatus(1)).to.equal(0); // Active
    });

    it("tokenURI returns correct metadata URL", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.tokenURI(1)).to.equal("https://api.bae4u.com/metadata/1.json");
    });

    it("tokenURI reverts for nonexistent token", async () => {
      const { reg } = await loadFixture(deployFixture);
      await expect(reg.tokenURI(999)).to.be.revertedWith("PetsRegistry: nonexistent token");
    });
  });

  describe("setBaseURI()", () => {
    it("admin can change base URI", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await reg.connect(admin).setBaseURI("https://cdn.example.com/meta/");
      expect(await reg.tokenURI(1)).to.equal("https://cdn.example.com/meta/1.json");
    });

    it("non-admin cannot change base URI", async () => {
      const { reg, attacker } = await loadFixture(deployFixture);
      await expect(
        reg.connect(attacker).setBaseURI("https://evil.com/")
      ).to.be.reverted;
    });
  });

  describe("ERC-721 compliance", () => {
    it("totalSupply increments on each mint", async () => {
      const { reg, admin, alice, bob } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      await reg.connect(admin).mintProfile(bob.address, ethers.parseEther("100"));
      expect(await reg.totalSupply()).to.equal(2n);
    });

    it("tokenOfOwnerByIndex returns correct tokenId", async () => {
      const { reg, admin, alice } = await loadFixture(deployFixture);
      await reg.connect(admin).mintProfile(alice.address, ethers.parseEther("100"));
      expect(await reg.tokenOfOwnerByIndex(alice.address, 0)).to.equal(1n);
    });

    it("supportsInterface: ERC-721 + AccessControl", async () => {
      const { reg } = await loadFixture(deployFixture);
      expect(await reg.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
      expect(await reg.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
    });
  });
});
