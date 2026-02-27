# Document Scanning Workforce System

This project consists of three main components:

1.  **backend**: Node.js + Express + MongoDB API.
2.  **admin**: React web admin panel.
3.  **ScanApp**: React Native mobile app for staff.

## Architecture Decisions

-   **Backend (MVC Pattern)**: The backend follows the Model-View-Controller (MVC) pattern.
    -   `models`: Mongoose schemas defining data structure (`Staff`, `ScanEntry`, `Project`).
    -   `controllers`: Business logic (`auth`, `scanEntry`, `project`, `payroll`).
    -   `routes`: API endpoints definition.
    -   `middleware`: Custom middleware for auth and error handling.
    -   `config`: Configuration files (DB connection).

-   **Authentication**:
    -   JWT (JSON Web Tokens) used for stateless authentication.
    -   `authMiddleware` protects routes and verifies user roles (`admin`, `supervisor`, `staff`).

-   **Database**:
    -   MongoDB with Mongoose for schema-based modeling and validation.

-   **Admin Panel**:
    -   Built with React and Vite for performance.
    -   Uses Context API for state management.
    -   Tailwind CSS for styling.
    -   Includes Auth flow.

-   **Mobile App**:
    -   React Native CLI.
    -   **Offline-first**: Uses `react-native-mmkv` to store scan entries locally when offline.
    -   **Sync**: Syncs data to backend when online via `SyncService`.

## Features Implemented

-   **Staff Management**: Register/Login.
-   **Project Management**: Create and assign projects.
-   **Scan Entry**:
    -   Mobile: Enter scans offline, sync later.
    -   Backend: Validates project and stores entry.
-   **Approval Workflow**:
    -   Levels: Supervisor -> Center -> Project -> Finance.
    -   Audit Trail: Tracks who approved and when.
-   **Payroll**:
    -   Calculates payout based on approved scans and project rates.

## Setup Instructions

### Backend
1.  Navigate to `backend` folder.
2.  Run `npm install`.
3.  Create `.env` file (see `.env.example`).
4.  Run `npm run dev` for development.
    -   Port: 5001

### Admin
1.  Navigate to `admin` folder.
2.  Run `npm install`.
3.  Run `npm run dev`.
    -   URL: http://localhost:5173

### ScanApp
1.  Navigate to `ScanApp` folder.
2.  Run `npm install`.
3.  Start Metro Bundler: `npm start` (or with polyfill if on Node 18: `export NODE_OPTIONS='-r ./polyfill.js' && npm start`).
4.  Run on Android: `npm run android`.
5.  Run on iOS: `npm run ios` (Requires CocoaPods).

## API Endpoints

-   `POST /api/auth/register` - Register staff
-   `POST /api/auth/login` - Login
-   `POST /api/scan-entry` - Create scan entry
-   `GET /api/scan-entry/my-entries` - Get staff entries
-   `PUT /api/scan-entry/:id/verify` - Supervisor verify
-   `GET /api/payroll` - Get payroll report (Admin)
