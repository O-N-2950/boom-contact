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
    } catch (e: unknown) {
      setGiftResult('❌ ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060C] flex items-center justify-center">
        <div className="text-[#FF3500] text-lg">⏳ Chargement dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06060C] text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap" style={{ width: 1, height: 1, margin: -1, clip: 'rect(0,0,0,0)', border: 0 }}>Administration boom.contact</h1>
      {/* Header */}
      <div className="bg-[#06060C] flex items-center justify-between sticky z-[100]" style={{ borderBottom: '1px solid #3a3a3a', padding: '14px 20px', top: 0 }}>
        <div className="flex items-center gap-3.5">
          <button onClick={onBack} className="bg-transparent border-0 text-[#d0d0d0] cursor-pointer text-[13px]" aria-label="Retour">←</button>
          <span className="text-[#FF3500] font-black text-lg">💥 Admin</span>
          <span className="text-[#d0d0d0] text-[11px] rounded" style={{ background: '#3a3a3a', padding: '2px 6px' }}>boom.contact</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="rounded-full" style={{ width: 8, height: 8, background: autoRefresh ? '#4ade80' : '#555' }} />
          <button onClick={() => setAuto(a => !a)} className="bg-transparent border-0 text-[#d0d0d0] text-[11px] cursor-pointer">
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={() => statsQ.refetch()} className="rounded-md text-xs cursor-pointer" style={{ background: '#3a3a3a', border: '1px solid #555', color: '#ccc', padding: '4px 10px' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 900, padding: '20px 16px' }}>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6">
          {(['overview', 'sessions', 'revenue', 'users'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#FF3500' : '#111', border: '1px solid ' + (tab === t ? '#FF3500' : '#444'),
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
            <div className="bg-[#111] rounded-xl overflow-hidden mb-6" style={{ border: '1px solid #3a3a3a' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                    {['Pack', 'Ventes', 'Revenus', 'Crédits'].map(h => (
                      <th key={h} className="text-[#d0d0d0] text-[11px] font-semibold" style={{ padding: '10px 16px', textAlign: 'left' as const, letterSpacing: 1 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.byPackage.length === 0 && (
                    <tr><td colSpan={4} className="text-[#d0d0d0]" style={{ padding: '20px 16px', textAlign: 'center' as const }}>Aucune vente</td></tr>
                  )}
                  {s.revenue.byPackage.map((p: any) => (
                    <tr key={p.packageId} style={{ borderBottom: '1px solid #111' }}>
                      <td style={td}><span className="text-white font-semibold">{p.packageId}</span></td>
                      <td style={td}>{p.count}</td>
                      <td className="text-green-400">{EUR(Number(p.revenue || 0))}</td>
                      <td style={td}>{p.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gift credits panel */}
            <SectionTitle>🎁 Envoyer des crédits</SectionTitle>
            <div className="rounded-xl p-5 mb-6" style={{ background: '#0d1f2a', border: '1px solid #1a3a4a' }}>
              <div className="flex gap-2.5 items-end" style={{ flexWrap: 'wrap' as const }}>
                <div>
                  <div className="text-[#d0d0d0] text-[11px] mb-1">CRÉDITS</div>
                  <input type="number" aria-label="Crédits" min={1} max={100} value={giftCredits}
                    onChange={e => setGiftCredits(Number(e.target.value))}
                    style={{ ...inputSm, width: 70 }} />
                </div>
                <div className="flex-1" style={{ minWidth: 200 }}>
                  <div className="text-[#d0d0d0] text-[11px] mb-1">EMAIL (optionnel)</div>
                  <input aria-label="Adresse email du destinataire" placeholder="destinataire@email.com" value={giftEmail}
                    onChange={e => setGiftEmail(e.target.value)}
                    style={inputSm} />
                </div>
                <button onClick={sendGift} className="text-white border-0 rounded-lg font-bold cursor-pointer text-[13px]" style={{ background: '#25D366', padding: '10px 16px' }}>
                  📲 WhatsApp
                </button>
              </div>
              {giftResult && <div className="mt-2.5 text-xs text-[#ccc]">{giftResult}</div>}
            </div>
          </>
        )}

        {/* ── SESSIONS ── */}
        {tab === 'sessions' && s && (
          <>
            <SectionTitle>📋 Dernières sessions ({s.sessions.recent.length})</SectionTitle>
            <div className="bg-[#111] rounded-xl overflow-hidden" style={{ border: '1px solid #3a3a3a' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                    {['ID', 'Statut', 'Date', 'Plaque A', 'Propriétaire'].map(h => (
                      <th key={h} className="text-[#d0d0d0] text-[11px]" style={{ padding: '10px 14px', textAlign: 'left' as const, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.sessions.recent.map((session: any) => {
                    const a   = session.participantA as any || {};
                    const plate = a.vehicle?.licensePlate || a.licensePlate || '—';
                    const date = new Date(session.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    const statusColor = session.status === 'completed' ? '#4ade80' : session.status === 'active' ? '#60c8f0' : session.status === 'signing' ? '#fbbf24' : '#aaa';
                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                        <td style={td}><span className="text-xs" style={{ fontFamily: 'monospace', color: '#FF5533' }}>{session.id}</span></td>
                        <td style={td}><span className="text-xs" style={{ color: statusColor }}>● {session.status}</span></td>
                        <td className="text-[#d0d0d0] text-xs">{date}</td>
                        <td className="text-xs" style={{ fontFamily: 'monospace' }}>{plate}</td>
                        <td className="text-[#d0d0d0] text-xs">{session.ownerEmail || '—'}</td>
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
            <div className="bg-[#111] rounded-xl overflow-hidden mb-6" style={{ border: '1px solid #3a3a3a' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                    {['Email', 'Pack', 'Montant', 'Crédits', 'Date'].map(h => (
                      <th key={h} className="text-[#d0d0d0] text-[11px]" style={{ padding: '10px 14px', textAlign: 'left' as const, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.recent.length === 0 && (
                    <tr><td colSpan={5} className="text-[#d0d0d0]" style={{ padding: '24px', textAlign: 'center' as const }}>Aucun paiement</td></tr>
                  )}
                  {s.revenue.recent.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td className="text-xs">{p.userEmail}</td>
                      <td style={td}><span className="rounded text-[11px]" style={{ background: '#3a3a3a', padding: '2px 6px' }}>{p.packageLabel}</span></td>
                      <td className="text-green-400 font-bold">{EUR(p.amountCents)} <span className="text-[#d0d0d0] text-[10px]">{p.currency}</span></td>
                      <td style={td}>{p.creditsGranted}</td>
                      <td className="text-[#d0d0d0] text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-CH') : <span className="text-[#d0d0d0]">pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI cost breakdown */}
            <SectionTitle>🤖 Détail coûts IA</SectionTitle>
            <div className="bg-[#111] rounded-xl p-5" style={{ border: '1px solid #3a3a3a' }}>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
            {usersQ.isLoading && <div className="text-[#d0d0d0] p-8 text-center">Chargement...</div>}
            <div className="bg-[#111] rounded-xl overflow-hidden" style={{ border: '1px solid #3a3a3a' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #3a3a3a' }}>
                    {['Email', 'Rôle', 'Crédits', 'Pays', 'Inscrit', 'Dernière activité'].map(h => (
                      <th key={h} className="text-[#d0d0d0] text-[11px]" style={{ padding: '10px 14px', textAlign: 'left' as const, letterSpacing: 0.8 }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data || []).map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td className="text-[13px]">{u.email}</td>
                      <td style={td}>
                        <span className="rounded text-[11px]" style={{ background: u.role === 'admin' ? '#FF3500' : '#3a3a3a', padding: '2px 7px', color: u.role === 'admin' ? '#fff' : '#aaa' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="font-bold" style={{ color: u.credits > 0 ? '#4ade80' : '#aaa' }}>
                        {u.credits === 999999 ? '∞' : u.credits}
                      </td>
                      <td className="text-[#d0d0d0] text-xs">{u.country || '—'}</td>
                      <td className="text-[#d0d0d0] text-xs">{new Date(u.createdAt).toLocaleDateString('fr-CH')}</td>
                      <td className="text-[#d0d0d0] text-xs">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString('fr-CH') : '—'}</td>
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
  return <div className="text-[#d0d0d0] text-[11px] font-bold mb-2.5 mt-2" style={{ letterSpacing: 1.5, textTransform: 'uppercase' as const }}>{children}</div>;
}

function KPI({ label, value, sub, color }: { label: string; value: any; sub?: string; color?: string }) {
  return (
    <div className="bg-[#111] rounded-xl flex-1" style={{ border: '1px solid #3a3a3a', padding: '16px 18px', minWidth: 100 }}>
      <div className="text-[#d0d0d0] text-[11px] mb-1.5" style={{ letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
      <div className="text-[22px] font-black leading-none" style={{ color: color || '#fff' }}>{value}</div>
      {sub && <div className="text-[#d0d0d0] text-[11px] mt-1">{sub}</div>}
    </div>
  );
}

function CostLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[#d0d0d0] text-[11px]" style={{ marginBottom: 2 }}>{label}</div>
      <div className="text-[15px]" style={{ color: highlight ? '#4ade80' : '#fff', fontWeight: highlight ? 700 : 400 }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const kpiRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const };
const td: React.CSSProperties = { padding: '11px 14px', color: '#ccc', fontSize: 13, borderBottom: '1px solid #0f0f0f' };
const inputSm: React.CSSProperties = { background: '#3a3a3a', border: '1px solid #555', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
