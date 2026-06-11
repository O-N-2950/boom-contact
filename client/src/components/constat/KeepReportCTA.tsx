// ── Boucle conducteur B ─────────────────────────────────────────
// Affiché au conducteur B (non connecté) après la signature, sous le
// téléchargement du PDF. Motivation native : « conserver MON exemplaire ».
// V1 sans incitation financière (aucune mention de prix — sûr en natif),
// instrumentée pour mesurer le taux de capture réel avant tout cadeau.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../../trpc';
import { track } from '../../analytics';
import { EVENTS } from '../../analytics-events';

interface Props {
  /** Email saisi par B dans le formulaire du constat (pré-rempli). */
  initialEmail?: string;
  /** B est-il déjà connecté ? Si oui, rien à capturer. */
  isLoggedIn: boolean;
}

export const KeepReportCTA = React.memo(function KeepReportCTA({ initialEmail, isLoggedIn }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail || '');
  const [sent, setSent] = useState(false);
  const magicMut = trpc.auth.magicLinkRequest.useMutation();

  React.useEffect(() => {
    if (!isLoggedIn) track(EVENTS.B_KEEP_REPORT_VIEWED);
  }, [isLoggedIn]);

  if (isLoggedIn) return null;

  const valid = /.+@.+\..+/.test(email);

  const submit = () => {
    if (!valid || magicMut.isPending) return;
    magicMut.mutate(
      { email: email.trim() },
      {
        onSuccess: () => {
          setSent(true);
          track(EVENTS.B_KEEP_REPORT_SUBMITTED);
        },
      }
    );
  };

  if (sent) {
    return (
      <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: 'rgba(46,160,67,0.12)', border: '1px solid rgba(46,160,67,0.45)' }}>
        <div className="text-[15px] font-bold mb-1" style={{ color: '#3fb950' }}>
          ✉️ {t('keepReport.sentTitle', { defaultValue: 'Email envoyé !' })}
        </div>
        <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {t('keepReport.sentBody', { defaultValue: 'Ouvrez le lien reçu pour activer votre compte — votre constat y sera conservé.' })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <div className="text-[15px] font-bold mb-1" style={{ color: '#fff' }}>
        🗂️ {t('keepReport.title', { defaultValue: 'Conservez votre exemplaire' })}
      </div>
      <div className="text-[13px] mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {t('keepReport.body', { defaultValue: 'Créez votre compte gratuit en un clic : votre constat y reste accessible, et vous êtes prêt en cas de prochain accident.' })}
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('keepReport.emailPlaceholder', { defaultValue: 'votre@email.com' })}
        autoComplete="email"
        className="w-full rounded-xl px-3 py-2.5 mb-2 text-[14px]"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', outline: 'none' }}
      />
      <button
        onClick={submit}
        disabled={!valid || magicMut.isPending}
        className="w-full rounded-xl py-3 font-bold text-[14px] cursor-pointer"
        style={{ background: valid ? '#e8590c' : 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', opacity: magicMut.isPending ? 0.6 : 1 }}
      >
        {magicMut.isPending
          ? t('keepReport.sending', { defaultValue: 'Envoi…' })
          : t('keepReport.cta', { defaultValue: 'Conserver mon constat — créer mon compte' })}
      </button>
      {magicMut.isError && (
        <div className="text-[12px] mt-2" style={{ color: '#ff7b72' }}>
          {t('keepReport.error', { defaultValue: "L'envoi a échoué. Réessayez dans un instant." })}
        </div>
      )}
    </div>
  );
});
