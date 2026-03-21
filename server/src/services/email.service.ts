import { logger } from '../logger.js';
/**
 * Email service — boom.contact
 *
 * LOGIQUE EMAIL boom.contact:
 * - Les DEUX conducteurs envoient le constat à LEUR PROPRE assureur
 * - boom.contact envoie le PDF au conducteur lui-même par email
 * - Le conducteur transmet ensuite à son assureur (comme le constat papier)
 *
 * On n'envoie PAS directement aux assureurs car:
 * 1. On ne connaît pas leurs emails (changent souvent, non publics)
 * 2. Beaucoup n'acceptent pas les déclarations par email
 * 3. Chaque assureur a son process propre (app, portail, téléphone)
 * 4. L'envoi direct nécessite un accord B2B certifié (futur)
 */

interface SendPDFToDriverParams {
  driverEmail: string;
  driverName: string;
  role: 'A' | 'B';
  sessionId: string;
  pdfBase64: string;
  insurerName?: string;       // Nom de la compagnie (extrait OCR carte verte)
  insurerPhone?: string;      // Numéro sinistres si connu
  language?: string;          // Pour adapter la langue de l'email
}

interface EmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ── Email templates per language ──────────────────────────────
const TEMPLATES: Record<string, {
  subject: string;
  heading: string;
  intro: string;
  step1: string;
  step2: string;
  step3: string;
  deadline: string;
  footer: string;
}> = {
  fr: {
    subject: 'Votre constat amiable numérique — boom.contact',
    heading: 'Votre constat est prêt',
    intro: 'Votre constat amiable numérique a été finalisé et signé par les deux parties.',
    step1: '📄 Téléchargez le PDF ci-joint',
    step2: '📞 Contactez votre assureur',
    step3: '📤 Transmettez-leur ce document',
    deadline: '⏰ Délai légal : 5 jours ouvrables en France, 8 jours en Suisse',
    footer: 'Constat numérique certifié boom.contact — valable mondialement.',
  },
  de: {
    subject: 'Ihr digitaler Unfallbericht — boom.contact',
    heading: 'Ihr Unfallbericht ist fertig',
    intro: 'Ihr digitaler Unfallbericht wurde von beiden Parteien unterzeichnet.',
    step1: '📄 Laden Sie das beigefügte PDF herunter',
    step2: '📞 Kontaktieren Sie Ihre Versicherung',
    step3: '📤 Übermitteln Sie dieses Dokument',
    deadline: '⏰ Gesetzliche Frist: 8 Tage in der Schweiz',
    footer: 'Zertifiziertes digitales Unfallprotokoll boom.contact — weltweit gültig.',
  },
  it: {
    subject: 'Il vostro modulo di constatazione — boom.contact',
    heading: 'Il vostro modulo è pronto',
    intro: 'Il vostro modulo di constatazione amichevole è stato firmato da entrambe le parti.',
    step1: '📄 Scaricate il PDF allegato',
    step2: '📞 Contattate la vostra assicurazione',
    step3: '📤 Trasmettete questo documento',
    deadline: '⏰ Termine legale: entro 8 giorni',
    footer: 'Constatazione digitale certificata boom.contact — valida in tutto il mondo.',
  },
  en: {
    subject: 'Your accident statement — boom.contact',
    heading: 'Your accident statement is ready',
    intro: 'Your digital accident statement has been completed and signed by both parties.',
    step1: '📄 Download the attached PDF',
    step2: '📞 Contact your insurance company',
    step3: '📤 Submit this document to them',
    deadline: '⏰ Legal deadline: typically 5-10 working days depending on your country',
    footer: 'Certified digital accident report boom.contact — valid worldwide.',
  },
  es: {
    subject: 'Su declaración de accidente — boom.contact',
    heading: 'Su declaración está lista',
    intro: 'Su declaración amistosa de accidente ha sido firmada por ambas partes.',
    step1: '📄 Descargue el PDF adjunto',
    step2: '📞 Contacte a su aseguradora',
    step3: '📤 Envíeles este documento',
    deadline: '⏰ Plazo legal: generalmente 7 días hábiles',
    footer: 'Parte de accidente digital certificado boom.contact — válido en todo el mundo.',
  },
  pt: {
    subject: 'A sua declaração de acidente — boom.contact',
    heading: 'A sua declaração está pronta',
    intro: 'A sua declaração amigável de acidente foi assinada por ambas as partes.',
    step1: '📄 Descarregue o PDF em anexo',
    step2: '📞 Contacte a sua seguradora',
    step3: '📤 Envie-lhes este documento',
    deadline: '⏰ Prazo legal: geralmente 8 dias úteis',
    footer: 'Relatório digital de acidente certificado boom.contact — válido em todo o mundo.',
  },
};

function getTemplate(lang?: string) {
  const code = (lang || 'fr').split('-')[0].toLowerCase();
  return TEMPLATES[code] || TEMPLATES.en;
}

function buildEmailHTML(params: SendPDFToDriverParams): string {
  const t = getTemplate(params.language);
  const roleLabel = params.role === 'A' ? 'Conducteur A' : 'Conducteur B';

  const insurerSection = params.insurerName ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;margin:16px 0;">
      <div style="font-weight:700;color:#166534;margin-bottom:6px;">🟢 Votre assureur identifié</div>
      <div style="font-size:15px;font-weight:600;">${params.insurerName}</div>
      ${params.insurerPhone ? `<div style="margin-top:4px;color:#166534;">📞 ${params.insurerPhone}</div>` : ''}
      <div style="margin-top:8px;font-size:12px;color:#666;">
        Contactez directement votre assureur pour déclarer le sinistre. 
        Les coordonnées exactes (email sinistres, portail) se trouvent sur votre police ou leur site web.
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#06060C;padding:28px 28px 24px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;background:#FF3500;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;">💥</div>
        <div>
          <div style="color:#FF3500;font-size:18px;font-weight:700;letter-spacing:0.5px;">boom.contact</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;text-transform:uppercase;">${roleLabel}</div>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#111;">${t.heading}</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.65;font-size:15px;">${t.intro}</p>

      <!-- Session badge -->
      <div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:11px;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Référence</div>
        <div style="font-size:16px;font-weight:700;font-family:monospace;color:#FF3500;">${params.sessionId}</div>
      </div>

      ${insurerSection}

      <!-- Steps -->
      <div style="background:#fff8f7;border:1px solid #fde8e4;border-radius:10px;padding:18px;margin-bottom:20px;">
        <div style="font-weight:700;font-size:14px;color:#FF3500;margin-bottom:12px;">Prochaines étapes</div>
        ${[t.step1, t.step2, t.step3].map((s, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:${i < 2 ? '10px' : '0'};">
            <div style="width:22px;height:22px;background:#FF3500;border-radius:50%;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i + 1}</div>
            <div style="font-size:14px;color:#333;">${s}</div>
          </div>
        `).join('')}
      </div>

      <!-- Deadline warning -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <div style="font-size:13px;color:#92400e;">${t.deadline}</div>
      </div>

      <p style="font-size:12px;color:#999;line-height:1.6;">${t.footer}</p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #f0f0f0;padding:16px 28px;background:#fafafa;">
      <div style="font-size:11px;color:#aaa;line-height:1.6;">
        boom.contact · PEP's Swiss SA · Groupe NEUKOMM<br>
        Bellevue 7, 2950 Courgenay, Jura, Suisse · CHE-XXX.XXX.XXX
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Main send function ────────────────────────────────────────
export async function sendPDFToDriver(params: SendPDFToDriverParams): Promise<EmailResult> {
  const RESEND_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_KEY) {
    logger.warn('RESEND_API_KEY not set — email not sent');
    return { ok: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  try {
    // Dynamic import — resend may not be installed yet
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_KEY);

    const t = getTemplate(params.language);
    const html = buildEmailHTML(params);

    const { data, error } = await resend.emails.send({
      from: 'boom.contact <constat@boom.contact>',
      to: params.driverEmail,
      subject: t.subject,
      html,
      attachments: [{
        filename: `constat-${params.sessionId}.pdf`,
        content: Buffer.from(params.pdfBase64, 'base64'),
      }],
    });

    if (error) {
      logger.error('Resend send failed', { error: error.message });
      return { ok: false, error: error.message };
    }

    logger.email('sent', params.driverEmail, t.subject);
    return { ok: true, messageId: data?.id };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown email error';
    logger.error('Email service error', { error: msg });
    return { ok: false, error: msg };
  }
}
