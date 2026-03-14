param(
  [string]$RpcUrl = $env:STARKNET_RPC_URL,
  [string]$Account = $env:STARKNET_ACCOUNT,
  [string]$Keystore = $env:STARKNET_KEYSTORE,
  [string]$Password = $env:STARKNET_KEYSTORE_PASSWORD
)

$ErrorActionPreference = "Stop"

$scarbCmd = Get-Command scarb -ErrorAction SilentlyContinue
if (-not $scarbCmd) {
  $localScarb = Get-ChildItem -Path "$env:USERPROFILE\.local\scarb" -Recurse -Filter "scarb.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  if ($localScarb) {
    $scarbCmd = @{ Source = $localScarb }
  }
}

$starkliCmd = Get-Command starkli -ErrorAction SilentlyContinue
if (-not $starkliCmd) {
  throw "starkli is not installed or not in PATH."
}

if (-not $scarbCmd) {
  throw "scarb is not installed or not in PATH. Install it from https://docs.swmansion.com/scarb/download.html"
}

if (-not $RpcUrl) { throw "Set STARKNET_RPC_URL (Sepolia)." }
if (-not $Account) { throw "Set STARKNET_ACCOUNT (starkli account json path)." }
if (-not $Keystore) { throw "Set STARKNET_KEYSTORE (starkli keystore path)." }
if (-not $Password) { throw "Set STARKNET_KEYSTORE_PASSWORD." }

Write-Host "[1/4] Build Cairo contract with scarb..."
Push-Location "$PSScriptRoot\..\contracts\starknet"
& $scarbCmd.Source build
Pop-Location

$artifact = Join-Path $PSScriptRoot "..\contracts\starknet\target\dev\fundflow_FundFlow.contract_class.json"
if (-not (Test-Path $artifact)) {
  throw "Artifact not found: $artifact"
}

$env:STARKNET_KEYSTORE_PASSWORD = $Password

Write-Host "[2/4] Declare contract..."
$declareOut = starkli declare $artifact --rpc $RpcUrl --account $Account --keystore $Keystore
$declareOut | Write-Host

$classHash = ($declareOut | Select-String -Pattern "Class hash:\s*(0x[0-9a-fA-F]+)").Matches.Groups[1].Value
if (-not $classHash) {
  throw "Failed to parse class hash from declare output."
}

Write-Host "[3/4] Deploy contract..."
$deployOut = starkli deploy $classHash --rpc $RpcUrl --account $Account --keystore $Keystore
$deployOut | Write-Host

$contractAddress = ($deployOut | Select-String -Pattern "Contract address:\s*(0x[0-9a-fA-F]+)").Matches.Groups[1].Value
if (-not $contractAddress) {
  throw "Failed to parse deployed contract address."
}

Write-Host "[4/4] Done"
Write-Host "Set NEXT_PUBLIC_FUNDFLOW_CONTRACT_ADDRESS=$contractAddress"
