# Catch Up - Flutter App

Web3 Dating App powered by Bae4U Protocol. Built on Base.

## Features

- **Smart Matchmaking** - 18-dimensional personality vectors
- **Earn While You Date** - Profile-as-asset model
- **Fantasy Bae League** - Collect cards & tournaments
- **Real-Time Chat** - Lightning-fast messaging
- **Daily PCASH Bonus** - Free tokens every 4 hours
- **Zero Web3 Hassle** - Invisible blockchain UX

## Backend Connection

Connected to Railway backend:
```
https://baebackend-production.up.railway.app
```

## Getting Started

### Prerequisites

- Flutter SDK 3.0+
- Dart SDK 3.0+
- Android Studio / Xcode (for mobile)

### Installation

1. Clone the repository
2. Navigate to project directory
3. Install dependencies:
   ```bash
   flutter pub get
   ```

4. Generate code (freezed, json_serializable):
   ```bash
   flutter pub run build_runner build --delete-conflicting-outputs
   ```

5. Run the app:
   ```bash
   flutter run
   ```

### Build for Production

**Android:**
```bash
flutter build apk --release
flutter build appbundle --release
```

**iOS:**
```bash
flutter build ios --release
```

**Web:**
```bash
flutter build web --release
```

## Project Structure

```
lib/
├── main.dart              # App entry point
├── models/                # Data models (freezed)
│   ├── auth_models.dart
│   ├── user_models.dart
│   └── pet_models.dart
├── services/              # API & business logic
│   └── api_service.dart   # Railway backend integration
├── providers/             # Riverpod state management
│   └── auth_provider.dart
├── screens/               # UI screens
│   └── landing_screen.dart
└── widgets/               # Reusable widgets
    ├── animated_background.dart
    ├── glass_card.dart
    ├── swipe_card_stack.dart
    └── wallet_modal.dart
```

## API Integration

The app connects to your Railway backend with the following endpoints:

### Auth
- `GET /auth/nonce/:wallet` - Get SIWE nonce
- `POST /auth/siwe` - Verify signature & get JWT

### Users
- `GET /users/me` - Get current user
- `POST /users/me/push-token` - Register push token

### Matches
- `GET /matches/discover` - Get swipe candidates
- `POST /matches/like` - Like a user
- `POST /matches/pass` - Pass on a user

### Pets
- `GET /pets` - Browse pets with pagination
- `GET /pets/:tokenId` - Get pet details
- `GET /pets/portfolio/:wallet` - Get owned pets

### Heroes & Tournaments
- `GET /heroes/leaderboard` - Hero rankings
- `GET /heroes/me` - Current user's hero stats
- `GET /bonus` - Claim daily PCASH

## Web3 Integration

Wallet connection options:
- Quick Start (in-app wallet)
- MetaMask
- Coinbase Wallet
- WalletConnect
- Coinbase CDP (MPC)

## Design System

**Colors:**
- Brand Purple: `#7B2FE8`
- Brand Pink: `#E94B9C`
- Background: `#1A0B2E`

**Typography:**
- Display: Fredoka
- Body: Inter

## Troubleshooting

### Build issues with freezed
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### iOS signing issues
Open Xcode and configure signing in Runner > Signing & Capabilities

## License

© 2026 Catch Up · Built on Base · Powered by Bae4U Protocol
