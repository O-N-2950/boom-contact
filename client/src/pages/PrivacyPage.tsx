interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="min-h-screen bg-[#06060C] text-white" style={{ padding: '0 0 40px' }}>
      <h1 className="absolute p-0 overflow-hidden whitespace-nowrap" style={{ width: 1, height: 1, margin: -1, clip: 'rect(0,0,0,0)', border: 0 }}>Mentions légales et politique de confidentialité — boom.contact</h1>
      {/* Header */}
      <div className="bg-[#06060C] flex items-center gap-3.5 sticky z-10" style={{ borderBottom: '1px solid #1a1a1a', padding: '14px 20px', top: 0 }}>
        <button onClick={onBack} className="bg-transparent border-0 text-[#d0d0d0] cursor-pointer text-lg" aria-label="Retour">←</button>
        <div>
          <div className="font-extrabold text-base text-[#FF5533]">💥 boom.contact</div>
          <div className="text-[#d0d0d0] text-[11px]">Mentions légales & Confidentialité</div>
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 600, padding: '24px 20px' }}>

        {/* Version badge */}
        <div className="bg-[#111] rounded-lg mb-6" style={{ border: '1px solid #222', padding: '8px 14px', display: 'inline-block' }}>
          <span className="text-[#d0d0d0] text-[11px]">Version 1.0 · Mars 2026 · RGPD art. 13 · nLPD Suisse</span>
        </div>

        {/* MENTIONS LÉGALES */}
        <Section title="⚖️ Mentions légales" accent>
          <Row label="Éditeur" value="PEP's Swiss SA" />
          <Row label="Siège social" value="Bellevue 7, 2950 Courgenay, Jura, Suisse" />
          <Row label="Forme juridique" value="Société anonyme de droit suisse" />
          <Row label="Directeur" value="Olivier Neukomm" />
          <Row label="Contact" value="contact@boom.contact" />
          <Row label="DPO (données)" value="privacy@boom.contact" />
          <Row label="Hébergement" value="Railway Corp. (EU West — Paris, France)" />
          <Row label="CDN / Sécurité" value="Cloudflare Inc., San Francisco, USA" />
        </Section>

        {/* RESPONSABLE DE TRAITEMENT */}
        <Section title="🔐 Responsable de traitement (RGPD art. 13)">
          <p>PEP's Swiss SA, Bellevue 7, 2950 Courgenay, Jura, Suisse.</p>
          <p>DPO : <a href="mailto:privacy@boom.contact" className="text-[#FF5533]">privacy@boom.contact</a></p>
        </Section>

        {/* DONNÉES COLLECTÉES */}
        <Section title="📋 Données collectées et finalités">
          <DataTable rows={[
            { data: 'Adresse email', purpose: 'Envoi PDF constat, authentification compte', legal: 'Contrat (art. 6.1.b)', retention: '5 ans' },
            { data: 'Nom, prénom, adresse', purpose: 'Génération constat amiable', legal: 'Contrat (art. 6.1.b)', retention: '30 jours' },
            { data: 'Plaque, véhicule', purpose: 'Constat + garage personnel', legal: 'Contrat (art. 6.1.b)', retention: '30 jours / compte' },
            { data: 'Données assurance', purpose: 'PDF constat + lookup assistance', legal: 'Contrat (art. 6.1.b)', retention: '30 jours / compte' },
            { data: 'GPS / localisation', purpose: 'Lieu de l\'accident sur le constat', legal: 'Contrat (art. 6.1.b)', retention: '30 jours' },
            { data: 'Signature numérique', purpose: 'Validation légale du constat', legal: 'Contrat (art. 6.1.b)', retention: '30 jours' },
            { data: 'Photos de l\'accident', purpose: 'Annexe au constat PDF', legal: 'Contrat (art. 6.1.b)', retention: '30 jours' },
            { data: 'Données paiement', purpose: 'Traitement Stripe (jamais stockées chez nous)', legal: 'Contrat (art. 6.1.b)', retention: '10 ans (légal)' },
            { data: 'Email marketing', purpose: 'Propositions services PEP\'s Swiss SA', legal: 'Consentement (art. 6.1.a)', retention: 'Jusqu\'à retrait' },
          ]} />
        </Section>

        {/* SOUS-TRAITANTS */}
        <Section title="🤝 Sous-traitants (art. 28 RGPD)">
          <SubprocessorRow name="Stripe Inc." location="USA (Privacy Shield + SCCs)" purpose="Paiement sécurisé PCI-DSS" privacy="stripe.com/privacy" />
          <SubprocessorRow name="Resend Inc." location="USA (SCCs)" purpose="Emails transactionnels PDF" privacy="resend.com/legal/privacy-policy" />
          <SubprocessorRow name="Anthropic Inc." location="USA (SCCs)" purpose="OCR documents — sans conservation selon CGU Anthropic" privacy="anthropic.com/privacy" />
          <SubprocessorRow name="OpenAI Inc." location="USA (SCCs)" purpose="Transcription vocale Whisper — sans conservation" privacy="openai.com/privacy" />
          <SubprocessorRow name="Railway Corp." location="USA / EU West (Paris)" purpose="Hébergement serveur et base de données" privacy="railway.app/legal/privacy" />
          <div className="mt-2.5 text-[#d0d0d0] text-xs leading-relaxed">
            Tous les sous-traitants sont liés par des Clauses Contractuelles Types (CCT) conformes à l'art. 46 RGPD et à l'art. 16 nLPD.
          </div>
        </Section>

        {/* COOKIES */}
        <Section title="🍪 Politique de cookies">
          <p className="text-[#d0d0d0] text-[13px] leading-relaxed mb-3">
            boom.contact utilise <strong className="text-white">uniquement des cookies strictement nécessaires</strong> au fonctionnement du service. Aucun cookie publicitaire, de tracking ou d'analyse comportementale n'est utilisé.
          </p>
          <CookieDetailTable rows={[
            { name: 'boom_cgu_accepted', purpose: 'Session constat en cours', duration: '2 heures', type: 'Essentiel' },
            { name: 'boom_flow_a', purpose: 'Sauvegarde du constat en cours', duration: '2 heures', type: 'Essentiel' },
            { name: 'boom_user_token', purpose: 'JWT authentification compte', duration: '30 jours', type: 'Essentiel' },
            { name: 'boom_user', purpose: 'Données profil en cache local', duration: 'Session', type: 'Essentiel' },
            { name: 'boom_cookie_consent', purpose: 'Mémorisation choix cookies', duration: '1 an', type: 'Essentiel' },
            { name: 'boom_police_token', purpose: 'Authentification agents police', duration: '8 heures', type: 'Essentiel' },
            { name: 'i18nextLng', purpose: 'Préférence de langue', duration: '1 an', type: 'Essentiel' },
          ]} />
          <div className="mt-2.5 text-[#d0d0d0] text-xs">
            <strong>Stripe</strong> dépose ses propres cookies lors du paiement (nécessaires à la sécurité PCI-DSS) — voir stripe.com/cookies-policy.<br />
            <strong>Cloudflare</strong> peut déposer un cookie de sécurité (__cf_bm) pour protéger contre les bots.
          </div>
        </Section>

        {/* DROITS */}
        <Section title="🛡️ Vos droits (RGPD + nLPD)">
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[
              { right: 'Accès', desc: 'Obtenir une copie de vos données' },
              { right: 'Rectification', desc: 'Corriger des données inexactes' },
              { right: 'Effacement', desc: '"Droit à l\'oubli" — suppression' },
              { right: 'Portabilité', desc: 'Recevoir vos données en JSON' },
              { right: 'Opposition', desc: 'S\'opposer à un traitement' },
              { right: 'Limitation', desc: 'Restreindre un traitement' },
            ].map(({ right, desc }) => (
              <div key={right} className="bg-[#111] rounded-lg" style={{ border: '1px solid #1a1a1a', padding: '10px 12px' }}>
                <div className="text-green-400 font-bold text-xs">{right}</div>
                <div className="text-[#d0d0d0] text-[11px]" style={{ marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div className="text-[#d0d0d0] text-[13px] leading-relaxed" style={{ marginTop: 14 }}>
            Exercez vos droits par email : <a href="mailto:privacy@boom.contact" className="text-[#FF5533]">privacy@boom.contact</a> — réponse sous 30 jours.<br />
            <br />
            <strong className="text-[#ccc]">Autorités de contrôle :</strong><br />
            🇨🇭 PFPDT (Suisse) — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-[#d0d0d0]">edoeb.admin.ch</a><br />
            🇪🇺 CNIL (France) — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#d0d0d0]">cnil.fr</a><br />
            🇧🇪 APD (Belgique) — <a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" className="text-[#d0d0d0]">dataprotectionauthority.be</a>
          </div>
        </Section>

        {/* SÉCURITÉ */}
        <Section title="🔒 Sécurité des données">
          <ul className="text-[#d0d0d0] text-[13px] m-0" style={{ lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Chiffrement TLS 1.3 sur toutes les communications</li>
            <li>Base de données PostgreSQL avec chiffrement at-rest (Railway)</li>
            <li>Authentification JWT signée (algorithme HS256, secret rotatif)</li>
            <li>Mots de passe hashés via scrypt (résistant au brute-force)</li>
            <li>Suppression automatique des sessions non complétées après 2h</li>
            <li>Suppression automatique des constats après 30 jours</li>
            <li>Audit trail RGPD pour les accès agents police</li>
            <li>Rate limiting sur toutes les routes sensibles</li>
          </ul>
        </Section>

        {/* MISES À JOUR */}
        <Section title="📅 Modifications de la politique">
          <p className="text-[#d0d0d0] text-[13px] leading-relaxed">
            Cette politique peut être mise à jour. La version en vigueur est toujours disponible sur cette page. En cas de modification substantielle, les utilisateurs enregistrés seront informés par email.
          </p>
          <div className="mt-2.5 text-[#d0d0d0] text-xs">
            Version 1.0 — Mars 2026 · PEP's Swiss SA
          </div>
        </Section>

        {/* Contact */}
        <div className="pt-5 text-[#d0d0d0] text-[11px]" style={{ borderTop: '1px solid #1a1a1a', textAlign: 'center' as const, lineHeight: 1.8 }}>
          boom.contact · PEP's Swiss SA · CHE-476.484.632<br />
          Bellevue 7, 2950 Courgenay, Jura, Suisse<br />
          <a href="mailto:privacy@boom.contact" className="text-[#d0d0d0]">privacy@boom.contact</a>
          {' · '}
          <a href="mailto:contact@boom.contact" className="text-[#d0d0d0]">contact@boom.contact</a>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="mb-8">
      <div className="font-extrabold text-base" style={{ color: accent ? '#FF3500' : '#fff', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${accent ? '#FF350020' : '#1a1a1a'}` }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3" style={{ padding: '7px 0', borderBottom: '1px solid #111' }}>
      <div className="text-[#d0d0d0] text-xs shrink-0" style={{ minWidth: 140 }}>{label}</div>
      <div className="text-xs text-[#ccc]">{value}</div>
    </div>
  );
}

function DataTable({ rows }: { rows: { data: string; purpose: string; legal: string; retention: string }[] }) {
  return (
    <div style={{ overflowX: 'auto' as const }}>
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #222' }}>
            {['Données', 'Finalité', 'Base légale', 'Durée'].map(h => (
              <th key={h} className="text-[#d0d0d0] font-semibold" style={{ textAlign: 'left' as const, padding: '8px 10px', letterSpacing: 0.5, whiteSpace: 'nowrap' as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #111' }}>
              <td className="text-white font-medium" style={{ padding: '8px 10px' }}>{r.data}</td>
              <td className="text-[#d0d0d0]" style={{ padding: '8px 10px' }}>{r.purpose}</td>
              <td style={{ padding: '8px 10px', color: '#60c8f0', whiteSpace: 'nowrap' as const }}>{r.legal}</td>
              <td className="text-[#d0d0d0]" style={{ padding: '8px 10px', whiteSpace: 'nowrap' as const }}>{r.retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CookieDetailTable({ rows }: { rows: { name: string; purpose: string; duration: string; type: string }[] }) {
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between items-start" style={{ padding: '8px 0', borderBottom: '1px solid #111' }}>
          <div>
            <div className="text-xs" style={{ color: '#ccc', fontFamily: 'monospace' }}>{r.name}</div>
            <div className="text-[#d0d0d0] text-[11px]">{r.purpose}</div>
          </div>
          <div className="shrink-0 ml-3" style={{ textAlign: 'right' as const }}>
            <div className="text-green-400 text-[10px] font-bold">{r.type}</div>
            <div className="text-[#d0d0d0] text-[10px]">{r.duration}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubprocessorRow({ name, location, purpose, privacy }: { name: string; location: string; purpose: string; privacy: string }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #111' }}>
      <div className="flex justify-between items-start">
        <div className="text-white font-semibold text-[13px]">{name}</div>
        <div className="text-[#d0d0d0] text-[11px]">{location}</div>
      </div>
      <div className="text-[#d0d0d0] text-xs" style={{ marginTop: 2 }}>{purpose}</div>
      <a href={`https://${privacy}`} target="_blank" rel="noopener noreferrer" className="text-[#d0d0d0] text-[11px] underline">{privacy}</a>
    </div>
  );
}
