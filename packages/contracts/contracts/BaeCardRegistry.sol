// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BaeCardRegistry
 * @notice Fantasy.top-style card system for Bae4U.
 *         Popular users are minted as tradeable NFT cards in 4 rarity tiers.
 *         Each card has a subject (the user it represents), a rarity, and a
 *         score multiplier used by TournamentEngine to compute deck scores.
 *
 *         Rarity tiers & multipliers (in basis points, /100 for ×):
 *           Common  (0) → 100  = 1.00×
 *           Rare    (1) → 180  = 1.80×
 *           Epic    (2) → 320  = 3.20×
 *           Legend  (3) → 600  = 6.00×
 *
 *         Hero revenue: BaeCardMarket calls recordRoyalty() so subjects can
 *         claim accumulated PCASH royalties from their card trades.
 */
contract BaeCardRegistry is ERC721Enumerable, AccessControl {
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE  = keccak256("BURNER_ROLE");
    bytes32 public constant MARKET_ROLE  = keccak256("MARKET_ROLE");

    enum Rarity { Common, Rare, Epic, Legend }

    uint256[4] public MULTIPLIERS = [100, 180, 320, 600];

    struct CardInfo {
        address subject;
        Rarity  rarity;
        uint256 mintedAt;
    }

    string private _baseTokenURI;

    uint256 private _nextId = 1;

    mapping(uint256 => CardInfo)          public cards;
    mapping(address => uint256[])         private _subjectCards;
    mapping(address => uint256)           public pendingRoyalties;

    event CardMinted(address indexed subject, uint256 indexed tokenId, Rarity rarity);
    event CardBurned(uint256 indexed tokenId, address indexed burnedBy);
    event RoyaltyAccrued(address indexed subject, uint256 amount);
    event RoyaltyClaimed(address indexed subject, uint256 amount);

    constructor(address admin)
        ERC721("Bae4U Hero Card", "BAEC")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        _grantRole(MARKET_ROLE, admin);
        _baseTokenURI = "https://api.bae4u.com/cards/";
    }

    /**
     * @notice Mint a new Bae Card for a subject user.
     *         Called by backend when user crosses weekly score threshold.
     *         Multiple cards (different rarities) can exist per subject.
     */
    function mintCard(address subject, Rarity rarity)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(subject != address(0), "BaeCardRegistry: zero subject");

        uint256 tokenId = _nextId++;
        cards[tokenId] = CardInfo(subject, rarity, block.timestamp);
        _subjectCards[subject].push(tokenId);

        _safeMint(msg.sender, tokenId);
        emit CardMinted(subject, tokenId, rarity);
        return tokenId;
    }

    /**
     * @notice Burn a card — called by BaeCardMarket during upgrade mechanic.
     *         Removes from subject card list as well.
     */
    function burnCard(uint256 tokenId) external onlyRole(BURNER_ROLE) {
        address owner = ownerOf(tokenId);
        address subject = cards[tokenId].subject;

        _burn(tokenId);

        uint256[] storage arr = _subjectCards[subject];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == tokenId) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }

        emit CardBurned(tokenId, owner);
    }

    /**
     * @notice Called by BaeCardMarket on every trade to accrue royalty for subject.
     *         1.5% of sale price (150 bps) goes to the card subject.
     */
    function recordRoyalty(uint256 tokenId, uint256 amount)
        external
        onlyRole(MARKET_ROLE)
    {
        address subject = cards[tokenId].subject;
        pendingRoyalties[subject] += amount;
        emit RoyaltyAccrued(subject, amount);
    }

    /**
     * @notice Subject claims their accumulated royalties. Actual PCASH transfer
     *         happens in BaeCardMarket which holds the funds.
     * @return amount the amount to be paid (caller must be BaeCardMarket)
     */
    function consumeRoyalties(address subject)
        external
        onlyRole(MARKET_ROLE)
        returns (uint256)
    {
        uint256 amount = pendingRoyalties[subject];
        require(amount > 0, "BaeCardRegistry: nothing to claim");
        pendingRoyalties[subject] = 0;
        emit RoyaltyClaimed(subject, amount);
        return amount;
    }

    function getMultiplier(uint256 tokenId) external view returns (uint256) {
        return MULTIPLIERS[uint256(cards[tokenId].rarity)];
    }

    function getSubject(uint256 tokenId) external view returns (address) {
        return cards[tokenId].subject;
    }

    function getRarity(uint256 tokenId) external view returns (Rarity) {
        return cards[tokenId].rarity;
    }

    function getCardInfo(uint256 tokenId)
        external view
        returns (address subject, Rarity rarity, uint256 mintedAt)
    {
        CardInfo storage c = cards[tokenId];
        return (c.subject, c.rarity, c.mintedAt);
    }

    function getSubjectCards(address subject) external view returns (uint256[] memory) {
        return _subjectCards[subject];
    }

    function tokenURI(uint256 tokenId)
        public view override
        returns (string memory)
    {
        require(_exists(tokenId), "BaeCardRegistry: nonexistent token");
        Rarity r = cards[tokenId].rarity;
        string memory tier = r == Rarity.Common ? "common"
                           : r == Rarity.Rare   ? "rare"
                           : r == Rarity.Epic   ? "epic"
                           : "legend";
        return string(abi.encodePacked(_baseTokenURI, tier, "/", _toString(tokenId), ".json"));
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) { digits--; buffer[digits] = bytes1(uint8(48 + value % 10)); value /= 10; }
        return string(buffer);
    }

    function supportsInterface(bytes4 iface)
        public view override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
