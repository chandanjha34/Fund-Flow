import { shortString } from "starknet"

export const FUNDFLOW_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_FUNDFLOW_CONTRACT_ADDRESS || ""

export function isFundFlowContractEnabled(): boolean {
  return Boolean(FUNDFLOW_CONTRACT_ADDRESS)
}

function toCodeFelt(code: string): string {
  const normalized = code.trim().toUpperCase()
  return shortString.encodeShortString(normalized)
}

function toRiskLevel(risk: string): number {
  switch (risk.toLowerCase()) {
    case "low":
      return 1
    case "medium":
      return 2
    case "high":
      return 3
    default:
      return 1
  }
}

function toDurationDays(duration: string): number {
  const value = duration.trim().toLowerCase()
  if (value.includes("3 month")) return 90
  if (value.includes("6 month")) return 180
  if (value.includes("1 year")) return 365
  if (value.includes("3 year")) return 1095
  return 180
}

async function executeContract(
  wallet: any,
  entrypoint: string,
  calldata: Array<string>,
): Promise<void> {
  if (!wallet || !FUNDFLOW_CONTRACT_ADDRESS) return

  if (typeof wallet.execute !== "function") {
    throw new Error("Connected wallet does not support contract execution")
  }

  const tx = await wallet.execute(
    [
      {
        contractAddress: FUNDFLOW_CONTRACT_ADDRESS,
        entrypoint,
        calldata,
      },
    ],
    { feeMode: "sponsored" },
  )

  if (typeof tx?.wait === "function") {
    await tx.wait()
  }
}

export async function createCircleOnchain(
  wallet: any,
  args: {
    code: string
    fundingGoal: number
    recurringAmount: number
    riskLevel: string
    totalDuration: string
    isPublic: boolean
  },
): Promise<void> {
  if (!isFundFlowContractEnabled()) return

  await executeContract(wallet, "create_circle", [
    toCodeFelt(args.code),
    String(Math.max(0, Math.floor(args.fundingGoal))),
    String(Math.max(0, Math.floor(args.recurringAmount))),
    String(toRiskLevel(args.riskLevel)),
    String(toDurationDays(args.totalDuration)),
    args.isPublic ? "1" : "0",
  ])
}

export async function joinCircleOnchain(wallet: any, code: string): Promise<void> {
  if (!isFundFlowContractEnabled()) return
  await executeContract(wallet, "join_circle", [toCodeFelt(code)])
}

export async function contributeOnchain(
  wallet: any,
  code: string,
  amount: number,
): Promise<void> {
  if (!isFundFlowContractEnabled()) return
  await executeContract(wallet, "contribute", [
    toCodeFelt(code),
    String(Math.max(0, Math.floor(amount))),
  ])
}
