# Banking API Gateway

A production-ready banking API gateway built with the MERN stack featuring:

- **OAuth2** — Resource Owner Password, Refresh Token, and Client Credentials flows with JWT
- **REST API** — full banking REST endpoints with Express
- **GraphQL** — Apollo Server v4 with identical functionality
- **Rate Limiting** — per-endpoint tiered limits (auth: 10/15min, transactions: 20/min, general: 100/min)
- **Audit Logging** — every action logged to MongoDB with user, IP, duration, status
- **Role-Based Access** — customer / teller / admin roles with OAuth2 scopes
- **React Dashboard** — accounts, transactions, audit log viewer

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit MONGO_URI, JWT_SECRET if needed
npm install
npm run seed                # creates demo users and accounts
npm run dev                 # starts on :5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start                   # starts on :3000
```

---

## Demo Credentials

| Role     | Email               | Password         |
|----------|---------------------|------------------|
| Admin    | admin@bank.com      | Admin@1234       |
| Customer | john@bank.com       | Customer@1234    |
| Teller   | teller@bank.com     | Teller@1234      |

---

## REST API Reference

### Auth — `/api/auth`

| Method | Endpoint            | Description                        |
|--------|---------------------|------------------------------------|
| POST   | `/register`         | Register new user                  |
| POST   | `/oauth/token`      | Get access + refresh token (OAuth2)|
| POST   | `/revoke`           | Revoke a token                     |
| GET    | `/me`               | Get current user profile           |

#### Get OAuth2 Token

```bash
curl -X POST http://localhost:5000/api/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "username": "john@bank.com",
    "password": "Customer@1234",
    "client_id": "banking_client",
    "client_secret": "banking_client_secret_2024",
    "scope": "accounts:read accounts:write transactions:read transactions:write"
  }'
```

### Accounts — `/api/accounts` *(requires Bearer token)*

| Method | Endpoint              | Scope           | Description             |
|--------|-----------------------|-----------------|-------------------------|
| GET    | `/`                   | accounts:read   | List accounts           |
| POST   | `/`                   | accounts:write  | Create account          |
| GET    | `/:id`                | accounts:read   | Get account details     |
| GET    | `/:id/balance`        | accounts:read   | Get balance             |
| GET    | `/:id/transactions`   | transactions:read | Account transaction history |
| PATCH  | `/:id/status`         | admin/teller    | Freeze / close account  |

### Transactions — `/api/transactions` *(requires Bearer token)*

| Method | Endpoint       | Scope                | Description       |
|--------|----------------|----------------------|-------------------|
| POST   | `/transfer`    | transactions:write   | Transfer funds    |
| POST   | `/deposit`     | transactions:write   | Deposit funds     |
| POST   | `/withdraw`    | transactions:write   | Withdraw funds    |
| GET    | `/`            | transactions:read    | List transactions |
| GET    | `/:id`         | transactions:read    | Get transaction   |

### Audit Logs — `/api/audit-logs` *(admin only)*

| Method | Endpoint  | Description             |
|--------|-----------|-------------------------|
| GET    | `/`       | Paginated audit log list|
| GET    | `/stats`  | 24h stats               |

---

## GraphQL

Playground available at `http://localhost:5000/graphql`

```graphql
# Example: Get accounts
query {
  accounts {
    count
    accounts {
      accountNumber
      type
      balance
      currency
      status
    }
  }
}

# Example: Transfer funds
mutation {
  transfer(fromAccountId: "...", toAccountId: "...", amount: 500, description: "Rent") {
    message
    transaction { referenceId status amount }
  }
}
```

Set the header: `Authorization: Bearer <access_token>`

---

## Architecture

```
banking-gateway/
├── backend/
│   ├── config/         # DB, logger, seed
│   ├── middleware/      # auth (JWT/OAuth2), rateLimiter, auditLogger, validate
│   ├── models/          # User, Account, Transaction, AuditLog, OAuthToken
│   ├── routes/          # auth, accounts, transactions, audit
│   ├── controllers/     # business logic
│   ├── graphql/         # typeDefs, resolvers (Apollo Server)
│   └── server.js        # Express + Apollo bootstrap
└── frontend/
    └── src/
        ├── api/         # Axios instance with token refresh interceptor
        ├── context/     # AuthContext (login, logout, register)
        ├── components/  # Navbar
        └── pages/       # Login, Register, Dashboard, Accounts, Transactions, AuditLogs
```

## OAuth2 Scopes

| Scope               | Access                             |
|---------------------|------------------------------------|
| `accounts:read`     | View accounts and balances         |
| `accounts:write`    | Create accounts, freeze/close      |
| `transactions:read` | View transaction history           |
| `transactions:write`| Transfer, deposit, withdraw        |
| `admin`             | Audit logs, user management        |

## Rate Limits

| Endpoint Group   | Limit             |
|------------------|-------------------|
| Auth endpoints   | 10 / 15 minutes   |
| Transactions     | 20 / 1 minute     |
| General API      | 100 / 1 minute    |
| Admin endpoints  | 50 / 1 minute     |
