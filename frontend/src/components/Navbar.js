import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const S = {
  nav: {
    background: 'var(--nav-bg)',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid var(--nav-sep)',
  },
  brand: {
    color: 'var(--primary)',
    fontWeight: 700,
    fontSize: 16,
    textDecoration: 'none',
    letterSpacing: '-0.3px',
    marginRight: 28,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  links: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 16,
    borderLeft: '1px solid var(--nav-sep)',
  },
  userName: {
    color: 'var(--nav-txt)',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  rolePill: {
    background: 'var(--primary-lt)',
    color: 'var(--primary)',
    padding: '2px 7px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--nav-sep)',
    color: 'var(--nav-txt)',
    padding: '5px 12px',
    borderRadius: 'var(--r)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0,
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/accounts', label: 'Accounts' },
    { to: '/transactions', label: 'Transactions' },
    ...(user.role === 'admin' ? [{ to: '/audit', label: 'Audit Logs' }] : []),
  ];

  return (
    <nav style={S.nav}>
      <div style={S.left}>
        <Link to="/dashboard" style={S.brand}>BankGateway</Link>
        <div style={S.links}>
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link${isActive(to) ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div style={S.right}>
        <span style={S.userName}>{user.name}</span>
        <span style={S.rolePill}>{user.role}</span>
        <button style={S.logoutBtn} onClick={handleLogout}>Sign out</button>
      </div>
    </nav>
  );
}
