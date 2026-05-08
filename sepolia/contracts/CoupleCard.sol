// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./PetsCash.sol";

/**
 * @title CoupleCard
 * @notice Bae4U's unique differentiator — on-chain couple NFTs.
 *
 *  When two users form a confirmed match and exchange 10+ messages,
 *  the backend signs a coupleProof. Either user submits this proof to
 *  co-mint a "Couple Card" pair: one NFT for each partner.
 *
 *  Both tokens reference the same match ID and each other's token ID.
 *  Burning one burns both (unmatch). Trading a couple card splits 0.75%
 *  royalty to each partner (1.5% total), tracked via pendingRoyalties.
 *
 *  EIP-712 signed proof prevents spam minting.
 */
contract CoupleCard is ERC721Enumerable, EIP712, AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");

    bytes32 private constant COUPLE_TYPEHASH = keccak256(
        "CoupleProof(address userA,address userB,bytes32 matchId,uint256 timestamp)"
    );

    PetsCash public cash;

    string private _baseTokenURI;

    uint256 private _nextId = 1;

    struct CoupleInfo {
        address userA;
        address userB;
        bytes32 matchId;
        uint256 partnerId;   // the sibling token ID
        uint256 mintedAt;
        bool    active;
    }

    mapping(uint256  => CoupleInfo) public coupleInfo;
    mapping(bytes32  => uint256)    public matchToTokenA;
    mapping(bytes32  => bool)       public usedProofs;
    mapping(address  => uint256)    public pendingRoyalties;

    uint256 public constant ROYALTY_BPS = 75;   // 0.75% per partner per trade
    uint256 public constant BASIS       = 10000;

    event CoupleMinted(
        address indexed userA,
        address indexed userB,
        bytes32 indexed matchId,
        uint256 tokenIdA,
        uint256 tokenIdB
    );
    event CoupleCardBurned(bytes32 indexed matchId, uint256 tokenIdA, uint256 tokenIdB);
    event CoupleRoyaltyAccrued(address indexed user, uint256 amount);
    event CoupleRoyaltyClaimed(address indexed user, uint256 amount);

    constructor(address _cash, address admin, address minter)
        ERC721("Bae4U Couple Card", "BAECC")
        EIP712("Bae4U", "1")
    {
        cash = PetsCash(_cash);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(MARKET_ROLE, admin);
        _baseTokenURI = "https://api.bae4u.com/couples/";
    }

    /**
     * @notice Co-mint a couple card pair. Requires an EIP-712 proof signed by
     *         the backend verifying the mutual match with 10+ messages.
     *         Either partner can submit the proof.
     */
    function mintCouple(
        address   userA,
        address   userB,
        bytes32   matchId,
        uint256   timestamp,
        bytes calldata sig
    ) external returns (uint256 tokenIdA, uint256 tokenIdB) {
        require(block.timestamp <= timestamp + 1 hours, "CoupleCard: proof expired");
        require(matchToTokenA[matchId] == 0,            "CoupleCard: already minted");

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(COUPLE_TYPEHASH, userA, userB, matchId, timestamp))
        );
        require(!usedProofs[digest],         "CoupleCard: proof already used");
        require(hasRole(MINTER_ROLE, digest.recover(sig)), "CoupleCard: invalid sig");

        usedProofs[digest]   = true;

        tokenIdA = _nextId++;
        tokenIdB = _nextId++;

        coupleInfo[tokenIdA] = CoupleInfo(userA, userB, matchId, tokenIdB, block.timestamp, true);
        coupleInfo[tokenIdB] = CoupleInfo(userA, userB, matchId, tokenIdA, block.timestamp, true);

        matchToTokenA[matchId] = tokenIdA;

        _safeMint(userA, tokenIdA);
        _safeMint(userB, tokenIdB);

        emit CoupleMinted(userA, userB, matchId, tokenIdA, tokenIdB);
    }

    /**
     * @notice Burn both couple cards on unmatch. Either partner can trigger this.
     *         The other card is burned regardless of who holds it.
     */
    function burnCouple(bytes32 matchId) external {
        uint256 tidA = matchToTokenA[matchId];
        require(tidA != 0, "CoupleCard: not found");

        CoupleInfo storage info = coupleInfo[tidA];
        require(info.active,                                        "CoupleCard: already burned");
        require(msg.sender == info.userA || msg.sender == info.userB, "CoupleCard: not a partner");

        uint256 tidB = info.partnerId;
        info.active              = false;
        coupleInfo[tidB].active  = false;

        if (_exists(tidA)) _burn(tidA);
        if (_exists(tidB)) _burn(tidB);

        emit CoupleCardBurned(matchId, tidA, tidB);
    }

    /**
     * @notice Called by external marketplace contracts to record trade royalties.
     *         0.75% to each partner = 1.5% total.
     */
    function recordRoyalty(uint256 tokenId, uint256 saleAmount)
        external
        onlyRole(MARKET_ROLE)
    {
        uint256 each = (saleAmount * ROYALTY_BPS) / BASIS;
        address a    = coupleInfo[tokenId].userA;
        address b    = coupleInfo[tokenId].userB;
        pendingRoyalties[a] += each;
        pendingRoyalties[b] += each;
        emit CoupleRoyaltyAccrued(a, each);
        emit CoupleRoyaltyAccrued(b, each);
    }

    /**
     * @notice Either partner claims their share of accumulated royalties.
     */
    function claimRoyalties() external {
        uint256 amount = pendingRoyalties[msg.sender];
        require(amount > 0, "CoupleCard: nothing to claim");
        pendingRoyalties[msg.sender] = 0;
        cash.transfer(msg.sender, amount);
        emit CoupleRoyaltyClaimed(msg.sender, amount);
    }

    function tokenURI(uint256 tokenId)
        public view override
        returns (string memory)
    {
        require(_exists(tokenId), "CoupleCard: nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function isActive(bytes32 matchId) external view returns (bool) {
        uint256 tid = matchToTokenA[matchId];
        return tid != 0 && coupleInfo[tid].active;
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
