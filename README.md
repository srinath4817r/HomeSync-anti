# HomeSync-anti 🏠✨

> **Next-Generation Household Coordination & Family Intelligence Platform**

HomeSync is an all-in-one real-time household operations operating system engineered for modern families, roommates, and care circles. Built with a fluid design system, 3D visual interaction, and intelligent automation, HomeSync eliminates household friction across chores, schedules, medicine routines, groceries, location awareness, and finances.

---

## 🌟 Key Highlights & Features

### 🏡 3D Living Home Stage
- **Interactive Isometric Viewport**: Powered by Three.js with realistic lighting, shadows, and camera orbit controls.
- **Dynamic Family Avatars**: Visualizes household members (Parents, Spouses, Children, Seniors, Caregivers) present in the home with customizable appearances.
- **Status & Activity Indicators**: Real-time visual presence and quick member status inspections.

### 📅 Smart Calendar & Day Timeline
- **Period Breakdown**: Morning, Afternoon, Evening, and Night timeline sections for intuitive daily planning.
- **Recurrence Engine**: Supports recurring household obligations, school schedules, and appointments.
- **Synchronized Family Views**: Filter calendar by family member or household role.

### 🤖 Intelligent Household AI Assistant
- **Gemini-Powered Intelligence**: Natural language assistant to draft chore schedules, answer household questions, and coordinate tasks.
- **Voice Input Ready**: Quick voice-to-text mic integration for instant hands-free input.
- **Context-Aware Suggestions**: Recommends smart actions based on active family events and chores.

### 💊 Medicine Care Plans & Escalation
- **Dosage Reminders**: Automated reminders for routine prescriptions and care regimens.
- **Caregiver Alert Protocol**: Missed dose tracking with automated alerts to family caregivers.
- **Health Logs**: Centralized care notes accessible to authorized guardians and family members.

### 🛒 Smart Grocery & Inventory Hub
- **Categorized Shopping Lists**: Group items by Produce, Dairy, Pantry, Home Supplies, and more.
- **Quantity Tracking & Cost Estimates**: Real-time calculation of estimated shopping expenses.
- **One-Tap Fulfillment**: Real-time cross-off and family-wide sync when shopping.

### 📍 Consent-Based Family Radar & Nearby Services
- **Privacy-First Location Radar**: Opt-in location sharing with configurable precision levels.
- **Interactive OpenStreetMap**: Live maps with real-time POI search for emergency rooms, 24/7 pharmacies, and supermarkets.
- **Safe Zones & Check-Ins**: Quick status pings for peace of mind.

### 💳 Finance, Bills & Document Vault
- **Shared Bills Tracker**: Due-date alerts, split calculations, and payment status tracking.
- **Household Document Storage**: Secure storage for leases, insurance policies, warranties, and emergency contacts.
- **Home Inventory**: Keep track of household appliances, serial numbers, and maintenance schedules.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Three.js, Lucide Icons, Leaflet |
| **Backend** | Express 4, TypeScript, `better-sqlite3` (WAL mode enabled) |
| **Authentication** | Google OAuth 2.0 / OpenID Connect & Secure Dev SSO |
| **Security** | HTTP-Only Cookies, Cryptographic Session Signatures, Strict RBAC |
| **Styling** | Modern CSS Design System with Light/Dark Themes & Fluid Animations |

---

## 🔐 Privacy & Security Best Practices

- **Zero Secret Commits**: Sensitive secrets, local databases, and private credentials are excluded via `.gitignore`.
- **Environment Isolation**: All configuration options are strictly read from `.env` with a sanitized template provided in `.env.example`.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin, Parent, Spouse, Child, Senior, Caregiver, and Member roles.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (Node 20+ recommended)
- **npm** or **pnpm**

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/srinath4817r/HomeSync-anti.git
cd HomeSync-anti
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Open `.env` in your editor and configure your environment variables (e.g. Google OAuth Client ID/Secret, Session secrets, Port).

### 4. Running the Development Server
Run the frontend and backend concurrently:
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:3001`

### 5. Running Tests
Execute the comprehensive test suite:
```bash
npm test
```

### 6. Production Build
Compile client and bundle server:
```bash
npm run build
npm start
```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
