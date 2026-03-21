import { useState } from 'react';

interface Props {
  onAccept: (email: string, consentMarketing: boolean) => void;
  onClose: () => void;
}

export function CGUModal({ onAccept, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [consentCGU, setConsentCGU] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [tab, setTab] = useState<'cgu' | 'privacy'>('cgu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = email.includes('@') && consentCGU;

  const handleSubmit = async () => {
    if (!canProceed) return;
    setLoading(true);
    setError(null);
    try {
      await fetch('/trpc/user.saveConsent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consentCGU: true,
          consentMarketing,
          language: navigator.language?.split('-')[0] || 'fr',
        }),
      });
      onAccept(email, consentMarketing);
    } catch (err) {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#0E0E18',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px 24px 0 0',
        maxHeight: '90svh',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--boom)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💥</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>boom.contact</div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.4, fontFamily: 'DM Mono, monospace', letterSpacing: 1, marginBottom: 16 }}>AVANT DE CONTINUER</div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 0 }}>
            {([['cgu', 'CGU'], ['privacy', 'Confidentialité']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === id ? 'var(--boom)' : 'rgba(240,237,232,0.45)',
                borderBottom: tab === id ? '2px solid var(--boom)' : '2px solid transparent',
                fontSize: 12, fontWeight: tab === id ? 700 : 400,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {tab === 'cgu' ? (
            <div style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(240,237,232,0.75)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>Conditions Générales d'Utilisation</div>
              <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 16, fontFamily: 'monospace' }}>Version 1.0 — Mars 2026 · PEP's Swiss SA</div>

              {[
                {
                  title: '1. Objet',
                  text: 'boom.contact est un service numérique édité par PEP\'s Swiss SA (ci-après "PEP\'s Swiss"), Bellevue 7, 2950 Courgenay, Jura, Suisse. Il permet l\'établissement de constats amiables d\'accident numériques conformes au standard européen CEA.'
                },
                {
                  title: '2. Acceptation',
                  text: 'L\'utilisation du service implique l\'acceptation des présentes CGU. Toute utilisation à des fins illicites, frauduleuses ou contraires à l\'ordre public est strictement interdite.'
                },
                {
                  title: '3. Description du service',
                  text: 'boom.contact permet : (a) la capture de documents par OCR (permis, carte verte) ; (b) le partage d\'une session temps réel entre deux conducteurs via QR code ; (c) la génération d\'un PDF conforme CEA signé numériquement ; (d) l\'envoi du PDF par email à chaque conducteur. Le service ne se substitue pas à l\'obligation légale de chaque conducteur de déclarer le sinistre à son propre assureur dans les délais prévus par son contrat.'
                },
                {
                  title: '4. Tarification',
                  text: 'L\'accès au service est payant selon les packages disponibles au moment de l\'achat. Les prix sont affichés TTC. Le paiement s\'effectue via Stripe, prestataire certifié PCI-DSS. Chaque package correspond à un nombre de crédits permettant d\'initier des constats. Les crédits n\'ont pas de date d\'expiration. Aucun remboursement ne peut être accordé une fois un constat finalisé et le PDF généré.'
                },
                {
                  title: '5. Valeur légale',
                  text: 'Le PDF généré respecte le formulaire harmonisé CEA (Conseil des Bureaux Européens d\'Assurance). Sa valeur légale est équivalente au constat papier dans les pays membres de la convention CEA. PEP\'s Swiss SA ne garantit pas son acceptation dans tous les pays et recommande de conserver le PDF et de le transmettre dans les délais légaux à son assureur.'
                },
                {
                  title: '6. Responsabilité',
                  text: 'PEP\'s Swiss SA ne saurait être tenue responsable : (a) des erreurs de saisie ou d\'OCR non corrigées par l\'utilisateur ; (b) du refus d\'un assureur d\'accepter le constat ; (c) de tout litige entre les conducteurs. La responsabilité de PEP\'s Swiss SA est limitée au montant payé pour le service.'
                },
                {
                  title: '7. Propriété intellectuelle',
                  text: 'Le logiciel, les marques, logos et contenus de boom.contact sont la propriété exclusive de PEP\'s Swiss SA. Toute reproduction sans autorisation est interdite.'
                },
                {
                  title: '8. Droit applicable',
                  text: 'Les présentes CGU sont soumises au droit suisse. Tout litige sera soumis à la juridiction exclusive des tribunaux du canton du Jura, Suisse.'
                },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 12 }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, lineHeight: 1.75, color: 'rgba(240,237,232,0.75)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>Politique de Confidentialité & RGPD</div>
              <div style={{ fontSize: 10, opacity: 0.4, marginBottom: 16, fontFamily: 'monospace' }}>Conforme RGPD UE 2016/679 et nLPD Suisse · Mars 2026</div>

              {[
                {
                  title: 'Responsable de traitement',
                  text: 'PEP\'s Swiss SA, Bellevue 7, 2950 Courgenay, Jura, Suisse. Contact DPO : privacy@boom.contact'
                },
                {
                  title: 'Données collectées',
                  text: 'Dans le cadre du service : adresse email, nom/prénom, adresse (extraits des documents OCR), plaque d\'immatriculation, données du véhicule, coordonnées GPS de l\'accident, signatures digitales, données d\'assurance (nom de la compagnie, numéro de police). Ces données sont strictement nécessaires à la prestation du service.'
                },
                {
                  title: 'Base légale',
                  text: 'Traitement nécessaire à l\'exécution du contrat (art. 6.1.b RGPD) pour les données du constat. Consentement explicite (art. 6.1.a RGPD) pour toute utilisation commerciale secondaire.'
                },
                {
                  title: 'Durée de conservation',
                  text: 'Sessions actives : 2 heures. PDFs et données de constat : 30 jours puis suppression automatique. Données comptables (paiements) : 10 ans (obligation légale). Email et consentements : jusqu\'à retrait du consentement.'
                },
                {
                  title: 'Partage des données',
                  text: 'Vos données ne sont JAMAIS vendues à des tiers. Elles peuvent être partagées avec : (a) Stripe Inc. pour le traitement des paiements ; (b) Resend Inc. pour l\'envoi des emails transactionnels ; (c) Anthropic Inc. pour l\'analyse OCR des documents (données traitées sans conservation selon les CGU Anthropic). Si vous y consentez expressément (case optionnelle ci-dessous), PEP\'s Swiss SA pourra utiliser votre email pour vous proposer des services complémentaires de ses applications (gestion de sinistres, conseil en assurance, services financiers).'
                },
                {
                  title: 'Vos droits',
                  text: 'Accès, rectification, effacement, portabilité, opposition. Demande à : privacy@boom.contact. Réponse sous 30 jours. Droit de recours auprès du PFPDT (Suisse) ou de votre autorité nationale de protection des données.'
                },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontSize: 12 }}>{s.title}</div>
                  <div>{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action area */}
        <div style={{ padding: '16px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, letterSpacing: 0.5 }}>Votre email (pour recevoir le PDF)</div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="input-boom"
              style={{ width: '100%' }}
            />
          </div>

          {/* CGU obligatoire */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10, cursor: 'pointer' }}>
            <div onClick={() => setConsentCGU(!consentCGU)} style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: consentCGU ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
              background: consentCGU ? 'var(--boom)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {consentCGU && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.8 }}>
              J'accepte les{' '}
              <span onClick={() => setTab('cgu')} style={{ color: 'var(--boom)', cursor: 'pointer', textDecoration: 'underline' }}>CGU</span>
              {' '}et la{' '}
              <span onClick={() => setTab('privacy')} style={{ color: 'var(--boom)', cursor: 'pointer', textDecoration: 'underline' }}>Politique de confidentialité</span>
              {' '}<span style={{ color: 'var(--boom)' }}>*</span>
            </div>
          </label>

          {/* Marketing optionnel */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, cursor: 'pointer' }}>
            <div onClick={() => setConsentMarketing(!consentMarketing)} style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: consentMarketing ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
              background: consentMarketing ? '#22c55e' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              {consentMarketing && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.65 }}>
              J'accepte que PEP's Swiss SA utilise mon email pour me proposer des services complémentaires de ses applications (gestion de sinistres, assurances, services financiers). <span style={{ opacity: 0.5 }}>Optionnel — révocable à tout moment.</span>
            </div>
          </label>

          {error && (
            <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', fontSize: 12, color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canProceed || loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 12, border: 'none',
              background: canProceed ? 'var(--boom)' : 'rgba(255,255,255,0.08)',
              color: canProceed ? '#fff' : 'rgba(255,255,255,0.3)',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
            }}
          >
            {loading ? '⏳ Enregistrement…' : 'Continuer →'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, opacity: 0.3 }}>
            * Obligatoire pour utiliser le service
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
