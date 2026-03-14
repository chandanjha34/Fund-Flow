import { Account, RpcProvider, hash, json } from "starknet";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RPC_URL = process.env.STARKNET_RPC_URL ?? "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/your_alchemy_key";
const DEPLOYER_ADDRESS = process.env.STARKNET_DEPLOYER_ADDRESS ?? "";
const PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY ?? "";

if (!DEPLOYER_ADDRESS || !PRIVATE_KEY) {
  console.error("Set STARKNET_DEPLOYER_ADDRESS and STARKNET_PRIVATE_KEY before running deployment.");
  process.exit(1);
}

const devDir = join(process.cwd(), "contracts", "starknet", "target", "dev");
const artifactIndexPath = join(devDir, "fundflow.starknet_artifacts.json");

if (!existsSync(artifactIndexPath)) {
  console.error("Artifacts not found. Run Scarb build first in contracts/starknet.");
  process.exit(1);
}

const artifactIndex = JSON.parse(readFileSync(artifactIndexPath, "utf-8"));
const contractEntry = artifactIndex?.contracts?.find((c) => c?.contract_name === "FundFlow");

if (!contractEntry) {
  console.error("FundFlow contract artifacts were not found in fundflow.starknet_artifacts.json");
  process.exit(1);
}

const sierraRel = contractEntry?.artifacts?.sierra;
const casmRelFromIndex = contractEntry?.artifacts?.casm;
const fallbackCasmRel = "fundflow_FundFlow.compiled_contract_class.json";

if (!sierraRel) {
  console.error("Sierra artifact path is missing in artifact index.");
  process.exit(1);
}

const sierraPath = join(devDir, sierraRel);
const casmPath = join(devDir, casmRelFromIndex || fallbackCasmRel);

if (!existsSync(sierraPath)) {
  console.error(`Sierra artifact missing at: ${sierraPath}`);
  process.exit(1);
}
if (!existsSync(casmPath)) {
  console.error(`CASM artifact missing at: ${casmPath}`);
  console.error("Enable CASM in contracts/starknet/Scarb.toml with [[target.starknet-contract]] casm = true");
  process.exit(1);
}

const sierra = json.parse(readFileSync(sierraPath, "utf-8"));
const casm = json.parse(readFileSync(casmPath, "utf-8"));

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account = new Account({
  provider,
  address: DEPLOYER_ADDRESS,
  signer: PRIVATE_KEY,
});

console.log(`RPC: ${RPC_URL}`);
console.log(`Deployer: ${DEPLOYER_ADDRESS}`);

let classHash = "";
console.log("Step 1/2: Declare class...");
try {
  const declaration = await account.declareIfNot({ contract: sierra, casm });
  classHash = declaration.class_hash;

  if (declaration.transaction_hash) {
    console.log(`Declare tx: ${declaration.transaction_hash}`);
    await provider.waitForTransaction(declaration.transaction_hash);
    console.log(`Class declared: ${classHash}`);
  } else {
    console.log(`Class already declared: ${classHash}`);
  }
} catch (error) {
  const message = String(error?.message ?? error);
  if (
    message.includes("already declared") ||
    message.includes("ClassAlreadyDeclared") ||
    message.includes("DuplicateTx")
  ) {
    classHash = hash.computeSierraContractClassHash(sierra);
    console.log(`Class already declared (computed): ${classHash}`);
  } else {
    console.error(`Declare failed: ${message}`);
    process.exit(1);
  }
}

console.log("Step 2/2: Deploy contract instance...");
const deployment = await account.deployContract({ classHash, constructorCalldata: [] });
console.log(`Deploy tx: ${deployment.transaction_hash}`);
await provider.waitForTransaction(deployment.transaction_hash);

const contractAddress = deployment.contract_address;
console.log("---------------------------------------------");
console.log("FundFlow deployed to Starknet Sepolia");
console.log(`Class hash: ${classHash}`);
console.log(`Contract address: ${contractAddress}`);
console.log(`Tx hash: ${deployment.transaction_hash}`);
console.log("---------------------------------------------");
console.log(`NEXT_PUBLIC_FUNDFLOW_CONTRACT_ADDRESS=${contractAddress}`);
