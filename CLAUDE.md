# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
```bash
npm run server          # Start Express backend (port 3001, TZ=America/Mexico_City)
npm run server:clean    # Start backend with a clean database
npm run client          # Start Vite frontend dev server
```

**Testing:**
```bash
npm test                # Run all Jest tests (server + client)
npm run test:watch      # Run Jest in watch mode
npm run test:coverage   # Run with coverage report
```

Tests are split into two projects by `jest.config.js`:
- Server tests: `server/__tests__/**/*.test.js` (Node environment)
- Client tests: `client/__tests__/**/*.test.js` (jsdom environment)

**Frontend-only:**
```bash
cd client && npm run lint     # ESLint
cd client && npm run build    # Production build to client/dist/
```

## Architecture

This is a restaurant POS system. The backend follows **Clean Architecture** alongside a legacy API layer ("Strangler Fig" migration pattern):

- `GET/POST /api/*` — Legacy routes (`server/routes.js`, `server/db.js`)
- `GET/POST /api/v2/*` — Clean Architecture routes (`server/src/`)

**Backend layers** (`server/src/`):
1. `domain/` — Entities (`Order`, `OrderItem`), value objects (`OrderStatus`, `UserRole`, `Money`), repository interfaces
2. `use-cases/orders/` — Application logic (CreateOrder, GetOrder, UpdateOrderStatus, etc.)
3. `infrastructure/database/repositories/` — SQLite implementations of repository interfaces
4. `interface-adapters/` — Express controllers and error-handling middleware
5. `frameworks/` — Express app setup, routes, and DI container (`frameworks/di/container.js`)

**Frontend** (`client/src/`):
- `App.jsx` — Main router and JWT session management
- `Dashboard.jsx` — Primary staff interface (order management + cooking view)
- `components/AdminDashboard.jsx` — Admin panel (menu, users, settings, reports)
- `config.js` — Exports `API_BASE_URL`
- `constants.js` — Shared `ORDER_STATUS` and `ORDER_TYPE` enums

**Authentication:** JWT-based with three roles: `admin`, `mesero` (waiter), `cocinero` (cook). Default credentials are in `README.md`. The server **requires** `JWT_SECRET` to be set in `.env` — it will exit on startup if missing. See `.env.example` for all required variables including `ALLOWED_ORIGINS`.

**Client auth pattern:** All protected API calls use `authHeaders()` from `client/src/utils/api.js`, which injects `Authorization: Bearer <token>` from `localStorage`. Public routes (menu, categories, settings GET) do not require auth.

**Database:** Single SQLite file at `server/restaurant.db`. Schema and legacy CRUD live in `server/db.js`.

**WhatsApp integration:** `server/whatsappService.js` uses `whatsapp-web.js`; requires scanning a QR code on first run.

## Key conventions

- New business logic belongs in `server/src/` following Clean Architecture (use cases → repositories → domain entities). Avoid adding to the legacy `routes.js`.
- The DI container (`frameworks/di/container.js`) wires dependencies; register new use cases and repositories there.
- Frontend API calls use the `API_BASE_URL` from `client/src/config.js` — do not hardcode URLs.
- Styles are plain CSS with a glassmorphism theme; there is no CSS framework.
