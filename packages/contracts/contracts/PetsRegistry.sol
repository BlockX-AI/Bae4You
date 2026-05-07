// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PetsRegistry
 * @notice Mints a unique ERC-721 NFT for every new Bae4U user profile.
 *         Each token ID maps permanently to one wallet address.
 *         Converted from ERC-1155 SFT to ERC-721 for true non-fungibility
 *         and better marketplace / wallet compatibility.
 *         Ghost status is set when a user deactivates (price frozen on market).
 */
contract PetsRegistry is ERC721Enumerable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string private _baseTokenURI;

    enum PetStatus { Active, Ghost, Burned }

    struct Profile {
        address userAddress;
        uint256 startingPrice;
        PetStatus status;
        uint256 mintedAt;
    }

    uint256 private _nextId = 1;

    mapping(uint256 => Profile) public profiles;
    mapping(address => uint256) public addressToToken;

    event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice);
    event ProfileGhosted(address indexed user, uint256 indexed tokenId);

    constructor(address admin)
        ERC721("Bae4U Profile", "BAE")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _baseTokenURI = "https://api.bae4u.com/metadata/";
    }

    /**
     * @notice Called by backend on new user signup. Mints the user's profile NFT.
     * @return tokenId the new token ID
     */
    function mintProfile(address user, uint256 startingPrice)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(addressToToken[user] == 0, "PetsRegistry: already minted");

        uint256 tokenId = _nextId++;
        profiles[tokenId] = Profile(user, startingPrice, PetStatus.Active, block.timestamp);
        addressToToken[user] = tokenId;

        _safeMint(user, tokenId);
        emit ProfileMinted(user, tokenId, startingPrice);
        return tokenId;
    }

    /**
     * @notice User signs this tx to deactivate. Price freezes on PetsMarket.
     */
    function ghostProfile(uint256 tokenId) external {
        require(profiles[tokenId].userAddress == msg.sender, "PetsRegistry: not your profile");
        require(profiles[tokenId].status == PetStatus.Active, "PetsRegistry: not active");
        profiles[tokenId].status = PetStatus.Ghost;
        emit ProfileGhosted(msg.sender, tokenId);
    }

    function getTokenByAddress(address user) external view returns (uint256) {
        return addressToToken[user];
    }

    function getUserAddress(uint256 tokenId) external view returns (address) {
        return profiles[tokenId].userAddress;
    }

    function getPetStatus(uint256 tokenId) external view returns (PetStatus) {
        return profiles[tokenId].status;
    }

    function tokenURI(uint256 tokenId)
        public view override
        returns (string memory)
    {
        require(_exists(tokenId), "PetsRegistry: nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
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
