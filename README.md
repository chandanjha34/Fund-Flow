# Fund Flow

Fund Flow is a Starknet-native social finance app for group fundraising, prediction markets, and lightweight DeFi on Sepolia. Circles are funded with testnet STRK, wallet flows use StarkZap and Cartridge for gasless onboarding, and members can place predictions or stake into DeFi pools without leaving the app.

---

## Features

- Starknet Circles: Create private or public circles, invite members by code or QR, and track shared funding goals.
- Gasless Wallet UX: Connect through Cartridge-backed StarkZap flows with sponsored transaction support.
- Prediction Markets: Launch circle-specific polls, place STRK-backed predictions, and resolve outcomes in-app.
- DeFi Module: Stake STRK from the circle experience with StarkZap pool integrations.
- Firebase Persistence: Store circle and proposal metadata in Firebase while using Starknet for transfers and wallet actions.
- Sepolia Ready: Built around testnet STRK, Voyager links, and faucet-friendly onboarding.

---

## Platform Architecture

- **Frontend:** Next.js + React
- **Wallet / Chain SDK:** StarkZap + Cartridge Controller
- **Network:** Starknet Sepolia
- **Persistence:** Firebase Realtime Database
- **DeFi:** StarkZap staking and token transfer flows
- **UI:** shadcn/ui components with Next.js App Router

---

## Getting Started

### Prerequisites

- Node.js and npm
- A Starknet-compatible browser wallet or Cartridge-enabled login flow
- Sepolia STRK for manual runtime testing
- Firebase project credentials if you want to persist circles outside local storage


## Installation

Clone the repository:
```bash
git clone https://github.com/Hrishikesh332/FundFlow.git
cd fund-flow
```

Install dependencies (for client):
```bash
npm install
```

## Usage

Start the frontend:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Open the app, connect a Starknet wallet, fund it from the Sepolia faucet if needed, and test circle creation, joining, predictions, and staking flows.


## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting issues and pull requests[web:38][web:50].

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you have questions or need help, open an issue in this repository or contact the maintainer at x.com/fundflow_xyz.

## Maintainers
- Hrishikesh (@Hrishikesh332)
- Sarthi (@SarthiBorkar)
