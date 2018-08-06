pragma solidity 0.4.18;

import "../../contracts/Staking.sol";
import "../../contracts/StakingHistory.sol";

contract StakingMockBase is AragonApp {
    uint _mockTime = now;
    uint _mockBlockNumber = block.number;

    function getTimestampExt() external view returns (uint256) {
        return getTimestamp();
    }

    function getBlockNumberExt() external view returns (uint256) {
        return getBlockNumber();
    }

    function setTimestamp(uint i) public {
        _mockTime = i;
    }

    function setBlockNumber(uint i) public {
        _mockBlockNumber = i;
    }

    function getTimestamp() internal view returns (uint256) {
        return _mockTime;
    }

    // TODO: Use getBlockNumber from Initializable.sol - issue with solidity-coverage
    function getBlocknumber() internal view returns (uint256) {
        return _mockBlockNumber;
    }
}

contract StakingMock is Staking, StakingMockBase {}
contract StakingHistoryMock is StakingHistory, StakingMockBase {}