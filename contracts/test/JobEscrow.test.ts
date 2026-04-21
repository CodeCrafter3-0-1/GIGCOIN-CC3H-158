import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("JobEscrow Full Flow", function () {
  let token: any;
  let escrow: any;

  let owner: any;
  let requester: any;
  let worker: any;
  let validator: any;

  const initialSupply = ethers.parseUnits("1000000", 18);
  const jobPayment = ethers.parseUnits("100", 18);
  const stakeAmount = ethers.parseUnits("50", 18);
  const validatorStake = ethers.parseUnits("25", 18);
  const workerCoinbaseReward = ethers.parseUnits("10", 18);
  const validatorCoinbaseReward = ethers.parseUnits("2", 18);

  beforeEach(async function () {
    [owner, requester, worker, validator] = await ethers.getSigners();

    token = await ethers.deployContract("Token", [initialSupply]);
    await token.waitForDeployment();

    escrow = await ethers.deployContract("JobEscrow", [await token.getAddress(), owner.address]);
    await escrow.waitForDeployment();
    await token.setMinter(await escrow.getAddress(), true);

    await token.transfer(requester.address, ethers.parseUnits("1000", 18));
    await token.transfer(worker.address, ethers.parseUnits("500", 18));
    await token.transfer(validator.address, ethers.parseUnits("500", 18));
  });

  it("should complete full job lifecycle and mint GigCoin rewards", async function () {
    await escrow.connect(requester).createJob(
      100,
      requester.address,
      999999999,
    );

    const jobId = 1n;

    await token.connect(requester).approve(await escrow.getAddress(), jobPayment);
    await escrow.connect(requester).fundJob(jobId, jobPayment);

    await token.connect(worker).approve(await escrow.getAddress(), stakeAmount);
    await escrow.connect(worker).acceptJob(jobId, stakeAmount);

    await token.connect(validator).approve(await escrow.getAddress(), validatorStake);
    await escrow.connect(validator).stakeAsValidator(validatorStake);

    const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("result"));
    const fakeCID = "QmFakeCID";

    await escrow.connect(worker).submitWork(jobId, fakeHash, fakeCID);
    await escrow.connect(validator).vote(jobId, true);
    await escrow.finalizeValidation(jobId);

    const workerBalanceBefore = await token.balanceOf(worker.address);
    const validatorBalanceBefore = await token.balanceOf(validator.address);
    const expectedBurn = (jobPayment * 2n) / 100n;
    const expectedValidatorReward = (jobPayment * 2n) / 100n;
    const expectedTreasury = (jobPayment * 1n) / 100n;
    const expectedPayout = jobPayment - expectedBurn - expectedValidatorReward - expectedTreasury;
    const expectedWorkerIncrease = expectedPayout + stakeAmount + workerCoinbaseReward;
    const expectedValidatorIncrease = expectedValidatorReward + validatorCoinbaseReward;

    await escrow.finalize(jobId);

    const workerBalanceAfter = await token.balanceOf(worker.address);
    const validatorBalanceAfter = await token.balanceOf(validator.address);
    expect(workerBalanceAfter - workerBalanceBefore).to.equal(expectedWorkerIncrease);
    expect(validatorBalanceAfter - validatorBalanceBefore).to.equal(expectedValidatorIncrease);

    const job = await escrow.jobs(jobId);
    expect(job.state).to.equal(8n);
    expect(job.worker).to.equal(worker.address);
    expect(job.tokenAmount).to.equal(jobPayment);
    expect(job.stakeAmount).to.equal(stakeAmount);
    expect(job.resultHash).to.equal(fakeHash);
    expect(job.resultCID).to.equal(fakeCID);

    const contractBalance = await token.balanceOf(await escrow.getAddress());
    expect(contractBalance).to.equal(validatorStake);
    expect(await token.name()).to.equal("GigCoin");
  });
});
