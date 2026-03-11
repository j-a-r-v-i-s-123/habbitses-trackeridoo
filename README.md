# Habittracker

A habit tracking application built with React, TypeScript, and Node.js.

## Tech Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL

## Project Structure

```
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── package.json     # Root workspace config
└── tsconfig.base.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Run both client and server in dev mode
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server in dev mode |
| `npm run dev:client` | Start only the frontend |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build both client and server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |
