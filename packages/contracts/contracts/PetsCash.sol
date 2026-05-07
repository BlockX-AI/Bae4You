// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title PetsCash
 * @notice In-game ERC-20 currency for the Bae4U protocol.
 *         Minted via EIP-712 signed login-bonus claims (every 4 hours).
 *         Also minted by PetsMarket during trade profit distribution.
 */
contract PetsCash is ERC20, EIP712, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 private constant BONUS_TYPEHASH = keccak256(
        "BonusClaim(address user,uint256 amount,uint256 timestamp)"
    );

    uint256 public constant CLAIM_COOLDOWN = 4 hours;

    mapping(address => uint256) public lastClaimAt;
    mapping(bytes32 => bool)    public usedSigs;

    event BonusClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event GoldConversion(address indexed user, uint256 cashBurned);

    constructor(address admin, address signer)
        ERC20("PetsCash", "PCASH")
        EIP712("Bae4U", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SIGNER_ROLE, signer);
    }

    /**
     * @notice User submits an EIP-712 signed claim from the backend signer.
     *         Backend never calls mint directly — user always submits the sig.
     */
    function claimBonus(
        uint256 amount,
        uint256 timestamp,
        bytes calldata sig
    ) external {
        require(
            block.timestamp >= lastClaimAt[msg.sender] + CLAIM_COOLDOWN,
            "PetsCash: cooldown active"
        );
        require(block.timestamp <= timestamp + 1 hours, "PetsCash: sig expired");

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(BONUS_TYPEHASH, msg.sender, amount, timestamp))
        );
        require(!usedSigs[digest], "PetsCash: sig already used");
        require(hasRole(SIGNER_ROLE, digest.recover(sig)), "PetsCash: invalid sig");

        usedSigs[digest] = true;
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, amount);

        emit BonusClaimed(msg.sender, amount, timestamp);
    }

    /// @notice Called by PetsMarket to distribute trade profit splits
    function mintFromMarket(address to, uint256 amount) external onlyRole(MARKET_ROLE) {
        _mint(to, amount);
    }

    /// @notice Burns tokens — used as a token sink for premium features
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice One-way conversion of PetsCash → Bae4U Gold (recorded off-chain)
    function convertToGold(uint256 amount) external {
        _burn(msg.sender, amount);
        emit GoldConversion(msg.sender, amount);
    }

    function grantMarketRole(address market) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MARKET_ROLE, market);
    }
}
