import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const acctType = {
  checking:      { bg: 'var(--navy-lt)',    fg: 'var(--navy)' },
  savings:       { bg: 'var(--success-lt)', fg: 'var(--success)' },
  loan:          { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  fixed_deposit: { bg: 'var(--purple-lt)',  fg: 'var(--purple)' },
};

const txStatus = {
  completed: { bg: 'var(--success-lt)', fg: 'var(--success)' },
  failed:    { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  pending:   { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
  reversed:  { bg: 'var(--surface-2)', fg: 'var(--text-2)' },
};

const badge = ({ bg = 'var(--surface-2)', fg = 'var(--text-2)' } = {}) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.2px',
  background: bg,
  color: fg,
  whiteSpace: 'nowrap',
});

const S = {
  page: { padding: '2.25rem 2rem', maxWidth: 1100, margin: '0 auto' },

  pageHeader: { marginBottom: 32 },
  greeting: { fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 8 },
  summaryLine: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  balance: { fontSize: 26, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.5px' },
  summaryLabel: { fontSize: 13, color: 'var(--text-2)' },
  dot: { color: 'var(--border)', fontSize: 16, lineHeight: 1 },
  meta: { fontSize: 13, color: 'var(--text-2)' },

  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },

  section: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  sectionHead: {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  viewAll: { color: 'var(--primary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 18px',
    borderBottom: '1px solid var(--border)',
  },
  rowLabel: { fontWeight: 600, fontSize: 13, color: 'var(--text)', fontFamily: "'Courier New', monospace" },
  rowSub: { fontSize: 12, color: 'var(--text-2)', marginTop: 1, textTransform: 'capitalize' },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  amount: { fontWeight: 700, fontSize: 13, color: 'var(--text)' },

  empty: { padding: '24px 18px', textAlign: 'center', color: 'var(--text-2)', fontSize: 13 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/accounts'), api.get('/transactions?limit=6')])
      .then(([acRes, txRes]) => {
        setAccounts(acRes.data.accounts);
        setTxns(txRes.data.transactions);
      })
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0];
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <h1 style={S.greeting}>Good day, {firstName}</h1>
        {!loading && (
          <div style={S.summaryLine}>
            <span style={S.balance}>
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={S.summaryLabel}>total balance</span>
            <span style={S.dot}>·</span>
            <span style={S.meta}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </span>
            <span style={S.dot}>·</span>
            <span style={{ ...S.meta, textTransform: 'capitalize' }}>{user?.role}</span>
          </div>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={S.twoCol}>
          <div style={S.section}>
            <div style={S.sectionHead}>
              <span style={S.sectionTitle}>Your Accounts</span>
              <Link to="/accounts" style={S.viewAll}>View all →</Link>
            </div>
            {accounts.length === 0 && (
              <div style={S.empty}>No accounts yet.</div>
            )}
            {accounts.slice(0, 5).map((acc, i) => (
              <div
                key={acc._id}
                style={{ ...S.row, ...(i === accounts.slice(0, 5).length - 1 ? { borderBottom: 'none' } : {}) }}
              >
                <div>
                  <div style={S.rowLabel}>{acc.accountNumber}</div>
                  <div style={S.rowSub}>{acc.type.replace('_', ' ')}</div>
                </div>
                <div style={S.rowRight}>
                  <span style={S.amount}>
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span style={badge(acctType[acc.type])}>{acc.type.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={S.section}>
            <div style={S.sectionHead}>
              <span style={S.sectionTitle}>Recent Transactions</span>
              <Link to="/transactions" style={S.viewAll}>View all →</Link>
            </div>
            {txns.length === 0 && (
              <div style={S.empty}>No transactions yet.</div>
            )}
            {txns.map((tx, i) => (
              <div
                key={tx._id}
                style={{ ...S.row, ...(i === txns.length - 1 ? { borderBottom: 'none' } : {}) }}
              >
                <div>
                  <div style={{ ...S.rowLabel, fontFamily: 'inherit', textTransform: 'capitalize' }}>
                    {tx.type}
                  </div>
                  <div style={S.rowSub}>{tx.description || tx.referenceId}</div>
                </div>
                <div style={S.rowRight}>
                  <span style={S.amount}>${tx.amount.toLocaleString()}</span>
                  <span style={badge(txStatus[tx.status])}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
