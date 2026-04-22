import { ethers } from "ethers";
import type { Eip1193Provider } from "ethers";
import artifact from "./JobEscrow.json";

const abi = artifact.abi || (artifact as any).default?.abi || artifact;
const tokenAbi = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
] as const;
const TOKEN_DECIMALS = 18;
const TOKEN_PER_USD = 10;

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
  tokenAmountFormatted: string;
  resultHash: string;
  resultCID: string;
  requesterPubKey: string;
  stakeAmount: string;
  stakeAmountFormatted: string;
  state: number;
  createdAt: string;
  deadline: string;
};

export type JobRequestMetadata = {
  title: string;
  description: string;
  deadlineLabel: string;
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
      tokenAmountFormatted: formatGigAmount(job.tokenAmount),
      resultHash: job.resultHash,
      resultCID: job.resultCID,
      requesterPubKey: job.requesterPubKey,
      stakeAmount: job.stakeAmount.toString(),
      stakeAmountFormatted: formatGigAmount(job.stakeAmount),
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

export async function createAndFundJob(usdPrice: string, requesterPubKey: string, deadline: number) {
  try {
    const escrow = await getContract();
    const approvalAmount = usdPriceToGig(usdPrice);

    const createTx = await escrow.createJob(BigInt(Math.trunc(Number(usdPrice || "0"))), requesterPubKey, BigInt(deadline));
    const createReceipt = await createTx.wait();

    let jobId = 0;
    for (const log of createReceipt.logs ?? []) {
      try {
        const parsed = escrow.interface.parseLog(log);
        if (parsed?.name === "JobCreated") {
          jobId = Number(parsed.args.jobId);
          break;
        }
      } catch {
        // Ignore unrelated logs.
      }
    }

    if (!jobId) {
      throw new Error("Could not determine the created job id from transaction logs.");
    }

    const token = await getTokenContract();
    const approveTx = await token.approve(await escrow.getAddress(), approvalAmount);
    await approveTx.wait();

    const fundTx = await escrow.fundJob(BigInt(jobId), approvalAmount);
    await fundTx.wait();

    return {
      jobId,
      createTxHash: createTx.hash,
      fundTxHash: fundTx.hash,
    };
  } catch (error) {
    throw toReadableContractError(error);
  }
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

export async function submitCompletedWork(jobId: number, resultCid: string) {
  try {
    const escrow = await getContract();
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultCid.trim()));
    return waitForTx(escrow.submitWork(BigInt(jobId), resultHash, resultCid.trim()));
  } catch (error) {
    throw toReadableContractError(error);
  }
}

export async function fetchGigBalance(account: string) {
  const token = await getTokenContract(true);
  const balance = await token.balanceOf(account);
  return formatGigAmount(balance);
}

export async function fetchValidatorStake(account: string) {
  const escrow = await getContract(true);
  const balance = await escrow.validatorStake(account);
  return formatGigAmount(balance);
}


export async function claimMockReward(amount: bigint) {
  const escrow = await getContract();
  return waitForTx(escrow.mockReward(amount));
}

export function usdPriceToGig(usdPrice: string) {
  const usdValue = Number(usdPrice || "0");
  const tokenAmount = usdValue * TOKEN_PER_USD;
  return ethers.parseUnits(String(tokenAmount), TOKEN_DECIMALS);
}

export function formatGigAmount(value: bigint | string) {
  const normalized = typeof value === "string" ? BigInt(value || "0") : value;
  const formatted = ethers.formatUnits(normalized, TOKEN_DECIMALS);
  const asNumber = Number(formatted);

  if (Number.isFinite(asNumber)) {
    return asNumber.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }

  return formatted;
}

const JOB_METADATA_STORAGE_KEY = "gigcoin-job-metadata";

export function saveJobMetadata(jobId: number, metadata: JobRequestMetadata) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readJobMetadataMap();
  current[String(jobId)] = metadata;
  window.localStorage.setItem(JOB_METADATA_STORAGE_KEY, JSON.stringify(current));
}

export function getJobMetadata(jobId: number): JobRequestMetadata | null {
  const current = readJobMetadataMap();
  return current[String(jobId)] ?? null;
}

function readJobMetadataMap(): Record<string, JobRequestMetadata> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(JOB_METADATA_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, JobRequestMetadata>;
  } catch {
    return {};
  }
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
