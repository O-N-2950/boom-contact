import { useState } from 'react';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import type { OCRResult } from '../../../shared/types';

interface AccountPageProps {
  user: { id: string; email: string; role: string; credits: number };
  token: string;
  onBack: () => void;
  onLogout: () => void;
}

type PageTab   = 'garage' | 'history' | 'profile';
type VehicleView = 'list' | 'add' | 'edit';

interface VehicleForm {
  id?: string;
  nickname?: string;
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  category?: string;
  licenseData?: Record<string, any>;
  insuranceData?: Record<string, any>;
}

export function AccountPage({ user, token, onBack, onLogout }: AccountPageProps) {
  const [tab, setTab]                 = useState<PageTab>('garage');
  const [vehicleView, setVehicleView] = useState<VehicleView>('list');
  const [form, setForm]               = useState<VehicleForm>({});
  const [scanning, setScanning]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [feedback, setFeedback]       = useState('');

  const vehicleListQ = trpc.vehicle.list.useQuery(undefined);
  const historyQ     = trpc.session.history.useQuery(undefined, { enabled: tab === 'history' });
  const saveMut      = trpc.vehicle.save.useMutation();
  const deleteMut    = trpc.vehicle.delete.useMutation();

  const toast = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(''), 4000); };

  const startAdd  = () => { setForm({}); setVehicleView('add'); };
  const startEdit = (v: any) => { setForm({ ...v }); setVehicleView('edit'); };

  const handleScanComplete = (result: { registration: OCRResult; greenCard?: OCRResult }) => {
    setScanning(false);
    const reg = result.registration;
    const ins = result.greenCard;
    setForm(prev => ({
      ...prev,
      plate:    (reg as any).vehicle?.licensePlate || (reg as any).licensePlate || prev.plate,
      make:     (reg as any).vehicle?.make         || (reg as any).make         || prev.make,
      model:    (reg as any).vehicle?.model        || (reg as any).model        || prev.model,
      color:    (reg as any).vehicle?.color        || (reg as any).color        || prev.color,
      year:     (reg as any).vehicle?.year         || (reg as any).year         || prev.year,
      category: (reg as any).vehicle?.vehicleCategory || prev.category,
      licenseData: { ...prev.licenseData, ...reg },
      insuranceData: ins
        ? { ...prev.insuranceData, company: (ins as any).insurance?.company || (ins as any).company, policyNumber: (ins as any).insurance?.policyNumber || (ins as any).policyNumber, ...ins }
        : prev.insuranceData,
    }));
    toast('✅ Documents scannés et pré-remplis !');
  };

  const handleSave = async () => {
    if (!form.plate && !form.make && !form.nickname) { toast('Ajoutez au moins une information.'); return; }
    setSaving(true);
    try {
      await saveMut.mutateAsync(form);
      await vehicleListQ.refetch();
      setVehicleView('list');
      toast('✅ Véhicule sauvegardé !');
    } catch (e: any) { toast('Erreur : ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm('Supprimer ' + (name || 'ce véhicule') + ' ?')) return;
    try { await deleteMut.mutateAsync({ id }); await vehicleListQ.refetch(); }
    catch (e: any) { toast('Erreur : ' + e.message); }
  };

  // ── OCR Scan overlay ─────────────────────────────────────────
  if (scanning) {
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setScanning(false)} style={backBtn}>← Annuler</button>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
            Photographiez votre <strong style={{ color: '#fff' }}>permis de circuler</strong> et/ou votre <strong style={{ color: '#fff' }}>carte verte</strong>.
          </p>
          <OCRScanner role="A" onComplete={handleScanComplete} />
        </div>
      </div>
    );
  }

  // ── Vehicle form ─────────────────────────────────────────────
  if (vehicleView !== 'list') {
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setVehicleView('list')} style={backBtn}>← Garage</button>
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
            {vehicleView === 'add' ? '➕ Ajouter un véhicule' : '✏️ Modifier le véhicule'}
          </h2>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
            Scannez vos documents pour tout pré-remplir automatiquement.
          </p>

          {feedback && <FeedbackBanner msg={feedback} />}

          <button onClick={() => setScanning(true)} style={{ width: '100%', background: '#0d1f2a', border: '1px solid #1a4a6a', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>📄</span>
            <div style={{ textAlign: 'left' as const }}>
              <div style={{ color: '#60c8f0', fontWeight: 700 }}>Scanner permis + carte verte</div>
              <div style={{ color: '#555', fontSize: 12 }}>Reconnaissance automatique · 50 langues</div>
            </div>
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Surnom" placeholder='ex: "Ma Golf bleue"' value={form.nickname || ''} onChange={v => setForm(p => ({ ...p, nickname: v }))} />
            <Field label="Plaque" placeholder="JU 12345" value={form.plate || ''} onChange={v => setForm(p => ({ ...p, plate: v.toUpperCase() }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="Marque" placeholder="Volkswagen" value={form.make || ''} onChange={v => setForm(p => ({ ...p, make: v }))} /></div>
              <div style={{ flex: 1 }}><Field label="Modèle" placeholder="Golf 8" value={form.model || ''} onChange={v => setForm(p => ({ ...p, model: v }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="Couleur" placeholder="Bleue" value={form.color || ''} onChange={v => setForm(p => ({ ...p, color: v }))} /></div>
              <div style={{ flex: 1 }}><Field label="Année" placeholder="2022" value={form.year || ''} onChange={v => setForm(p => ({ ...p, year: v }))} /></div>
            </div>

            {form.insuranceData && Object.keys(form.insuranceData).length > 0 && (
              <div style={{ background: '#0d2a0d', border: '1px solid #1a4a1a', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🛡️ Assurance enregistrée</div>
                {form.insuranceData.company && <div style={{ color: '#ccc', fontSize: 13 }}>{form.insuranceData.company}</div>}
                {form.insuranceData.policyNumber && <div style={{ color: '#999', fontSize: 12 }}>Police n° {form.insuranceData.policyNumber}</div>}
                <button onClick={() => setScanning(true)} style={{ marginTop: 8, background: 'none', border: '1px dashed #2a4a2a', borderRadius: 8, padding: '6px 12px', color: '#4ade80', fontSize: 12, cursor: 'pointer' }}>
                  Mettre à jour →
                </button>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={primaryBtn}>
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder ce véhicule'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────
  const vehicles = vehicleListQ.data || [];
  const history  = (historyQ.data || []) as any[];

  return (
    <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button onClick={onBack} style={backBtn}>← Retour</button>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 13 }}>Déconnexion</button>
        </div>

        {/* Profile card */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 20 }}>💥 boom.contact</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{user.email}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <StatBadge value={user.credits === 999999 ? '∞' : user.credits} label="crédits" highlight />
            <StatBadge value={vehicles.length} label={vehicles.length !== 1 ? 'véhicules' : 'véhicule'} />
            <StatBadge value={history.length || '—'} label="constats" />
          </div>
        </div>

        {feedback && <FeedbackBanner msg={feedback} />}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['garage', 'history', 'profile'] as PageTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? '#FF3500' : '#111', border: '1px solid ' + (tab === t ? '#FF3500' : '#222'), color: '#fff', borderRadius: 10, padding: '9px 6px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {t === 'garage' ? '🚗 Garage' : t === 'history' ? '📋 Historique' : '👤 Profil'}
            </button>
          ))}
        </div>

        {/* GARAGE */}
        {tab === 'garage' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: '#fff', fontWeight: 700 }}>Mon garage ({vehicles.length})</div>
              <button onClick={startAdd} style={{ background: '#FF3500', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Ajouter</button>
            </div>
            {vehicles.length === 0 && (
              <EmptyState icon="🚗" title="Garage vide" subtitle="Enregistrez vos véhicules une fois. Plus jamais besoin de scanner lors d'un accident.">
                <button onClick={startAdd} style={{ ...primaryBtn, width: 'auto', padding: '11px 20px', marginTop: 16 }}>➕ Ajouter mon premier véhicule</button>
              </EmptyState>
            )}
            {vehicles.map((v: any) => (
              <div key={v.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule'}</div>
                    {v.plate && <div style={{ color: '#FF3500', fontFamily: 'monospace', fontSize: 14 }}>{v.plate}</div>}
                    <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{[v.make, v.model, v.color, v.year].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(v)} style={iconBtn}>✏️</button>
                    <button onClick={() => handleDelete(v.id, v.nickname)} style={iconBtn}>🗑️</button>
                  </div>
                </div>
                {v.insuranceData && Object.keys(v.insuranceData).length > 0
                  ? <div style={{ marginTop: 10, background: '#0d2a0d', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#4ade80' }}>🛡️ {v.insuranceData.company || 'Assurance enregistrée'}{v.insuranceData.policyNumber ? ' · ' + v.insuranceData.policyNumber : ''}</div>
                  : <button onClick={() => startEdit(v)} style={{ marginTop: 8, background: 'none', border: '1px dashed #2a2a2a', borderRadius: 8, padding: '5px 10px', color: '#555', fontSize: 11, cursor: 'pointer' }}>+ Ajouter assurance</button>
                }
              </div>
            ))}
          </>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>Mes constats ({history.length})</div>
            {historyQ.isLoading && <div style={{ color: '#555', textAlign: 'center', padding: 32 }}>Chargement...</div>}
            {!historyQ.isLoading && history.length === 0 && (
              <EmptyState icon="📋" title="Aucun constat" subtitle="Votre prochain constat apparaîtra ici automatiquement." />
            )}
            {history.map((s: any) => {
              const a = s.participantA || {};
              const plate = a.vehicle?.licensePlate || a.licensePlate || '—';
              const date = new Date(s.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' });
              const statusIcon = s.status === 'completed' ? '✅' : s.status === 'signing' ? '✍️' : '⏳';
              return (
                <div key={s.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#FF3500', fontFamily: 'monospace', fontSize: 12 }}>{s.id}</div>
                      <div style={{ color: '#fff', fontWeight: 600, marginTop: 2 }}>Plaque : {plate}</div>
                      <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{date} · {statusIcon} {s.status}</div>
                      {s.accident?.location?.address && <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>📍 {s.accident.location.address}</div>}
                    </div>
                    {s.pdfUrl && (
                      <a href={s.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '7px 12px', color: '#ccc', fontSize: 12, textDecoration: 'none' }}>📄 PDF</a>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoCard label="Email" value={user.email} />
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>CRÉDITS DISPONIBLES</div>
              <div style={{ color: '#FF3500', fontSize: 32, fontWeight: 900 }}>{user.credits === 999999 ? '∞' : user.credits}</div>
              <div style={{ color: '#555', fontSize: 12 }}>1 crédit = 1 constat amiable complet</div>
            </div>
            <div style={{ background: '#0d1f2a', border: '1px solid #1a3a4a', borderRadius: 14, padding: 20 }}>
              <div style={{ color: '#60c8f0', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>🎁 Offrir un constat via WhatsApp</div>
              <div style={{ color: '#888', fontSize: 13, lineHeight: 1.7 }}>
                Votre enfant a eu un accident ? Un employé a besoin d'aide urgente ?<br />
                Envoyez-lui un crédit <strong style={{ color: '#fff' }}>en 3 secondes</strong> sur son mobile.
              </div>
              <button style={{ ...primaryBtn, marginTop: 14, background: '#25D366', fontSize: 14 }}>
                📲 Envoyer un crédit par WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ color: '#666', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, color: '#fff', padding: '11px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box' as const }} />
    </div>
  );
}

function StatBadge({ value, label, highlight }: { value: any; label: string; highlight?: boolean }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '8px 14px', textAlign: 'center' as const, flex: 1 }}>
      <div style={{ color: highlight ? '#FF3500' : '#fff', fontSize: 20, fontWeight: 900 }}>{value}</div>
      <div style={{ color: '#555', fontSize: 11 }}>{label}</div>
    </div>
  );
}

function FeedbackBanner({ msg }: { msg: string }) {
  const ok = msg.startsWith('✅');
  return <div style={{ background: ok ? '#0a2a0a' : '#2a0a0a', border: '1px solid ' + (ok ? '#1a5c1a' : '#5c1a1a'), borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#ccc', fontSize: 14 }}>{msg}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 20 }}>
      <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ color: '#fff', fontSize: 15 }}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div style={{ background: '#111', border: '1px dashed #2a2a2a', borderRadius: 14, padding: 32, textAlign: 'center' as const }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>{subtitle}</div>
      {children}
    </div>
  );
}

const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: '4px 0', marginBottom: 16, display: 'block' };
const primaryBtn: React.CSSProperties = { background: '#FF3500', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' };
const iconBtn: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15 };
