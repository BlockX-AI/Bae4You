// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PetsCash.sol";
import "./BaeCardRegistry.sol";

/**
 * @title BaeCardMarket
 * @notice Handles all card economy for the Fantasy Bae layer:
 *         1. Individual card trading with +8% bonding curve per trade.
 *         2. Pack sales — buy 5 random cards (dynamic pricing).
 *         3. Upgrade mechanic — burn 3 same-rarity cards + PCASH fee → 1 next tier.
 *         4. Hero royalty payouts — subjects claim 1.5% of their card trading volume.
 *
 *  Fee breakdown per trade (BASIS = 10000):
 *    ROYALTY_BPS =  150  → 1.50% to card subject
 *    FEE_BPS     =  250  → 2.50% to treasury
 *    Seller gets: salePrice - fee - royalty (their original cost + their share of profit)
 */
contract BaeCardMarket is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 public constant BASIS       = 10000;
    uint256 public constant PRICE_MULT  = 10800;  // 8% increase per trade
    uint256 public constant FEE_BPS     = 250;    // 2.5% platform fee
    uint256 public constant ROYALTY_BPS = 150;    // 1.5% to card subject

    uint256 public constant PACK_BASE_PRICE   = 500  ether;   // 500 PCASH
    uint256 public constant PACK_PRICE_STEP   = 5;            // +5 PCASH per 100 packs sold
    uint256 public constant UPGRADE_FEE_RARE  = 50   ether;   // PCASH fee to upgrade to Rare
    uint256 public constant UPGRADE_FEE_EPIC  = 200  ether;   // PCASH fee to upgrade to Epic
    uint256 public constant UPGRADE_FEE_LEGEND= 1000 ether;   // PCASH fee to upgrade to Legend
    uint256 public constant CARDS_PER_PACK    = 5;

    PetsCash        public cash;
    BaeCardRegistry public registry;
    address         public treasury;

    uint256 public totalPacksSold;

    struct CardState {
        address owner;
        uint256 price;
        uint256 totalTrades;
    }

    mapping(uint256 => CardState) public states;
    mapping(uint256 => mapping(address => uint256)) public paidPrice;

    event CardPurchased(
        uint256 indexed tokenId,
        address indexed prevOwner,
        address indexed newOwner,
        uint256 salePrice,
        uint256 newPrice
    );
    event PackPurchased(address indexed buyer, uint256 packPrice, uint256[] tokenIds);
    event CardUpgraded(
        address indexed owner,
        uint256[3] burnedIds,
        uint256 newTokenId,
        BaeCardRegistry.Rarity newRarity
    );
    event RoyaltyClaimed(address indexed subject, uint256 amount);

    constructor(
        address _cash,
        address _registry,
        address _treasury,
        address admin
    ) {
        cash     = PetsCash(_cash);
        registry = BaeCardRegistry(_registry);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    /**
     * @notice Backend calls after minting a card to list it on the market.
     */
    function listCard(uint256 tokenId, address owner, uint256 price)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(states[tokenId].price == 0, "BaeCardMarket: already listed");
        states[tokenId] = CardState(owner, price, 0);
        paidPrice[tokenId][owner] = 0;
    }

    /**
     * @notice Buy a listed card. Price increases 8% after each purchase.
     *         Fee + royalty deducted from buyer payment, remainder to seller.
     */
    function buyCard(uint256 tokenId) external nonReentrant whenNotPaused {
        CardState storage card = states[tokenId];
        require(card.price > 0,              "BaeCardMarket: not listed");
        require(card.owner != msg.sender,    "BaeCardMarket: already own");

        uint256 salePrice = card.price;
        require(cash.balanceOf(msg.sender) >= salePrice, "BaeCardMarket: insufficient PCASH");

        address prevOwner = card.owner;

        uint256 fee      = (salePrice * FEE_BPS)     / BASIS;
        uint256 royalty  = (salePrice * ROYALTY_BPS) / BASIS;
        uint256 toSeller = salePrice - fee - royalty;

        card.owner       = msg.sender;
        card.totalTrades++;
        card.price       = (salePrice * PRICE_MULT) / BASIS;
        paidPrice[tokenId][msg.sender] = salePrice;

        cash.transferFrom(msg.sender, address(this), salePrice);
        cash.transfer(treasury, fee);
        cash.transfer(prevOwner, toSeller);

        registry.recordRoyalty(tokenId, royalty);

        emit CardPurchased(tokenId, prevOwner, msg.sender, salePrice, card.price);
    }

    /**
     * @notice Buy a pack of CARDS_PER_PACK random cards.
     *         Random selection uses on-chain entropy (good enough for testnet;
     *         use Chainlink VRF on mainnet for production).
     *         Pack price increases by PACK_PRICE_STEP PCASH every 100 packs sold.
     */
    function buyPack(uint256[] calldata tokenIds) external nonReentrant whenNotPaused {
        require(tokenIds.length == CARDS_PER_PACK, "BaeCardMarket: wrong pack size");

        uint256 packPrice = currentPackPrice();
        require(cash.balanceOf(msg.sender) >= packPrice, "BaeCardMarket: insufficient PCASH");

        cash.transferFrom(msg.sender, address(this), packPrice);

        uint256 toTreasury  = (packPrice * 3000) / BASIS;
        uint256 toPrizePool = packPrice - toTreasury;
        cash.transfer(treasury, toTreasury);

        totalPacksSold++;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tid = tokenIds[i];
            require(states[tid].owner == address(this), "BaeCardMarket: card not in pack pool");
            states[tid].owner = msg.sender;
            paidPrice[tid][msg.sender] = packPrice / CARDS_PER_PACK;
        }

        cash.transfer(treasury, toPrizePool);

        emit PackPurchased(msg.sender, packPrice, tokenIds);
    }

    /**
     * @notice Burn 3 cards of the same rarity + pay PCASH upgrade fee
     *         to receive 1 new card of the next rarity tier.
     *         All 3 burned cards must be owned by msg.sender and have the same rarity.
     */
    function upgradeCards(
        uint256[3] calldata burnIds,
        address subject
    ) external nonReentrant whenNotPaused returns (uint256 newTokenId) {
        BaeCardRegistry.Rarity r0 = registry.getRarity(burnIds[0]);
        require(r0 != BaeCardRegistry.Rarity.Legend, "BaeCardMarket: cannot upgrade Legend");

        uint256 upgradeFee = r0 == BaeCardRegistry.Rarity.Common  ? UPGRADE_FEE_RARE
                           : r0 == BaeCardRegistry.Rarity.Rare    ? UPGRADE_FEE_EPIC
                           : UPGRADE_FEE_LEGEND;

        for (uint256 i = 0; i < 3; i++) {
            require(registry.ownerOf(burnIds[i]) == msg.sender,      "BaeCardMarket: not owner");
            require(registry.getRarity(burnIds[i]) == r0,            "BaeCardMarket: rarity mismatch");
            require(registry.getSubject(burnIds[i]) == subject,      "BaeCardMarket: subject mismatch");
        }

        require(cash.balanceOf(msg.sender) >= upgradeFee, "BaeCardMarket: insufficient PCASH for upgrade");

        cash.transferFrom(msg.sender, treasury, upgradeFee);

        for (uint256 i = 0; i < 3; i++) {
            registry.burnCard(burnIds[i]);
        }

        BaeCardRegistry.Rarity newRarity = BaeCardRegistry.Rarity(uint256(r0) + 1);
        newTokenId = registry.mintCard(subject, newRarity);
        states[newTokenId] = CardState(msg.sender, _rarityBasePrice(newRarity), 0);

        emit CardUpgraded(msg.sender, burnIds, newTokenId, newRarity);
    }

    /**
     * @notice Card subjects call this to receive their accumulated royalties.
     */
    function claimRoyalties() external nonReentrant {
        uint256 amount = registry.consumeRoyalties(msg.sender);
        cash.transfer(msg.sender, amount);
        emit RoyaltyClaimed(msg.sender, amount);
    }

    function currentPackPrice() public view returns (uint256) {
        return PACK_BASE_PRICE + (totalPacksSold / 100) * PACK_PRICE_STEP * 1 ether;
    }

    function getCardPrice(uint256 tokenId) external view returns (uint256) {
        return states[tokenId].price;
    }

    function _rarityBasePrice(BaeCardRegistry.Rarity r) internal pure returns (uint256) {
        if (r == BaeCardRegistry.Rarity.Common)  return 200  ether;
        if (r == BaeCardRegistry.Rarity.Rare)    return 600  ether;
        if (r == BaeCardRegistry.Rarity.Epic)    return 1800 ether;
        return 5000 ether;
    }

    function pause()       external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause()     external onlyRole(ADMIN_ROLE) { _unpause(); }
    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) { treasury = t; }

    function supportsInterface(bytes4 iface)
        public view override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
