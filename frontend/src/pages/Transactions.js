import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const txStatusStyle = {
  completed: { bg: 'var(--success-lt)', fg: 'var(--success)' },
  failed:    { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  pending:   { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
  reversed:  { bg: 'var(--surface-2)', fg: 'var(--text-2)' },
};

const txTypeStyle = {
  transfer:   { bg: 'var(--navy-lt)',    fg: 'var(--navy)' },
  deposit:    { bg: 'var(--success-lt)', fg: 'var(--success)' },
  withdrawal: { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  payment:    { bg: 'var(--purple-lt)',  fg: 'var(--purple)' },
  fee:        { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
};

const typeIcon = { transfer: '↔', deposit: '↓', withdrawal: '↑', payment: '→', fee: '$' };

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' },
  actionGroup: {
    display: 'flex',
    gap: 6,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    padding: 4,
  },
  actionBtn: (active) => ({
    padding: '6px 14px',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'var(--surface)' : 'var(--text-2)',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s',
  }),

  tableWrap: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    background: 'var(--surface-2)',
    borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    color: 'var(--text)',
    verticalAlign: 'middle',
  },
  mono: { fontFamily: "'Courier New', monospace", fontSize: 12, letterSpacing: '0.2px' },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'oklch(0% 0 0 / 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1.5rem',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: 400,
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4, textTransform: 'capitalize' },
  modalSub: { color: 'var(--text-2)', fontSize: 13, marginBottom: 20 },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 5,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--surface)',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--surface)',
  },
  err: {
    background: 'var(--danger-lt)',
    border: '1px solid var(--danger-bd)',
    color: 'var(--danger)',
    padding: '10px 12px',
    borderRadius: 'var(--r)',
    fontSize: 13,
    marginTop: 12,
  },
  suc: {
    background: 'var(--success-lt)',
    border: '1px solid oklch(86% 0.07 148)',
    color: 'var(--success)',
    padding: '10px 12px',
    borderRadius: 'var(--r)',
    fontSize: 13,
    marginTop: 12,
  },
  modalActions: { display: 'flex', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--text)',
  },
  submitBtn: {
    flex: 1,
    padding: '10px',
    background: 'var(--primary)',
    color: 'var(--surface)',
    border: 'none',
    borderRadius: 'var(--r)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
  },
};

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', accountId: '', amount: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([api.get('/transactions?limit=30'), api.get('/accounts')])
      .then(([txRes, acRes]) => { setTxns(txRes.data.transactions); setAccounts(acRes.data.accounts); })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const set = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const openModal = (type) => {
    setModal(type);
    setError('');
    setSuccess('');
    setForm({ fromAccountId: '', toAccountId: '', accountId: '', amount: '', description: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = { amount: Number(form.amount), description: form.description };
      if (modal === 'transfer') {
        await api.post('/transactions/transfer', { ...payload, fromAccountId: form.fromAccountId, toAccountId: form.toAccountId });
      } else if (modal === 'deposit') {
        await api.post('/transactions/deposit', { ...payload, accountId: form.accountId });
      } else {
        await api.post('/transactions/withdraw', { ...payload, accountId: form.accountId });
      }
      setSuccess('Transaction completed.');
      setTimeout(() => { setModal(null); load(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const lastIdx = txns.length - 1;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Transactions</h1>
        <div style={S.actionGroup}>
          {['transfer', 'deposit', 'withdraw'].map((t) => (
            <button key={t} style={S.actionBtn(modal === t)} onClick={() => openModal(t)}>
              {typeIcon[t] || ''} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Reference', 'Type', 'Amount', 'From', 'To', 'Status', 'Date'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((tx, i) => {
                const last = { borderBottom: 'none' };
                const tdBase = { ...S.td, ...(i === lastIdx ? last : {}) };
                return (
                  <tr key={tx._id}>
                    <td style={{ ...tdBase, ...S.mono }}>{tx.referenceId?.slice(0, 12)}…</td>
                    <td style={tdBase}>
                      <span style={badge(txTypeStyle[tx.type])}>
                        {typeIcon[tx.type]} {tx.type}
                      </span>
                    </td>
                    <td style={{ ...tdBase, fontWeight: 700 }}>
                      ${tx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...tdBase, ...S.mono }}>{tx.fromAccount?.accountNumber || '—'}</td>
                    <td style={{ ...tdBase, ...S.mono }}>{tx.toAccount?.accountNumber || '—'}</td>
                    <td style={tdBase}>
                      <span style={badge(txStatusStyle[tx.status])}>{tx.status}</span>
                    </td>
                    <td style={{ ...tdBase, color: 'var(--text-2)', fontSize: 12 }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {txns.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: 'center', color: 'var(--text-2)', borderBottom: 'none', padding: '2rem' }}>
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{modal}</div>
            <div style={S.modalSub}>Fill in the details below</div>
            <form onSubmit={submit}>
              {modal === 'transfer' ? (
                <>
                  <label style={S.label}>From Account</label>
                  <select style={S.select} value={form.fromAccountId} onChange={set('fromAccountId')} required>
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.accountNumber} — ${a.balance.toFixed(2)} {a.currency}
                      </option>
                    ))}
                  </select>
                  <label style={S.label}>To Account ID</label>
                  <input style={S.input} placeholder="Destination account ID" value={form.toAccountId} onChange={set('toAccountId')} required />
                </>
              ) : (
                <>
                  <label style={S.label}>Account</label>
                  <select style={S.select} value={form.accountId} onChange={set('accountId')} required>
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.accountNumber} — ${a.balance.toFixed(2)} {a.currency}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <label style={S.label}>Amount</label>
              <input style={S.input} type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} required />
              <label style={S.label}>Description (optional)</label>
              <input style={S.input} value={form.description} onChange={set('description')} />
              {error && <div style={S.err}>{error}</div>}
              {success && <div style={S.suc}>{success}</div>}
              <div style={S.modalActions}>
                <button type="button" style={S.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
                <button
                  type="submit"
                  style={{ ...S.submitBtn, opacity: submitting ? 0.7 : 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Processing…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
