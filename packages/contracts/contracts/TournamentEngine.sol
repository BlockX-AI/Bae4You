// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./PetsCash.sol";
import "./BaeCardRegistry.sol";

/**
 * @title TournamentEngine
 * @notice Fantasy Bae weekly tournament system.
 *
 *  Flow:
 *    1. Admin opens a tournament (openTournament).
 *    2. Players lock a deck of exactly 5 BaeCards they own (lockDeck).
 *       Entry fee in PCASH is collected into the prize pool.
 *    3. At week end, oracle submits a merkle root of (address, rank, score)
 *       tuples computed off-chain from hero activity (submitScores).
 *    4. Players claim prizes by providing a merkle proof (claimPrize).
 *       Prize amount is determined by rank tier.
 *    5. Admin closes the tournament (closeTournament).
 *
 *  Prize tiers (% of prize pool):
 *    Rank 1        → 15%
 *    Rank 2-5      → 4% each
 *    Rank 6-20     → 1% each
 *    Rank 21-50    → 0.3% each
 *
 *  Deck score = sum over 5 cards of (heroScore × cardMultiplier / 100).
 *  Hero score is computed off-chain and committed via merkle root.
 */
contract TournamentEngine is ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    uint256 public constant DECK_SIZE      = 5;
    uint256 public constant ENTRY_FEE      = 10 ether;   // 10 PCASH
    uint256 public constant BASIS          = 10000;

    PetsCash        public cash;
    BaeCardRegistry public registry;

    struct Tournament {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256 prizePool;
        bytes32 merkleRoot;
        bool    scoresSubmitted;
        bool    closed;
    }

    uint256 private _nextTournamentId = 1;

    mapping(uint256 => Tournament)                  public tournaments;
    mapping(uint256 => mapping(address => uint256[DECK_SIZE])) public lockedDecks;
    mapping(uint256 => mapping(address => bool))   public hasDeck;
    mapping(uint256 => mapping(address => bool))   public prizeClaimed;

    uint256 public activeTournamentId;

    event TournamentOpened(uint256 indexed tournamentId, uint256 startTime, uint256 endTime);
    event DeckLocked(uint256 indexed tournamentId, address indexed player, uint256[5] cardIds);
    event ScoresSubmitted(uint256 indexed tournamentId, bytes32 merkleRoot);
    event PrizeClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount, uint256 rank);
    event TournamentClosed(uint256 indexed tournamentId);

    constructor(address _cash, address _registry, address admin) {
        cash     = PetsCash(_cash);
        registry = BaeCardRegistry(_registry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    /**
     * @notice Admin opens a new weekly tournament.
     */
    function openTournament(uint256 durationSeconds) external onlyRole(ADMIN_ROLE) {
        require(activeTournamentId == 0 ||
                tournaments[activeTournamentId].closed,
                "TournamentEngine: tournament already active");

        uint256 tid = _nextTournamentId++;
        tournaments[tid] = Tournament({
            id:               tid,
            startTime:        block.timestamp,
            endTime:          block.timestamp + durationSeconds,
            prizePool:        0,
            merkleRoot:       bytes32(0),
            scoresSubmitted:  false,
            closed:           false
        });
        activeTournamentId = tid;

        emit TournamentOpened(tid, block.timestamp, block.timestamp + durationSeconds);
    }

    /**
     * @notice Lock a deck of 5 BaeCards for the active tournament.
     *         Player must own all 5 cards. Entry fee deducted in PCASH.
     *         Cards are NOT transferred — ownership stays with player.
     */
    function lockDeck(uint256[DECK_SIZE] calldata cardIds) external nonReentrant {
        uint256 tid = activeTournamentId;
        require(tid != 0,                              "TournamentEngine: no active tournament");
        Tournament storage t = tournaments[tid];
        require(block.timestamp <= t.endTime,          "TournamentEngine: tournament ended");
        require(!hasDeck[tid][msg.sender],             "TournamentEngine: deck already locked");
        require(!t.scoresSubmitted,                    "TournamentEngine: scoring phase");

        for (uint256 i = 0; i < DECK_SIZE; i++) {
            require(registry.ownerOf(cardIds[i]) == msg.sender, "TournamentEngine: not card owner");
            for (uint256 j = i + 1; j < DECK_SIZE; j++) {
                require(cardIds[i] != cardIds[j], "TournamentEngine: duplicate card");
            }
        }

        require(cash.balanceOf(msg.sender) >= ENTRY_FEE, "TournamentEngine: insufficient PCASH");
        cash.transferFrom(msg.sender, address(this), ENTRY_FEE);

        lockedDecks[tid][msg.sender] = cardIds;
        hasDeck[tid][msg.sender]     = true;
        t.prizePool += ENTRY_FEE;

        emit DeckLocked(tid, msg.sender, cardIds);
    }

    /**
     * @notice Oracle submits the weekly scores as a merkle root.
     *         Leaf format: keccak256(abi.encodePacked(player, rank, score)).
     */
    function submitScores(uint256 tournamentId, bytes32 merkleRoot)
        external
        onlyRole(ORACLE_ROLE)
    {
        Tournament storage t = tournaments[tournamentId];
        require(!t.closed,            "TournamentEngine: already closed");
        require(!t.scoresSubmitted,   "TournamentEngine: scores already submitted");

        t.merkleRoot        = merkleRoot;
        t.scoresSubmitted   = true;

        emit ScoresSubmitted(tournamentId, merkleRoot);
    }

    /**
     * @notice Player claims their prize using a merkle proof.
     *         Prize = prizePool × rankTierPercent / BASIS.
     */
    function claimPrize(
        uint256       tournamentId,
        uint256       rank,
        uint256       score,
        bytes32[]     calldata proof
    ) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.scoresSubmitted,                    "TournamentEngine: scores not yet submitted");
        require(!prizeClaimed[tournamentId][msg.sender], "TournamentEngine: already claimed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, rank, score));
        require(MerkleProof.verify(proof, t.merkleRoot, leaf), "TournamentEngine: invalid proof");

        uint256 share = _rankShare(rank);
        require(share > 0, "TournamentEngine: rank not in prize range");

        uint256 prize = (t.prizePool * share) / BASIS;
        prizeClaimed[tournamentId][msg.sender] = true;

        cash.transfer(msg.sender, prize);

        emit PrizeClaimed(tournamentId, msg.sender, prize, rank);
    }

    /**
     * @notice Close the tournament. Unclaimed prizes remain in contract for admin to sweep.
     */
    function closeTournament(uint256 tournamentId) external onlyRole(ADMIN_ROLE) {
        Tournament storage t = tournaments[tournamentId];
        require(!t.closed, "TournamentEngine: already closed");
        t.closed = true;
        if (activeTournamentId == tournamentId) activeTournamentId = 0;
        emit TournamentClosed(tournamentId);
    }

    /**
     * @notice Seed the prize pool externally (e.g. from pack sale revenue).
     */
    function seedPrizePool(uint256 tournamentId, uint256 amount) external {
        require(!tournaments[tournamentId].closed, "TournamentEngine: closed");
        cash.transferFrom(msg.sender, address(this), amount);
        tournaments[tournamentId].prizePool += amount;
    }

    /**
     * @notice Admin can withdraw unclaimed prizes after tournament closes.
     */
    function sweepUnclaimed(uint256 tournamentId, address to) external onlyRole(ADMIN_ROLE) {
        require(tournaments[tournamentId].closed, "TournamentEngine: not closed");
        uint256 bal = cash.balanceOf(address(this));
        if (bal > 0) cash.transfer(to, bal);
    }

    function getDeck(uint256 tournamentId, address player)
        external view returns (uint256[DECK_SIZE] memory)
    {
        return lockedDecks[tournamentId][player];
    }

    function getTournament(uint256 tournamentId)
        external view returns (Tournament memory)
    {
        return tournaments[tournamentId];
    }

    function _rankShare(uint256 rank) internal pure returns (uint256) {
        if (rank == 1)               return 1500;   // 15%
        if (rank >= 2 && rank <= 5)  return 400;    // 4% each
        if (rank >= 6 && rank <= 20) return 100;    // 1% each
        if (rank >= 21 && rank <= 50)return 30;     // 0.3% each
        return 0;
    }

    function supportsInterface(bytes4 iface)
        public view override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(iface);
    }
}
