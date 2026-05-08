// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./PetsCash.sol";
import "./PetsRegistry.sol";

/**
 * @title PetsMarket
 * @notice Core trading contract. Enforces the 10% price invariant.
 *         Every buy raises the pet's price by exactly 10%.
 *         Profit (price - previous cost) splits 50/50 between pet profile and previous owner.
 *         2.5% platform fee goes to treasury multisig.
 *
 * ROUNDING POLICY:
 *   All price math uses basis points: price * 11000 / 10000.
 *   Odd-wei remainder from 50/50 split always goes to the pet profile.
 */
contract PetsMarket is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant PRICE_MULT   = 11000; // 10% increase via BPS
    uint256 public constant BASIS        = 10000;
    uint256 public constant FEE_BPS      = 250;   // 2.5% platform fee
    uint256 public constant MAX_LOCK     = 7 days;
    uint256 public constant GIFT_PER_DAY = 10;

    PetsCash     public petsCash;
    PetsRegistry public registry;
    address      public treasury;

    struct PetState {
        address owner;
        uint256 price;
        bool    isLocked;
        uint256 lockExpiry;
        uint256 totalBuys;
    }

    // tokenId => state
    mapping(uint256 => PetState) public states;
    // tokenId => buyer address => price they paid (used to compute profit on resale)
    mapping(uint256 => mapping(address => uint256)) public paidPrice;
    // owner => day (timestamp/1 days) => gifts sent today
    mapping(address => mapping(uint256 => uint256)) public dailyGifts;

    event PetPurchased(
        uint256 indexed tokenId,
        address indexed prevOwner,
        address indexed newOwner,
        uint256 salePrice,
        uint256 newPrice
    );
    event PetLocked(uint256 indexed tokenId, address indexed owner, uint256 expiry);
    event CashGifted(uint256 indexed tokenId, address indexed from, uint256 amount);

    constructor(
        address _cash,
        address _registry,
        address _treasury,
        address admin
    ) {
        petsCash  = PetsCash(_cash);
        registry  = PetsRegistry(_registry);
        treasury  = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /**
     * @notice Backend calls this right after mintProfile() to register the pet on the market.
     */
    function initPet(uint256 tokenId, address owner, uint256 price)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(states[tokenId].price == 0, "PetsMarket: already init");
        states[tokenId] = PetState(owner, price, false, 0, 0);
        paidPrice[tokenId][owner] = 0; // first owner paid nothing (free mint)
    }

    /**
     * @notice Core trade function. Buyer pays current price in PetsCash.
     *         Profit splits 50/50. Price increases by 10%.
     */
    function buy(uint256 tokenId) external nonReentrant whenNotPaused {
        PetState storage pet = states[tokenId];

        // Auto-expire stale lock
        if (pet.isLocked && block.timestamp >= pet.lockExpiry) {
            pet.isLocked = false;
        }

        require(!pet.isLocked,                                               "PetsMarket: locked");
        require(pet.price > 0,                                               "PetsMarket: not listed");
        require(pet.owner != msg.sender,                                     "PetsMarket: already own");
        require(
            registry.getPetStatus(tokenId) == PetsRegistry.PetStatus.Active,
            "PetsMarket: pet is ghost"
        );

        uint256 salePrice  = pet.price;
        require(petsCash.balanceOf(msg.sender) >= salePrice, "PetsMarket: insufficient balance");

        address prevOwner  = pet.owner;
        address petProfile = registry.getUserAddress(tokenId);

        // Fee + profit math (all in wei, no floats)
        uint256 fee       = (salePrice * FEE_BPS) / BASIS;
        uint256 afterFee  = salePrice - fee;
        uint256 cost      = paidPrice[tokenId][prevOwner];
        uint256 profit    = afterFee > cost ? afterFee - cost : 0;
        uint256 half      = profit / 2;
        uint256 remainder = profit - (half * 2); // odd wei goes to pet

        // Effects before interactions (CEI pattern)
        pet.owner    = msg.sender;
        pet.totalBuys++;
        pet.price    = (salePrice * PRICE_MULT) / BASIS;
        paidPrice[tokenId][msg.sender] = salePrice;

        // Interactions
        petsCash.transferFrom(msg.sender, address(this), salePrice);
        petsCash.transfer(treasury, fee);
        petsCash.transfer(prevOwner, cost + half);

        // If prevOwner IS the petProfile (first-ever sale), they receive both halves
        if (petProfile != prevOwner) {
            petsCash.transfer(petProfile, half + remainder);
        } else {
            // petProfile already received `cost + half` above, send remaining half
            petsCash.transfer(petProfile, half + remainder);
        }

        emit PetPurchased(tokenId, prevOwner, msg.sender, salePrice, pet.price);
    }

    /**
     * @notice Owner temporarily locks their pet to prevent purchase.
     *         Lock auto-expires — no manual unlock needed.
     */
    function lockPet(uint256 tokenId, uint256 duration) external whenNotPaused {
        require(states[tokenId].owner == msg.sender, "PetsMarket: not owner");
        require(duration > 0 && duration <= MAX_LOCK,  "PetsMarket: invalid duration");

        states[tokenId].isLocked   = true;
        states[tokenId].lockExpiry = block.timestamp + duration;

        emit PetLocked(tokenId, msg.sender, block.timestamp + duration);
    }

    /**
     * @notice Ranked owners can gift PetsCash to their pets (up to 10/day).
     */
    function giftCash(uint256 tokenId, uint256 amount) external whenNotPaused {
        require(states[tokenId].owner == msg.sender, "PetsMarket: not owner");

        uint256 today = block.timestamp / 1 days;
        require(dailyGifts[msg.sender][today] < GIFT_PER_DAY, "PetsMarket: daily gift limit");

        address petProfile = registry.getUserAddress(tokenId);
        dailyGifts[msg.sender][today]++;

        petsCash.transferFrom(msg.sender, petProfile, amount);
        emit CashGifted(tokenId, msg.sender, amount);
    }

    function getPrice(uint256 tokenId) external view returns (uint256) {
        return states[tokenId].price;
    }

    function isLocked(uint256 tokenId) external view returns (bool) {
        PetState storage pet = states[tokenId];
        return pet.isLocked && block.timestamp < pet.lockExpiry;
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
    function setTreasury(address t) external onlyRole(DEFAULT_ADMIN_ROLE) { treasury = t; }

    function supportsInterface(bytes4 iface)
        public view override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
