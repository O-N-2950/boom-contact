import { track } from '../analytics';
import { EVENTS } from '../analytics-events';
import { useState, useEffect } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import type { OCRResult } from '../../../shared/types';

interface AccountPageProps {
  user: {
    id: string;
    email: string;
    role: string;
    credits: number;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    address?: string;
  };
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
  licenseData?: Record<string, unknown>;
  insuranceData?: Record<string, unknown>;
}

export function AccountPage({ user, token, onBack, onLogout, initialTab = 'garage' }: AccountPageProps) {
  const [tab, setTab]                 = useState<PageTab>(initialTab);
  useEffect(() => { track(EVENTS.ACCOUNT_VIEWED); }, []);
  useEffect(() => { if (tab === 'garage') track(EVENTS.GARAGE_VIEWED); }, [tab]);
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
  const [showShare, setShowShare] = useState(false);
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
  const startEdit = (v: Record<string, unknown>) => { setForm({ ...v } as any); setVehicleView('edit'); };

  const handleScanComplete = (result: { registration: OCRResult; greenCard?: OCRResult }) => {
    setScanning(false);
    const reg = result.registration;
    const ins = result.greenCard;
    setForm(prev => ({
      ...prev,
      plate:    reg.vehicle?.licensePlate || prev.plate,
      make:     (reg.vehicle as any)?.make         || prev.make,
      model:    reg.vehicle?.model        || prev.model,
      color:    reg.vehicle?.color        || prev.color,
      year:     reg.vehicle?.year         || prev.year,
      category: reg.vehicle?.category || prev.category,
      licenseData: { ...prev.licenseData, ...reg },
      insuranceData: ins
        ? { ...prev.insuranceData, company: ins.insurance?.company, policyNumber: ins.insurance?.policyNumber, ...ins }
        : prev.insuranceData,
    }));
    toast('✅ Documents scannés et pré-remplis !');
  };

  const handleSave = async () => {
    if (!form.plate && !form.make && !form.nickname) { toast('Ajoutez au moins une information.'); return; }
    setSaving(true);
    try {
      await saveMut.mutateAsync(form as any);
      track(EVENTS.GARAGE_VEHICLE_ADDED);
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
      <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-6" style={{ background: 'rgba(16,32,51,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-[420px] rounded-[20px] p-7 bg-[#FFFFFF]" style={{ border: '1.5px solid rgba(239,68,68,0.35)' }}>
          {/* Icône warning */}
          <div className="text-center text-5xl mb-4">⚠️</div>

          <div className="text-[#DC2626] font-black text-xl text-center mb-2">
            Suppression définitive
          </div>

          <div className="text-[#5D6B7C] text-sm mb-5 text-center leading-[1.7]">
            Tu es sur le point de supprimer le compte<br />
            <strong className="text-[#102033]">{emailToConfirm}</strong>
          </div>

          {/* Ce qui sera supprimé */}
          <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-[#DC2626] font-bold text-xs mb-2.5">CE QUI SERA SUPPRIMÉ DÉFINITIVEMENT :</div>
            {[
              '🗑️ Ton compte et tes identifiants',
              '🚗 Tous tes véhicules enregistrés',
              '📋 Tout ton historique de constats',
              '💳 Tous tes crédits restants',
            ].map((item, i) => (
              <div key={i} className="text-[13px] mb-1.5 flex items-center gap-2 text-[#5D6B7C]">
                {item}
              </div>
            ))}
            <div className="text-[#DC2626] text-xs mt-2.5 font-semibold">
              ⚠️ Cette action est irréversible. Aucune récupération possible.
            </div>
          </div>

          {/* Confirmation par saisie email */}
          <div className="mb-5">
            <label htmlFor="delete-confirm" className="text-[#5D6B7C] text-xs mb-2 block">
              Pour confirmer, saisis ton adresse email :
            </label>
            <input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={emailToConfirm}
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Confirmation de l'adresse email"
              aria-describedby="delete-confirm-help"
              className="w-full rounded-[10px] text-[#102033] text-sm box-border px-3.5 py-3 bg-[#F5F8FC]" style={{ border: '1px solid #DDE7F0', outline: deleteConfirmText === emailToConfirm ? '2px solid #ef4444' : 'none' }}
            />
            <div id="delete-confirm-help" className="text-[11px] text-[#5D6B7C] mt-1">
              Ceci est irréversible.
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-2.5">
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
              className="w-full p-3.5 rounded-xl border-0 font-bold transition-all duration-200 text-[15px]" style={{ background: deleteConfirmText === emailToConfirm ? '#ef4444' : 'rgba(239,68,68,0.15)', color: deleteConfirmText === emailToConfirm ? '#fff' : '#5D6B7C', cursor: deleteConfirmText === emailToConfirm ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Suppression...' : '🗑️ Supprimer définitivement'}
            </button>
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
              className="w-full p-[13px] rounded-xl bg-transparent cursor-pointer text-sm font-semibold text-[#5D6B7C]" style={{ border: '1px solid #DDE7F0' }}
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
      <div className="min-h-screen bg-[#F5F8FC] p-4">
        <div className="mx-auto max-w-[500px]">
          <button onClick={() => setScanning(false)} style={backBtn}>← Annuler</button>
          <p className="text-[#5D6B7C] text-[13px] mb-4">
            Photographiez votre <strong className="text-[#102033]">permis de circuler</strong> et/ou votre <strong className="text-[#102033]">carte verte</strong>.
          </p>
          <OCRScanner role="A" onComplete={handleScanComplete} />
        </div>
      </div>
    );
  }

  // ── Vehicle form ─────────────────────────────────────────────
  if (vehicleView !== 'list') {
    return (
      <div className="min-h-screen bg-[#F5F8FC] p-4">
        <div className="mx-auto max-w-[500px]">
          <button onClick={() => setVehicleView('list')} style={backBtn}>← Garage</button>
          <h2 className="text-[#102033] text-xl font-extrabold mb-1">
            {vehicleView === 'add' ? '➕ Ajouter un véhicule' : '✏️ Modifier le véhicule'}
          </h2>
          <p className="text-[#5D6B7C] text-[13px] mb-5">
            Scannez vos documents pour tout pré-remplir automatiquement.
          </p>

          {feedback && <FeedbackBanner msg={feedback} />}

          <button onClick={() => setScanning(true)} className="w-full rounded-xl cursor-pointer flex items-center gap-3 mb-5 px-4 py-3.5 bg-[#EEF4FA]" style={{ border: '1px solid #DDE7F0' }}>
            <span className="text-[28px]">📄</span>
            <div className="text-left">
              <div className="font-bold text-[#123A5A]">Scanner permis + carte verte</div>
              <div className="text-xs text-[#5D6B7C]">Reconnaissance automatique · multilingue</div>
            </div>
          </button>

          <div className="flex flex-col gap-3">
            <Field label="Surnom" placeholder='ex: "Ma Golf bleue"' value={form.nickname || ''} onChange={v => setForm(p => ({ ...p, nickname: v }))} />
            <Field label="Plaque" placeholder="JU 12345" value={form.plate || ''} onChange={v => setForm(p => ({ ...p, plate: v.toUpperCase() }))} />
            <div className="flex gap-2.5">
              <div className="flex-1"><Field label="Marque" placeholder="Volkswagen" value={form.make || ''} onChange={v => setForm(p => ({ ...p, make: v }))} /></div>
              <div className="flex-1"><Field label="Modèle" placeholder="Golf 8" value={form.model || ''} onChange={v => setForm(p => ({ ...p, model: v }))} /></div>
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1"><Field label="Couleur" placeholder="Bleue" value={form.color || ''} onChange={v => setForm(p => ({ ...p, color: v }))} /></div>
              <div className="flex-1"><Field label="Année" placeholder="2022" value={form.year || ''} onChange={v => setForm(p => ({ ...p, year: v }))} /></div>
            </div>

            {form.insuranceData && Object.keys(form.insuranceData).length > 0 && (
              <div className="rounded-[10px] p-3.5 bg-[#ECFDF3]" style={{ border: '1px solid rgba(22,163,74,0.3)' }}>
                <div className="text-[#16A34A] font-bold text-[13px] mb-1">🛡️ Assurance enregistrée</div>
                {(form.insuranceData as any)?.company && <div className="text-[13px] text-[#5D6B7C]">{(form.insuranceData as any).company}</div>}
                {(form.insuranceData as any)?.policyNumber && <div className="text-[#5D6B7C] text-xs">Police n° {(form.insuranceData as any).policyNumber}</div>}
                <button onClick={() => setScanning(true)} className="mt-2 bg-transparent rounded-lg text-[#16A34A] text-xs cursor-pointer px-3 py-1.5" style={{ border: '1px dashed rgba(22,163,74,0.4)' }}>
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
  const history  = historyQ.data || [];

  return (
    <div className="min-h-screen bg-[#F5F8FC] p-4">
      <div className="mx-auto max-w-[500px]">
        <div className="flex justify-between items-center mb-5">
          <button onClick={onBack} style={backBtn}>← Retour</button>
          <button onClick={onLogout} className="bg-transparent border-0 cursor-pointer text-[13px] font-medium" style={{ color: '#5D6B7C' }}>Déconnexion</button>
        </div>

        {/* Profile card */}
        <h1 className="absolute p-0 overflow-hidden w-px h-px m-[-1px] border-0"  style={{ clip: 'rect(0,0,0,0)' }}>Mon compte boom.contact</h1>
        <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-5" style={{ border: '1px solid #DDE7F0' }}>
          <div className="text-[#FF6B1A] font-black text-xl">💥 boom.contact</div>
          <div className="text-[#5D6B7C] text-[13px] mt-0.5" >{freshUser.email}</div>
          <div className="flex gap-2.5 mt-3.5" >
            <StatBadge value={freshUser.credits === 999999 ? '∞' : freshUser.credits} label="crédits" highlight />
            <StatBadge value={vehicles.length} label={vehicles.length !== 1 ? 'véhicules' : 'véhicule'} />
            <StatBadge value={history.length || '—'} label="constats" />
          </div>
        </div>

        {feedback && <FeedbackBanner msg={feedback} />}

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          {(['garage', 'history', 'profile'] as PageTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className="flex-1 rounded-[10px] text-xs font-bold cursor-pointer px-1.5 py-[9px]" style={{ background: tab === t ? '#FF6B1A' : '#FFFFFF', color: tab === t ? '#fff' : '#102033', border: '1px solid ' + (tab === t ? '#FF6B1A' : '#DDE7F0') }}>
              {t === 'garage' ? '🚗 Garage' : t === 'history' ? '📋 Historique' : '👤 Profil'}
            </button>
          ))}
        </div>

        {/* GARAGE */}
        {tab === 'garage' && (
          <>
            <div className="flex justify-between items-center mb-3">
              <div className="text-[#102033] font-bold">Mon garage ({vehicles.length})</div>
              <button onClick={startAdd} className="bg-[#FF6B1A] text-[#102033] border-0 rounded-lg text-[13px] font-bold cursor-pointer px-3.5 py-2">+ Ajouter</button>
            </div>
            {vehicles.length === 0 && (
              <EmptyState icon="🚗" title="Garage vide" subtitle="Enregistrez vos véhicules une fois. Plus jamais besoin de scanner lors d'un accident.">
                <button onClick={startAdd} className="mt-4 w-auto px-5 py-[11px]" style={{ background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>➕ Ajouter mon premier véhicule</button>
              </EmptyState>
            )}
            {vehicles.map((v: any) => (
              <div key={v.id} className="bg-[#FFFFFF] rounded-[14px] p-4 mb-2.5" style={{ border: '1px solid #DDE7F0' }}>
                <div className="flex justify-between">
                  <div>
                    <div>
                      <div className="text-[#102033] font-bold">{v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule'}</div>
                    </div>
                    {v.plate && <div className="text-sm text-[#123A5A]"  style={{ fontFamily: 'monospace' }}>{v.plate}</div>}
                    <div className="text-xs mt-0.5 text-[#5D6B7C]">{[v.make, v.model, v.color, v.year].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => startEdit(v)} style={iconBtn} aria-label="Modifier le véhicule">✏️</button>
                    <button onClick={() => handleDelete(v.id, v.nickname)} style={iconBtn} aria-label="Supprimer le véhicule">🗑️</button>
                  </div>
                </div>
                {v.insuranceData && Object.keys(v.insuranceData).length > 0
                  ? <div className="mt-2.5 rounded-lg text-xs text-[#16A34A] px-3 py-[7px] bg-[#ECFDF3]">🛡️ {v.insuranceData.company || 'Assurance enregistrée'}{v.insuranceData.policyNumber ? ' · ' + v.insuranceData.policyNumber : ''}</div>
                  : <button onClick={() => startEdit(v)} className="mt-2 bg-transparent rounded-lg text-[11px] cursor-pointer px-2.5 py-[5px] text-[#5D6B7C]" style={{ border: '1px dashed #DDE7F0' }}>+ Ajouter assurance</button>
                }
              </div>
            ))}
          </>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <>
            <div className="text-[#102033] font-bold mb-3">Mes constats ({history.length})</div>
            {historyQ.isLoading && <div className="text-center p-8 text-[#5D6B7C]">Chargement...</div>}
            {!historyQ.isLoading && history.length === 0 && (
              <EmptyState icon="📋" title="Aucun constat" subtitle="Votre prochain constat apparaîtra ici automatiquement." />
            )}
            {history.map((s: any) => {
              const a = s.participantA || {};
              const plate = a.vehicle?.licensePlate || a.licensePlate || '—';
              const date = new Date(s.createdAt).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' });
              const statusIcon = s.status === 'completed' ? '✅' : s.status === 'signing' ? '✍️' : '⏳';
              return (
                <div key={s.id} className="bg-[#FFFFFF] rounded-[14px] p-4 mb-2.5" style={{ border: '1px solid #DDE7F0' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-[#123A5A]"  style={{ fontFamily: 'monospace' }}>{s.id}</div>
                      <div className="text-[#102033] font-semibold mt-0.5" >Plaque : {plate}</div>
                      <div className="text-xs mt-0.5 text-[#5D6B7C]">{date} · {statusIcon} {s.status}</div>
                      {s.accident?.location?.address && <div className="text-[11px] mt-1 text-[#5D6B7C]">📍 {s.accident.location.address}</div>}
                    </div>
                    {s.pdfUrl && (
                      <a href={s.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg text-xs no-underline px-3 py-[7px] bg-[#EEF4FA] text-[#5D6B7C]" style={{ border: '1px solid #DDE7F0' }}>📄 PDF</a>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <div className="flex flex-col gap-3.5">

            {/* Crédits */}
            <div className="bg-[#FFFFFF] rounded-[14px] p-[18px]" style={{ border: '1px solid #DDE7F0' }}>
              <div className="text-[#5D6B7C] text-xs mb-1">CRÉDITS DISPONIBLES</div>
              <div className="text-[#FF6B1A] text-[32px] font-black">{freshUser.credits === 999999 ? '∞' : freshUser.credits}</div>
              <div className="text-xs text-[#5D6B7C]">1 crédit = 1 constat amiable complet</div>
            </div>

            {/* Email — changement */}
            <div className="bg-[#FFFFFF] rounded-[14px] p-[18px]" style={{ border: '1px solid #DDE7F0' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: editingEmail ? 14 : 0 }}>
                <div>
                  <div className="text-[#5D6B7C] text-[11px] font-semibold mb-[3px]" >EMAIL</div>
                  <div className="text-[#102033] text-sm">{freshUser.email || user.email}</div>
                </div>
                <button onClick={() => { setEditingEmail(!editingEmail); setNewEmail(''); setEmailPassword(''); }}
                  className="bg-transparent rounded-lg text-[#5D6B7C] text-xs cursor-pointer px-2.5 py-[5px]" style={{ border: '1px solid #DDE7F0' }}>
                  {editingEmail ? 'Annuler' : 'Modifier →'}
                </button>
              </div>
              {editingEmail && (
                <div className="flex flex-col gap-2.5">
                  <Field label="Nouvel email" placeholder="contact@example.com" value={newEmail} onChange={setNewEmail} />
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
            <div className="bg-[#FFFFFF] rounded-[14px] p-[18px]" style={{ border: '1px solid #DDE7F0' }}>
              <div className="flex justify-between items-center mb-3.5" >
                <div className="text-[#102033] font-bold text-sm">👤 Informations personnelles</div>
                {!editingProfile && (
                  <button onClick={() => {
                    setProfileForm({
                      firstName: user.firstName || '',
                      lastName:  user.lastName  || '',
                      phone:     user.phone     || '',
                      company:   user.company   || '',
                      address:   user.address   || '',
                    });
                    setEditingProfile(true);
                  }}
                  className="bg-transparent rounded-lg text-[#5D6B7C] text-xs cursor-pointer px-2.5 py-[5px]" style={{ border: '1px solid #DDE7F0' }}>
                    Modifier →
                  </button>
                )}
              </div>
              {!editingProfile ? (
                <div className="flex flex-col gap-2">
                  {[
                    ['Prénom', user.firstName],
                    ['Nom', user.lastName],
                    ['Téléphone', user.phone],
                    ['Société', user.company],
                    ['Adresse', user.address],
                  ].map(([label, val]) => val ? (
                    <div key={label as string}>
                      <div className="text-[11px] text-[#5D6B7C]">{label as string}</div>
                      <div className="text-sm text-[#5D6B7C]">{val as string}</div>
                    </div>
                  ) : null)}
                  {!(user.firstName || user.phone) && (
                    <div className="text-[13px] text-[#5D6B7C]">Aucune information — clique sur Modifier</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2.5">
                    <div className="flex-1"><Field label="Prénom" placeholder="Olivier" value={profileForm.firstName} onChange={v => setProfileForm(p => ({...p, firstName: v}))} /></div>
                    <div className="flex-1"><Field label="Nom" placeholder="Neukomm" value={profileForm.lastName} onChange={v => setProfileForm(p => ({...p, lastName: v}))} /></div>
                  </div>
                  <Field label="Téléphone" placeholder="+41 79 123 45 67" value={profileForm.phone} onChange={v => setProfileForm(p => ({...p, phone: v}))} />
                  <Field label="Société" placeholder="Acme SA" value={profileForm.company} onChange={v => setProfileForm(p => ({...p, company: v}))} />
                  <Field label="Adresse" placeholder="Bellevue 7, 2950 Courgenay" value={profileForm.address} onChange={v => setProfileForm(p => ({...p, address: v}))} />
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setEditingProfile(false)}
                      className="flex-1 bg-transparent rounded-[10px] text-[#5D6B7C] cursor-pointer text-[13px] p-[11px]"  style={{ border: '1px solid #DDE7F0' }}>
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

            {/* Partage viral */}
            <div className="rounded-[14px] p-[18px]" style={{ background: 'rgba(255,107,26,0.08)', border: '1px solid rgba(255,107,26,0.25)' }}>
              <div className="font-bold text-sm mb-1.5 text-[#123A5A]">📤 Faire connaître boom.contact</div>
              <div className="text-[#5D6B7C] text-[13px] leading-relaxed mb-3">
                Partage l'app à tes proches, collègues et sur les réseaux. Aide-les avant qu'ils en aient besoin.
              </div>
              <button onClick={() => setShowShare(true)} className="text-sm" style={{ background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}>
                📤 Partager boom.contact
              </button>
            </div>
            {showShare && <ShareBoom onClose={() => setShowShare(false)} context="account" />}

            {/* Zone dangereuse — Suppression compte */}
            <div className="rounded-[14px] p-[18px]" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-[#DC2626] font-bold text-[13px] mb-1.5">⚠️ Zone dangereuse</div>
              <div className="text-[#5D6B7C] text-xs leading-relaxed mb-3">
                Supprimer définitivement ton compte, tes véhicules et tous tes constats. Cette action est irréversible.
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-[11px] rounded-[10px] cursor-pointer text-[13px] font-semibold text-[#DC2626]" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)' }}
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
      <div className="text-[#5D6B7C] text-[11px] font-semibold mb-1 tracking-[0.5px]">{label.toUpperCase()}</div>
      <input aria-label={label} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="rounded-[10px] text-[#102033] text-sm w-full px-3.5 py-[11px] box-border bg-[#EEF4FA]" style={{ border: '1px solid #DDE7F0' }} />
    </div>
  );
}

function StatBadge({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="rounded-[10px] flex-1 px-3.5 py-2 bg-[#EEF4FA] text-center">
      <div className="text-xl font-black" style={{ color: highlight ? '#FF6B1A' : '#102033' }}>{value}</div>
      <div className="text-[11px] text-[#5D6B7C]">{label}</div>
    </div>
  );
}

function FeedbackBanner({ msg }: { msg: string }) {
  const ok = msg.startsWith('✅');
  return <div className="rounded-[10px] mb-4 text-sm px-4 py-3 text-[#5D6B7C]" style={{ background: ok ? '#ECFDF3' : 'rgba(220,38,38,0.08)', border: '1px solid ' + (ok ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.3)') }}>{msg}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-5" style={{ border: '1px solid #DDE7F0' }}>
      <div className="text-[#5D6B7C] text-xs mb-1">{label.toUpperCase()}</div>
      <div className="text-[#102033] text-[15px]">{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] rounded-[14px] p-8 text-center" style={{ border: '1px dashed #DDE7F0' }}>
      <div className="text-[40px] mb-3">{icon}</div>
      <div className="text-[#102033] font-bold mb-1.5">{title}</div>
      <div className="text-[#5D6B7C] text-sm leading-relaxed">{subtitle}</div>
      {children}
    </div>
  );
}

const backBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#5D6B7C', cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: '4px 0', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 };
const primaryBtn: React.CSSProperties = { background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' };
const iconBtn: React.CSSProperties = { background: '#EEF4FA', border: '1px solid #DDE7F0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15 };



