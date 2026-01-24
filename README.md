# Restaurant Management System

A web-based application for managing restaurant orders, menu items, and users.

## Features

- **Authenticated Dashboard**: Separate roles for Admin, Waiter, and Kitchen staff.
- **Order Management**: Create, update, and track orders.
- **Real-time Order Status**: Updates for kitchen and waitstaff.
- **Menu Management**: Admin interface to manage menu items.
- **Responsive Design**: Works on tablets and desktop.

## Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT / Local Auth (bcrypt)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd Restaurant
    ```

2.  Install dependencies:

    **Backend (Root directory):**
    ```bash
    npm install
    ```

    **Frontend (Client directory):**
    ```bash
    cd client
    npm install
    ```

### Running the Application

There are two ways to run the application:

#### 1. Development Mode (For coding)
Run the backend and frontend separately to enable hot-reloading.

**Step 1: Start Backend** (Root directory)
```bash
npm run server
```
- Server/API runs on: `http://localhost:3001`
- Keep this terminal open.

**Step 2: Start Frontend** (Client directory)
Open a new terminal:
```bash
cd client
npm run dev
```
- Client runs on: `http://localhost:5173`
- The client is configured to talk to the backend on port 3001 automatically.

#### 2. Production Mode (For actual usage)
Build the frontend into static files served by the backend.

1.  **Build Frontend:**
    ```bash
    cd client
    npm run build
    cd ..
    ```

2.  **Start Server:**
    ```bash
    npm run server
    ```
    - The entire application (App + API) runs on: `http://localhost:3001`
    - You do NOT need to run `npm run dev` in this mode.

## Environment Variables

Copy `.env.example` to `.env` in both root/server if applicable and configure your settings.

## License

[MIT](LICENSE)
