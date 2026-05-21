import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const statusStyle = {
  success: { bg: 'var(--success-lt)', fg: 'var(--success)' },
  failure: { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  warning: { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
};

const methodStyle = {
  GET:     { bg: 'var(--navy-lt)',    fg: 'var(--navy)' },
  POST:    { bg: 'var(--success-lt)', fg: 'var(--success)' },
  DELETE:  { bg: 'var(--danger-lt)',  fg: 'var(--danger)' },
  PATCH:   { bg: 'var(--warn-lt)',    fg: 'var(--warn)' },
  GRAPHQL: { bg: 'var(--purple-lt)',  fg: 'var(--purple)' },
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
  page: { padding: '2.25rem 2rem', maxWidth: 1200, margin: '0 auto' },
  pageHeader: { marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' },
  sub: { color: 'var(--text-2)', fontSize: 13, marginTop: 4 },

  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    marginBottom: 16,
    flexWrap: 'wrap',
    fontSize: 13,
    color: 'var(--text-2)',
  },
  statVal: { fontWeight: 700, color: 'var(--text)' },
  statSep: { color: 'var(--border)', fontSize: 16 },

  filters: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    padding: '12px 16px',
    marginBottom: 16,
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  select: {
    padding: '8px 10px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--surface)',
  },
  input: {
    padding: '8px 10px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r)',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--surface)',
    minWidth: 160,
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
    padding: '10px 14px',
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
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    color: 'var(--text)',
    verticalAlign: 'middle',
  },
  mono: { fontFamily: "'Courier New', monospace", letterSpacing: '0.2px' },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: '', resource: '', status: '' });

  const buildQuery = () =>
    Object.entries(filter)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/audit-logs?limit=50&${buildQuery()}`),
      api.get('/audit-logs/stats'),
    ])
      .then(([logsRes, statsRes]) => {
        setLogs(logsRes.data.logs);
        setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const successRate = stats && stats.total24h > 0
    ? Math.round((1 - stats.failures24h / stats.total24h) * 100)
    : 100;

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <h1 style={S.title}>Audit Logs</h1>
        <p style={S.sub}>Full audit trail of all system activity</p>
      </div>

      {stats && (
        <div style={S.statsBar}>
          <span>
            <span style={S.statVal}>{stats.total24h}</span> events in 24h
          </span>
          <span style={S.statSep}>·</span>
          <span style={{ color: stats.failures24h > 0 ? 'var(--danger)' : 'var(--text-2)' }}>
            <span style={{ fontWeight: 700 }}>{stats.failures24h}</span> failure{stats.failures24h !== 1 ? 's' : ''}
          </span>
          <span style={S.statSep}>·</span>
          <span style={{ color: 'var(--success)' }}>
            <span style={{ fontWeight: 700 }}>{successRate}%</span> success rate
          </span>
          <span style={S.statSep}>·</span>
          <span>showing <span style={S.statVal}>{logs.length}</span> entries</span>
        </div>
      )}

      <div style={S.filters}>
        <select
          style={S.select}
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
        <select
          style={S.select}
          value={filter.resource}
          onChange={(e) => setFilter({ ...filter, resource: e.target.value })}
        >
          <option value="">All Resources</option>
          {['Account', 'Transaction', 'User', 'OAuthToken'].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <input
          style={S.input}
          placeholder="Filter by action…"
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Timestamp', 'User', 'Action', 'Resource', 'Method', 'IP', 'Status', 'Duration'].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const last = { borderBottom: 'none' };
                const tdBase = { ...S.td, ...(i === logs.length - 1 ? last : {}) };
                return (
                  <tr key={log._id}>
                    <td style={{ ...tdBase, ...S.mono, color: 'var(--text-2)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={tdBase}>{log.userId?.email || '—'}</td>
                    <td style={{ ...tdBase, ...S.mono }}>{log.action}</td>
                    <td style={tdBase}>{log.resource}</td>
                    <td style={tdBase}>
                      {log.method && <span style={badge(methodStyle[log.method])}>{log.method}</span>}
                    </td>
                    <td style={{ ...tdBase, ...S.mono, color: 'var(--text-2)' }}>{log.ipAddress || '—'}</td>
                    <td style={tdBase}>
                      <span style={badge(statusStyle[log.status])}>{log.status}</span>
                    </td>
                    <td style={{ ...tdBase, color: 'var(--text-2)' }}>
                      {log.duration != null ? `${log.duration}ms` : '—'}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...S.td, textAlign: 'center', color: 'var(--text-2)', borderBottom: 'none', padding: '2rem' }}>
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
