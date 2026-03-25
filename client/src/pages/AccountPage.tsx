import { useState } from 'react';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import type { OCRResult } from '../../../shared/types';

interface AccountPageProps {
  user: { id: string; email: string; role: string; credits: number };
  token: string;
  onBack: () => void;
  onLogout: () => void;
  initialTab?: 'garage' | 'history' | 'profile';
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

export function AccountPage({ user, token, onBack, onLogout, initialTab = 'garage' }: AccountPageProps) {
  const [tab, setTab]                 = useState<PageTab>(initialTab);
  const [vehicleView, setVehicleView] = useState<VehicleView>('list');
  const [form, setForm]               = useState<VehicleForm>({});
  const [scanning, setScanning]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [feedback, setFeedback]       = useState('');
  // ── Profil édition ────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<{
    firstName: string; lastName: string;
    phone: string; company: string; address: string;
  }>({ firstName: '', lastName: '', phone: '', company: '', address: '' });
  const [editingEmail, setEditingEmail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [newEmail, setNewEmail]     = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Données fraîches depuis la DB (crédits, profil à jour)
  const meQ          = trpc.auth.me.useQuery(undefined);
  const freshUser    = meQ.data || user;
  const vehicleListQ = trpc.vehicle.list.useQuery(undefined);
  const historyQ     = trpc.session.history.useQuery(undefined, { enabled: tab === 'history' });
  const deleteAccountMut = trpc.auth.deleteAccount.useMutation();
  const saveMut        = trpc.vehicle.save.useMutation();
  const deleteMut      = trpc.vehicle.delete.useMutation();
  const updateProfileMut = trpc.auth.updateProfile.useMutation();
  const updateEmailMut   = trpc.auth.updateEmail.useMutation();

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

  // ── Modal suppression compte ────────────────────────────────
  if (showDeleteModal) {
    const emailToConfirm = freshUser.email || user.email;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(6,6,12,0.97)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: '#0d0d18',
          border: '1.5px solid rgba(239,68,68,0.35)',
          borderRadius: 20, padding: 28,
        }}>
          {/* Icône warning */}
          <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 16 }}>⚠️</div>

          <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 20, textAlign: 'center', marginBottom: 8 }}>
            Suppression définitive
          </div>

          <div style={{ color: '#aaa', fontSize: 14, lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>
            Tu es sur le point de supprimer le compte<br />
            <strong style={{ color: '#fff' }}>{emailToConfirm}</strong>
          </div>

          {/* Ce qui sera supprimé */}
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 12, marginBottom: 10 }}>CE QUI SERA SUPPRIMÉ DÉFINITIVEMENT :</div>
            {[
              '🗑️ Ton compte et tes identifiants',
              '🚗 Tous tes véhicules enregistrés',
              '📋 Tout ton historique de constats',
              '💳 Tous tes crédits restants',
            ].map((item, i) => (
              <div key={i} style={{ color: '#ccc', fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                {item}
              </div>
            ))}
            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10, fontWeight: 600 }}>
              ⚠️ Cette action est irréversible. Aucune récupération possible.
            </div>
          </div>

          {/* Confirmation par saisie email */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
              Pour confirmer, saisis ton adresse email :
            </div>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={emailToConfirm}
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%', padding: '12px 14px',
                background: '#1a1a2e', border: '1px solid #2a2a3e',
                borderRadius: 10, color: '#fff', fontSize: 14,
                boxSizing: 'border-box',
                outline: deleteConfirmText === emailToConfirm ? '2px solid #ef4444' : 'none',
              }}
            />
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              disabled={deleteConfirmText !== emailToConfirm || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await deleteAccountMut.mutateAsync({});
                  onLogout();
                } catch(e: any) {
                  setFeedback('❌ ' + (e.message || 'Erreur'));
                  setShowDeleteModal(false);
                } finally { setSaving(false); }
              }}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, border: 'none',
                background: deleteConfirmText === emailToConfirm ? '#ef4444' : 'rgba(239,68,68,0.15)',
                color: deleteConfirmText === emailToConfirm ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: deleteConfirmText === emailToConfirm ? 'pointer' : 'not-allowed',
                fontSize: 15, fontWeight: 700,
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Suppression...' : '🗑️ Supprimer définitivement'}
            </button>
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#888',
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              Annuler — garder mon compte
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>{freshUser.email}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <StatBadge value={freshUser.credits === 999999 ? '∞' : freshUser.credits} label="crédits" highlight />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Crédits */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 18 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>CRÉDITS DISPONIBLES</div>
              <div style={{ color: '#FF3500', fontSize: 32, fontWeight: 900 }}>{freshUser.credits === 999999 ? '∞' : freshUser.credits}</div>
              <div style={{ color: '#555', fontSize: 12 }}>1 crédit = 1 constat amiable complet</div>
            </div>

            {/* Email — changement */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingEmail ? 14 : 0 }}>
                <div>
                  <div style={{ color: '#666', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>EMAIL</div>
                  <div style={{ color: '#fff', fontSize: 14 }}>{freshUser.email || user.email}</div>
                </div>
                <button onClick={() => { setEditingEmail(!editingEmail); setNewEmail(''); setEmailPassword(''); }}
                  style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', fontSize: 12, padding: '5px 10px', cursor: 'pointer' }}>
                  {editingEmail ? 'Annuler' : 'Modifier →'}
                </button>
              </div>
              {editingEmail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label="Nouvel email" placeholder="contact@winwin.swiss" value={newEmail} onChange={setNewEmail} />
                  <Field label="Mot de passe actuel (confirmation)" placeholder="••••••••" value={emailPassword} onChange={setEmailPassword} />
                  <button
                    disabled={!newEmail || !emailPassword}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await updateEmailMut.mutateAsync({ newEmail, currentPassword: emailPassword });
                        setFeedback('✅ Email modifié — reconnecte-toi avec le nouvel email');
                        setEditingEmail(false);
                        setTimeout(() => { onLogout(); }, 2500);
                      } catch(e: any) {
                        setFeedback('❌ ' + (e.message || 'Erreur'));
                      } finally { setSaving(false); }
                    }}
                    style={{ ...primaryBtn, opacity: (!newEmail || !emailPassword) ? 0.4 : 1 }}>
                    {saving ? 'Mise à jour...' : "✅ Confirmer le changement d'email"}
                  </button>
                </div>
              )}
            </div>

            {/* Profil — infos personnelles */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>👤 Informations personnelles</div>
                {!editingProfile && (
                  <button onClick={() => {
                    setProfileForm({
                      firstName: (user as any).firstName || '',
                      lastName:  (user as any).lastName  || '',
                      phone:     (user as any).phone     || '',
                      company:   (user as any).company   || '',
                      address:   (user as any).address   || '',
                    });
                    setEditingProfile(true);
                  }}
                  style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', fontSize: 12, padding: '5px 10px', cursor: 'pointer' }}>
                    Modifier →
                  </button>
                )}
              </div>
              {!editingProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['Prénom', (user as any).firstName],
                    ['Nom', (user as any).lastName],
                    ['Téléphone', (user as any).phone],
                    ['Société', (user as any).company],
                    ['Adresse', (user as any).address],
                  ].map(([label, val]) => val ? (
                    <div key={label as string}>
                      <div style={{ color: '#555', fontSize: 11 }}>{label as string}</div>
                      <div style={{ color: '#ccc', fontSize: 14 }}>{val as string}</div>
                    </div>
                  ) : null)}
                  {!((user as any).firstName || (user as any).phone) && (
                    <div style={{ color: '#555', fontSize: 13 }}>Aucune information — clique sur Modifier</div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}><Field label="Prénom" placeholder="Olivier" value={profileForm.firstName} onChange={v => setProfileForm(p => ({...p, firstName: v}))} /></div>
                    <div style={{ flex: 1 }}><Field label="Nom" placeholder="Neukomm" value={profileForm.lastName} onChange={v => setProfileForm(p => ({...p, lastName: v}))} /></div>
                  </div>
                  <Field label="Téléphone" placeholder="+41 79 123 45 67" value={profileForm.phone} onChange={v => setProfileForm(p => ({...p, phone: v}))} />
                  <Field label="Société" placeholder="WinWin SA" value={profileForm.company} onChange={v => setProfileForm(p => ({...p, company: v}))} />
                  <Field label="Adresse" placeholder="Bellevue 7, 2950 Courgenay" value={profileForm.address} onChange={v => setProfileForm(p => ({...p, address: v}))} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => setEditingProfile(false)}
                      style={{ flex: 1, background: 'none', border: '1px solid #2a2a2a', borderRadius: 10, color: '#888', padding: '11px', cursor: 'pointer', fontSize: 13 }}>
                      Annuler
                    </button>
                    <button onClick={async () => {
                      setSaving(true);
                      try {
                        await updateProfileMut.mutateAsync(profileForm);
                        setFeedback('✅ Profil mis à jour');
                        setEditingProfile(false);
                      } catch(e: any) {
                        setFeedback('❌ ' + (e.message || 'Erreur'));
                      } finally { setSaving(false); }
                    }}
                    disabled={saving}
                    style={{ ...primaryBtn, flex: 2 }}>
                      {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div style={{ background: '#0d1f2a', border: '1px solid #1a3a4a', borderRadius: 14, padding: 18 }}>
              <div style={{ color: '#60c8f0', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🎁 Offrir un constat via WhatsApp</div>
              <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
                Employé, proche, client en difficulté ? Envoyez un crédit en 3 secondes.
              </div>
              <button style={{ ...primaryBtn, marginTop: 12, background: '#25D366', fontSize: 14 }}>
                📲 Envoyer un crédit
              </button>
            </div>

            {/* Zone dangereuse — Suppression compte */}
            <div style={{ border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 18 }}>
              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>⚠️ Zone dangereuse</div>
              <div style={{ color: '#666', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                Supprimer définitivement ton compte, tes véhicules et tous tes constats. Cette action est irréversible.
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.06)',
                  color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                🗑️ Supprimer mon compte
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



