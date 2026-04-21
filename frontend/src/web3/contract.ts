import { ethers } from "ethers";
import type { Eip1193Provider } from "ethers";
import artifact from "./JobEscrow.json";

const abi = artifact.abi || (artifact as any).default?.abi || artifact;
const tokenAbi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
] as const;

const CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS;
const EMPTY_CODE = "0x";

export const JOB_STATES = [
  "Created",
  "Funded",
  "In Progress",
  "Submitted",
  "Validating",
  "Verified",
  "Disputed",
  "Resolved",
  "Settled",
] as const;

export type JobStateLabel = (typeof JOB_STATES)[number];

export type JobDetails = {
  id: number;
  requester: string;
  worker: string;
  usdPrice: string;
  tokenAmount: string;
  resultHash: string;
  resultCID: string;
  requesterPubKey: string;
  stakeAmount: string;
  state: number;
  createdAt: string;
  deadline: string;
};

function requireEthereum(): Eip1193Provider {
  if (typeof window !== "undefined" && !window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another EVM wallet.");
  }
  return window.ethereum as Eip1193Provider;
}

function requireContractAddress() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing VITE_ESCROW_ADDRESS in frontend env.");
  }
  return CONTRACT_ADDRESS;
}

export function toReadableContractError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("could not decode result data") ||
    message.includes("BAD_DATA") ||
    message.includes("0x")
  ) {
    return new Error(
      "Escrow contract read failed. Check that VITE_ESCROW_ADDRESS points to a deployed JobEscrow contract on the same network as your wallet.",
    );
  }

  return error instanceof Error ? error : new Error("Escrow contract read failed.");
}

export async function getProvider() {
  return new ethers.BrowserProvider(requireEthereum());
}

export async function getSignerAddress() {
  const provider = await getProvider();
  const signer = await provider.getSigner();
  return signer.getAddress();
}

export async function getContract(readOnly = false) {
  const provider = await getProvider();
  const runner = readOnly ? provider : await provider.getSigner();
  const contractAddress = requireContractAddress();
  const code = await provider.getCode(contractAddress);

  if (code === EMPTY_CODE) {
    throw new Error(
      "No contract is deployed at VITE_ESCROW_ADDRESS for the currently connected network.",
    );
  }

  return new ethers.Contract(contractAddress, abi, runner);
}

export async function getTokenContract(readOnly = false) {
  try {
    const provider = await getProvider();
    const runner = readOnly ? provider : await provider.getSigner();
    const escrow = await getContract(true);
    const tokenAddress = await escrow.token();
    const code = await provider.getCode(tokenAddress);

    if (code === EMPTY_CODE) {
      throw new Error("Escrow token contract is not deployed on the current network.");
    }

    return new ethers.Contract(tokenAddress, tokenAbi, runner);
  } catch (error) {
    throw toReadableContractError(error);
  }
}

export async function fetchJob(jobId: number): Promise<JobDetails> {
  try {
    const contract = await getContract(true);
    const job = await contract.jobs(jobId);

    return {
      id: jobId,
      requester: job.requester,
      worker: job.worker,
      usdPrice: job.usdPrice.toString(),
      tokenAmount: job.tokenAmount.toString(),
      resultHash: job.resultHash,
      resultCID: job.resultCID,
      requesterPubKey: job.requesterPubKey,
      stakeAmount: job.stakeAmount.toString(),
      state: Number(job.state),
      createdAt: job.createdAt.toString(),
      deadline: job.deadline.toString(),
    };
  } catch (error) {
    throw toReadableContractError(error);
  }
}

async function waitForTx(txPromise: Promise<{ wait: () => Promise<unknown>; hash: string }>) {
  try {
    const tx = await txPromise;
    await tx.wait();
    return tx.hash;
  } catch (error) {
    throw toReadableContractError(error);
  }
}

export async function approveEscrowSpending(amount: bigint) {
  const token = await getTokenContract();
  const escrow = await getContract(true);
  return waitForTx(token.approve(await escrow.getAddress(), amount));
}

export async function acceptJob(jobId: number, stakeAmount: bigint) {
  const escrow = await getContract();
  return waitForTx(escrow.acceptJob(BigInt(jobId), stakeAmount));
}

export async function stakeAsValidator(amount: bigint) {
  const escrow = await getContract();
  return waitForTx(escrow.stakeAsValidator(amount));
}

export async function voteOnJob(jobId: number, isValid: boolean) {
  const escrow = await getContract();
  return waitForTx(escrow.vote(BigInt(jobId), isValid));
}

export async function finalizeValidation(jobId: number) {
  const escrow = await getContract();
  return waitForTx(escrow.finalizeValidation(BigInt(jobId)));
}

export async function finalizeJob(jobId: number) {
  const escrow = await getContract();
  return waitForTx(escrow.finalize(BigInt(jobId)));
}

export async function fetchGigBalance(account: string) {
  const token = await getTokenContract(true);
  const balance = await token.balanceOf(account);
  return balance.toString();
}

export async function fetchValidatorStake(account: string) {
  const escrow = await getContract(true);
  const balance = await escrow.validatorStake(account);
  return balance.toString();
}

export function formatJobState(state: number): JobStateLabel | `Unknown (${number})` {
  return JOB_STATES[state] ?? `Unknown (${state})`;
}

export function shortenAddress(address: string) {
  if (!address || address === ethers.ZeroAddress) {
    return "Not assigned";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
