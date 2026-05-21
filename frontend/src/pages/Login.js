import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '2rem',
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--primary)',
    letterSpacing: '-0.4px',
    marginBottom: 36,
    textAlign: 'center',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: '2.25rem 2.5rem',
    width: '100%',
    maxWidth: 380,
    boxShadow: 'var(--shadow)',
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 4,
  },
  sub: {
    color: 'var(--text-2)',
    fontSize: 13,
    marginBottom: 28,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 14,
    color: 'var(--text)',
    background: 'var(--surface)',
    marginBottom: 16,
    transition: 'border-color 0.15s',
  },
  btn: {
    width: '100%',
    padding: '11px',
    background: 'var(--primary)',
    color: 'var(--surface)',
    border: 'none',
    borderRadius: 'var(--r)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginTop: 4,
  },
  err: {
    background: 'var(--danger-lt)',
    border: '1px solid var(--danger-bd)',
    color: 'var(--danger)',
    padding: '10px 12px',
    borderRadius: 'var(--r)',
    fontSize: 13,
    marginBottom: 16,
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: 'var(--text-2)',
  },
  a: {
    color: 'var(--primary)',
    fontWeight: 600,
    textDecoration: 'none',
  },
  demo: {
    marginTop: 28,
    padding: '10px 12px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 12,
    color: 'var(--text-2)',
    textAlign: 'center',
    lineHeight: 1.6,
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error_description || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.brand}>BankGateway</div>
      <div style={S.card}>
        <h1 style={S.title}>Sign in</h1>
        <p style={S.sub}>Enter your credentials to continue</p>
        {error && <div style={S.err}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>Email address</label>
          <input
            style={S.input}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoFocus
          />
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p style={S.footer}>
          No account? <Link to="/register" style={S.a}>Register</Link>
        </p>
        <div style={S.demo}>
          Demo: john@bank.com / Customer@1234
        </div>
      </div>
    </div>
  );
}
