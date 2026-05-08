// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title PetsRanking
 * @notice Issues badge SFTs (Bronze → Master) based on off-chain ranking computation.
 *         Backend computes rankings from The Graph data, signs a proof, user submits proof.
 *         Weekly reset is triggered by Chainlink Automation (or admin for testnet).
 *
 * Badge token IDs:
 *   1 = Bronze, 2 = Silver, 3 = Gold, 4 = Diamond, 5 = Master
 */
contract PetsRanking is ERC1155, EIP712, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant ISSUER_ROLE     = keccak256("ISSUER_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");

    bytes32 private constant BADGE_TYPEHASH = keccak256(
        "BadgeClaim(address user,uint8 tier,uint256 snapshotTs)"
    );

    enum Tier { None, Bronze, Silver, Gold, Diamond, Master }

    mapping(address => Tier)  public activeBadge;
    mapping(bytes32 => bool)  public usedProofs;

    uint256 public lastReset;

    event BadgeIssued(address indexed user, Tier indexed tier, uint256 snapshotTs);
    event WeeklyReset(uint256 timestamp);

    constructor(address admin, address issuer)
        ERC1155("https://api.bae4u.com/badges/{id}.json")
        EIP712("Bae4U", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, issuer);
        _grantRole(AUTOMATION_ROLE, issuer);
        lastReset = block.timestamp;
    }

    /**
     * @notice Submit a backend-signed proof to mint a badge SFT.
     *         Previous badge is burned first. Badges are truly owned on-chain.
     */
    function issueBadge(
        address user,
        Tier    tier,
        uint256 snapshotTs,
        bytes calldata sig
    ) external {
        require(tier != Tier.None, "PetsRanking: invalid tier");

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(BADGE_TYPEHASH, user, uint8(tier), snapshotTs))
        );
        require(!usedProofs[digest], "PetsRanking: proof already used");
        require(hasRole(ISSUER_ROLE, digest.recover(sig)), "PetsRanking: invalid sig");

        usedProofs[digest] = true;

        // Burn existing badge before issuing new one
        Tier prev = activeBadge[user];
        if (prev != Tier.None) {
            _burn(user, uint256(prev), 1);
        }

        activeBadge[user] = tier;
        _mint(user, uint256(tier), 1, "");

        emit BadgeIssued(user, tier, snapshotTs);
    }

    /// @notice Called by Chainlink Automation every Monday 00:00 UTC
    function weeklyReset() external onlyRole(AUTOMATION_ROLE) {
        lastReset = block.timestamp;
        emit WeeklyReset(block.timestamp);
    }

    function getActiveBadge(address user) external view returns (Tier) {
        return activeBadge[user];
    }

    function supportsInterface(bytes4 iface)
        public view override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
