interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#fff', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: '#06060C', borderBottom: '1px solid #1a1a1a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div>
          <div style={{ color: '#FF3500', fontWeight: 800, fontSize: 16 }}>💥 boom.contact</div>
          <div style={{ color: '#555', fontSize: 11 }}>Mentions légales & Confidentialité</div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>

        {/* Version badge */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '8px 14px', marginBottom: 24, display: 'inline-block' }}>
          <span style={{ color: '#555', fontSize: 11 }}>Version 1.0 · Mars 2026 · RGPD art. 13 · nLPD Suisse</span>
        </div>

        {/* MENTIONS LÉGALES */}
        <Section title="⚖️ Mentions légales" accent>
          <Row label="Éditeur" value="PEP's Swiss SA (Groupe NEUKOMM)" />
          <Row label="Siège social" value="Bellevue 7, 2950 Courgenay, Jura, Suisse" />
          <Row label="Forme juridique" value="Société anonyme de droit suisse" />
          <Row label="Directeur" value="Groupe NEUKOMM" />
          <Row label="Contact" value="contact@boom.contact" />
          <Row label="DPO (données)" value="privacy@boom.contact" />
          <Row label="Hébergement" value="Railway Corp. (EU West — Paris, France)" />
          <Row label="CDN / Sécurité" value="Cloudflare Inc., San Francisco, USA" />
        </Section>

        {/* RESPONSABLE DE TRAITEMENT */}
        <Section title="🔐 Responsable de traitement (RGPD art. 13)">
          <p>PEP's Swiss SA, Bellevue 7, 2950 Courgenay, Jura, Suisse.</p>
          <p>DPO : <a href="mailto:privacy@boom.contact" style={{ color: '#FF3500' }}>privacy@boom.contact</a></p>
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
          <div style={{ marginTop: 10, color: '#555', fontSize: 12, lineHeight: 1.6 }}>
            Tous les sous-traitants sont liés par des Clauses Contractuelles Types (CCT) conformes à l'art. 46 RGPD et à l'art. 16 nLPD.
          </div>
        </Section>

        {/* COOKIES */}
        <Section title="🍪 Politique de cookies">
          <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
            boom.contact utilise <strong style={{ color: '#fff' }}>uniquement des cookies strictement nécessaires</strong> au fonctionnement du service. Aucun cookie publicitaire, de tracking ou d'analyse comportementale n'est utilisé.
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
          <div style={{ marginTop: 10, color: '#555', fontSize: 12 }}>
            <strong>Stripe</strong> dépose ses propres cookies lors du paiement (nécessaires à la sécurité PCI-DSS) — voir stripe.com/cookies-policy.<br />
            <strong>Cloudflare</strong> peut déposer un cookie de sécurité (__cf_bm) pour protéger contre les bots.
          </div>
        </Section>

        {/* DROITS */}
        <Section title="🛡️ Vos droits (RGPD + nLPD)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { right: 'Accès', desc: 'Obtenir une copie de vos données' },
              { right: 'Rectification', desc: 'Corriger des données inexactes' },
              { right: 'Effacement', desc: '"Droit à l\'oubli" — suppression' },
              { right: 'Portabilité', desc: 'Recevoir vos données en JSON' },
              { right: 'Opposition', desc: 'S\'opposer à un traitement' },
              { right: 'Limitation', desc: 'Restreindre un traitement' },
            ].map(({ right, desc }) => (
              <div key={right} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 12 }}>{right}</div>
                <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, color: '#888', fontSize: 13, lineHeight: 1.6 }}>
            Exercez vos droits par email : <a href="mailto:privacy@boom.contact" style={{ color: '#FF3500' }}>privacy@boom.contact</a> — réponse sous 30 jours.<br />
            <br />
            <strong style={{ color: '#ccc' }}>Autorités de contrôle :</strong><br />
            🇨🇭 PFPDT (Suisse) — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" style={{ color: '#555' }}>edoeb.admin.ch</a><br />
            🇪🇺 CNIL (France) — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#555' }}>cnil.fr</a><br />
            🇧🇪 APD (Belgique) — <a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" style={{ color: '#555' }}>dataprotectionauthority.be</a>
          </div>
        </Section>

        {/* SÉCURITÉ */}
        <Section title="🔒 Sécurité des données">
          <ul style={{ color: '#888', fontSize: 13, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
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
          <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6 }}>
            Cette politique peut être mise à jour. La version en vigueur est toujours disponible sur cette page. En cas de modification substantielle, les utilisateurs enregistrés seront informés par email.
          </p>
          <div style={{ marginTop: 10, color: '#444', fontSize: 12 }}>
            Version 1.0 — Mars 2026 · PEP's Swiss SA
          </div>
        </Section>

        {/* Contact */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 20, textAlign: 'center' as const, color: '#444', fontSize: 11, lineHeight: 1.8 }}>
          boom.contact · PEP's Swiss SA · Groupe NEUKOMM<br />
          Bellevue 7, 2950 Courgenay, Jura, Suisse<br />
          <a href="mailto:privacy@boom.contact" style={{ color: '#555' }}>privacy@boom.contact</a>
          {' · '}
          <a href="mailto:contact@boom.contact" style={{ color: '#555' }}>contact@boom.contact</a>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ color: accent ? '#FF3500' : '#fff', fontWeight: 800, fontSize: 16, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${accent ? '#FF350020' : '#1a1a1a'}` }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid #111' }}>
      <div style={{ color: '#666', fontSize: 12, minWidth: 140, flexShrink: 0 }}>{label}</div>
      <div style={{ color: '#ccc', fontSize: 12 }}>{value}</div>
    </div>
  );
}

function DataTable({ rows }: { rows: { data: string; purpose: string; legal: string; retention: string }[] }) {
  return (
    <div style={{ overflowX: 'auto' as const }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #222' }}>
            {['Données', 'Finalité', 'Base légale', 'Durée'].map(h => (
              <th key={h} style={{ textAlign: 'left' as const, color: '#555', padding: '8px 10px', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap' as const }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #111' }}>
              <td style={{ padding: '8px 10px', color: '#fff', fontWeight: 500 }}>{r.data}</td>
              <td style={{ padding: '8px 10px', color: '#888' }}>{r.purpose}</td>
              <td style={{ padding: '8px 10px', color: '#60c8f0', whiteSpace: 'nowrap' as const }}>{r.legal}</td>
              <td style={{ padding: '8px 10px', color: '#666', whiteSpace: 'nowrap' as const }}>{r.retention}</td>
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
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #111' }}>
          <div>
            <div style={{ color: '#ccc', fontSize: 12, fontFamily: 'monospace' }}>{r.name}</div>
            <div style={{ color: '#555', fontSize: 11 }}>{r.purpose}</div>
          </div>
          <div style={{ textAlign: 'right' as const, flexShrink: 0, marginLeft: 12 }}>
            <div style={{ color: '#4ade80', fontSize: 10, fontWeight: 700 }}>{r.type}</div>
            <div style={{ color: '#444', fontSize: 10 }}>{r.duration}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubprocessorRow({ name, location, purpose, privacy }: { name: string; location: string; purpose: string; privacy: string }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #111' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div style={{ color: '#555', fontSize: 11 }}>{location}</div>
      </div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>{purpose}</div>
      <a href={`https://${privacy}`} target="_blank" rel="noopener noreferrer" style={{ color: '#444', fontSize: 11, textDecoration: 'underline' }}>{privacy}</a>
    </div>
  );
}
