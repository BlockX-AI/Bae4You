// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PetsRegistry
 * @notice Mints a unique ERC-1155 SFT for every new Bae4U user profile.
 *         Each token ID maps permanently to one wallet address.
 *         Ghost status is set when a user deactivates (price frozen on market).
 */
contract PetsRegistry is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    enum PetStatus { Active, Ghost, Burned }

    struct Profile {
        address userAddress;
        uint256 startingPrice;
        PetStatus status;
    }

    uint256 private _nextId = 1;

    mapping(uint256 => Profile) public profiles;
    mapping(address => uint256) public addressToToken;

    event ProfileMinted(address indexed user, uint256 indexed tokenId, uint256 startingPrice);
    event ProfileGhosted(address indexed user, uint256 indexed tokenId);

    constructor(address admin)
        ERC1155("https://api.bae4u.com/metadata/{id}.json")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Called by backend on new user signup. Mints the user's profile SFT.
     * @return tokenId the new token ID
     */
    function mintProfile(address user, uint256 startingPrice)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(addressToToken[user] == 0, "PetsRegistry: already minted");

        uint256 tokenId = _nextId++;
        profiles[tokenId] = Profile(user, startingPrice, PetStatus.Active);
        addressToToken[user] = tokenId;

        _mint(user, tokenId, 1, "");
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

    function supportsInterface(bytes4 iface)
        public view override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
