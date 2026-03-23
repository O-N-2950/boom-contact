import { useState, useEffect } from 'react';
import { trpc } from '../trpc';

interface AdminDashboardProps {
  token: string;
  onBack: () => void;
}

type Tab = 'overview' | 'sessions' | 'revenue' | 'users';

const EUR = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;

export function AdminDashboard({ token, onBack }: AdminDashboardProps) {
  const [tab, setTab]         = useState<Tab>('overview');
  const [autoRefresh, setAuto] = useState(true);

  const statsQ = trpc.admin.stats.useQuery(undefined, {
    refetchInterval: autoRefresh ? 30000 : false,
  });
  const usersQ = trpc.admin.users.useQuery({ limit: 100 }, {
    enabled: tab === 'users',
  });

  const s = statsQ.data;
  const loading = statsQ.isLoading;

  // ── Gift credits send via WhatsApp ────────────────────────────
  const grantMut = trpc.auth.grantCredits.useMutation();
  const [giftCredits, setGiftCredits] = useState(1);
  const [giftEmail, setGiftEmail]     = useState('');
  const [giftResult, setGiftResult]   = useState('');

  const sendGift = async () => {
    try {
      const r = await grantMut.mutateAsync({ credits: giftCredits, recipientEmail: giftEmail || undefined, sendEmail: !!giftEmail });
      window.open(r.waUrl, '_blank');
      setGiftResult(`✅ Lien créé ! ${r.giftUrl}`);
    } catch (e: any) {
      setGiftResult('❌ ' + e.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FF3500', fontSize: 18 }}>⏳ Chargement dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#06060C', borderBottom: '1px solid #1a1a1a', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13 }}>←</button>
          <span style={{ color: '#FF3500', fontWeight: 900, fontSize: 18 }}>💥 Admin</span>
          <span style={{ background: '#1a1a1a', color: '#666', fontSize: 11, borderRadius: 4, padding: '2px 6px' }}>boom.contact</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: autoRefresh ? '#4ade80' : '#555' }} />
          <button onClick={() => setAuto(a => !a)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 11, cursor: 'pointer' }}>
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={() => statsQ.refetch()} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#ccc', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {(['overview', 'sessions', 'revenue', 'users'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#FF3500' : '#111', border: '1px solid ' + (tab === t ? '#FF3500' : '#222'),
              color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              {t === 'overview' ? '📊 Vue d\'ensemble' : t === 'sessions' ? '📋 Sessions' : t === 'revenue' ? '💰 Revenus' : '👥 Utilisateurs'}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && s && (
          <>
            {/* KPI row 1 — Sessions */}
            <SectionTitle>📋 Sessions</SectionTitle>
            <div style={kpiRow}>
              <KPI label="Total" value={s.sessions.total} />
              <KPI label="Complétés" value={s.sessions.completed} sub={pct(s.sessions.completed, s.sessions.total) + '%'} color="#4ade80" />
              <KPI label="24h" value={s.sessions.last24h} color="#60c8f0" />
              <KPI label="7 jours" value={s.sessions.last7d} />
            </div>

            {/* KPI row 2 — Revenue */}
            <SectionTitle>💰 Revenus</SectionTitle>
            <div style={kpiRow}>
              <KPI label="Total" value={EUR(s.revenue.totalCents)} color="#FF3500" />
              <KPI label="30 jours" value={EUR(s.revenue.last30dCents)} />
              <KPI label="7 jours" value={EUR(s.revenue.last7dCents)} />
              <KPI label="Crédits vendus" value={s.revenue.totalCredits} />
            </div>

            {/* KPI row 3 — Users */}
            <SectionTitle>👥 Utilisateurs</SectionTitle>
            <div style={kpiRow}>
              <KPI label="Total" value={s.users.total} />
              <KPI label="7 jours" value={s.users.last7d} color="#4ade80" />
              <KPI label="30 jours" value={s.users.last30d} />
              <KPI label="Crédits offerts" value={s.gifts.totalGiven || 0} />
            </div>

            {/* KPI row 4 — AI costs */}
            <SectionTitle>🤖 Coûts IA (estimés)</SectionTitle>
            <div style={kpiRow}>
              <KPI label="Scans OCR est." value={s.ai.estOcrScans} />
              <KPI label="Coût OCR total" value={'€' + s.ai.estOcrCostEur.toFixed(2)} />
              <KPI label="Coût/session" value={'€' + s.ai.costPerSession.toFixed(3)} />
              <KPI label="Marge nette est." value={s.revenue.totalCents > 0 ? EUR(s.revenue.totalCents - s.ai.estOcrCostEur * 100) : '—'} color="#4ade80" />
            </div>

            {/* Revenue by package */}
            <SectionTitle>📦 Revenus par pack</SectionTitle>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Pack', 'Ventes', 'Revenus', 'Crédits'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, color: '#555', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.byPackage.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '20px 16px', color: '#555', textAlign: 'center' as const }}>Aucune vente</td></tr>
                  )}
                  {s.revenue.byPackage.map((p: any) => (
                    <tr key={p.packageId} style={{ borderBottom: '1px solid #111' }}>
                      <td style={td}><span style={{ color: '#fff', fontWeight: 600 }}>{p.packageId}</span></td>
                      <td style={td}>{p.count}</td>
                      <td style={{ ...td, color: '#4ade80' }}>{EUR(Number(p.revenue || 0))}</td>
                      <td style={td}>{p.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gift credits panel */}
            <SectionTitle>🎁 Envoyer des crédits</SectionTitle>
            <div style={{ background: '#0d1f2a', border: '1px solid #1a3a4a', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>CRÉDITS</div>
                  <input type="number" min={1} max={100} value={giftCredits}
                    onChange={e => setGiftCredits(Number(e.target.value))}
                    style={{ ...inputSm, width: 70 }} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ color: '#666', fontSize: 11, marginBottom: 4 }}>EMAIL (optionnel)</div>
                  <input placeholder="destinataire@email.com" value={giftEmail}
                    onChange={e => setGiftEmail(e.target.value)}
                    style={inputSm} />
                </div>
                <button onClick={sendGift} style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  📲 WhatsApp
                </button>
              </div>
              {giftResult && <div style={{ marginTop: 10, color: '#ccc', fontSize: 12 }}>{giftResult}</div>}
            </div>
          </>
        )}

        {/* ── SESSIONS ── */}
        {tab === 'sessions' && s && (
          <>
            <SectionTitle>📋 Dernières sessions ({s.sessions.recent.length})</SectionTitle>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['ID', 'Statut', 'Date', 'Plaque A', 'Propriétaire'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, color: '#555', fontSize: 11, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.sessions.recent.map((session: any) => {
                    const a   = session.participantA as any || {};
                    const plate = a.vehicle?.licensePlate || a.licensePlate || '—';
                    const date = new Date(session.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    const statusColor = session.status === 'completed' ? '#4ade80' : session.status === 'active' ? '#60c8f0' : session.status === 'signing' ? '#fbbf24' : '#555';
                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                        <td style={td}><span style={{ fontFamily: 'monospace', color: '#FF3500', fontSize: 12 }}>{session.id}</span></td>
                        <td style={td}><span style={{ color: statusColor, fontSize: 12 }}>● {session.status}</span></td>
                        <td style={{ ...td, color: '#666', fontSize: 12 }}>{date}</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{plate}</td>
                        <td style={{ ...td, color: '#666', fontSize: 12 }}>{session.ownerEmail || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── REVENUE ── */}
        {tab === 'revenue' && s && (
          <>
            <SectionTitle>💰 Derniers paiements ({s.revenue.recent.length})</SectionTitle>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Email', 'Pack', 'Montant', 'Crédits', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, color: '#555', fontSize: 11, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.recent.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '24px', color: '#555', textAlign: 'center' as const }}>Aucun paiement</td></tr>
                  )}
                  {s.revenue.recent.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td style={{ ...td, fontSize: 12 }}>{p.userEmail}</td>
                      <td style={td}><span style={{ background: '#1a1a1a', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{p.packageLabel}</span></td>
                      <td style={{ ...td, color: '#4ade80', fontWeight: 700 }}>{EUR(p.amountCents)} <span style={{ color: '#555', fontSize: 10 }}>{p.currency}</span></td>
                      <td style={td}>{p.creditsGranted}</td>
                      <td style={{ ...td, color: '#666', fontSize: 12 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-CH') : <span style={{ color: '#555' }}>pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI cost breakdown */}
            <SectionTitle>🤖 Détail coûts IA</SectionTitle>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CostLine label="Sessions complétées" value={String(s.sessions.completed)} />
                <CostLine label="Scans OCR estimés (×2/session)" value={String(s.ai.estOcrScans)} />
                <CostLine label="Coût par scan OCR (Claude Sonnet)" value="€0.003" />
                <CostLine label="Coût OCR total estimé" value={'€' + s.ai.estOcrCostEur.toFixed(2)} highlight />
                <CostLine label="Revenu total" value={EUR(s.revenue.totalCents)} />
                <CostLine label="Marge brute estimée" value={EUR(Math.max(0, s.revenue.totalCents - s.ai.estOcrCostEur * 100))} highlight />
              </div>
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <SectionTitle>👥 Utilisateurs ({usersQ.data?.length || 0})</SectionTitle>
            {usersQ.isLoading && <div style={{ color: '#555', padding: 32, textAlign: 'center' as const }}>Chargement...</div>}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                    {['Email', 'Rôle', 'Crédits', 'Pays', 'Inscrit', 'Dernière activité'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, color: '#555', fontSize: 11, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data || []).map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td style={{ ...td, fontSize: 13 }}>{u.email}</td>
                      <td style={td}>
                        <span style={{ background: u.role === 'admin' ? '#FF3500' : '#1a1a1a', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: u.role === 'admin' ? '#fff' : '#888' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ ...td, color: u.credits > 0 ? '#4ade80' : '#555', fontWeight: 700 }}>
                        {u.credits === 999999 ? '∞' : u.credits}
                      </td>
                      <td style={{ ...td, color: '#666', fontSize: 12 }}>{u.country || '—'}</td>
                      <td style={{ ...td, color: '#666', fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('fr-CH')}</td>
                      <td style={{ ...td, color: '#555', fontSize: 12 }}>{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString('fr-CH') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 10, marginTop: 8 }}>{children}</div>;
}

function KPI({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: '16px 18px', flex: 1, minWidth: 100 }}>
      <div style={{ color: '#555', fontSize: 11, marginBottom: 6, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div style={{ color: color || '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function CostLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ color: '#555', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: highlight ? '#4ade80' : '#fff', fontWeight: highlight ? 700 : 400, fontSize: 15 }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const kpiRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const };
const td: React.CSSProperties = { padding: '11px 14px', color: '#ccc', fontSize: 13, borderBottom: '1px solid #0f0f0f' };
const inputSm: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
