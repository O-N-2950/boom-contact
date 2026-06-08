import { track } from '../analytics';
import { useTranslation } from 'react-i18next';
import { EVENTS, creditsBucket } from '../analytics-events';
import { useState, useEffect } from 'react';
import { ShareBoom } from '../components/ShareBoom';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import type { OCRResult } from '../../../shared/types';

// ── Fleet B2B — panneau membres + invitations (owner/fleet_admin) ──
function OrgMembersPanel({ organizationId, name, actorRole }: { organizationId: string; name: string; actorRole?: string }) {
  const { t } = useTranslation();
  const membersQ = trpc.organization.listMembers.useQuery({ organizationId });
  const invitesQ = trpc.organization.listInvites.useQuery({ organizationId });
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'driver' | 'fleet_admin'>('driver');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inviteMut = trpc.organization.inviteMember.useMutation({
    onSuccess: () => {
      track(EVENTS.ORGANIZATION_MEMBER_INVITED, { role, success: true });
      setMsg({ ok: true, text: 'Invitation envoyée par email.' }); setEmail('');
      invitesQ.refetch();
    },
    onError: (e: any) => {
      track(EVENTS.ORGANIZATION_INVITE_FAILED, { role, success: false });
      const m = /already a member/.test(e?.message) ? 'Cette personne est déjà membre.'
        : /invalid email/.test(e?.message) ? 'Adresse email invalide.'
        : /cannot assign|not invitable|admin required/.test(e?.message) ? "Vous n'avez pas le droit d'inviter ce rôle."
        : "L'invitation a échoué.";
      setMsg({ ok: false, text: m });
    },
  });
  const revokeMut = trpc.organization.revokeInvite.useMutation({
    onSuccess: () => { track(EVENTS.ORGANIZATION_INVITE_REVOKED, {}); invitesQ.refetch(); },
  });
  const resendMut = trpc.organization.resendInvite.useMutation({
    onSuccess: () => { track(EVENTS.ORGANIZATION_INVITE_RESENT, {}); setMsg({ ok: true, text: 'Invitation renvoyée par email.' }); invitesQ.refetch(); },
    onError: () => { track(EVENTS.ORGANIZATION_MEMBER_ACTION_FAILED, { reason_code: 'resend', success: false }); setMsg({ ok: false, text: 'Le renvoi a échoué.' }); },
  });
  const roleMut = trpc.organization.updateMemberRole.useMutation({
    onSuccess: () => { track(EVENTS.ORGANIZATION_MEMBER_ROLE_UPDATED, { actor_role: actorRole, success: true }); setMsg({ ok: true, text: 'Rôle mis à jour.' }); membersQ.refetch(); },
    onError: (e: any) => {
      track(EVENTS.ORGANIZATION_MEMBER_ACTION_FAILED, { actor_role: actorRole, reason_code: 'role_update', success: false });
      setMsg({ ok: false, text: /last owner/.test(e?.message) ? 'Impossible de rétrograder le dernier propriétaire.' : "Changement de rôle refusé." });
    },
  });
  const removeMut = trpc.organization.removeMember.useMutation({
    onSuccess: () => { track(EVENTS.ORGANIZATION_MEMBER_REMOVED, { actor_role: actorRole, success: true }); setMsg({ ok: true, text: 'Membre retiré.' }); membersQ.refetch(); },
    onError: (e: any) => {
      track(EVENTS.ORGANIZATION_MEMBER_ACTION_FAILED, { actor_role: actorRole, reason_code: 'remove', success: false });
      setMsg({ ok: false, text: /last owner/.test(e?.message) ? 'Impossible de retirer le dernier propriétaire.' : "Retrait refusé." });
    },
  });

  const ROLE_LABEL: Record<string, string> = { owner: 'Propriétaire', fleet_admin: 'Admin flotte', driver: 'Chauffeur', broker_viewer: 'Courtier', insurer_viewer: 'Assureur' };
  const pending = (invitesQ.data || []).filter((i: any) => i.status === 'pending');
  const ownerCount = (membersQ.data || []).filter((m: any) => m.role === 'owner').length;
  // Droits UI (le serveur reste l'autorité) : owner gère tout sauf rétrograder/retirer le dernier owner ;
  // fleet_admin ne gère que les drivers.
  const canManageMember = (memberRole: string) =>
    actorRole === 'owner' ? true : actorRole === 'fleet_admin' ? memberRole === 'driver' : false;
  const isLastOwner = (memberRole: string) => memberRole === 'owner' && ownerCount <= 1;

  const submit = () => {
    setMsg(null);
    track(EVENTS.ORGANIZATION_MEMBER_INVITE_STARTED, { role });
    inviteMut.mutate({ organizationId, email: email.trim(), role });
  };

  return (
    <div className="rounded-[12px] p-3 mb-4" style={{ background: '#FFFFFF', border: '1px solid #DDE7F0' }}>
      <div className="text-[13px] font-bold text-[#102033] mb-2">Membres · {name}</div>
      <div className="flex flex-col gap-1 mb-3">
        {(membersQ.data || []).map((m: any) => {
          const manageable = canManageMember(m.role) && !isLastOwner(m.role);
          return (
            <div key={m.id} className="flex items-center justify-between text-[12px] py-1.5 gap-2 flex-wrap" style={{ borderTop: '1px solid #EEF4FA' }}>
              <span className="text-[#102033] flex-1 min-w-[120px]">{m.invitedEmail || 'Membre'}</span>
              {manageable && m.role !== 'owner' ? (
                <select value={m.role} disabled={roleMut.isPending}
                  onChange={(e) => { setMsg(null); track(EVENTS.ORGANIZATION_MEMBER_ROLE_UPDATE_STARTED, { actor_role: actorRole, new_role: e.target.value }); roleMut.mutate({ organizationId, memberId: m.id, role: e.target.value as any }); }}
                  className="rounded-md text-[11px] px-1.5 py-1 text-[#123A5A] cursor-pointer" style={{ border: '1px solid #DDE7F0' }}>
                  <option value="driver">{t('account.role.driver', { defaultValue: 'Chauffeur' })}</option>
                  <option value="fleet_admin">{t('account.role.fleet_admin', { defaultValue: 'Admin flotte' })}</option>
                </select>
              ) : (
                <span className="text-[11px] font-bold rounded-md px-2 py-0.5" style={{ color: '#123A5A', background: '#EEF4FA' }}>{t('account.role.'+m.role, { defaultValue: ROLE_LABEL[m.role] || m.role })}</span>
              )}
              {manageable && (
                <button
                  onClick={() => { if (window.confirm(t('account.member.removeConfirm', { defaultValue: "Retirer ce membre ? Il perdra l'accès aux véhicules et crédits de l'entreprise." }))) { setMsg(null); removeMut.mutate({ organizationId, memberId: m.id }); } }}
                  disabled={removeMut.isPending}
                  className="bg-transparent rounded-md text-[11px] font-bold cursor-pointer px-2 py-1 text-[#DC2626] disabled:opacity-50" style={{ border: '1px solid #DC2626' }}>
                  {t('account.member.remove', { defaultValue: 'Retirer' })}
                </button>
              )}
            </div>
          );
        })}
        {(membersQ.data?.length ?? 0) === 0 && <div className="text-[12px] text-[#5D6B7C] py-1">{membersQ.isLoading ? t('account.member.loading', { defaultValue: 'Chargement…' }) : t('account.member.none', { defaultValue: 'Aucun membre.' })}</div>}
      </div>

      <div className="text-[12px] font-bold text-[#102033] mb-1">{t('account.member.invite', { defaultValue: 'Inviter un membre' })}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@entreprise.ch"
          className="flex-1 min-w-[160px] rounded-lg text-[13px] px-3 py-2 text-[#102033]" style={{ border: '1px solid #DDE7F0' }} />
        <select value={role} onChange={(e) => setRole(e.target.value as any)}
          className="rounded-lg text-[13px] px-2 py-2 text-[#102033] cursor-pointer" style={{ border: '1px solid #DDE7F0' }}>
          <option value="driver">{t('account.role.driver', { defaultValue: 'Chauffeur' })}</option>
          <option value="fleet_admin">{t('account.role.fleet_admin', { defaultValue: 'Admin flotte' })}</option>
        </select>
        <button onClick={submit} disabled={inviteMut.isPending || !email.trim()}
          className="bg-[#FF6B1A] text-white border-0 rounded-lg text-[13px] font-bold cursor-pointer px-3.5 py-2 disabled:opacity-50">
          {t('account.member.inviteBtn', { defaultValue: 'Inviter' })}
        </button>
      </div>
      {msg && <div className="text-[12px] mb-2" style={{ color: msg.ok ? '#16A34A' : '#DC2626' }}>{msg.text}</div>}

      {pending.length > 0 && (
        <div className="mt-2">
          <div className="text-[12px] font-bold text-[#102033] mb-1">{t('account.member.pending', { defaultValue: 'Invitations en attente' })}</div>
          {pending.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between text-[12px] py-1 gap-2 flex-wrap" style={{ borderTop: '1px solid #EEF4FA' }}>
              <div className="flex flex-col flex-1 min-w-[140px]">
                <span className="text-[#102033]">{i.email}</span>
                <span className="text-[11px] text-[#5D6B7C]">{t('account.role.'+i.role, { defaultValue: ROLE_LABEL[i.role] || i.role })} · expire le {new Date(i.expiresAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setMsg(null); resendMut.mutate({ organizationId, inviteId: i.id }); }} disabled={resendMut.isPending}
                  className="bg-transparent rounded-lg text-[11px] font-bold cursor-pointer px-2.5 py-1 text-[#123A5A] disabled:opacity-50" style={{ border: '1px solid #123A5A' }}>
                  Renvoyer
                </button>
                <button onClick={() => revokeMut.mutate({ organizationId, inviteId: i.id })} disabled={revokeMut.isPending}
                  className="bg-transparent rounded-lg text-[11px] font-bold cursor-pointer px-2.5 py-1 text-[#DC2626] disabled:opacity-50" style={{ border: '1px solid #DC2626' }}>
                  Révoquer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fleet Finance — panneau historique wallet (owner/fleet_admin), lecture seule ──
function OrgFinancePanel({ organizationId, name }: { organizationId: string; name: string }) {
  const { t } = useTranslation();
  const walletQ = trpc.payment.getOrganizationWallet.useQuery({ organizationId });
  const [cursor, setCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const txQ = trpc.payment.listOrganizationTransactions.useQuery({ organizationId, limit: 10, cursor });

  useEffect(() => { track(EVENTS.FLEET_WALLET_TRANSACTIONS_VIEWED); }, []);
  useEffect(() => {
    if (!txQ.data) return;
    setRows(prev => cursor ? [...prev, ...txQ.data.items] : txQ.data.items);
    setNextCursor(txQ.data.nextCursor);
  }, [txQ.data, cursor]);
  useEffect(() => {
    const c = walletQ.data?.credits;
    if (c == null) return;
    if (c === 0) track(EVENTS.FLEET_WALLET_EMPTY_SEEN);
    else if (c <= 3) track(EVENTS.FLEET_WALLET_LOW_BALANCE_SEEN, { credits_bucket: creditsBucket(c) });
  }, [walletQ.data?.credits]);

  const credits = walletQ.data?.credits ?? 0;
  const badge = credits === 0
    ? { t: 'Aucun crédit', c: '#DC2626', bg: '#FEF2F2' }
    : credits <= 3
    ? { t: 'Solde bas', c: '#B45309', bg: '#FFFBEB' }
    : { t: 'Crédits disponibles', c: '#16A34A', bg: '#ECFDF3' };

  const TYPE_LABEL: Record<string, string> = { purchase: 'Achat', consumption: 'Consommation', adjustment: 'Ajustement', refund: 'Remboursement' };

  const exportCsv = () => {
    track(EVENTS.FLEET_WALLET_EXPORT_CLICKED, { transaction_count_bucket: rows.length > 20 ? '20+' : String(rows.length) });
    const header = ['date', 'type', 'amount', 'balanceAfter', 'reason', 'relatedSessionShort', 'relatedPaymentShort'];
    const lines = rows.map(r => [
      new Date(r.createdAt).toISOString(), r.type, r.amount, r.balanceAfter,
      (r.reason || '').replace(/[",\n]/g, ' '), r.relatedSessionShort || '', r.relatedPaymentShort || '',
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `credits-entreprise-${organizationId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[12px] p-3 mb-4" style={{ background: '#FFFFFF', border: '1px solid #DDE7F0' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-[#102033]">Crédits entreprise · {name}</span>
          <span className="text-[11px] font-bold rounded-md px-2 py-0.5" style={{ color: badge.c, background: badge.bg }}>{badge.t}</span>
          <span className="text-[12px] text-[#5D6B7C]">{credits} crédit{credits > 1 ? 's' : ''}</span>
        </div>
        {walletQ.data?.canExport && rows.length > 0 && (
          <button onClick={exportCsv} className="bg-transparent rounded-lg text-[12px] font-bold cursor-pointer px-3 py-1.5 text-[#123A5A]" style={{ border: '1px solid #123A5A' }}>
            Exporter CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-[#5D6B7C] py-2">{txQ.isLoading ? 'Chargement…' : 'Aucune transaction pour le moment.'}</div>
      ) : (
        <div className="flex flex-col gap-1">
          {rows.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-[12px] py-1.5" style={{ borderTop: '1px solid #EEF4FA' }}>
              <div className="flex flex-col">
                <span className="text-[#102033] font-semibold">{TYPE_LABEL[r.type] || r.type}{r.reason ? ' · ' + r.reason : ''}</span>
                <span className="text-[#5D6B7C] text-[11px]">{new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString().slice(0,5)}{r.relatedPaymentShort ? ' · ' + r.relatedPaymentShort : ''}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold" style={{ color: r.amount >= 0 ? '#16A34A' : '#DC2626' }}>{r.amount >= 0 ? '+' : ''}{r.amount}</span>
                <span className="text-[#5D6B7C]">solde {r.balanceAfter}</span>
              </div>
            </div>
          ))}
          {nextCursor && (
            <button onClick={() => setCursor(nextCursor)} disabled={txQ.isFetching}
              className="bg-transparent border-0 text-[12px] font-bold cursor-pointer text-[#123A5A] mt-1 self-start disabled:opacity-50">
              Voir plus
            </button>
          )}
        </div>
      )}
    </div>
  );
}


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
  organizationId?: string;
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
  const { t } = useTranslation();
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
  const saveOrgMut     = trpc.vehicle.saveOrganization.useMutation();
  const deleteOrgMut   = trpc.vehicle.deleteOrganization.useMutation();
  const accessibleQ    = trpc.vehicle.listAccessible.useQuery(undefined);
  const myOrgsQ        = trpc.organization.listMine.useQuery(undefined);
  const walletsQ       = trpc.payment.myOrganizationWallets.useQuery(undefined);
  const orgCheckoutMut = trpc.payment.createOrgCheckout.useMutation({
    onSuccess: (d: any) => { if (d?.url) window.location.href = d.url; },
    onError:   (e: any) => { toast('Erreur : ' + e.message); },
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('org_credits');
    if (p === 'success') {
      track(EVENTS.FLEET_WALLET_CREDIT_ADDED);
      toast('✅ Crédits entreprise ajoutés !');
      walletsQ.refetch();
      window.history.replaceState({}, '', '/account');
    } else if (p === 'cancelled') {
      window.history.replaceState({}, '', '/account');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (tab === 'garage' && (myOrgsQ.data?.length ?? 0) > 0) track(EVENTS.FLEET_WALLET_VIEWED); }, [tab, myOrgsQ.data]);
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
      if (form.organizationId) {
        await saveOrgMut.mutateAsync(form as any);
        track(EVENTS.FLEET_VEHICLE_ADDED, { scope: 'organization' });
      } else {
        await saveMut.mutateAsync(form as any);
        track(EVENTS.GARAGE_VEHICLE_ADDED);
      }
      await vehicleListQ.refetch();
      await accessibleQ.refetch();
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

  const startAddOrg = (organizationId: string) => { setForm({ organizationId }); setVehicleView('add'); };
  const handleDeleteOrg = async (id: string, name?: string) => {
    if (!confirm('Supprimer ' + (name || 'ce véhicule d\'entreprise') + ' ?')) return;
    try { await deleteOrgMut.mutateAsync({ id }); await accessibleQ.refetch(); }
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
            <div className="text-[#DC2626] font-bold text-xs mb-2.5">{t('account.delete.willDelete', { defaultValue: 'CE QUI SERA SUPPRIMÉ DÉFINITIVEMENT :' })}</div>
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
              aria-label={t('account.fields.confirmEmailAria', { defaultValue: "Confirmation de l'adresse email" })}
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
          <button onClick={() => setScanning(false)} style={backBtn}>← {t('account.scan.cancel', { defaultValue: 'Annuler' })}</button>
          <p className="text-[#5D6B7C] text-[13px] mb-4">
            {t('account.scan.photographPre', { defaultValue: 'Photographiez votre' })} <strong className="text-[#102033]">{t('account.scan.license', { defaultValue: 'permis de circuler' })}</strong> {t('account.scan.and', { defaultValue: 'et/ou votre' })} <strong className="text-[#102033]">{t('account.scan.greenCard', { defaultValue: 'carte verte' })}</strong>.
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
          <button onClick={() => setVehicleView('list')} style={backBtn}>← {t('account.garage.back', { defaultValue: 'Garage' })}</button>
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
              <div className="font-bold text-[#123A5A]">{t('account.scan.title', { defaultValue: 'Scanner permis + carte verte' })}</div>
              <div className="text-xs text-[#5D6B7C]">{t('account.scan.subtitle', { defaultValue: 'Reconnaissance automatique · multilingue' })}</div>
            </div>
          </button>

          <div className="flex flex-col gap-3">
            <Field label={t('account.fields.nickname', { defaultValue: 'Surnom' })} placeholder='ex: "Ma Golf bleue"' value={form.nickname || ''} onChange={v => setForm(p => ({ ...p, nickname: v }))} />
            <Field label={t('account.fields.plate', { defaultValue: 'Plaque' })} placeholder="JU 12345" value={form.plate || ''} onChange={v => setForm(p => ({ ...p, plate: v.toUpperCase() }))} />
            <div className="flex gap-2.5">
              <div className="flex-1"><Field label={t('account.fields.make', { defaultValue: 'Marque' })} placeholder="Volkswagen" value={form.make || ''} onChange={v => setForm(p => ({ ...p, make: v }))} /></div>
              <div className="flex-1"><Field label={t('account.fields.model', { defaultValue: 'Modèle' })} placeholder="Golf 8" value={form.model || ''} onChange={v => setForm(p => ({ ...p, model: v }))} /></div>
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1"><Field label={t('account.fields.color', { defaultValue: 'Couleur' })} placeholder="Bleue" value={form.color || ''} onChange={v => setForm(p => ({ ...p, color: v }))} /></div>
              <div className="flex-1"><Field label={t('account.fields.year', { defaultValue: 'Année' })} placeholder="2022" value={form.year || ''} onChange={v => setForm(p => ({ ...p, year: v }))} /></div>
            </div>

            {form.insuranceData && Object.keys(form.insuranceData).length > 0 && (
              <div className="rounded-[10px] p-3.5 bg-[#ECFDF3]" style={{ border: '1px solid rgba(22,163,74,0.3)' }}>
                <div className="text-[#16A34A] font-bold text-[13px] mb-1">🛡️ {t('account.insurance.saved', { defaultValue: t('account.insurance.saved', { defaultValue: 'Assurance enregistrée' }) })}</div>
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
          <button onClick={onBack} style={backBtn}>← {t('constat.nav.back', { defaultValue: 'Retour' })}</button>
          <button onClick={onLogout} className="bg-transparent border-0 cursor-pointer text-[13px] font-medium" style={{ color: '#5D6B7C' }}>{t('account.nav.logout', { defaultValue: 'Déconnexion' })}</button>
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
              <div className="text-[#102033] font-bold">{t('account.garage.title', { defaultValue: 'Mon garage' })} ({vehicles.length})</div>
              <button onClick={startAdd} className="bg-[#FF6B1A] text-[#102033] border-0 rounded-lg text-[13px] font-bold cursor-pointer px-3.5 py-2">+ {t('account.garage.add', { defaultValue: 'Ajouter' })}</button>
            </div>
            {vehicles.length === 0 && (
              <EmptyState icon="🚗" title={t('account.garage.emptyTitle', { defaultValue: 'Garage vide' })} subtitle={t('account.garage.emptySubtitle', { defaultValue: "Enregistrez vos véhicules une fois. Plus jamais besoin de scanner lors d'un accident." })}>
                <button onClick={startAdd} className="mt-4 w-auto px-5 py-[11px]" style={{ background: '#FF6B1A', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>➕ {t('account.garage.addFirst', { defaultValue: 'Ajouter mon premier véhicule' })}</button>
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
                    <button onClick={() => startEdit(v)} style={iconBtn} aria-label={t('account.vehicle.edit', { defaultValue: 'Modifier le véhicule' })}>✏️</button>
                    <button onClick={() => handleDelete(v.id, v.nickname)} style={iconBtn} aria-label={t('account.vehicle.delete', { defaultValue: 'Supprimer le véhicule' })}>🗑️</button>
                  </div>
                </div>
                {v.insuranceData && Object.keys(v.insuranceData).length > 0
                  ? <div className="mt-2.5 rounded-lg text-xs text-[#16A34A] px-3 py-[7px] bg-[#ECFDF3]">🛡️ {v.insuranceData.company || 'Assurance enregistrée'}{v.insuranceData.policyNumber ? ' · ' + v.insuranceData.policyNumber : ''}</div>
                  : <button onClick={() => startEdit(v)} className="mt-2 bg-transparent rounded-lg text-[11px] cursor-pointer px-2.5 py-[5px] text-[#5D6B7C]" style={{ border: '1px dashed #DDE7F0' }}>+ {t('account.insurance.add', { defaultValue: 'Ajouter assurance' })}</button>
                }
              </div>
            ))}

            {/* ── Véhicules d'entreprise — visible UNIQUEMENT si membre d'une organisation ── */}
            {(myOrgsQ.data?.length ?? 0) > 0 && (() => {
              const orgVehicles = (accessibleQ.data || []).filter((v: any) => v.scope === 'organization');
              const manageableOrgs = (myOrgsQ.data || []).filter((o: any) => o.role === 'owner' || o.role === 'fleet_admin');
              return (
                <div className="mt-7 pt-5" style={{ borderTop: '1px solid #DDE7F0' }}>
                  <div className="text-[#102033] font-bold mb-3">🏢 Véhicules d'entreprise ({orgVehicles.length})</div>
                  {(walletsQ.data || []).map((w: any) => (
                    <div key={w.organizationId}>
                    <div className="rounded-[12px] p-3 mb-3 flex items-center justify-between flex-wrap gap-2" style={{ background: '#EEF4FA', border: '1px solid #DDE7F0' }}>
                      <div>
                        <div className="text-[13px] font-bold text-[#123A5A]">Crédits entreprise · {w.name}</div>
                        <div className="text-[12px] text-[#5D6B7C]">{w.balance > 0 ? w.balance + ' crédit' + (w.balance > 1 ? 's' : '') + ' disponibles' : 'Aucun crédit entreprise — les constats utilisent vos crédits personnels'}</div>
                      </div>
                      {(w.canManageBilling) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-[#5D6B7C] mr-1">{t('account.credits.buy', { defaultValue: 'Acheter :' })}</span>
                          {([['single','1'],['pack3','3'],['pack10','10']] as const).map(([pid, lbl]) => (
                            <button key={pid}
                              onClick={() => orgCheckoutMut.mutate({ organizationId: w.organizationId, packageId: pid as any, currency: 'EUR', locale: (navigator.language || 'fr').split('-')[0] })}
                              disabled={orgCheckoutMut.isPending}
                              className="bg-[#123A5A] text-white border-0 rounded-lg text-[12px] font-bold cursor-pointer px-3 py-1.5 disabled:opacity-50">
                              {lbl} crédit{lbl !== '1' ? 's' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {w.canManageBilling && <OrgMembersPanel organizationId={w.organizationId} name={w.name} actorRole={(myOrgsQ.data || []).find((o: any) => o.id === w.organizationId)?.role} />}
                    {w.canManageBilling && <OrgFinancePanel organizationId={w.organizationId} name={w.name} />}
                    </div>
                  ))}
                  {manageableOrgs.map((o: any) => (
                    <button key={o.id} onClick={() => startAddOrg(o.id)} className="bg-[#123A5A] text-white border-0 rounded-lg text-[13px] font-bold cursor-pointer px-3.5 py-2 mb-2 mr-2">
                      + Ajouter pour {o.name}
                    </button>
                  ))}
                  {orgVehicles.length === 0 && (
                    <div className="text-[13px] text-[#5D6B7C] mt-1">{t('account.garage.noOrgVehicles', { defaultValue: "Aucun véhicule d'entreprise pour le moment." })}</div>
                  )}
                  {orgVehicles.map((v: any) => (
                    <div key={v.id} className="bg-[#FFFFFF] rounded-[14px] p-4 mb-2.5 mt-2" style={{ border: '1px solid #DDE7F0', borderLeft: '3px solid #123A5A' }}>
                      <div className="flex justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#102033] font-bold">{v.label || 'Véhicule'}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#123A5A', background: '#EEF4FA', border: '1px solid #DDE7F0', borderRadius: 6, padding: '2px 7px' }}>🏢 {v.organizationName || 'Entreprise'}</span>
                          </div>
                          {v.plate && <div className="text-sm text-[#123A5A]" style={{ fontFamily: 'monospace' }}>{v.plate}</div>}
                          <div className="text-xs mt-0.5 text-[#5D6B7C]">{[v.make, v.model, v.color, v.year].filter(Boolean).join(' · ')}</div>
                        </div>
                        {v.canManage && (
                          <div className="flex gap-1.5">
                            <button onClick={() => startEdit(v)} style={iconBtn} aria-label={t('account.vehicle.editOrg', { defaultValue: "Modifier le véhicule d'entreprise" })}>✏️</button>
                            <button onClick={() => handleDeleteOrg(v.id, v.label)} style={iconBtn} aria-label={t('account.vehicle.deleteOrg', { defaultValue: "Supprimer le véhicule d'entreprise" })}>🗑️</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <>
            <div className="text-[#102033] font-bold mb-3">Mes constats ({history.length})</div>
            {historyQ.isLoading && <div className="text-center p-8 text-[#5D6B7C]">{t('account.history.loading', { defaultValue: 'Chargement...' })}</div>}
            {!historyQ.isLoading && history.length === 0 && (
              <EmptyState icon="📋" title={t('account.history.empty', { defaultValue: 'Aucun constat' })} subtitle={t('account.history.emptySub', { defaultValue: 'Votre prochain constat apparaîtra ici automatiquement.' })} />
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
              <div className="text-[#5D6B7C] text-xs mb-1">{t('account.credits.available', { defaultValue: 'CRÉDITS DISPONIBLES' })}</div>
              <div className="text-[#FF6B1A] text-[32px] font-black">{freshUser.credits === 999999 ? '∞' : freshUser.credits}</div>
              <div className="text-xs text-[#5D6B7C]">{t('account.credits.unit', { defaultValue: '1 crédit = 1 constat amiable complet' })}</div>
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
                  <Field label={t('account.fields.newEmail', { defaultValue: 'Nouvel email' })} placeholder="contact@example.com" value={newEmail} onChange={setNewEmail} />
                  <Field label={t('account.fields.currentPwd', { defaultValue: 'Mot de passe actuel (confirmation)' })} placeholder="••••••••" value={emailPassword} onChange={setEmailPassword} />
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
                <div className="text-[#102033] font-bold text-sm">👤 {t('account.personal.title', { defaultValue: 'Informations personnelles' })}</div>
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
                    <div className="text-[13px] text-[#5D6B7C]">{t('account.personal.none', { defaultValue: 'Aucune information — clique sur Modifier' })}</div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2.5">
                    <div className="flex-1"><Field label={t('account.fields.firstName', { defaultValue: 'Prénom' })} placeholder="Olivier" value={profileForm.firstName} onChange={v => setProfileForm(p => ({...p, firstName: v}))} /></div>
                    <div className="flex-1"><Field label={t('account.fields.lastName', { defaultValue: 'Nom' })} placeholder="Neukomm" value={profileForm.lastName} onChange={v => setProfileForm(p => ({...p, lastName: v}))} /></div>
                  </div>
                  <Field label={t('account.fields.phone', { defaultValue: 'Téléphone' })} placeholder="+41 79 123 45 67" value={profileForm.phone} onChange={v => setProfileForm(p => ({...p, phone: v}))} />
                  <Field label={t('account.fields.company', { defaultValue: 'Société' })} placeholder="Acme SA" value={profileForm.company} onChange={v => setProfileForm(p => ({...p, company: v}))} />
                  <Field label={t('account.fields.address', { defaultValue: 'Adresse' })} placeholder="Bellevue 7, 2950 Courgenay" value={profileForm.address} onChange={v => setProfileForm(p => ({...p, address: v}))} />
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
              <div className="text-[#DC2626] font-bold text-[13px] mb-1.5">⚠️ {t('account.danger.title', { defaultValue: 'Zone dangereuse' })}</div>
              <div className="text-[#5D6B7C] text-xs leading-relaxed mb-3">
                {t('account.delete.text', { defaultValue: 'Supprimer définitivement ton compte, tes véhicules et tous tes constats. Cette action est irréversible.' })}
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



