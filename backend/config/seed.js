import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Account from '../models/Account.js';

await mongoose.connect(process.env.MONGO_URI);

await User.deleteMany({});
await Account.deleteMany({});

const admin = await User.create({
  name: 'Admin User',
  email: 'admin@bank.com',
  password: 'Admin@1234',
  role: 'admin',
  phone: '+1-555-0100',
});

const customer = await User.create({
  name: 'John Doe',
  email: 'john@bank.com',
  password: 'Customer@1234',
  role: 'customer',
  phone: '+1-555-0101',
});

const teller = await User.create({
  name: 'Jane Teller',
  email: 'teller@bank.com',
  password: 'Teller@1234',
  role: 'teller',
  phone: '+1-555-0102',
});

const checking = await Account.create({
  accountNumber: Account.generateAccountNumber(),
  userId: customer._id,
  type: 'checking',
  balance: 5000,
  currency: 'USD',
});

const savings = await Account.create({
  accountNumber: Account.generateAccountNumber(),
  userId: customer._id,
  type: 'savings',
  balance: 12000,
  currency: 'USD',
  interestRate: 2.5,
});

console.log('Seed complete:');
console.log('  Admin:    admin@bank.com / Admin@1234');
console.log('  Customer: john@bank.com  / Customer@1234');
console.log('  Teller:   teller@bank.com / Teller@1234');
console.log(`  Checking account: ${checking.accountNumber}`);
console.log(`  Savings account:  ${savings.accountNumber}`);

await mongoose.disconnect();
