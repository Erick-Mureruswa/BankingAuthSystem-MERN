export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    createdAt: String!
  }

  type Account {
    id: ID!
    accountNumber: String!
    type: String!
    balance: Float!
    currency: String!
    status: String!
    interestRate: Float
    dailyTransactionLimit: Float
    userId: User
    createdAt: String!
  }

  type Transaction {
    id: ID!
    referenceId: String!
    type: String!
    fromAccount: Account
    toAccount: Account
    amount: Float!
    currency: String!
    status: String!
    description: String
    initiatedBy: User
    completedAt: String
    createdAt: String!
  }

  type AuditLog {
    id: ID!
    action: String!
    resource: String!
    method: String
    endpoint: String
    ipAddress: String
    statusCode: Int
    status: String!
    duration: Int
    userId: User
    createdAt: String!
  }

  type TransactionPage {
    transactions: [Transaction!]!
    total: Int!
    pages: Int!
  }

  type AccountsResult {
    count: Int!
    accounts: [Account!]!
  }

  type AuditStats {
    total24h: Int!
    failures24h: Int!
  }

  type TransferResult {
    message: String!
    transaction: Transaction!
  }

  type Query {
    # Account queries
    accounts: AccountsResult!
    account(id: ID!): Account
    accountBalance(id: ID!): Account

    # Transaction queries
    transactions(
      page: Int
      limit: Int
      type: String
      status: String
      startDate: String
      endDate: String
    ): TransactionPage!
    transaction(id: ID!): Transaction

    # Audit queries (admin only)
    auditLogs(
      page: Int
      limit: Int
      action: String
      resource: String
      status: String
    ): [AuditLog!]!
    auditStats: AuditStats!

    # Auth
    me: User
  }

  type Mutation {
    createAccount(type: String!, currency: String, initialDeposit: Float): Account!

    transfer(fromAccountId: ID!, toAccountId: ID!, amount: Float!, description: String): TransferResult!
    deposit(accountId: ID!, amount: Float!, description: String): TransferResult!
    withdraw(accountId: ID!, amount: Float!, description: String): TransferResult!

    updateAccountStatus(id: ID!, status: String!): Account!
  }
`;
