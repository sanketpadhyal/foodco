<p align="center">
  <img src="assets/logo.png" alt="Foodco Logo" width="108" />
</p>

<h1 align="center">Foodco</h1>

<p align="center">
  A cross-platform mobile intelligence and barcode scanning application engineered to provide instant nutritional breakdowns, NOVA food classification, additive risk detection, cosmetic formulation analysis, and AI health ratings for mart groceries and personal care items.
</p>

<p align="center">
  <a href="https://github.com/sanketpadhyal/foodco">GitHub Repository</a>
  |
  <a href="https://www.sanketpadhyal.in">Developer Website</a>
</p>

<p align="center">
  <a href="https://expo.dev">
    <img src="https://img.shields.io/badge/Expo-SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK" />
  </a>
  <a href="https://reactnative.dev">
    <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </a>
  <a href="https://firebase.google.com">
    <img src="https://img.shields.io/badge/Firebase-Auth_&_Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  </a>
  <a href="https://github.com/sanketpadhyal/foodco">
    <img src="https://img.shields.io/badge/Repository-Open_Source-E8502A?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository" />
  </a>
</p>

## Overview

Foodco is a mobile application built with React Native and Expo that eliminates confusion around grocery ingredients and cosmetic product safety. By scanning any standard product barcode or exploring curated product categories, users receive comprehensive dietary and chemical assessments.

The application evaluates food items across international standards including Nutri-Score (grades A through E), NOVA ultra-processed food classification (groups 1 to 4), macro-nutrient concentrations per 100g, palm oil presence, and harmful E-number food additives. For beauty and skincare items, Foodco parses formulation lists to detect active compounds (such as Hyaluronic Acid, Niacinamide, and Ceramides) while alerting users to endocrine disruptors, parabens, harsh sulfates, and synthetic fragrances.

Foodco combines an offline-first curated knowledge base with real-time multi-source fallback integrations (Foodco REST API, OpenFoodFacts, and OpenBeautyFacts) to deliver instant scan results.

> [!IMPORTANT]
> **Open Source Project**
> The **React Native mobile client, barcode scanning engine, ingredient parser, and UI design system** are open source.
> Explore the source code or contribute directly at [sanketpadhyal/foodco](https://github.com/sanketpadhyal/foodco).

> [!NOTE]
> **Multi-Source Product Resolution**
> Foodco resolves product queries through a cascading resolution engine: local curated registry -> authenticated Foodco backend API -> OpenFoodFacts global database -> OpenBeautyFacts database -> algorithmic formulation estimation.

## Product Links

| Product Surface | Link |
| --- | --- |
| GitHub Repository | [sanketpadhyal/foodco](https://github.com/sanketpadhyal/foodco) |
| Developer Portfolio | [sanketpadhyal.in](https://www.sanketpadhyal.in) |
| Expo Platform | [expo.dev](https://expo.dev) |

## What Happens During Barcode & Product Analysis

1. User points the device camera at any mart product barcode or inputs a search query.
2. The scanner captures the barcode via hardware-accelerated camera frames using `expo-camera`.
3. The application checks the high-speed local curated registry for instant cache hits.
4. If not found locally, an authenticated request is dispatched to the Foodco REST API using JWT credentials.
5. In the event of an API miss, fallback queries execute against OpenFoodFacts (for grocery) and OpenBeautyFacts (for cosmetics).
6. The ingredient parsing engine detects harmful additives, E-numbers, preservatives, and allergens.
7. The NOVA classification algorithm identifies whether the food is unprocessed, culinary, processed, or ultra-processed.
8. The formulation engine calculates an AI Health Rating (0 to 100) based on nutritional ratios, saturated fats, sugars, and chemical additives.
9. For cosmetics, the beauty analyzer evaluates active ingredients, emollient ratios, parabens, sulfates, and silicone presence.
10. The interactive Product Detail panel renders dynamic macro charts, safety score badges, and ingredient risk breakdowns.

## Key Features

### Mobile Experience & Dashboard

- **Animated Interface**: Smooth screen transitions and spring-based interactions built with React Native's Animated API.
- **Hardware-Accelerated Barcode Scanner**: Fast camera scanning interface supporting flash toggle, manual code entry, and permission handling.
- **Dynamic Category Explorer**: Browse curated product inventories across Beauty, Food, Cold Drinks, Chocolates, Biscuits, and Fragrances.
- **Search & Filter Engine**: Search across local and remote inventories with real-time query matching and deduplication.
- **Universal Modal System**: Bottom-sheet panel architecture (`UniversalPanel`) for smooth confirmation dialogs, profile management, and alerts.

### Product Intelligence & Health Analysis Engine

- **Nutri-Score Rating**: Standardized A-to-E nutritional rating calculation based on energy density, sugars, saturated fatty acids, and sodium.
- **NOVA Group Classification**: Level 1 to 4 categorization identifying ultra-processed food formulations.
- **Harmful Additive & Chemical Detection**: Automatic detection and flagging of artificial food colorings, preservatives, palm oil, and carcinogenic E-numbers.
- **Beauty Formulation Profiling**: Specialized cosmetic analyzer checking for sulfates (SLS/SLES), parabens, silicones, synthetic fragrances, and biomimetic actives.
- **Nutritional Macro Breakdown**: Full nutritional metrics per 100g, including calories, carbohydrates, free sugars, fat, saturated fat, protein, dietary fiber, and salt.

### Authentication & Session Security

- **Google Sign-In**: Native Google OAuth integration via `@react-native-google-signin/google-signin` and Firebase Authentication.
- **Email OTP Flow**: Secure one-time passcode verification system backed by the Foodco authentication API.
- **JWT Session Synchronization**: Token verification and automatic expiration detection with session recovery dialogs.
- **Encrypted Local Storage**: Persistent user session state managed via `@react-native-async-storage/async-storage`.

## Project Structure

| Directory | Description |
| --- | --- |
| `src/landing page/` | App landing screen, intro animations, feature showcases, and about modal |
| `src/auth-page/` | Authentication screens, Google Sign-In, Email OTP verification, and auth service |
| `src/DASHBOARD/` | Main dashboard, search bar, category cards, barcode scanner, and product services |
| `src/product-detail/` | Deep-dive product specification modal, macro breakdowns, and safety insights |
| `src/components/` | Reusable UI components including the universal modal panel |
| `src/splash-screen/` | Initial animated application splash screen and loader |
| `assets/` | Static application assets, icons, product mockups, and illustrations |
| `logo-formats/` | Multi-resolution platform icons for Android and iOS targets |
| `android/` | Android native project configuration and Gradle build files |

## Main Files

### Application Core & Root

| File | Purpose |
| --- | --- |
| `App.tsx` | Main application coordinator managing screen transitions, session hydration, and navigation lifecycle |
| `index.ts` | Application entry point registered with Expo |
| `app.json` | Expo configuration including bundle identifiers, splash screen parameters, and permissions |
| `tsconfig.json` | TypeScript compiler configuration and strict type-checking rules |

### Screens & Modules (`src/`)

| File | Purpose |
| --- | --- |
| `src/landing page/landingpage.tsx` | Entry landing screen with animated cards and get-started triggers |
| `src/auth-page/authPage.tsx` | Authentication UI supporting Google OAuth and Email OTP input |
| `src/auth-page/authService.ts` | Auth API service, token validation, session storage, and JWT handlers |
| `src/DASHBOARD/dashboard.tsx` | Main user dashboard containing category grids, search bar, and hero banners |
| `src/DASHBOARD/BarcodeScannerPage.tsx` | Fullscreen camera barcode scanner with continuous capture and manual input |
| `src/DASHBOARD/CategoryProductsPage.tsx` | Category product catalogue with live search and filtering |
| `src/DASHBOARD/SearchResultsPage.tsx` | Dedicated search results view with multi-source product aggregation |
| `src/DASHBOARD/productService.ts` | Multi-tier product resolution engine, Nutri-Score calculation, and beauty ingredient parsing |
| `src/product-detail/ProductDetailPage.tsx` | Complete product modal detailing macros, NOVA scores, additives, and safety verdicts |
| `src/components/universalpanel.tsx` | Modal sheet component handling dialogs, session timeouts, and confirmations |

## Tech Stack

| Component | Technology |
| --- | --- |
| Framework | React Native 0.86, Expo SDK 57 |
| Language | TypeScript 6.0 |
| Navigation & State | React Hooks, React Native Animated API, Safe Area Context |
| Camera & Scanning | Expo Camera (`expo-camera`), Expo Barcode Scanner |
| Authentication | Firebase Auth (`@react-native-firebase/auth`), Google Sign-In |
| Storage | React Native Async Storage (`@react-native-async-storage/async-storage`) |
| UI & Icons | Expo Vector Icons (Ionicons, Feather, AntDesign), Expo Linear Gradient |
| Media & Video | Expo Video (`expo-video`), Expo Web Browser, Expo Splash Screen |
| Data Sources | Foodco REST API, OpenFoodFacts API, OpenBeautyFacts API |

## Environment Variables & Configuration

The application uses environment-specific endpoints configured across services. For local development or custom backend integration, review the configuration parameters below:

### Configuration Reference

```env
# Foodco API Base URL
BACKEND_BASE_URL=https://foodco.heymimi.app/api

# Google OAuth Web Client ID (Configured in authPage.tsx)
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### Firebase Native Configuration

For native Android builds, ensure the Google Services configuration file is present:
- `android/app/google-services.json`
- `google-services.json` (Project root)

> [!WARNING]
> Do not commit private API secrets or production keystore credentials to public version control. Keep native release signing keys in your secure local configuration or CI/CD environment.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or bun
- Android Studio with Android SDK (for Android emulation) or physical Android/iOS test device
- Expo Go application or Expo development build

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Type Checking & Validation

```bash
npm run test
```

### Step 3: Start Development Server

Start the Expo bundler:

```bash
npm run start
```

Press `a` in the terminal to open on an Android emulator, `i` for iOS simulator, or scan the displayed QR code with the Expo Go app on a physical device.

### Step 4: Run Native Development Builds

To run directly on a connected Android device or emulator with native modules:

```bash
npm run android
```

To run on iOS:

```bash
npm run ios
```

## Security & Privacy

- Authentication tokens (JWT) and user sessions are stored securely in device storage using `AsyncStorage`.
- Camera permissions are requested on-demand only when opening the barcode scanner interface.
- Session validity checks execute automatically on app resumption to verify token status against the authentication service.
- Third-party barcode queries are sanitized and dispatched through secure HTTPS channels.

## Developed By

Developed by **Sanket Padhyal**.

- **Website**: [www.sanketpadhyal.in](https://www.sanketpadhyal.in)
- **GitHub**: [@sanketpadhyal](https://github.com/sanketpadhyal)
- **Repository**: [sanketpadhyal/foodco](https://github.com/sanketpadhyal/foodco)
