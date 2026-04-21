import { network } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const backendEnvPath = resolve(import.meta.dirname, "..", "..", "backend", ".env");
const frontendEnvPath = resolve(import.meta.dirname, "..", "..", "frontend", ".env");

function readEnvFile(envPath: string) {
  const envText = readFileSync(envPath, "utf8");
  const env = new Map<string, string>();

  for (const rawLine of envText.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    env.set(key, value);
  }

  return { envText, env };
}

function upsertEnvValue(envText: string, key: string, value: string): string {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(envText)) {
    return envText.replace(pattern, `${key}=${value}`);
  }
  return `${envText.trimEnd()}\n${key}=${value}\n`;
}

async function main() {
  const { ethers } = await network.connect("localhost");
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  const Token = await ethers.getContractFactory("Token");
  const initialSupply = ethers.parseUnits("1000000", 18);
  const token = await Token.deploy(initialSupply);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("Token deployed at:", tokenAddress);

  const JobEscrow = await ethers.getContractFactory("JobEscrow");
  const treasuryAddress = deployer.address;
  const escrow = await JobEscrow.deploy(tokenAddress, treasuryAddress);
  await escrow.waitForDeployment();

  const escrowAddress = await escrow.getAddress();
  console.log("JobEscrow deployed at:", escrowAddress);

  const allowMinterTx = await token.setMinter(escrowAddress, true);
  await allowMinterTx.wait();
  console.log("Granted escrow mint access.");

  const { envText, env } = readEnvFile(backendEnvPath);
  const workerPrivateKey = env.get("WORKER_PRIVATE_KEY");
  const workerFundAmount = env.get("WORKER_FUND_AMOUNT") ?? "500";

  let nextBackendEnvText = upsertEnvValue(envText, "ESCROW_ADDRESS", escrowAddress);
  nextBackendEnvText = upsertEnvValue(nextBackendEnvText, "RPC_URL", "http://127.0.0.1:8545");
  writeFileSync(backendEnvPath, nextBackendEnvText);

  const { envText: frontendEnvText } = readEnvFile(frontendEnvPath);
  const nextFrontendEnvText = upsertEnvValue(frontendEnvText, "VITE_ESCROW_ADDRESS", escrowAddress);
  writeFileSync(frontendEnvPath, nextFrontendEnvText);

  console.log("Updated backend/.env and frontend/.env.");

  if (workerPrivateKey !== undefined && workerPrivateKey !== "") {
    const workerWallet = new ethers.Wallet(workerPrivateKey);
    const workerAddress = await workerWallet.getAddress();
    const fundAmount = BigInt(workerFundAmount);

    const transferTx = await token.transfer(workerAddress, fundAmount);
    await transferTx.wait();

    console.log("Funded worker:", workerAddress);
    console.log("Worker token amount:", fundAmount.toString());
  }

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Token:", tokenAddress);
  console.log("Escrow:", escrowAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
