import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareBoom } from '../ShareBoom';
import { trpc } from '../../trpc';

interface PostConstatCTAProps {
  sessionId: string;
  authToken?: string;
  authUser?: { id: string; email: string; role: string; credits: number } | null;
  onLogin: () => void;         // Opens AuthModal
  onAccount: () => void;       // Opens AccountPage
  onBuyPack: () => void;       // Opens PricingPage
}

export const PostConstatCTA = React.memo(function PostConstatCTA({
  sessionId,
  authToken,
  authUser,
  onLogin,
  onAccount,
  onBuyPack,
}: PostConstatCTAProps) {
  const { t } = useTranslation();
  const [waLinkCopied, setWaLinkCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [giftResult, setGiftResult]     = useState('');

  const grantMut = trpc.auth.grantCredits.useMutation();

  const sendGift = async (credits: number) => {
    try {
      const r = await grantMut.mutateAsync({ credits, sendEmail: false });
      window.open(r.waUrl, '_blank');
      setGiftResult(t('postConstat.gift_link_created'));
    } catch (e: any) {
      setGiftResult(t('auth.generic_error') + ' : ' + e.message);
    }
  };

  // ── Mode 1 : Utilisateur NON CONNECTÉ ────────────────────
  if (!authUser) {
    return (
      <div style={containerStyle}>
        {/* Accroche émotionnelle */}
        <div style={headerStyle}>
          <div style={emojiStyle} aria-hidden="true">⚡</div>
          <div>
            <div style={titleStyle}>{t('postConstat.next_time_title')}</div>
            <div style={subtitleStyle}>{t('postConstat.next_time_subtitle')}</div>
          </div>
        </div>

        {/* Avantages */}
        <div style={benefitsGrid}>
          <Benefit icon="🚗" text={t('postConstat.benefit_scanned')} />
          <Benefit icon="⚡" text={t('postConstat.benefit_fast')} />
          <Benefit icon="🎁" text={t('postConstat.benefit_gift')} />
          <Benefit icon="👨‍👩‍👧" text={t('postConstat.benefit_family')} />
        </div>

        {/* CTA principal */}
        <button onClick={onLogin} style={primaryBtnStyle}>
          {t('postConstat.create_account')}
        </button>
        <button onClick={() => setShowShare(true)} className="w-full mt-2 p-3 rounded-[10px] bg-transparent cursor-pointer text-[13px] font-semibold flex items-center justify-center gap-2" style={{ border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(240,237,232,0.6)' }}>
          <span>📤</span> {t('postConstat.share_btn')}
        </button>
        {showShare && <ShareBoom onClose={() => setShowShare(false)} context="post_constat" />}

        {/* Rappel garage — juste après inscription */}
        <div className="mt-2.5 rounded-xl flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
          <span className="text-[22px]">🚗</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold" style={{ color: 'rgba(240,237,232,0.9)' }}>
              {t('postConstat.register_vehicle_title')}
            </div>
            <div className="text-[11px] opacity-70 mt-0.5" >
              {t('postConstat.register_vehicle_subtitle')}
            </div>
          </div>
          <span className="text-base opacity-70" >›</span>
        </div>

        <div style={dividerStyle}>
          <div style={dividerLine} />
          <span style={dividerText}>{t('postConstat.or_skip')}</span>
          <div style={dividerLine} />
        </div>

        {/* Pack famille */}
        <div style={packCardStyle}>
          <div className="flex justify-between items-start mb-2.5">
            <div>
              <div className="font-black text-base text-[#FF5533]">{t('postConstat.family_pack')}</div>
              <div className="text-[#d0d0d0] text-xs mt-0.5" >{t('postConstat.family_pack_desc')}</div>
            </div>
            <div className="text-right">
              <div className="text-white font-black text-[22px]">12.90</div>
              <div className="text-[#d0d0d0] text-[11px]">CHF / EUR</div>
            </div>
          </div>

          {/* Scénarios marketing */}
          <div className="flex gap-1.5 mb-3.5"  style={{ flexDirection: 'column' as const }}>
            <Scenario icon="📱" text={t('postConstat.scenario_child')} />
            <Scenario icon="🏢" text={t('postConstat.scenario_employee')} />
            <Scenario icon="👫" text={t('postConstat.scenario_friend')} />
          </div>

          <button onClick={onBuyPack} style={primaryBtnStyle}>
            {t('postConstat.buy_3_reports')}
          </button>
        </div>

        <button onClick={onBuyPack} style={ghostBtnStyle}>
          {t('postConstat.see_all_packs')}
        </button>
      </div>
    );
  }

  // ── Mode 2 : Connecté, 0 crédit ──────────────────────────
  if (authUser.credits === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={emojiStyle} aria-label="Objectif atteint">🎯</div>
          <div>
            <div style={titleStyle}>{t('postConstat.ready_title')}</div>
            <div style={subtitleStyle}>{t('postConstat.ready_subtitle')}</div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4 bg-[#0d1a0d]" style={{ border: '1px solid #1a3a1a' }}>
          <div className="text-green-400 font-bold mb-2.5">{t('postConstat.account_title')}</div>
          <div className="text-[#d0d0d0] text-[13px] leading-relaxed">
            {t('postConstat.account_desc')}
          </div>
          <button onClick={onAccount} className="mt-2.5 text-xs px-3.5 py-2">
            {t('postConstat.manage_garage')}
          </button>
        </div>

        {/* Packs avec focus "offrir" */}
        <div style={packCardStyle}>
          <div className="font-black text-[15px] mb-1.5 text-[#FF5533]">
            {t('postConstat.gift_title')}
          </div>
          <div className="text-[#d0d0d0] text-[13px] leading-relaxed mb-3.5" dangerouslySetInnerHTML={{ __html: t('postConstat.gift_desc') }} />
          <PackChoice onSelect={onBuyPack} />
        </div>
      </div>
    );
  }

  // ── Mode 3 : Connecté avec crédits ──────────────────────
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={emojiStyle} aria-label="Force et puissance">💪</div>
        <div>
          <div style={titleStyle}>{t('postConstat.credits_available', { count: authUser.credits })}</div>
          <div style={subtitleStyle}>{t('postConstat.share_protect')}</div>
        </div>
      </div>

      {/* Envoyer par WhatsApp */}
      <div className="rounded-xl p-4 mb-3 bg-[#0d1a1a]" style={{ border: '1px solid #1a3a3a' }}>
        <div className="font-bold mb-2 text-[#60c8f0]">{t('postConstat.wa_gift_title')}</div>
        <div className="text-[#d0d0d0] text-[13px] mb-3 leading-relaxed">
          {t('postConstat.wa_gift_desc')}
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendGift(1)} disabled={grantMut.isPending} className="flex-1 text-white border-0 rounded-lg font-bold cursor-pointer text-[13px] px-3 py-[11px] bg-[#25D366]">
            {grantMut.isPending ? '...' : t('postConstat.send_1')}
          </button>
          <button onClick={() => sendGift(3)} disabled={grantMut.isPending || authUser.credits < 3} className="flex-1 rounded-lg font-bold text-[13px]" style={{ background: authUser.credits >= 3 ? '#1da851' : '#1a1a1a', color: authUser.credits >= 3 ? '#fff' : '#aaa', border: `1px solid ${authUser.credits >= 3 ? '#1da851' : '#333'}`, padding: '11px 12px', cursor: authUser.credits >= 3 ? 'pointer' : 'default' }}>
            {t('postConstat.send_3')}
          </button>
        </div>
        {giftResult && <div className="text-green-400 text-xs mt-2">{giftResult}</div>}
      </div>

      {/* Partage viral — après constat */}
      <div className="rounded-xl p-3.5 mb-3" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.2)' }}>
        <div className="font-bold text-sm mb-1.5 text-[#FF5533]">{t('postConstat.share_title')}</div>
        <div className="text-[#d0d0d0] text-[13px] leading-normal mb-2.5">
          {t('postConstat.share_desc')}
        </div>
        <button onClick={() => setShowShare(true)} className="w-full p-[11px] rounded-[10px] border-0 text-white cursor-pointer text-sm font-bold flex items-center justify-center gap-2" style={{ background: 'var(--boom)' }}>
          <span className="text-lg">📤</span> {t('postConstat.share_btn')}
        </button>
      </div>
      {showShare && <ShareBoom onClose={() => setShowShare(false)} context="post_constat" />}

      {/* Garage */}
      <div className="bg-[#111] rounded-xl p-3.5 mb-3" style={{ border: '1px solid #1a1a1a' }}>
        <div className="text-white font-bold mb-1.5">{t('postConstat.memorize_vehicles')}</div>
        <div className="text-[#d0d0d0] text-[13px] leading-normal">
          {t('postConstat.memorize_desc')}
        </div>
        <button onClick={onAccount} className="mt-2.5 text-[13px] px-3.5 py-[9px]">
          {t('postConstat.manage_garage')}
        </button>
      </div>

      {/* Recharger si peu de crédits */}
      {authUser.credits <= 2 && (
        <div className="rounded-xl p-3.5 bg-[#1a1000]" style={{ border: '1px solid #3a2000' }}>
          <div className="font-bold mb-1.5 text-[#fbbf24]">{t('postConstat.low_credits', { count: authUser.credits })}</div>
          <div className="text-[#d0d0d0] text-[13px] mb-2.5">
            {t('postConstat.recharge_desc')}
          </div>
          <button onClick={onBuyPack} style={primaryBtnStyle}>
            {t('postConstat.recharge_btn')}
          </button>
        </div>
      )}
    </div>
  );
});

// ── Sub-components ────────────────────────────────────────────
function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2" style={{ padding: '8px 0', borderBottom: '1px solid #111' }}>
      <span className="text-lg shrink-0">{icon}</span>
      <span className="text-[13px] leading-normal text-[#ccc]">{text}</span>
    </div>
  );
}

function Scenario({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="bg-[#111] rounded-lg flex gap-2.5 items-start px-3 py-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <span className="text-[#d0d0d0] text-xs leading-normal">{text}</span>
    </div>
  );
}

function PackChoice({ onSelect }: { onSelect: () => void }) {
  const { t } = useTranslation();
  const packs = [
    { id: 'single', label: t('postConstat.pack_single_label'), price: '4.90', note: t('postConstat.pack_single_note') },
    { id: 'pack3', label: t('postConstat.pack_pack3_label'), price: '12.90', note: t('postConstat.pack_pack3_note'), star: true },
    { id: 'pack10', label: t('postConstat.pack_pack10_label'), price: '34.90', note: t('postConstat.pack_pack10_note') },
  ];
  return (
    <div className="flex gap-2">
      {packs.map(p => (
        <button key={p.id} onClick={onSelect} className="flex-1 rounded-[10px] cursor-pointer" style={{ background: p.star ? '#D42D00' : '#1a1a1a', border: `1px solid ${p.star ? '#D42D00' : '#333'}`, padding: '10px 8px', textAlign: 'center' as const }}>
          {p.star && <div className="text-white text-[9px] font-bold mb-[3px]" >{t('postConstat.popular_badge')}</div>}
          <div className="text-white font-bold text-[13px]">{p.label}</div>
          <div className="font-black text-base" style={{ color: p.star ? '#ffd0c0' : '#FF5533' }}>CHF {p.price}</div>
          <div className="text-[10px] mt-0.5"  style={{ color: p.star ? 'rgba(255,255,255,0.6)' : '#aaa' }}>{p.note}</div>
        </button>
      ))}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  marginTop: 24,
  borderTop: '1px solid #1a1a1a',
  paddingTop: 24,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 20,
};

const emojiStyle: React.CSSProperties = {
  width: 48, height: 48,
  background: '#D42D00',
  borderRadius: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 24, flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 900,
  fontSize: 18,
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  color: '#d0d0d0',
  fontSize: 13,
  marginTop: 3,
};

const benefitsGrid: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  marginBottom: 20,
  background: '#111',
  borderRadius: 12,
  padding: '4px 16px',
  border: '1px solid #1a1a1a',
};

const packCardStyle: React.CSSProperties = {
  background: '#111',
  border: '1px solid #2a1a0a',
  borderRadius: 14,
  padding: 16,
  marginBottom: 12,
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  background: '#D42D00',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '14px 20px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center' as const,
};

const ghostBtnStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  color: '#d0d0d0',
  border: '1px solid #333',
  borderRadius: 10,
  padding: '11px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center' as const,
};

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '16px 0',
};

const dividerLine: React.CSSProperties = { flex: 1, height: 1, background: '#1a1a1a' };
const dividerText: React.CSSProperties = { color: '#c0c0c0', fontSize: 11, whiteSpace: 'nowrap' as const };
