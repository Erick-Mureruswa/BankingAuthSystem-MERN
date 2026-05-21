import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const statusStyle = {
  active:  { bg: 'var(--success-lt)', fg: 'var(--success)' },
  frozen:  { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
  closed:  { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
};

const typeStyle = {
  checking:      { bg: 'var(--navy-lt)',    fg: 'var(--navy)' },
  savings:       { bg: 'var(--success-lt)', fg: 'var(--success)' },
  loan:          { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  fixed_deposit: { bg: 'var(--purple-lt)',  fg: 'var(--purple)' },
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' },
  addBtn: {
    background: 'var(--primary)',
    color: 'var(--surface)',
    border: 'none',
    borderRadius: 'var(--r)',
    padding: '9px 18px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    transition: 'background 0.15s',
  },
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
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    color: 'var(--text)',
    verticalAlign: 'middle',
  },
  mono: { fontFamily: "'Courier New', monospace", fontWeight: 600, letterSpacing: '0.3px' },
  amountCell: { fontWeight: 700, fontSize: 13 },

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
    maxWidth: 380,
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
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
    marginBottom: 4,
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

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'checking', currency: 'USD', initialDeposit: '' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () =>
    api.get('/accounts').then((r) => setAccounts(r.data.accounts)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const createAccount = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/accounts', { ...form, initialDeposit: Number(form.initialDeposit) || 0 });
      setShowModal(false);
      setForm({ type: 'checking', currency: 'USD', initialDeposit: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Accounts</h1>
        <button style={S.addBtn} onClick={() => setShowModal(true)}>+ New Account</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Account Number', 'Type', 'Balance', 'Currency', 'Status', 'Created'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, i) => (
                <tr key={acc._id} style={i === accounts.length - 1 ? { '--last': '1' } : {}}>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}), ...S.mono }}>
                    {acc.accountNumber}
                  </td>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}) }}>
                    <span style={badge(typeStyle[acc.type])}>{acc.type.replace('_', ' ')}</span>
                  </td>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}), ...S.amountCell }}>
                    ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}) }}>
                    {acc.currency}
                  </td>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}) }}>
                    <span style={badge(statusStyle[acc.status])}>{acc.status}</span>
                  </td>
                  <td style={{ ...S.td, ...(i === accounts.length - 1 ? { borderBottom: 'none' } : {}), color: 'var(--text-2)' }}>
                    {new Date(acc.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: 'var(--text-2)', borderBottom: 'none', padding: '2rem' }}>
                    No accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Open New Account</div>
            <div style={S.modalSub}>Fill in the details below</div>
            {error && <div style={S.err}>{error}</div>}
            <form onSubmit={createAccount}>
              <label style={S.label}>Account Type</label>
              <select
                style={S.select}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {['checking', 'savings', 'loan', 'fixed_deposit'].map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
              <label style={S.label}>Currency</label>
              <select
                style={S.select}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                {['USD', 'EUR', 'GBP', 'KES', 'NGN'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <label style={S.label}>Initial Deposit</label>
              <input
                style={S.input}
                type="number"
                min="0"
                step="0.01"
                value={form.initialDeposit}
                onChange={(e) => setForm({ ...form, initialDeposit: e.target.value })}
              />
              <div style={S.modalActions}>
                <button
                  type="button"
                  style={S.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...S.submitBtn, opacity: creating ? 0.7 : 1 }}
                  disabled={creating}
                >
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
