/**
 * Pages légales pré-rendues côté serveur (HTML statique, HTTP 200, SANS JS requis).
 *
 * Objectif : les examinateurs/robots des stores (Google Play « Sécurité des données »,
 * App Store) et un simple `curl` doivent obtenir le CONTENU RÉEL en 200, sans exécuter
 * le JavaScript de la SPA React.
 *
 * Ces routes sont servies AVANT express.static et le wildcard SPA (voir index.ts).
 * Elles sont 100 % publiques (aucune authentification) et ne contiennent AUCUN prix,
 * achat, ni lien de paiement (respect du modèle « zéro-paiement natif »).
 *
 * Contenu fidèle à client/src/pages/PrivacyPage.tsx (mêmes durées de conservation,
 * même éditeur, même contact). Éditeur : PEP's Swiss SA — Groupe NEUKOMM.
 */

type Lang = 'fr' | 'en' | 'de' | 'it';

const SUPPORTED: Lang[] = ['fr', 'en', 'de', 'it'];

function pickLang(input?: string): Lang {
  const l = (input || '').slice(0, 2).toLowerCase();
  return (SUPPORTED as string[]).includes(l) ? (l as Lang) : 'fr';
}

// Charte NEO : fond sombre, accent orange, texte clair.
const SHELL = (title: string, bodyHtml: string, lang: Lang) => `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — boom.contact</title>
<meta name="robots" content="index, follow">
<meta name="description" content="${title} — boom.contact, PEP's Swiss SA (Groupe NEUKOMM).">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#06060C; color:#E8EAF0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; line-height:1.65; }
  .wrap { max-width:760px; margin:0 auto; padding:40px 22px 80px; }
  header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  header .logo { font-size:26px; }
  header .brand { font-weight:800; font-size:20px; color:#fff; }
  h1 { font-size:26px; color:#fff; margin:24px 0 6px; line-height:1.25; }
  .sub { color:#8A93A6; font-size:14px; margin-bottom:28px; }
  h2 { font-size:18px; color:#FF5533; margin:32px 0 10px; }
  p, li { color:#C7CDDA; font-size:15.5px; }
  a { color:#6BB8E8; }
  ul { padding-left:20px; }
  li { margin:6px 0; }
  .box { background:#0F0F1A; border:1px solid #1E2233; border-radius:14px; padding:18px 20px; margin:18px 0; }
  .langbar { margin-bottom:20px; font-size:14px; }
  .langbar a { margin-right:14px; text-decoration:none; }
  footer { margin-top:48px; padding-top:22px; border-top:1px solid #1E2233; color:#8A93A6; font-size:13px; }
  .cta { display:inline-block; margin-top:6px; background:#FF5533; color:#fff; text-decoration:none; padding:12px 20px; border-radius:12px; font-weight:700; }
  strong { color:#E8EAF0; }
</style>
</head>
<body>
<div class="wrap">
<header><span class="logo">💥</span><span class="brand">boom.contact</span></header>
${bodyHtml}
<footer>
  boom.contact · PEP's Swiss SA — Groupe NEUKOMM · CHE-476.484.632<br>
  Bellevue 7, 2950 Courgenay, Jura, Suisse · <a href="mailto:privacy@boom.contact">privacy@boom.contact</a>
</footer>
</div>
</body>
</html>`;

const langbar = (path: string) =>
  `<div class="langbar">` +
  SUPPORTED.map(l => `<a href="${path}?lang=${l}">${l.toUpperCase()}</a>`).join('') +
  `</div>`;

/* ─────────────────────── SUPPRESSION DE COMPTE ─────────────────────── */

const DELETION: Record<Lang, { title: string; body: string }> = {
  fr: {
    title: 'Suppression de compte',
    body: `
      <h1>Suppression de votre compte boom.contact</h1>
      <div class="sub">Application « boom.contact » · Éditeur : PEP's Swiss SA — Groupe NEUKOMM</div>
      ${langbar('/supprimer-compte')}
      <p>Vous pouvez demander la suppression de votre compte boom.contact et des données associées à tout moment, par l'une des deux voies suivantes.</p>

      <h2>1. Directement dans l'application</h2>
      <p>Ouvrez l'application, puis&nbsp;: <strong>Compte → « Supprimer mon compte »</strong>. La suppression est immédiate après confirmation.</p>

      <h2>2. Par email (voie hors application)</h2>
      <p>Écrivez à <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> depuis l'adresse email de votre compte, en indiquant « Suppression de compte ». Nous traitons la demande sous 30 jours.</p>

      <h2>Données supprimées</h2>
      <ul>
        <li>Votre compte et vos identifiants&nbsp;;</li>
        <li>Vos constats d'accident&nbsp;;</li>
        <li>Les photos, notes vocales et croquis liés&nbsp;;</li>
        <li>Les signatures numériques&nbsp;;</li>
        <li>Les données de véhicule et d'assurance saisies.</li>
      </ul>

      <h2>Données éventuellement conservées</h2>
      <p>Certaines données peuvent être conservées uniquement lorsque la loi l'exige (par exemple à des fins comptables ou en cas de procédure). Le cas échéant&nbsp;:</p>
      <ul>
        <li>Pièces comptables liées à un paiement&nbsp;: jusqu'à <strong>10 ans</strong> (obligation légale suisse).</li>
        <li>En dehors de ces obligations, les constats sont supprimés automatiquement après <strong>30 jours</strong>, et les sessions non complétées après <strong>2 heures</strong>.</li>
      </ul>
      <div class="box">Après suppression, les données ne sont plus accessibles et sont effacées de nos systèmes de production, sous réserve des obligations légales ci-dessus.</div>

      <a class="cta" href="mailto:privacy@boom.contact?subject=Suppression%20de%20compte">Demander la suppression par email</a>
    `,
  },
  en: {
    title: 'Account deletion',
    body: `
      <h1>Delete your boom.contact account</h1>
      <div class="sub">App “boom.contact” · Publisher: PEP's Swiss SA — Groupe NEUKOMM</div>
      ${langbar('/account-deletion')}
      <p>You may request deletion of your boom.contact account and associated data at any time, in one of two ways.</p>

      <h2>1. Directly in the app</h2>
      <p>Open the app, then&nbsp;: <strong>Account → “Delete my account”</strong>. Deletion is immediate after confirmation.</p>

      <h2>2. By email (out-of-app)</h2>
      <p>Email <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> from your account's email address with the subject “Account deletion”. We process requests within 30 days.</p>

      <h2>Data that is deleted</h2>
      <ul>
        <li>Your account and credentials;</li>
        <li>Your accident reports;</li>
        <li>Related photos, voice notes and sketches;</li>
        <li>Digital signatures;</li>
        <li>Vehicle and insurance data you entered.</li>
      </ul>

      <h2>Data that may be retained</h2>
      <p>Some data may be kept only where required by law (e.g. accounting or legal proceedings):</p>
      <ul>
        <li>Accounting records linked to a payment: up to <strong>10 years</strong> (Swiss legal requirement).</li>
        <li>Otherwise, reports are automatically deleted after <strong>30 days</strong>, and incomplete sessions after <strong>2 hours</strong>.</li>
      </ul>
      <div class="box">After deletion, data is no longer accessible and is erased from our production systems, subject to the legal obligations above.</div>

      <a class="cta" href="mailto:privacy@boom.contact?subject=Account%20deletion">Request deletion by email</a>
    `,
  },
  de: {
    title: 'Kontolöschung',
    body: `
      <h1>Ihr boom.contact-Konto löschen</h1>
      <div class="sub">App „boom.contact“ · Herausgeber: PEP's Swiss SA — Groupe NEUKOMM</div>
      ${langbar('/account-deletion')}
      <p>Sie können die Löschung Ihres boom.contact-Kontos und der zugehörigen Daten jederzeit auf zwei Wegen beantragen.</p>

      <h2>1. Direkt in der App</h2>
      <p>Öffnen Sie die App, dann&nbsp;: <strong>Konto → „Mein Konto löschen“</strong>. Die Löschung erfolgt sofort nach Bestätigung.</p>

      <h2>2. Per E-Mail (ausserhalb der App)</h2>
      <p>Schreiben Sie an <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> von der E-Mail-Adresse Ihres Kontos mit dem Betreff „Kontolöschung“. Wir bearbeiten Anfragen innerhalb von 30 Tagen.</p>

      <h2>Gelöschte Daten</h2>
      <ul>
        <li>Ihr Konto und Ihre Zugangsdaten;</li>
        <li>Ihre Unfallberichte;</li>
        <li>Zugehörige Fotos, Sprachnotizen und Skizzen;</li>
        <li>Digitale Unterschriften;</li>
        <li>Eingegebene Fahrzeug- und Versicherungsdaten.</li>
      </ul>

      <h2>Möglicherweise aufbewahrte Daten</h2>
      <p>Bestimmte Daten werden nur aufbewahrt, wenn das Gesetz dies verlangt (z. B. Buchhaltung oder Verfahren):</p>
      <ul>
        <li>Buchhaltungsbelege zu einer Zahlung: bis zu <strong>10 Jahre</strong> (gesetzliche Pflicht in der Schweiz).</li>
        <li>Andernfalls werden Berichte nach <strong>30 Tagen</strong> und unvollständige Sitzungen nach <strong>2 Stunden</strong> automatisch gelöscht.</li>
      </ul>
      <div class="box">Nach der Löschung sind die Daten nicht mehr zugänglich und werden aus unseren Produktivsystemen entfernt, vorbehaltlich der oben genannten gesetzlichen Pflichten.</div>

      <a class="cta" href="mailto:privacy@boom.contact?subject=Kontol%C3%B6schung">Löschung per E-Mail anfragen</a>
    `,
  },
  it: {
    title: 'Eliminazione account',
    body: `
      <h1>Elimina il tuo account boom.contact</h1>
      <div class="sub">App “boom.contact” · Editore: PEP's Swiss SA — Groupe NEUKOMM</div>
      ${langbar('/account-deletion')}
      <p>Puoi richiedere l'eliminazione del tuo account boom.contact e dei dati associati in qualsiasi momento, in due modi.</p>

      <h2>1. Direttamente nell'app</h2>
      <p>Apri l'app, quindi&nbsp;: <strong>Account → “Elimina il mio account”</strong>. L'eliminazione è immediata dopo la conferma.</p>

      <h2>2. Via email (fuori dall'app)</h2>
      <p>Scrivi a <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> dall'indirizzo email del tuo account con oggetto “Eliminazione account”. Elaboriamo le richieste entro 30 giorni.</p>

      <h2>Dati eliminati</h2>
      <ul>
        <li>Il tuo account e le credenziali;</li>
        <li>I tuoi constat d'incidente;</li>
        <li>Foto, note vocali e schizzi collegati;</li>
        <li>Firme digitali;</li>
        <li>Dati del veicolo e dell'assicurazione inseriti.</li>
      </ul>

      <h2>Dati eventualmente conservati</h2>
      <p>Alcuni dati possono essere conservati solo se richiesto dalla legge (es. contabilità o procedimenti):</p>
      <ul>
        <li>Documenti contabili legati a un pagamento: fino a <strong>10 anni</strong> (obbligo legale svizzero).</li>
        <li>Altrimenti, i constat vengono eliminati automaticamente dopo <strong>30 giorni</strong> e le sessioni non completate dopo <strong>2 ore</strong>.</li>
      </ul>
      <div class="box">Dopo l'eliminazione, i dati non sono più accessibili e vengono cancellati dai nostri sistemi di produzione, fatti salvi gli obblighi di legge sopra indicati.</div>

      <a class="cta" href="mailto:privacy@boom.contact?subject=Eliminazione%20account">Richiedi l'eliminazione via email</a>
    `,
  },
};

/* ─────────────────────── POLITIQUE DE CONFIDENTIALITÉ ─────────────────────── */

const PRIVACY: Record<Lang, { title: string; body: string }> = {
  fr: {
    title: 'Politique de confidentialité',
    body: `
      <h1>Mentions légales &amp; Confidentialité</h1>
      <div class="sub">Version 1.0 · RGPD art. 13 · nLPD Suisse</div>
      ${langbar('/privacy')}
      <h2>Responsable du traitement</h2>
      <p>PEP's Swiss SA — Groupe NEUKOMM, Bellevue 7, 2950 Courgenay, Jura, Suisse. Contact&nbsp;: <a href="mailto:privacy@boom.contact">privacy@boom.contact</a>.</p>

      <h2>Données traitées</h2>
      <p>boom.contact traite les données que vous saisissez pour établir un constat amiable&nbsp;: identité et coordonnées, données de véhicule et d'assurance, photos, notes vocales, croquis, signatures numériques et géolocalisation de l'accident.</p>

      <h2>Finalités</h2>
      <p>Ces données servent uniquement à générer votre constat, à vous le transmettre et, le cas échéant, à le partager avec l'autre conducteur impliqué. Aucune donnée n'est vendue.</p>

      <h2>Durées de conservation</h2>
      <ul>
        <li>Sessions non complétées&nbsp;: supprimées automatiquement après <strong>2 heures</strong>.</li>
        <li>Constats&nbsp;: supprimés automatiquement après <strong>30 jours</strong>.</li>
        <li>Pièces comptables liées à un paiement&nbsp;: jusqu'à <strong>10 ans</strong> (obligation légale).</li>
      </ul>

      <h2>Sous-traitants</h2>
      <p>Nos sous-traitants techniques (hébergement, email, paiement) sont liés par des Clauses Contractuelles Types conformes à l'art. 46 RGPD. Le paiement s'effectue via Stripe (sécurité PCI-DSS).</p>

      <h2>Cookies</h2>
      <p>boom.contact utilise uniquement des cookies strictement nécessaires au fonctionnement du service. Aucun cookie publicitaire ni de tracking comportemental n'est utilisé.</p>

      <h2>Vos droits</h2>
      <p>Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité. Exercez-les à <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> — réponse sous 30 jours. Pour supprimer votre compte, voir la <a href="/supprimer-compte">page de suppression de compte</a>.</p>

      <h2>Sécurité</h2>
      <ul>
        <li>Chiffrement TLS 1.3 sur toutes les communications&nbsp;;</li>
        <li>Base de données chiffrée at-rest&nbsp;;</li>
        <li>Authentification par jeton signé&nbsp;;</li>
        <li>Mots de passe hachés (scrypt)&nbsp;;</li>
        <li>Suppression automatique des sessions et constats (voir durées ci-dessus).</li>
      </ul>

      <h2>Autorités de contrôle</h2>
      <p>PFPDT (Suisse), CNIL (France), APD (Belgique).</p>
    `,
  },
  en: {
    title: 'Privacy policy',
    body: `
      <h1>Legal notice &amp; Privacy</h1>
      <div class="sub">Version 1.0 · GDPR art. 13 · Swiss FADP</div>
      ${langbar('/privacy')}
      <h2>Data controller</h2>
      <p>PEP's Swiss SA — Groupe NEUKOMM, Bellevue 7, 2950 Courgenay, Jura, Switzerland. Contact&nbsp;: <a href="mailto:privacy@boom.contact">privacy@boom.contact</a>.</p>

      <h2>Data processed</h2>
      <p>boom.contact processes the data you enter to complete an accident report: identity and contact details, vehicle and insurance data, photos, voice notes, sketches, digital signatures and the accident's location.</p>

      <h2>Purposes</h2>
      <p>This data is used only to generate your report, deliver it to you and, where applicable, share it with the other driver involved. No data is sold.</p>

      <h2>Retention periods</h2>
      <ul>
        <li>Incomplete sessions: automatically deleted after <strong>2 hours</strong>.</li>
        <li>Reports: automatically deleted after <strong>30 days</strong>.</li>
        <li>Accounting records linked to a payment: up to <strong>10 years</strong> (legal requirement).</li>
      </ul>

      <h2>Processors</h2>
      <p>Our technical processors (hosting, email, payment) are bound by Standard Contractual Clauses under GDPR art. 46. Payment is handled by Stripe (PCI-DSS).</p>

      <h2>Cookies</h2>
      <p>boom.contact uses only strictly necessary cookies. No advertising or behavioural tracking cookies are used.</p>

      <h2>Your rights</h2>
      <p>You have rights of access, rectification, erasure and portability. Exercise them at <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> — reply within 30 days. To delete your account, see the <a href="/account-deletion">account deletion page</a>.</p>

      <h2>Security</h2>
      <ul>
        <li>TLS 1.3 encryption on all communications;</li>
        <li>Database encrypted at rest;</li>
        <li>Signed-token authentication;</li>
        <li>Hashed passwords (scrypt);</li>
        <li>Automatic deletion of sessions and reports (see periods above).</li>
      </ul>

      <h2>Supervisory authorities</h2>
      <p>FDPIC (Switzerland), CNIL (France), APD (Belgium).</p>
    `,
  },
  de: {
    title: 'Datenschutzerklärung',
    body: `
      <h1>Impressum &amp; Datenschutz</h1>
      <div class="sub">Version 1.0 · DSGVO Art. 13 · Schweizer DSG</div>
      ${langbar('/privacy')}
      <h2>Verantwortlicher</h2>
      <p>PEP's Swiss SA — Groupe NEUKOMM, Bellevue 7, 2950 Courgenay, Jura, Schweiz. Kontakt&nbsp;: <a href="mailto:privacy@boom.contact">privacy@boom.contact</a>.</p>

      <h2>Verarbeitete Daten</h2>
      <p>boom.contact verarbeitet die von Ihnen eingegebenen Daten zur Erstellung eines Unfallberichts: Identität und Kontaktdaten, Fahrzeug- und Versicherungsdaten, Fotos, Sprachnotizen, Skizzen, digitale Unterschriften und den Unfallort.</p>

      <h2>Zwecke</h2>
      <p>Diese Daten dienen ausschliesslich der Erstellung Ihres Berichts, dessen Übermittlung an Sie und gegebenenfalls der Weitergabe an den anderen beteiligten Fahrer. Es werden keine Daten verkauft.</p>

      <h2>Aufbewahrungsfristen</h2>
      <ul>
        <li>Unvollständige Sitzungen: automatisch nach <strong>2 Stunden</strong> gelöscht.</li>
        <li>Berichte: automatisch nach <strong>30 Tagen</strong> gelöscht.</li>
        <li>Buchhaltungsbelege zu einer Zahlung: bis zu <strong>10 Jahre</strong> (gesetzliche Pflicht).</li>
      </ul>

      <h2>Auftragsverarbeiter</h2>
      <p>Unsere technischen Auftragsverarbeiter (Hosting, E-Mail, Zahlung) sind durch Standardvertragsklauseln gemäss DSGVO Art. 46 gebunden. Die Zahlung erfolgt über Stripe (PCI-DSS).</p>

      <h2>Cookies</h2>
      <p>boom.contact verwendet ausschliesslich unbedingt erforderliche Cookies. Es werden keine Werbe- oder Tracking-Cookies eingesetzt.</p>

      <h2>Ihre Rechte</h2>
      <p>Sie haben Rechte auf Auskunft, Berichtigung, Löschung und Übertragbarkeit. Wenden Sie sich an <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> — Antwort innerhalb von 30 Tagen. Zur Kontolöschung siehe die <a href="/account-deletion">Seite zur Kontolöschung</a>.</p>

      <h2>Sicherheit</h2>
      <ul>
        <li>TLS-1.3-Verschlüsselung bei allen Kommunikationen;</li>
        <li>Datenbank at-rest verschlüsselt;</li>
        <li>Authentifizierung per signiertem Token;</li>
        <li>Gehashte Passwörter (scrypt);</li>
        <li>Automatische Löschung von Sitzungen und Berichten (siehe Fristen oben).</li>
      </ul>

      <h2>Aufsichtsbehörden</h2>
      <p>EDÖB (Schweiz), CNIL (Frankreich), APD (Belgien).</p>
    `,
  },
  it: {
    title: 'Informativa sulla privacy',
    body: `
      <h1>Note legali &amp; Privacy</h1>
      <div class="sub">Versione 1.0 · GDPR art. 13 · LPD svizzera</div>
      ${langbar('/privacy')}
      <h2>Titolare del trattamento</h2>
      <p>PEP's Swiss SA — Groupe NEUKOMM, Bellevue 7, 2950 Courgenay, Giura, Svizzera. Contatto&nbsp;: <a href="mailto:privacy@boom.contact">privacy@boom.contact</a>.</p>

      <h2>Dati trattati</h2>
      <p>boom.contact tratta i dati inseriti per compilare un constat d'incidente: identità e recapiti, dati del veicolo e dell'assicurazione, foto, note vocali, schizzi, firme digitali e luogo dell'incidente.</p>

      <h2>Finalità</h2>
      <p>Questi dati servono solo a generare il tuo constat, a trasmettertelo e, se del caso, a condividerlo con l'altro conducente coinvolto. Nessun dato viene venduto.</p>

      <h2>Periodi di conservazione</h2>
      <ul>
        <li>Sessioni non completate: eliminate automaticamente dopo <strong>2 ore</strong>.</li>
        <li>Constat: eliminati automaticamente dopo <strong>30 giorni</strong>.</li>
        <li>Documenti contabili legati a un pagamento: fino a <strong>10 anni</strong> (obbligo legale).</li>
      </ul>

      <h2>Responsabili del trattamento</h2>
      <p>I nostri responsabili tecnici (hosting, email, pagamento) sono vincolati da Clausole Contrattuali Standard ai sensi dell'art. 46 GDPR. Il pagamento è gestito da Stripe (PCI-DSS).</p>

      <h2>Cookie</h2>
      <p>boom.contact utilizza solo cookie strettamente necessari. Nessun cookie pubblicitario o di tracciamento comportamentale.</p>

      <h2>I tuoi diritti</h2>
      <p>Hai diritti di accesso, rettifica, cancellazione e portabilità. Esercitali a <a href="mailto:privacy@boom.contact">privacy@boom.contact</a> — risposta entro 30 giorni. Per eliminare l'account, vedi la <a href="/account-deletion">pagina di eliminazione account</a>.</p>

      <h2>Sicurezza</h2>
      <ul>
        <li>Crittografia TLS 1.3 su tutte le comunicazioni;</li>
        <li>Database crittografato at-rest;</li>
        <li>Autenticazione con token firmato;</li>
        <li>Password con hash (scrypt);</li>
        <li>Eliminazione automatica di sessioni e constat (vedi periodi sopra).</li>
      </ul>

      <h2>Autorità di controllo</h2>
      <p>IFPDT (Svizzera), CNIL (Francia), APD (Belgio).</p>
    `,
  },
};

export function renderDeletionPage(langInput?: string): string {
  const lang = pickLang(langInput);
  const { title, body } = DELETION[lang];
  return SHELL(title, body, lang);
}

export function renderPrivacyPage(langInput?: string): string {
  const lang = pickLang(langInput);
  const { title, body } = PRIVACY[lang];
  return SHELL(title, body, lang);
}
