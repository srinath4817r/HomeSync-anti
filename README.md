# HomeSync

HomeSync is a modern, real-time household coordination platform built with a Liquid Glass design system. It brings together family scheduling, chores, medicine care plans, grocery lists, location sharing, and smart services into a unified interface.

## Features

- **Liquid Glass UI**: Ultra-fluid glassmorphic design system supporting dynamic Light and Dark modes.
- **Single-Sign-On Authentication**: Secure Google OAuth 2.0 with cryptographic HTTP-only session cookies.
- **Family & Role-Based Access Control**: Multi-household management with distinct roles (Admin, Parent, Spouse, Child, Senior, Caregiver, Member).
- **Interactive Calendar**: Day, week, and month views with recurrence engine and schedule synchronization.
- **Task & Chore Engine**: Priority-tagged task delegation with completion tracking.
- **Smart Grocery List**: Categorized shopping items, quantity tracking, and cost estimation.
- **Medicine Reminders & Caregiver Escalation**: Automated schedule alerts and missed-dose escalation.
- **Consent-Based Location Sharing**: Opt-in real-time family location radar with privacy precision control.
- **Nearby Services & Interactive Map**: Live OpenStreetMap search for emergency centers, pharmacies, and grocery stores.
- **Finance, Bills & Document Vault**: Bill due reminders and household inventory tracking.

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Vanilla CSS Design System, Lucide Icons, Leaflet
- **Backend**: Express, TypeScript, SQLite (`better-sqlite3` in WAL mode), Google Auth Library
- **Architecture**: Modular service layer with background reminder schedulers

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```
Add your Google OAuth credentials in `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

## Deployment

HomeSync is preconfigured with `vercel.json` for single-URL routing. In production, the backend serves both the API endpoints (`/api/*`) and the compiled frontend bundle from a single unified URL.
