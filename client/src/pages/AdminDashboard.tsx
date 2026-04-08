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
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>Administration boom.contact</h1>
      {/* Header */}
      <div className="bg-[#06060C] flex items-center justify-between sticky z-[100] top-0 px-5 py-3.5" style={{ borderBottom: '1px solid #3a3a3a' }}>
        <div className="flex items-center gap-3.5">
          <button onClick={onBack} className="bg-transparent border-0 text-[#d0d0d0] cursor-pointer text-[13px]" aria-label="Retour">←</button>
          <span className="text-[#FF3500] font-black text-lg">💥 Admin</span>
          <span className="text-[#d0d0d0] text-[11px] rounded px-1.5 py-0.5 bg-[#3a3a3a]">boom.contact</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="rounded-full w-2 h-2"  style={{ background: autoRefresh ? '#4ade80' : '#555' }} />
          <button onClick={() => setAuto(a => !a)} className="bg-transparent border-0 text-[#d0d0d0] text-[11px] cursor-pointer">
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={() => statsQ.refetch()} className="rounded-md text-xs cursor-pointer px-2.5 py-1 bg-[#3a3a3a] text-[#ccc]" style={{ border: '1px solid #555' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-5">

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6">
          {(['overview', 'sessions', 'revenue', 'users'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className="text-white rounded-lg text-xs font-bold cursor-pointer px-3.5 py-[7px]" style={{ background: tab === t ? '#D42D00' : '#111', border: '1px solid ' + (tab === t ? '#D42D00' : '#444') }}>
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
                      <th key={h} className="text-[#d0d0d0] text-[11px] font-semibold px-4 py-2.5 tracking-[1px] text-left">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.byPackage.length === 0 && (
                    <tr><td colSpan={4} className="text-[#d0d0d0] px-4 py-5 text-center">Aucune vente</td></tr>
                  )}
                  {s.revenue.byPackage.map((p: Record<string, unknown>) => (
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
            <div className="rounded-xl p-5 mb-6 bg-[#0d1f2a]" style={{ border: '1px solid #1a3a4a' }}>
              <div className="flex gap-2.5 items-end" style={{ flexWrap: 'wrap' as const }}>
                <div>
                  <div className="text-[#d0d0d0] text-[11px] mb-1">CRÉDITS</div>
                  <input type="number" aria-label="Crédits" min={1} max={100} value={giftCredits}
                    onChange={e => setGiftCredits(Number(e.target.value))}
                    style={{ ...inputSm, width: 70 }} />
                </div>
                <div className="flex-1 min-w-[200px]" >
                  <div className="text-[#d0d0d0] text-[11px] mb-1">EMAIL (optionnel)</div>
                  <input aria-label="Adresse email du destinataire" placeholder="destinataire@email.com" value={giftEmail}
                    onChange={e => setGiftEmail(e.target.value)}
                    style={inputSm} />
                </div>
                <button onClick={sendGift} className="text-white border-0 rounded-lg font-bold cursor-pointer text-[13px] px-4 py-2.5 bg-[#25D366]">
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
                      <th key={h} className="text-[#d0d0d0] text-[11px] px-3.5 py-2.5 tracking-[0.8px] text-left">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.sessions.recent.map((session: Record<string, unknown>) => {
                    const a   = (session.participantA || {}) as Record<string, unknown>;
                    const plate = a.vehicle?.licensePlate || a.licensePlate || '—';
                    const date = new Date(session.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                    const statusColor = session.status === 'completed' ? '#4ade80' : session.status === 'active' ? '#60c8f0' : session.status === 'signing' ? '#fbbf24' : '#aaa';
                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                        <td style={td}><span className="text-xs text-[#FF5533]"  style={{ fontFamily: 'monospace' }}>{session.id}</span></td>
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
                      <th key={h} className="text-[#d0d0d0] text-[11px] px-3.5 py-2.5 tracking-[0.8px] text-left">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.revenue.recent.length === 0 && (
                    <tr><td colSpan={5} className="text-[#d0d0d0] p-6 text-center">Aucun paiement</td></tr>
                  )}
                  {s.revenue.recent.map((p: Record<string, unknown>) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td className="text-xs">{p.userEmail}</td>
                      <td style={td}><span className="rounded text-[11px] px-1.5 py-0.5 bg-[#3a3a3a]">{p.packageLabel}</span></td>
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
                      <th key={h} className="text-[#d0d0d0] text-[11px] px-3.5 py-2.5 tracking-[0.8px] text-left">{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data || []).map((u: Record<string, unknown>) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #0f0f0f' }}>
                      <td className="text-[13px]">{u.email}</td>
                      <td style={td}>
                        <span className="rounded text-[11px] px-[7px] py-0.5" style={{ background: u.role === 'admin' ? '#D42D00' : '#3a3a3a', color: u.role === 'admin' ? '#fff' : '#aaa' }}>
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
  return <div className="text-[#d0d0d0] text-[11px] font-bold mb-2.5 mt-2 tracking-[1.5px] uppercase">{children}</div>;
}

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#111] rounded-xl flex-1 min-w-[100px] px-[18px] py-4" style={{ border: '1px solid #3a3a3a' }}>
      <div className="text-[#d0d0d0] text-[11px] mb-1.5 tracking-[0.5px]">{label.toUpperCase()}</div>
      <div className="text-[22px] font-black leading-none" style={{ color: color || '#fff' }}>{value}</div>
      {sub && <div className="text-[#d0d0d0] text-[11px] mt-1">{sub}</div>}
    </div>
  );
}

function CostLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[#d0d0d0] text-[11px] mb-0.5" >{label}</div>
      <div className="text-[15px]" style={{ color: highlight ? '#4ade80' : '#fff', fontWeight: highlight ? 700 : 400 }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const kpiRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const };
const td: React.CSSProperties = { padding: '11px 14px', color: '#ccc', fontSize: 13, borderBottom: '1px solid #0f0f0f' };
const inputSm: React.CSSProperties = { background: '#3a3a3a', border: '1px solid #555', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const };
