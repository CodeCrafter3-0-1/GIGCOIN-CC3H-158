// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external returns (bool);
}

contract JobEscrow {
    IERC20 public token;
    address public owner;
    address public treasury;

    uint256 public jobCounter;
    uint256 public burnPercent = 2;
    uint256 public validatorRewardPercent = 2;
    uint256 public treasuryPercent = 1;
    uint256 public workerCoinbaseReward = 10 ether;
    uint256 public validatorCoinbaseReward = 2 ether;

    enum JobState { CREATED, FUNDED, IN_PROGRESS, SUBMITTED, VALIDATING, VERIFIED, DISPUTED, RESOLVED, SETTLED }

    struct Job {
        address requester; address worker; uint256 usdPrice; uint256 tokenAmount;
        bytes32 resultHash; string resultCID; address requesterPubKey; uint256 stakeAmount;
        JobState state; uint256 createdAt; uint256 deadline;
    }

    struct Validation {
        uint256 yesVotes; uint256 noVotes;
        mapping(address => bool) voted; mapping(address => bool) voteChoice;
        address[] validators;
    }

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Validation) public validations;
    mapping(address => uint256) public validatorStake;

    event JobCreated(uint256 jobId, address requester);
    event JobFunded(uint256 jobId, uint256 amount);
    event JobAccepted(uint256 jobId, address worker);
    event WorkSubmitted(uint256 jobId, string cid);
    event VoteCast(uint256 jobId, address validator, bool choice);
    event JobVerified(uint256 jobId);
    event JobDisputed(uint256 jobId);
    event JobFinalized(uint256 jobId);
    event CoinbaseRewardMinted(uint256 jobId, address recipient, uint256 amount);

    constructor(address _token, address _treasury) { token = IERC20(_token); owner = msg.sender; treasury = _treasury; }

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier inState(uint256 jobId, JobState state) { require(jobs[jobId].state == state, "Invalid state"); _; }

    function stakeAsValidator(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Stake failed");
        validatorStake[msg.sender] += amount;
    }

    function createJob(uint256 usdPrice, address requesterPubKey, uint256 deadline) external returns (uint256) {
        jobCounter++;
        Job storage job = jobs[jobCounter];
        job.requester = msg.sender; job.usdPrice = usdPrice; job.requesterPubKey = requesterPubKey;
        job.state = JobState.CREATED; job.createdAt = block.timestamp; job.deadline = deadline;
        emit JobCreated(jobCounter, msg.sender);
        return jobCounter;
    }

    function fundJob(uint256 jobId, uint256 tokenAmount) external inState(jobId, JobState.CREATED) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.requester, "Not requester");
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Transfer failed");
        job.tokenAmount = tokenAmount; job.state = JobState.FUNDED;
        emit JobFunded(jobId, tokenAmount);
    }

    function acceptJob(uint256 jobId, uint256 stakeAmount) external inState(jobId, JobState.FUNDED) {
        Job storage job = jobs[jobId];
        require(job.worker == address(0), "Already taken");
        require(token.transferFrom(msg.sender, address(this), stakeAmount), "Stake failed");
        job.worker = msg.sender; job.stakeAmount = stakeAmount; job.state = JobState.IN_PROGRESS;
        emit JobAccepted(jobId, msg.sender);
    }

    function submitWork(uint256 jobId, bytes32 resultHash, string calldata resultCID) external inState(jobId, JobState.IN_PROGRESS) {
        Job storage job = jobs[jobId];
        require(msg.sender == job.worker, "Not worker");
        job.resultHash = resultHash; job.resultCID = resultCID; job.state = JobState.VALIDATING;
        emit WorkSubmitted(jobId, resultCID);
    }

    function vote(uint256 jobId, bool isValid) external {
        require(jobs[jobId].state == JobState.VALIDATING, "Not validating");
        require(validatorStake[msg.sender] > 0, "No stake");
        Validation storage v = validations[jobId];
        require(!v.voted[msg.sender], "Already voted");
        v.voted[msg.sender] = true; v.voteChoice[msg.sender] = isValid; v.validators.push(msg.sender);
        if (isValid) v.yesVotes++; else v.noVotes++;
        emit VoteCast(jobId, msg.sender, isValid);
    }

    function finalizeValidation(uint256 jobId) external {
        Job storage job = jobs[jobId];
        Validation storage v = validations[jobId];
        require(job.state == JobState.VALIDATING, "Not in validation");
        if (v.yesVotes > v.noVotes) {
            job.state = JobState.VERIFIED; emit JobVerified(jobId);
        } else {
            job.state = JobState.DISPUTED; slashWorker(jobId); emit JobDisputed(jobId);
        }
    }

    function slashWorker(uint256 jobId) internal {
        token.transfer(address(0), jobs[jobId].stakeAmount);
    }

    function finalize(uint256 jobId) external inState(jobId, JobState.VERIFIED) {
        Job storage job = jobs[jobId];
        uint256 burnAmt = (job.tokenAmount * burnPercent) / 100;
        uint256 valReward = (job.tokenAmount * validatorRewardPercent) / 100;
        uint256 treasuryAmt = (job.tokenAmount * treasuryPercent) / 100;
        uint256 workerPayout = job.tokenAmount - burnAmt - valReward - treasuryAmt;
        token.transfer(address(0), burnAmt);
        token.transfer(treasury, treasuryAmt);
        require(token.transfer(job.worker, workerPayout), "Payout failed");
        require(token.transfer(job.worker, job.stakeAmount), "Stake failed");
        distributeValidatorRewards(jobId, valReward);
        require(token.mint(job.worker, workerCoinbaseReward), "Worker mint failed");
        emit CoinbaseRewardMinted(jobId, job.worker, workerCoinbaseReward);
        job.state = JobState.SETTLED; emit JobFinalized(jobId);
    }


    function mockReward(uint256 amount) external {
        require(token.mint(msg.sender, amount), "Mint failed");
    }
    function distributeValidatorRewards(uint256 jobId, uint256 totalReward) internal {
        Validation storage v = validations[jobId];
        uint256 totalVotes = v.yesVotes + v.noVotes;
        if (totalVotes == 0) return;
        uint256 rewardPerValidator = totalReward / totalVotes;
        for (uint i = 0; i < v.validators.length; i++) {
            address val = v.validators[i];
            if (v.voteChoice[val]) {
                token.transfer(val, rewardPerValidator);
                require(token.mint(val, validatorCoinbaseReward), "Validator mint failed");
                emit CoinbaseRewardMinted(jobId, val, validatorCoinbaseReward);
            }
        }
    }
}
