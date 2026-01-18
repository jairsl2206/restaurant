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

2.  Install dependencies for both client and server:
    ```bash
    npm install
    cd client && npm install
    cd ../server && npm install
    ```

### Running the Application

1.  Start the backend server (from the root directory):
    ```bash
    npm run server
    ```
    The server runs on `http://localhost:3001`.

2.  Start the frontend client (from a new terminal in the `client` directory):
    ```bash
    cd client
    npm run dev
    ```
    The client runs on `http://localhost:5173`.

## Environment Variables

Copy `.env.example` to `.env` in both root/server if applicable and configure your settings.

## License

[MIT](LICENSE)
