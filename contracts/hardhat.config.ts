import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: "0.8.20",
  paths: {
    sources: "./src"
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1"
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
});
