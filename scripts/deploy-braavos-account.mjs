import { SDK, ChainId, StarkSigner, BraavosPreset } from "starkzap";

const rpcUrl = process.env.STARKNET_RPC_URL;
const privateKey = process.env.STARKNET_PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  console.error("Set STARKNET_RPC_URL and STARKNET_PRIVATE_KEY first.");
  process.exit(1);
}

const sdk = new SDK({
  rpcUrl,
  chainId: ChainId.SEPOLIA,
});

const signer = new StarkSigner(privateKey);
const wallet = await sdk.connectWallet({
  account: {
    signer,
    accountClass: BraavosPreset,
  },
  feeMode: "user_pays",
});

console.log(`Wallet address: ${wallet.address}`);

await wallet.ensureReady({
  deploy: "if_needed",
  feeMode: "user_pays",
  onProgress: (event) => {
    console.log(`Progress: ${event.step}`);
  },
});

console.log("Braavos account is deployed and ready.");
