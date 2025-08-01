// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Vault.sol";

/// @title VaultFactory Contract
/// @notice Factory contract for creating and managing Vault instances
/// @dev Implements access control for vault creation and management
contract VaultFactory is Ownable, AccessControl, ReentrancyGuard {
    // ============ State Variables ============

    /// @notice Role identifier for factory managers
    bytes32 public constant FACTORY_MANAGER_ROLE =
        keccak256("FACTORY_MANAGER_ROLE");

    /// @notice Counter for vault IDs
    uint256 public vaultCounter;

    /// @notice Mapping from vault ID to vault address
    mapping(uint256 => address) public vaults;

    /// @notice Mapping from vault address to vault ID
    mapping(address => uint256) public vaultIds;

    /// @notice Mapping from asset address to list of vault addresses
    mapping(address => address[]) public assetVaults;

    /// @notice Array of all created vault addresses
    address[] public allVaults;

    /// @notice Mapping to check if an address is a vault created by this factory
    mapping(address => bool) public isVaultFromFactory;

    /// @notice Default manager for new vaults (can be changed per vault)
    address public defaultManager;

    /// @notice Default agent for new vaults (can be changed per vault)
    address public defaultAgent;

    /// @notice Fee for creating a vault (in wei)
    uint256 public creationFee;

    /// @notice Treasury address to receive fees
    address public treasury;

    /// @notice Default withdrawal fee for new vaults (in basis points, max 1000 = 10%)
    uint256 public defaultWithdrawalFee;

    /// @notice Default yield rate for new vaults (in basis points, max 2000 = 20%)
    uint256 public defaultYieldRate;

    // ============ Structs ============

    /// @notice Struct containing vault creation parameters
    struct VaultParams {
        IERC20 asset;
        string name;
        string symbol;
        address manager;
        address agent;
        uint256 withdrawalFee;
        uint256 yieldRate;
    }

    /// @notice Struct containing vault information
    struct VaultInfo {
        uint256 id;
        address vaultAddress;
        address asset;
        string name;
        string symbol;
        address manager;
        address agent;
        uint256 createdAt;
        address creator;
    }

    // ============ Events ============

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed vaultAddress,
        address indexed asset,
        string name,
        string symbol,
        address manager,
        address agent,
        address creator
    );

    event DefaultManagerUpdated(
        address indexed oldManager,
        address indexed newManager
    );
    event DefaultAgentUpdated(
        address indexed oldAgent,
        address indexed newAgent
    );
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );
    event FeesWithdrawn(address indexed to, uint256 amount);
    event DefaultWithdrawalFeeUpdated(uint256 oldFee, uint256 newFee);
    event DefaultYieldRateUpdated(uint256 oldRate, uint256 newRate);

    // ============ Errors ============

    error InvalidAsset();
    error InvalidManager();
    error InvalidAgent();
    error InvalidTreasury();
    error EmptyName();
    error EmptySymbol();
    error InsufficientFee();
    error VaultNotFromFactory();
    error WithdrawalFailed();
    error InvalidWithdrawalFee();
    error InvalidYieldRate();

    // ============ Modifiers ============

    /// @notice Restricts function access to addresses with FACTORY_MANAGER_ROLE
    modifier onlyFactoryManager() {
        require(
            hasRole(FACTORY_MANAGER_ROLE, msg.sender),
            "VaultFactory: caller is not a factory manager"
        );
        _;
    }

    // ============ Constructor ============

    /// @notice Initializes the VaultFactory
    /// @param _defaultManager Default manager address for new vaults
    /// @param _defaultAgent Default agent address for new vaults
    /// @param _treasury Treasury address to receive creation fees
    /// @param _creationFee Fee required to create a vault
    /// @param _defaultWithdrawalFee Default withdrawal fee for new vaults (in basis points, max 1000 = 10%)
    /// @param _defaultYieldRate Default yield rate for new vaults (in basis points, max 2000 = 20%)
    constructor(
        address _defaultManager,
        address _defaultAgent,
        address _treasury,
        uint256 _creationFee,
        uint256 _defaultWithdrawalFee,
        uint256 _defaultYieldRate
    ) Ownable(msg.sender) {
        if (_defaultManager == address(0)) revert InvalidManager();
        if (_defaultAgent == address(0)) revert InvalidAgent();
        if (_treasury == address(0)) revert InvalidTreasury();

        defaultManager = _defaultManager;
        defaultAgent = _defaultAgent;
        treasury = _treasury;
        creationFee = _creationFee;
        defaultWithdrawalFee = _defaultWithdrawalFee;
        defaultYieldRate = _defaultYieldRate;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACTORY_MANAGER_ROLE, msg.sender);
    }

    // ============ External Functions ============

    /// @notice Creates a vault with default manager and agent
    /// @param asset The underlying asset for the vault
    /// @param name Name of the vault token
    /// @param symbol Symbol of the vault token
    /// @return vaultAddress Address of the created vault
    /// @return vaultId ID of the created vault
    function createVaultWithDefaults(
        IERC20 asset,
        string calldata name,
        string calldata symbol
    ) external payable returns (address vaultAddress, uint256 vaultId) {
        VaultParams memory params = VaultParams({
            asset: asset,
            name: name,
            symbol: symbol,
            manager: address(0), // Will use default
            agent: address(0), // Will use default
            withdrawalFee: 0, // Will use default
            yieldRate: 0 // Will use default
        });

        return _createVault(params);
    }

    /// @notice Creates a new vault with specified parameters
    /// @param params Vault creation parameters
    /// @return vaultAddress Address of the created vault
    /// @return vaultId ID of the created vault
    function createVault(
        VaultParams calldata params
    )
        external
        payable
        nonReentrant
        returns (address vaultAddress, uint256 vaultId)
    {
        return _createVault(params);
    }

    /// @notice Internal function to create vaults
    /// @param params Vault creation parameters
    /// @return vaultAddress Address of the created vault
    /// @return vaultId ID of the created vault
    function _createVault(
        VaultParams memory params
    ) internal returns (address vaultAddress, uint256 vaultId) {
        // Validate parameters
        if (address(params.asset) == address(0)) revert InvalidAsset();
        if (bytes(params.name).length == 0) revert EmptyName();
        if (bytes(params.symbol).length == 0) revert EmptySymbol();
        if (msg.value < creationFee) revert InsufficientFee();

        // Use default values if not provided
        address manager = params.manager != address(0)
            ? params.manager
            : defaultManager;
        address agent = params.agent != address(0)
            ? params.agent
            : defaultAgent;
        uint256 withdrawalFee = params.withdrawalFee != 0
            ? params.withdrawalFee
            : defaultWithdrawalFee;
        uint256 yieldRate = params.yieldRate != 0
            ? params.yieldRate
            : defaultYieldRate;

        if (manager == address(0)) revert InvalidManager();
        if (agent == address(0)) revert InvalidAgent();

        // Increment vault counter
        vaultCounter++;
        vaultId = vaultCounter;

        // Create new vault
        Vault vault = new Vault(
            params.asset,
            params.name,
            params.symbol,
            manager,
            agent,
            withdrawalFee,
            yieldRate,
            treasury
        );

        vaultAddress = address(vault);

        // Store vault information
        vaults[vaultId] = vaultAddress;
        vaultIds[vaultAddress] = vaultId;
        assetVaults[address(params.asset)].push(vaultAddress);
        allVaults.push(vaultAddress);
        isVaultFromFactory[vaultAddress] = true;

        // Send creation fee to treasury
        if (msg.value > 0) {
            (bool success, ) = treasury.call{value: msg.value}("");
            if (!success) revert WithdrawalFailed();
        }

        emit VaultCreated(
            vaultId,
            vaultAddress,
            address(params.asset),
            params.name,
            params.symbol,
            manager,
            agent,
            msg.sender
        );

        return (vaultAddress, vaultId);
    }

    // ============ Admin Functions ============

    /// @notice Updates the default manager address
    /// @param _newDefaultManager New default manager address
    function setDefaultManager(address _newDefaultManager) external onlyOwner {
        if (_newDefaultManager == address(0)) revert InvalidManager();

        address oldManager = defaultManager;
        defaultManager = _newDefaultManager;

        emit DefaultManagerUpdated(oldManager, _newDefaultManager);
    }

    /// @notice Updates the default agent address
    /// @param _newDefaultAgent New default agent address
    function setDefaultAgent(address _newDefaultAgent) external onlyOwner {
        if (_newDefaultAgent == address(0)) revert InvalidAgent();

        address oldAgent = defaultAgent;
        defaultAgent = _newDefaultAgent;

        emit DefaultAgentUpdated(oldAgent, _newDefaultAgent);
    }

    /// @notice Updates the creation fee
    /// @param _newCreationFee New creation fee amount
    function setCreationFee(uint256 _newCreationFee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = _newCreationFee;

        emit CreationFeeUpdated(oldFee, _newCreationFee);
    }

    /// @notice Updates the treasury address
    /// @param _newTreasury New treasury address
    function setTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert InvalidTreasury();

        address oldTreasury = treasury;
        treasury = _newTreasury;

        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /// @notice Updates the default withdrawal fee
    /// @param _newDefaultWithdrawalFee New default withdrawal fee in basis points (max 1000 = 10%)
    function setDefaultWithdrawalFee(
        uint256 _newDefaultWithdrawalFee
    ) external onlyOwner {
        if (_newDefaultWithdrawalFee > 1000) revert InvalidWithdrawalFee();

        uint256 oldFee = defaultWithdrawalFee;
        defaultWithdrawalFee = _newDefaultWithdrawalFee;

        emit DefaultWithdrawalFeeUpdated(oldFee, _newDefaultWithdrawalFee);
    }

    /// @notice Updates the default yield rate
    /// @param _newDefaultYieldRate New default yield rate in basis points (max 2000 = 20%)
    function setDefaultYieldRate(
        uint256 _newDefaultYieldRate
    ) external onlyOwner {
        if (_newDefaultYieldRate > 2000) revert InvalidYieldRate();

        uint256 oldRate = defaultYieldRate;
        defaultYieldRate = _newDefaultYieldRate;

        emit DefaultYieldRateUpdated(oldRate, _newDefaultYieldRate);
    }

    /// @notice Withdraws accumulated fees to treasury
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = treasury.call{value: balance}("");
            if (!success) revert WithdrawalFailed();

            emit FeesWithdrawn(treasury, balance);
        }
    }

    // ============ View Functions ============

    /// @notice Returns the total number of vaults created
    /// @return count Total vault count
    function getVaultCount() external view returns (uint256 count) {
        return vaultCounter;
    }

    /// @notice Returns all vault addresses
    /// @return vaultAddresses Array of all vault addresses
    function getAllVaults()
        external
        view
        returns (address[] memory vaultAddresses)
    {
        return allVaults;
    }

    /// @notice Returns vault addresses for a specific asset
    /// @param asset Asset address
    /// @return vaultAddresses Array of vault addresses for the asset
    function getVaultsForAsset(
        address asset
    ) external view returns (address[] memory vaultAddresses) {
        return assetVaults[asset];
    }

    /// @notice Returns detailed information about a vault
    /// @param vaultId ID of the vault
    /// @return info Vault information struct
    function getVaultInfo(
        uint256 vaultId
    ) external view returns (VaultInfo memory info) {
        address vaultAddress = vaults[vaultId];
        if (vaultAddress == address(0)) {
            return info; // Return empty struct for non-existent vault
        }

        Vault vault = Vault(vaultAddress);

        info = VaultInfo({
            id: vaultId,
            vaultAddress: vaultAddress,
            asset: address(vault.asset()),
            name: vault.name(),
            symbol: vault.symbol(),
            manager: address(0), // Would need to add getter in Vault contract
            agent: address(0), // Would need to add getter in Vault contract
            createdAt: 0, // Would need to add creation timestamp tracking
            creator: address(0) // Would need to add creator tracking
        });

        return info;
    }

    /// @notice Returns vault information by vault address
    /// @param vaultAddress Address of the vault
    /// @return info Vault information struct
    function getVaultInfoByAddress(
        address vaultAddress
    ) external view returns (VaultInfo memory info) {
        uint256 vaultId = vaultIds[vaultAddress];
        if (vaultId == 0) {
            return info; // Return empty struct for non-existent vault
        }

        // Get vault info directly without recursive call
        address vaultAddr = vaults[vaultId];
        if (vaultAddr == address(0)) {
            return info; // Return empty struct for non-existent vault
        }

        Vault vault = Vault(vaultAddr);

        info = VaultInfo({
            id: vaultId,
            vaultAddress: vaultAddr,
            asset: address(vault.asset()),
            name: vault.name(),
            symbol: vault.symbol(),
            manager: address(0), // Would need to add getter in Vault contract
            agent: address(0), // Would need to add getter in Vault contract
            createdAt: 0, // Would need to add creation timestamp tracking
            creator: address(0) // Would need to add creator tracking
        });

        return info;
    }

    /// @notice Checks if a vault address was created by this factory
    /// @param vaultAddress Address to check
    /// @return isFromFactory True if vault was created by this factory
    function isVaultCreatedByFactory(
        address vaultAddress
    ) external view returns (bool isFromFactory) {
        return isVaultFromFactory[vaultAddress];
    }
}
