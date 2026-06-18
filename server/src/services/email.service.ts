import { logger } from '../logger.js';
import { RESEND_API_KEY } from '../config.js';
import { escapeHtml } from '../routes/trpc.js';

// ── Resend singleton — avoids re-creating client on every email send ──
let _resendInstance: InstanceType<typeof import('resend').Resend> | null = null;

export async function getResendClient() {
  if (_resendInstance) return _resendInstance;
  const { Resend } = await import('resend');
  _resendInstance = new Resend(RESEND_API_KEY);
  return _resendInstance;
}
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
  role: 'A' | 'B' | 'C' | 'D' | 'E';
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
  insurerTitle: string;
  insurerHint: string;
  pdfAttached: string;
  nextStepsLabel: string;
  heading: string;
  intro: string;
  step1: string;
  step2: string;
  step3: string;
  deadline: string;
  feedbackTitle: string;
  feedbackQ: string;
  feedbackGood: string;
  feedbackBad: string;
  googleTitle: string;
  googleText: string;
  googleBtn: string;
  shareTitle: string;
  shareText: string;
  shareBtn: string;
  signupTitle: string;
  signupText: string;
  signupBtn: string;
  footer: string;
}> = {
  fr: {
    insurerTitle: '🟢 Votre assureur identifié par OCR',
    insurerHint: 'Contactez directement votre assureur. Coordonnées sur votre police ou leur site web.',
    pdfAttached: 'Le PDF est joint à cet email',
    nextStepsLabel: 'PROCHAINES ÉTAPES',
    subject: '✅ Votre constat signé — PDF ci-joint · boom.contact',
    heading: 'Constat finalisé & signé',
    intro: 'Le constat est signé. Votre rapport numérique horodaté est joint à cet email en PDF.',
    step1: 'Ouvrez le PDF ci-joint et vérifiez les informations',
    step2: 'Contactez <strong>votre propre assureur</strong> pour déclarer le sinistre',
    step3: 'Transmettez-leur ce PDF dans les délais prévus par votre contrat d\'assurance',
    deadline: '⏰ Ne tardez pas — votre assureur doit être contacté rapidement après l\'accident.',
    feedbackTitle: 'Votre expérience compte',
    feedbackQ: 'Comment s\'est passé votre constat ?',
    feedbackGood: '😊 Très bien',
    feedbackBad: '😕 À améliorer',
    googleTitle: 'Aidez-nous à grandir',
    googleText: 'Si boom.contact vous a simplifié la vie, un avis Google prend 30 secondes et aide d\'autres conducteurs à nous trouver.',
    googleBtn: '⭐ Laisser un avis Google',
    shareTitle: 'Partagez avec vos proches',
    shareText: 'Un accident peut arriver à n\'importe qui. Envoyez ce lien à vos proches — le constat numérique est gratuit à faire.',
    shareBtn: '📲 Partager boom.contact',
    signupTitle: 'Prêt pour la prochaine fois ?',
    signupText: 'Créez un compte gratuit et enregistrez votre véhicule. La prochaine fois, votre constat sera pré-rempli en 10 secondes.',
    signupBtn: '🚗 Enregistrer mon véhicule',
    footer: 'boom.contact · PEP\'s Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>Constat numérique horodaté · Conforme RGPD',
  },
  de: {
    insurerTitle: '🟢 Ihr per OCR erkannter Versicherer',
    insurerHint: 'Kontaktieren Sie Ihren Versicherer direkt. Kontaktdaten auf Ihrer Police oder deren Website.',
    pdfAttached: 'Das PDF ist dieser E-Mail beigefügt',
    nextStepsLabel: 'NÄCHSTE SCHRITTE',
    subject: '✅ Ihr unterzeichneter Unfallbericht — PDF anbei · boom.contact',
    heading: 'Unfallbericht abgeschlossen & unterzeichnet',
    intro: 'Der Bericht ist unterschrieben. Ihr digitaler, zeitgestempelter Bericht ist als PDF beigefügt.',
    step1: 'Öffnen Sie das beigefügte PDF und prüfen Sie die Angaben',
    step2: 'Kontaktieren Sie <strong>Ihre eigene Versicherung</strong> zur Schadenmeldung',
    step3: 'Übermitteln Sie dieses PDF innerhalb der in Ihrem Versicherungsvertrag vorgesehenen Fristen',
    deadline: '⏰ Handeln Sie schnell — Ihre Versicherung muss zeitnah kontaktiert werden.',
    feedbackTitle: 'Ihre Erfahrung zählt',
    feedbackQ: 'Wie war Ihr Erlebnis mit boom.contact?',
    feedbackGood: '😊 Sehr gut',
    feedbackBad: '😕 Verbesserungswürdig',
    googleTitle: 'Helfen Sie uns zu wachsen',
    googleText: 'Falls boom.contact Ihnen geholfen hat, dauert eine Google-Bewertung nur 30 Sekunden.',
    googleBtn: '⭐ Google-Bewertung schreiben',
    shareTitle: 'Teilen Sie mit Freunden',
    shareText: 'Ein Unfall kann jeden treffen. Senden Sie diesen Link Ihren Liebsten — das digitale Protokoll ist kostenlos.',
    shareBtn: '📲 boom.contact teilen',
    signupTitle: 'Bereit für nächstes Mal?',
    signupText: 'Erstellen Sie ein kostenloses Konto und registrieren Sie Ihr Fahrzeug. Beim nächsten Mal in 10 Sekunden vorausgefüllt.',
    signupBtn: '🚗 Fahrzeug registrieren',
    footer: 'boom.contact · PEP\'s Swiss SA · CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Schweiz',
  },
  it: {
    insurerTitle: '🟢 Il vostro assicuratore identificato tramite OCR',
    insurerHint: 'Contattate direttamente il vostro assicuratore. Recapiti sulla vostra polizza o sul loro sito web.',
    pdfAttached: 'Il PDF è allegato a questa email',
    nextStepsLabel: 'PROSSIMI PASSI',
    subject: '✅ Il vostro modulo firmato — PDF allegato · boom.contact',
    heading: 'Constatazione completata e firmata',
    intro: 'Il constato è firmato. Il vostro rapporto digitale con marca temporale è allegato in PDF.',
    step1: 'Aprite il PDF allegato e verificate le informazioni',
    step2: 'Contattate <strong>la vostra assicurazione</strong> per dichiarare il sinistro',
    step3: 'Inviate loro questo PDF entro i termini previsti dal vostro contratto assicurativo',
    deadline: '⏰ Non aspettate — contattate la vostra assicurazione il prima possibile.',
    feedbackTitle: 'La vostra esperienza conta',
    feedbackQ: 'Com\'è stata la vostra esperienza?',
    feedbackGood: '😊 Ottima',
    feedbackBad: '😕 Da migliorare',
    googleTitle: 'Aiutateci a crescere',
    googleText: 'Se boom.contact vi ha semplificato la vita, una recensione Google richiede solo 30 secondi.',
    googleBtn: '⭐ Lascia una recensione Google',
    shareTitle: 'Condividete con i vostri cari',
    shareText: 'Un incidente può capitare a tutti. Inviate questo link — il modulo digitale è gratuito.',
    shareBtn: '📲 Condividi boom.contact',
    signupTitle: 'Pronti per la prossima volta?',
    signupText: 'Create un account gratuito e registrate il vostro veicolo. La prossima volta in 10 secondi.',
    signupBtn: '🚗 Registra il mio veicolo',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Giura, Svizzera',
  },
  en: {
    insurerTitle: '🟢 Your insurer identified by OCR',
    insurerHint: 'Contact your insurer directly. Details are on your policy or their website.',
    pdfAttached: 'The PDF is attached to this email',
    nextStepsLabel: 'NEXT STEPS',
    subject: '✅ Your signed accident report — PDF attached · boom.contact',
    heading: 'Accident report completed & signed',
    intro: 'The report is signed. Your timestamped digital report is attached as a PDF.',
    step1: 'Open the attached PDF and verify the information',
    step2: 'Contact <strong>your own insurance company</strong> to file the claim',
    step3: 'Send them this PDF within the deadlines set out in your insurance contract',
    deadline: '⏰ Don\'t wait — contact your insurer as soon as possible after the accident.',
    feedbackTitle: 'Your experience matters',
    feedbackQ: 'How was your experience with boom.contact?',
    feedbackGood: '😊 Great',
    feedbackBad: '😕 Needs improvement',
    googleTitle: 'Help us grow',
    googleText: 'If boom.contact made your life easier, a Google review takes just 30 seconds and helps other drivers find us.',
    googleBtn: '⭐ Leave a Google review',
    shareTitle: 'Share with friends & family',
    shareText: 'Accidents happen to everyone. Send this link to your loved ones — the digital report is free to complete.',
    shareBtn: '📲 Share boom.contact',
    signupTitle: 'Ready for next time?',
    signupText: 'Create a free account and save your vehicle. Next time, your report will be pre-filled in 10 seconds.',
    signupBtn: '🚗 Save my vehicle',
    footer: 'boom.contact · PEP\'s Swiss SA · CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Switzerland',
  },
  es: {
    insurerTitle: '🟢 Su aseguradora identificada por OCR',
    insurerHint: 'Contacte directamente con su aseguradora. Los datos están en su póliza o en su sitio web.',
    pdfAttached: 'El PDF está adjunto a este correo',
    nextStepsLabel: 'PRÓXIMOS PASOS',
    subject: '✅ Su declaración firmada — PDF adjunto · boom.contact',
    heading: 'Declaración completada y firmada',
    intro: 'El parte está firmado. Su informe digital con sello de tiempo está adjunto en PDF.',
    step1: 'Abra el PDF adjunto y verifique la información',
    step2: 'Contacte <strong>a su propia aseguradora</strong> para declarar el siniestro',
    step3: 'Envíeles este PDF dentro de los plazos previstos en su contrato de seguro',
    deadline: '⏰ No espere — contacte a su aseguradora lo antes posible.',
    feedbackTitle: 'Su experiencia importa',
    feedbackQ: '¿Cómo fue su experiencia con boom.contact?',
    feedbackGood: '😊 Muy bien',
    feedbackBad: '😕 Mejorable',
    googleTitle: 'Ayúdenos a crecer',
    googleText: 'Si boom.contact le facilitó las cosas, una reseña en Google tarda solo 30 segundos.',
    googleBtn: '⭐ Dejar reseña en Google',
    shareTitle: 'Comparta con sus seres queridos',
    shareText: 'Los accidentes le pueden pasar a cualquiera. Envíe este enlace — el parte digital es gratuito.',
    shareBtn: '📲 Compartir boom.contact',
    signupTitle: '¿Listo para la próxima vez?',
    signupText: 'Cree una cuenta gratuita y registre su vehículo. La próxima vez, pre-rellenado en 10 segundos.',
    signupBtn: '🚗 Registrar mi vehículo',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Jura, Suiza',
  },
  pt: {
    insurerTitle: '🟢 A sua seguradora identificada por OCR',
    insurerHint: 'Contacte diretamente a sua seguradora. Os contactos estão na sua apólice ou no site deles.',
    pdfAttached: 'O PDF está anexado a este email',
    nextStepsLabel: 'PRÓXIMOS PASSOS',
    subject: '✅ A sua declaração assinada — PDF em anexo · boom.contact',
    heading: 'Declaração concluída e assinada',
    intro: 'O relatório está assinado. O seu relatório digital com selo temporal está anexado em PDF.',
    step1: 'Abra o PDF em anexo e verifique as informações',
    step2: 'Contacte <strong>a sua seguradora</strong> para declarar o sinistro',
    step3: 'Envie-lhes este PDF dentro dos prazos previstos no seu contrato de seguro',
    deadline: '⏰ Não espere — contacte a sua seguradora o mais rapidamente possível.',
    feedbackTitle: 'A sua experiência é importante',
    feedbackQ: 'Como foi a sua experiência com boom.contact?',
    feedbackGood: '😊 Muito boa',
    feedbackBad: '😕 A melhorar',
    googleTitle: 'Ajude-nos a crescer',
    googleText: 'Se boom.contact lhe facilitou a vida, uma avaliação no Google demora apenas 30 segundos.',
    googleBtn: '⭐ Deixar avaliação no Google',
    shareTitle: 'Partilhe com os seus amigos',
    shareText: 'Os acidentes podem acontecer a qualquer pessoa. Envie este link — o relatório digital é gratuito.',
    shareBtn: '📲 Partilhar boom.contact',
    signupTitle: 'Pronto para a próxima vez?',
    signupText: 'Crie uma conta gratuita e registe o seu veículo. Na próxima vez, preenchido em 10 segundos.',
    signupBtn: '🚗 Registar o meu veículo',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Jura, Suíça',
  },
  nl: {
    insurerTitle: '🟢 Uw verzekeraar herkend via OCR',
    insurerHint: 'Neem rechtstreeks contact op met uw verzekeraar. Gegevens staan op uw polis of hun website.',
    pdfAttached: 'De PDF is bijgevoegd bij deze e-mail',
    nextStepsLabel: 'VOLGENDE STAPPEN',
    subject: '✅ Uw ondertekend aanrijdingsformulier — PDF bijgevoegd · boom.contact',
    heading: 'Aanrijdingsformulier voltooid en ondertekend',
    intro: 'Het rapport is ondertekend. Uw digitale rapport met tijdstempel is bijgevoegd als PDF.',
    step1: 'Open de bijgevoegde PDF en controleer de gegevens',
    step2: 'Neem contact op met <strong>uw eigen verzekeraar</strong> om de schade te melden',
    step3: 'Stuur hen deze PDF binnen de termijnen die in uw verzekeringscontract zijn vastgelegd',
    deadline: '⏰ Wacht niet — neem zo snel mogelijk contact op met uw verzekeraar.',
    feedbackTitle: 'Uw ervaring telt',
    feedbackQ: 'Hoe was uw ervaring met boom.contact?',
    feedbackGood: '😊 Uitstekend',
    feedbackBad: '😕 Vatbaar voor verbetering',
    googleTitle: 'Help ons groeien',
    googleText: 'Als boom.contact u heeft geholpen, duurt een Google-recensie slechts 30 seconden.',
    googleBtn: '⭐ Google-recensie schrijven',
    shareTitle: 'Deel met vrienden en familie',
    shareText: 'Een ongeluk kan iedereen overkomen. Stuur deze link — het digitale formulier is gratis.',
    shareBtn: '📲 boom.contact delen',
    signupTitle: 'Klaar voor de volgende keer?',
    signupText: 'Maak een gratis account en sla uw voertuig op. De volgende keer in 10 seconden ingevuld.',
    signupBtn: '🚗 Mijn voertuig opslaan',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Jura, Zwitserland',
  },
  pl: {
    insurerTitle: '🟢 Twój ubezpieczyciel rozpoznany przez OCR',
    insurerHint: 'Skontaktuj się bezpośrednio z ubezpieczycielem. Dane są na polisie lub na ich stronie.',
    pdfAttached: 'PDF jest załączony do tej wiadomości',
    nextStepsLabel: 'NASTĘPNE KROKI',
    subject: '✅ Twoje podpisane oświadczenie — PDF w załączniku · boom.contact',
    heading: 'Oświadczenie o zdarzeniu zakończone i podpisane',
    intro: 'Protokół został podpisany. Twój cyfrowy raport ze znacznikiem czasu jest dołączony jako PDF.',
    step1: 'Otwórz załączony PDF i sprawdź dane',
    step2: 'Skontaktuj się <strong>ze swoim ubezpieczycielem</strong>, aby zgłosić szkodę',
    step3: 'Prześlij im ten PDF w terminach określonych w umowie ubezpieczenia',
    deadline: '⏰ Nie zwlekaj — skontaktuj się ze swoim ubezpieczycielem jak najszybciej.',
    feedbackTitle: 'Twoje doświadczenie ma znaczenie',
    feedbackQ: 'Jak oceniasz boom.contact?',
    feedbackGood: '😊 Świetnie',
    feedbackBad: '😕 Do poprawy',
    googleTitle: 'Pomóż nam rosnąć',
    googleText: 'Jeśli boom.contact ułatwił Ci życie, recenzja Google zajmuje tylko 30 sekund.',
    googleBtn: '⭐ Napisz recenzję Google',
    shareTitle: 'Podziel się z bliskimi',
    shareText: 'Wypadek może przytrafić się każdemu. Wyślij ten link — formularz cyfrowy jest bezpłatny.',
    shareBtn: '📲 Udostępnij boom.contact',
    signupTitle: 'Gotowy na następny raz?',
    signupText: 'Utwórz bezpłatne konto i zapisz swój pojazd. Następnym razem wypełniony w 10 sekund.',
    signupBtn: '🚗 Zapisz mój pojazd',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Jura, Szwajcaria',
  },
  ru: {
    insurerTitle: '🟢 Ваш страховщик определён с помощью OCR',
    insurerHint: 'Свяжитесь со страховщиком напрямую. Контакты указаны в полисе или на их сайте.',
    pdfAttached: 'PDF приложён к этому письму',
    nextStepsLabel: 'ДАЛЬНЕЙШИЕ ШАГИ',
    subject: '✅ Ваш подписанный протокол — PDF во вложении · boom.contact',
    heading: 'Протокол о ДТП завершён и подписан',
    intro: 'Протокол подписан. Ваш цифровой отчёт с отметкой времени прилагается в формате PDF.',
    step1: 'Откройте прилагаемый PDF и проверьте данные',
    step2: 'Свяжитесь <strong>со своей страховой компанией</strong> для подачи заявления',
    step3: 'Отправьте им этот PDF в сроки, предусмотренные вашим договором страхования',
    deadline: '⏰ Не откладывайте — обратитесь в страховую компанию как можно скорее.',
    feedbackTitle: 'Ваш отзыв важен',
    feedbackQ: 'Как вы оцениваете boom.contact?',
    feedbackGood: '😊 Отлично',
    feedbackBad: '😕 Можно улучшить',
    googleTitle: 'Помогите нам расти',
    googleText: 'Если boom.contact помог вам, отзыв в Google займёт всего 30 секунд.',
    googleBtn: '⭐ Оставить отзыв в Google',
    shareTitle: 'Поделитесь с близкими',
    shareText: 'Авария может случиться с каждым. Отправьте ссылку — цифровой протокол бесплатен.',
    shareBtn: '📲 Поделиться boom.contact',
    signupTitle: 'Готовы к следующему разу?',
    signupText: 'Создайте бесплатный аккаунт и сохраните своё транспортное средство. В следующий раз заполнится за 10 секунд.',
    signupBtn: '🚗 Сохранить моё ТС',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Куржено, Юра, Швейцария',
  },
  ar: {
    insurerTitle: '🟢 شركة التأمين الخاصة بك مُحدَّدة عبر OCR',
    insurerHint: 'تواصل مباشرةً مع شركة التأمين. التفاصيل في وثيقتك أو على موقعهم الإلكتروني.',
    pdfAttached: 'ملف PDF مرفق بهذا البريد الإلكتروني',
    nextStepsLabel: 'الخطوات التالية',
    subject: '✅ تقريركم الموقع — PDF مرفق · boom.contact',
    heading: 'تقرير الحادث مكتمل وموقع',
    intro: 'تم توقيع التقرير. تقريركم الرقمي المختوم زمنياً مرفق بصيغة PDF.',
    step1: 'افتح ملف PDF المرفق وتحقق من المعلومات',
    step2: 'تواصل مع <strong>شركة التأمين الخاصة بك</strong> للإبلاغ عن الحادث',
    step3: 'أرسل لهم هذا الملف — الأجل: <strong>8 أيام عمل</strong>',
    deadline: '⏰ لا تتأخر — تواصل مع شركة التأمين في أقرب وقت ممكن.',
    feedbackTitle: 'تجربتكم تهمنا',
    feedbackQ: 'كيف كانت تجربتكم مع boom.contact؟',
    feedbackGood: '😊 ممتازة',
    feedbackBad: '😕 تحتاج تحسين',
    googleTitle: 'ساعدونا على النمو',
    googleText: 'إذا ساعدكم boom.contact، فإن تقييماً على Google لا يستغرق سوى 30 ثانية.',
    googleBtn: '⭐ كتابة تقييم على Google',
    shareTitle: 'شاركوا مع أصدقائكم',
    shareText: 'الحوادث تقع للجميع. أرسلوا هذا الرابط — إعداد التقرير الرقمي مجاني.',
    shareBtn: '📲 مشاركة boom.contact',
    signupTitle: 'مستعد للمرة القادمة؟',
    signupText: 'أنشئ حساباً مجانياً وسجّل سيارتك. في المرة القادمة، يُملأ التقرير في 10 ثوانٍ.',
    signupBtn: '🚗 تسجيل سيارتي',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay، جورا، سويسرا',
  },
  zh: {
    insurerTitle: '🟢 通过 OCR 识别的您的保险公司',
    insurerHint: '请直接联系您的保险公司。详情见您的保单或其官方网站。',
    pdfAttached: 'PDF 已附在此邮件中',
    nextStepsLabel: '后续步骤',
    subject: '✅ 您已签署的事故报告 — PDF附件 · boom.contact',
    heading: '事故报告已完成并签署',
    intro: '报告已签署。您的带时间戳的数字报告以PDF格式附上。',
    step1: '打开附件PDF并核实信息',
    step2: '联系<strong>您自己的保险公司</strong>申报事故',
    step3: '发送此PDF — 期限：<strong>5–8个工作日</strong>',
    deadline: '⏰ 请勿拖延 — 尽快联系您的保险公司。',
    feedbackTitle: '您的体验很重要',
    feedbackQ: '您如何评价boom.contact？',
    feedbackGood: '😊 非常好',
    feedbackBad: '😕 需要改进',
    googleTitle: '帮助我们成长',
    googleText: '如果boom.contact帮助了您，Google评价只需30秒。',
    googleBtn: '⭐ 撰写Google评价',
    shareTitle: '与亲友分享',
    shareText: '事故人人都可能遇到。发送此链接 — 数字报告免费填写。',
    shareBtn: '📲 分享boom.contact',
    signupTitle: '为下次做好准备？',
    signupText: '创建免费账户并保存您的车辆。下次10秒内自动填写。',
    signupBtn: '🚗 保存我的车辆',
    footer: 'boom.contact · PEP\'s Swiss SA团 · Bellevue 7, 2950 Courgenay, 瑞士汝拉州',
  },
  ti: {
    insurerTitle: "🟢 እባክዎ የተመረጡ አውታረ መንግስት",
    insurerHint: "በቀጥታ ወይም ወደ እንደዚህ ወይም ወደ ድር ጣቢያቸው ይደውሉ።",
    pdfAttached: "የPDF ፋይል በዚህ ኢሜይል ይዘዋል",
    nextStepsLabel: "የቀጣይ ደረጃዎች",
    subject: "✅ የተፈረሰ ኮንስታት — PDF በተያያዘ · boom.contact",
    heading: "የተጠናቀቀ እና የተፈረሰ",
    intro: "ኮንስታት ተፈርሷል። የእርስዎ የድር ሪፖርት በPDF ይዘዋል።",
    step1: "የተያያዘውን PDF ክፈት እና መረጃዎችን ይፈትሹ",
    step2: "እባክዎ <strong>የእርስዎን የአውታረ መንግስት</strong> ይደውሉ እንደ ምን እንደ ወንጌል",
    step3: "ይህን የPDF በእንደ ወንጌል ወደ እንደ ወንጌል ይላኩ",
    deadline: "⏰ አይታወቅም — የእርስዎ አውታረ መንግስት ከአደጋው በኋላ በፍጥነት ይደውሉ።",
    feedbackTitle: "የእርስዎ ልምድ አስፈላጊ ነው",
    feedbackQ: "የእርስዎ ኮንስታት እንዴት ነበር?",
    feedbackGood: "😊 ጥሩ ነው",
    feedbackBad: "😕 ይሻሻል",
    googleTitle: "እባክዎ እንደ ወንጌል ይረዳን",
    googleText: "እንደ boom.contact የሚያስቀምጥ እንደ ወንጌል 30 ሴኮንድ ይወዳድሩ እና ሌላ እንደ ወንጌል ይረዳን።",
    googleBtn: "⭐ የGoogle እቅፍ ይህን ይላኩ",
    shareTitle: "ከእንደ ወንጌል ይላኩ",
    shareText: "አደጋ ማንኛውም ሰው ይኖር ይችላል። ይህን የእንደ ወንጌል ይላኩ — የድር ኮንስታት ነፃ ነው።",
    shareBtn: "📲 boom.contact ይላኩ",
    signupTitle: "በሚቀጥለው ጊዜ ዝግጅት ነው?",
    signupText: "ነፃ መለያ ይፍጠሩ እና የእርስዎን መኪና ይመዝገቡ። በሚቀጥለው ጊዜ የእርስዎ ኮንስታት በ10 ሴኮንድ ይሞላል።",
    signupBtn: "🚗 የመኪናዬን ይመዝገቡ",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>የድር ኮንስታት · የRGPD መሠረት",
  },
  sv: {
    insurerTitle: "🟢 Din försäkringsgivare identifierad av OCR",
    insurerHint: "Kontakta din försäkringsgivare direkt. Kontaktuppgifter finns på din policy eller deras webbplats.",
    pdfAttached: "PDF:en är bifogad i detta e-postmeddelande",
    nextStepsLabel: "NÄSTA STEG",
    subject: "✅ Din signerade rapport — PDF bifogad · boom.contact",
    heading: "Rapporten är slutförd & signerad",
    intro: "Rapporten är signerad. Din tidsstämplade digitala rapport är bifogad i detta e-postmeddelande som PDF.",
    step1: "Öppna PDF:en som är bifogad och kontrollera uppgifterna",
    step2: "Kontakta <strong>din egen försäkringsgivare</strong> för att anmäla skadan",
    step3: "Överför denna PDF till dem inom den tidsram som anges i ditt försäkringsavtal",
    deadline: "⏰ Dröj inte — din försäkringsgivare måste kontaktas snabbt efter olyckan.",
    feedbackTitle: "Din upplevelse är viktig",
    feedbackQ: "Hur gick det med din rapport?",
    feedbackGood: "😊 Mycket bra",
    feedbackBad: "😕 Att förbättra",
    googleTitle: "Hjälp oss att växa",
    googleText: "Om boom.contact har förenklat ditt liv, tar en Google-recension 30 sekunder och hjälper andra förare att hitta oss.",
    googleBtn: "⭐ Lämna en Google-recension",
    shareTitle: "Dela med dina nära och kära",
    shareText: "En olycka kan hända vem som helst. Skicka denna länk till dina nära och kära — den digitala rapporten är gratis att göra.",
    shareBtn: "📲 Dela boom.contact",
    signupTitle: "Redo för nästa gång?",
    signupText: "Skapa ett gratis konto och registrera ditt fordon. Nästa gång kommer din rapport att vara förifylld på 10 sekunder.",
    signupBtn: "🚗 Registrera mitt fordon",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Schweiz<br>Digital tidsstämplad rapport · GDPR-kompatibel",
  },
  th: {
    insurerTitle: "🟢 ผู้ประกันภัยของคุณที่ระบุโดย OCR",
    insurerHint: "ติดต่อผู้ประกันภัยของคุณโดยตรง ข้อมูลติดต่ออยู่ในกรมธรรม์หรือเว็บไซต์ของพวกเขา",
    pdfAttached: "ไฟล์ PDF ถูกแนบมาพร้อมกับอีเมลนี้",
    nextStepsLabel: "ขั้นตอนถัดไป",
    subject: "✅ รายงานที่ลงนามของคุณ — PDF แนบมาด้วย · boom.contact",
    heading: "รายงานเสร็จสมบูรณ์ & ลงนาม",
    intro: "รายงานได้รับการลงนามแล้ว รายงานดิจิทัลที่มีการประทับเวลาของคุณถูกแนบมาพร้อมกับอีเมลนี้ในรูปแบบ PDF",
    step1: "เปิดไฟล์ PDF ที่แนบมาและตรวจสอบข้อมูล",
    step2: "ติดต่อ <strong>ผู้ประกันภัยของคุณเอง</strong> เพื่อแจ้งเหตุการณ์",
    step3: "ส่งไฟล์ PDF นี้ให้พวกเขาภายในเวลาที่กำหนดในสัญญาประกันภัยของคุณ",
    deadline: "⏰ อย่าช้า — ผู้ประกันภัยของคุณต้องได้รับการติดต่อโดยเร็วหลังจากเกิดอุบัติเหตุ",
    feedbackTitle: "ประสบการณ์ของคุณมีค่า",
    feedbackQ: "รายงานของคุณเป็นอย่างไรบ้าง?",
    feedbackGood: "😊 ดีมาก",
    feedbackBad: "😕 ต้องปรับปรุง",
    googleTitle: "ช่วยเราเติบโต",
    googleText: "หาก boom.contact ทำให้ชีวิตคุณง่ายขึ้น การให้ความคิดเห็นใน Google ใช้เวลาเพียง 30 วินาทีและช่วยให้ผู้ขับขี่คนอื่นๆ พบเรา",
    googleBtn: "⭐ ให้ความคิดเห็นใน Google",
    shareTitle: "แชร์กับคนที่คุณรัก",
    shareText: "อุบัติเหตุสามารถเกิดขึ้นกับใครก็ได้ ส่งลิงก์นี้ให้คนที่คุณรัก — การทำรายงานดิจิทัลฟรี",
    shareBtn: "📲 แชร์ boom.contact",
    signupTitle: "พร้อมสำหรับครั้งถัดไปหรือยัง?",
    signupText: "สร้างบัญชีฟรีและลงทะเบียนรถของคุณ ครั้งถัดไป รายงานของคุณจะถูกกรอกล่วงหน้าใน 10 วินาที",
    signupBtn: "🚗 ลงทะเบียนรถของฉัน",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, สวิตเซอร์แลนด์<br>รายงานดิจิทัลที่มีการประทับเวลา · สอดคล้องกับ RGPD",
  },
  tl: {
    insurerTitle: "🟢 Ang iyong tagaseguro ay nakilala sa pamamagitan ng OCR",
    insurerHint: "Makipag-ugnayan nang direkta sa iyong tagaseguro. Mga detalye sa iyong polisiya o sa kanilang website.",
    pdfAttached: "Ang PDF ay nakalakip sa email na ito",
    nextStepsLabel: "MGA SUSUNOD NA HAKBANG",
    subject: "✅ Ang iyong nilagdaang ulat — PDF na nakalakip · boom.contact",
    heading: "Nakompleto at nilagdaan na ulat",
    intro: "Ang ulat ay nilagdaan. Ang iyong naka-time stamp na digital na ulat ay nakalakip sa email na ito sa PDF.",
    step1: "Buksan ang nakalakip na PDF at suriin ang impormasyon",
    step2: "Makipag-ugnayan sa <strong>iyong sariling tagaseguro</strong> upang iulat ang insidente",
    step3: "Ipasa ito sa kanila ang PDF na ito sa loob ng itinakdang panahon ng iyong kontrata sa seguro",
    deadline: "⏰ Huwag magtagal — kailangang makipag-ugnayan sa iyong tagaseguro agad pagkatapos ng aksidente.",
    feedbackTitle: "Mahalaga ang iyong karanasan",
    feedbackQ: "Paano ang iyong ulat?",
    feedbackGood: "😊 Napakabuti",
    feedbackBad: "😕 Kailangan ng pagpapabuti",
    googleTitle: "Tulungan kaming lumago",
    googleText: "Kung pinadali ng boom.contact ang iyong buhay, ang isang pagsusuri sa Google ay tumatagal ng 30 segundo at tumutulong sa ibang mga driver na makahanap sa amin.",
    googleBtn: "⭐ Mag-iwan ng pagsusuri sa Google",
    shareTitle: "Ibahagi sa iyong mga mahal sa buhay",
    shareText: "Maaaring mangyari ang aksidente sa sinuman. Ipadala ang link na ito sa iyong mga mahal sa buhay — ang digital na ulat ay libre gawin.",
    shareBtn: "📲 Ibahagi ang boom.contact",
    signupTitle: "Handa na para sa susunod na pagkakataon?",
    signupText: "Lumikha ng libreng account at irehistro ang iyong sasakyan. Sa susunod, ang iyong ulat ay magiging pre-filled sa loob ng 10 segundo.",
    signupBtn: "🚗 Irehistro ang aking sasakyan",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Switzerland<br>Naka-time stamp na digital na ulat · Alinsunod sa RGPD",
  },
  uk: {
    insurerTitle: "🟢 Ваш страховик, визначений за допомогою OCR",
    insurerHint: "Зверніться безпосередньо до вашого страховика. Контактні дані на вашій поліси або на їхньому веб-сайті.",
    pdfAttached: "PDF прикріплено до цього електронного листа",
    nextStepsLabel: "НАСТУПНІ КРОКИ",
    subject: "✅ Ваш підписаний звіт — PDF в прикріпленні · boom.contact",
    heading: "Звіт завершено та підписано",
    intro: "Звіт підписано. Ваш цифровий звіт з позначкою часу прикріплено до цього електронного листа у форматі PDF.",
    step1: "Відкрийте прикріплений PDF та перевірте інформацію",
    step2: "Зв'яжіться з <strong>вашим страховиком</strong> для повідомлення про випадок",
    step3: "Передайте їм цей PDF у строки, передбачені вашим страховим договором",
    deadline: "⏰ Не зволікайте — ваш страховик має бути зв'язаний швидко після аварії.",
    feedbackTitle: "Ваш досвід важливий",
    feedbackQ: "Як пройшов ваш звіт?",
    feedbackGood: "😊 Дуже добре",
    feedbackBad: "😕 Потрібно покращити",
    googleTitle: "Допоможіть нам зростати",
    googleText: "Якщо boom.contact спростив ваше життя, відгук у Google займе 30 секунд і допоможе іншим водіям нас знайти.",
    googleBtn: "⭐ Залишити відгук у Google",
    shareTitle: "Поділіться з близькими",
    shareText: "Аварія може статися з будь-ким. Надішліть це посилання своїм близьким — цифровий звіт безкоштовний.",
    shareBtn: "📲 Поділитися boom.contact",
    signupTitle: "Готові до наступного разу?",
    signupText: "Створіть безкоштовний обліковий запис і зареєструйте свій автомобіль. Наступного разу ваш звіт буде заповнений за 10 секунд.",
    signupBtn: "🚗 Зареєструвати мій автомобіль",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Швейцарія<br>Цифровий звіт з позначкою часу · Відповідно до GDPR",
  },
  ur: {
    insurerTitle: "🟢 آپ کا بیمہ کنندہ OCR کے ذریعے شناخت کیا گیا",
    insurerHint: "براہ راست اپنے بیمہ کنندہ سے رابطہ کریں۔ معلومات آپ کی پالیسی یا ان کی ویب سائٹ پر ہیں۔",
    pdfAttached: "PDF اس ای میل کے ساتھ منسلک ہے",
    nextStepsLabel: "اگلے اقدامات",
    subject: "✅ آپ کا دستخط شدہ رپورٹ — PDF منسلک · boom.contact",
    heading: "رپورٹ مکمل اور دستخط شدہ",
    intro: "رپورٹ پر دستخط ہو چکے ہیں۔ آپ کی ڈیجیٹل رپورٹ جو وقت پر ہے، اس ای میل کے ساتھ PDF میں منسلک ہے۔",
    step1: "منسلک PDF کھولیں اور معلومات کی تصدیق کریں",
    step2: "<strong>اپنے بیمہ کنندہ</strong> سے رابطہ کریں تاکہ نقصان کی اطلاع دیں",
    step3: "اس PDF کو اپنے بیمہ معاہدے کے مطابق وقت پر انہیں بھیجیں",
    deadline: "⏰ دیر نہ کریں — آپ کے بیمہ کنندہ سے حادثے کے بعد جلدی رابطہ کرنا ضروری ہے۔",
    feedbackTitle: "آپ کا تجربہ اہم ہے",
    feedbackQ: "آپ کی رپورٹ کیسی رہی؟",
    feedbackGood: "😊 بہت اچھی",
    feedbackBad: "😕 بہتر بنانے کی ضرورت ہے",
    googleTitle: "ہمیں بڑھنے میں مدد کریں",
    googleText: "اگر boom.contact نے آپ کی زندگی آسان بنائی ہے، تو ایک Google جائزہ 30 سیکنڈ لیتا ہے اور دوسرے ڈرائیورز کو ہمیں تلاش کرنے میں مدد کرتا ہے۔",
    googleBtn: "⭐ Google پر جائزہ چھوڑیں",
    shareTitle: "اپنے عزیزوں کے ساتھ شیئر کریں",
    shareText: "ایک حادثہ کسی کے ساتھ بھی ہو سکتا ہے۔ یہ لنک اپنے عزیزوں کو بھیجیں — ڈیجیٹل رپورٹ بنانا مفت ہے۔",
    shareBtn: "📲 boom.contact شیئر کریں",
    signupTitle: "اگلی بار کے لیے تیار ہیں؟",
    signupText: "ایک مفت اکاؤنٹ بنائیں اور اپنے گاڑی کو رجسٹر کریں۔ اگلی بار، آپ کی رپورٹ 10 سیکنڈ میں پہلے سے بھری ہوئی ہوگی۔",
    signupBtn: "🚗 اپنی گاڑی رجسٹر کریں",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>ڈیجیٹل رپورٹ جو وقت پر ہے · RGPD کے مطابق",
  },
  vi: {
    insurerTitle: "🟢 Nhà bảo hiểm của bạn đã được xác định bởi OCR",
    insurerHint: "Liên hệ trực tiếp với nhà bảo hiểm của bạn. Thông tin liên lạc trên hợp đồng hoặc trang web của họ.",
    pdfAttached: "Tệp PDF được đính kèm trong email này",
    nextStepsLabel: "CÁC BƯỚC TIẾP THEO",
    subject: "✅ Biên bản đã ký của bạn — PDF đính kèm · boom.contact",
    heading: "Biên bản đã hoàn thành & ký",
    intro: "Biên bản đã được ký. Báo cáo kỹ thuật số có dấu thời gian của bạn được đính kèm trong email này dưới dạng PDF.",
    step1: "Mở PDF đính kèm và kiểm tra thông tin",
    step2: "Liên hệ với <strong>nhà bảo hiểm của bạn</strong> để báo cáo sự cố",
    step3: "Gửi cho họ PDF này trong thời hạn quy định bởi hợp đồng bảo hiểm của bạn",
    deadline: "⏰ Đừng chần chừ — nhà bảo hiểm của bạn cần được liên hệ nhanh chóng sau tai nạn.",
    feedbackTitle: "Trải nghiệm của bạn rất quan trọng",
    feedbackQ: "Biên bản của bạn diễn ra như thế nào?",
    feedbackGood: "😊 Rất tốt",
    feedbackBad: "😕 Cần cải thiện",
    googleTitle: "Giúp chúng tôi phát triển",
    googleText: "Nếu boom.contact đã giúp bạn dễ dàng hơn, một đánh giá Google chỉ mất 30 giây và giúp những tài xế khác tìm thấy chúng tôi.",
    googleBtn: "⭐ Để lại đánh giá Google",
    shareTitle: "Chia sẻ với người thân của bạn",
    shareText: "Một tai nạn có thể xảy ra với bất kỳ ai. Gửi liên kết này cho người thân của bạn — biên bản kỹ thuật số miễn phí để thực hiện.",
    shareBtn: "📲 Chia sẻ boom.contact",
    signupTitle: "Sẵn sàng cho lần sau chưa?",
    signupText: "Tạo tài khoản miễn phí và đăng ký xe của bạn. Lần sau, biên bản của bạn sẽ được điền sẵn trong 10 giây.",
    signupBtn: "🚗 Đăng ký xe của tôi",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Thụy Sĩ<br>Biên bản kỹ thuật số có dấu thời gian · Tuân thủ RGPD",
  },
  wo: {
    insurerTitle: "🟢 Sañse bi jàpp ci OCR",
    insurerHint: "Nangoo jàppale sañse bi. Njàngat ci sa polise walla sa site web.",
    pdfAttached: "PDF bi dafa am ci email bi",
    nextStepsLabel: "NJEKKI YI",
    subject: "✅ Sa constat signé — PDF ci jàpp · boom.contact",
    heading: "Constat bi am na & signé",
    intro: "Constat bi dafa signé. Sa rapòrt numérique horodaté am na ci email bi ci PDF.",
    step1: "Toppal PDF bi ci jàpp ak jàppale ngir jàmm",
    step2: "Nangoo jàppale <strong>sañse bi</strong> ngir déklare sinistre bi",
    step3: "Toppal le PDF bi ci sañse bi ci wàllu yeneen yi jàpp ci sa contrat d'assurance",
    deadline: "⏰ Dama jàpp — sañse bi war a jàppale bu baax ci ginnaaw sinistre bi.",
    feedbackTitle: "Sa ndigal am na",
    feedbackQ: "Naka la sa constat bi jàpp?",
    feedbackGood: "😊 Baax na",
    feedbackBad: "😕 War a am jàmm",
    googleTitle: "Nangoo nuy jàppale",
    googleText: "Soo boom.contact a jàppale sa bopp, un avis Google am na 30 secondes ak jàppale yeneen jàmmuñu.",
    googleBtn: "⭐ Laisser un avis Google",
    shareTitle: "Toppal ak sa ndaw",
    shareText: "Sinistre bu njëkk am na ci keneen. Toppal lii ak sa ndaw — constat numérique bi am na ci jàmm.",
    shareBtn: "📲 Toppal boom.contact",
    signupTitle: "Dama jàpp ngir wàllu yeneen?",
    signupText: "Jàppale un compte bu am na ci jàmm ak jàppale sa véhicule. Wàllu yeneen, sa constat bi war a am pré-rempli ci 10 secondes.",
    signupBtn: "🚗 Jàppale sa véhicule",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>Constat numérique horodaté · Conforme RGPD",
  },
  ms: {
    insurerTitle: "🟢 Insurans anda dikenalpasti oleh OCR",
    insurerHint: "Hubungi terus insurans anda. Maklumat di polisi anda atau laman web mereka.",
    pdfAttached: "PDF dilampirkan pada emel ini",
    nextStepsLabel: "LANGKAH SETERUSNYA",
    subject: "✅ Laporan anda yang ditandatangani — PDF dilampirkan · boom.contact",
    heading: "Laporan telah disiapkan & ditandatangani",
    intro: "Laporan telah ditandatangani. Laporan digital bertarikh anda dilampirkan pada emel ini dalam format PDF.",
    step1: "Buka PDF yang dilampirkan dan semak maklumat",
    step2: "Hubungi <strong>insurans anda sendiri</strong> untuk melaporkan kejadian",
    step3: "Hantar PDF ini kepada mereka dalam tempoh yang ditetapkan oleh kontrak insurans anda",
    deadline: "⏰ Jangan berlengah — insurans anda perlu dihubungi dengan cepat selepas kemalangan.",
    feedbackTitle: "Pengalaman anda penting",
    feedbackQ: "Bagaimana laporan anda?",
    feedbackGood: "😊 Sangat baik",
    feedbackBad: "😕 Perlu diperbaiki",
    googleTitle: "Bantu kami untuk berkembang",
    googleText: "Jika boom.contact memudahkan hidup anda, ulasan Google mengambil masa 30 saat dan membantu pemandu lain untuk menemui kami.",
    googleBtn: "⭐ Tinggalkan ulasan Google",
    shareTitle: "Kongsi dengan orang tersayang",
    shareText: "Kejadian boleh berlaku kepada sesiapa. Hantar pautan ini kepada orang tersayang — laporan digital adalah percuma untuk dibuat.",
    shareBtn: "📲 Kongsi boom.contact",
    signupTitle: "Sedia untuk lain kali?",
    signupText: "Buat akaun percuma dan daftarkan kenderaan anda. Lain kali, laporan anda akan diisi secara automatik dalam 10 saat.",
    signupBtn: "🚗 Daftar kenderaan saya",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Switzerland<br>Laporan digital bertarikh · Mematuhi RGPD",
  },
  nb: {
    insurerTitle: "🟢 Din forsikring identifisert av OCR",
    insurerHint: "Kontakt direkte med din forsikring. Kontaktinformasjon finnes på din police eller deres nettside.",
    pdfAttached: "PDF-en er vedlagt denne e-posten",
    nextStepsLabel: "NESTE STEG",
    subject: "✅ Din signerte rapport — PDF vedlagt · boom.contact",
    heading: "Rapport fullført & signert",
    intro: "Rapporten er signert. Din tidsstemplet digitale rapport er vedlagt denne e-posten i PDF-format.",
    step1: "Åpne den vedlagte PDF-en og sjekk informasjonen",
    step2: "Kontakt <strong>din egen forsikring</strong> for å melde skaden",
    step3: "Send dem denne PDF-en innen fristen angitt i din forsikringsavtale",
    deadline: "⏰ Ikke vent — din forsikring må kontaktes raskt etter ulykken.",
    feedbackTitle: "Din erfaring teller",
    feedbackQ: "Hvordan gikk rapporteringen?",
    feedbackGood: "😊 Veldig bra",
    feedbackBad: "😕 Til forbedring",
    googleTitle: "Hjelp oss å vokse",
    googleText: "Hvis boom.contact har gjort livet ditt enklere, tar en Google-anmeldelse 30 sekunder og hjelper andre sjåfører med å finne oss.",
    googleBtn: "⭐ Legg igjen en Google-anmeldelse",
    shareTitle: "Del med dine nærmeste",
    shareText: "En ulykke kan skje med hvem som helst. Send denne lenken til dine nærmeste — den digitale rapporten er gratis å lage.",
    shareBtn: "📲 Del boom.contact",
    signupTitle: "Klar for neste gang?",
    signupText: "Opprett en gratis konto og registrer kjøretøyet ditt. Neste gang vil rapporten din være forhåndsutfylt på 10 sekunder.",
    signupBtn: "🚗 Registrer mitt kjøretøy",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Sveits<br>Tidsstemplet digital rapport · I samsvar med GDPR",
  },
  ro: {
    insurerTitle: "🟢 Asigurătorul dumneavoastră identificat prin OCR",
    insurerHint: "Contactați direct asigurătorul dumneavoastră. Informații pe polița dumneavoastră sau pe site-ul lor.",
    pdfAttached: "PDF-ul este atașat acestui email",
    nextStepsLabel: "PAȘII URMĂTORI",
    subject: "✅ Raportul dumneavoastră semnat — PDF atașat · boom.contact",
    heading: "Raport finalizat & semnat",
    intro: "Raportul este semnat. Raportul dumneavoastră digital cu dată și oră este atașat acestui email în format PDF.",
    step1: "Deschideți PDF-ul atașat și verificați informațiile",
    step2: "Contactați <strong>asigurătorul dumneavoastră</strong> pentru a raporta incidentul",
    step3: "Transmiteți-le acest PDF în termenii prevăzuți de contractul dumneavoastră de asigurare",
    deadline: "⏰ Nu întârziați — asigurătorul dumneavoastră trebuie contactat rapid după accident.",
    feedbackTitle: "Experiența dumneavoastră contează",
    feedbackQ: "Cum a fost raportul dumneavoastră?",
    feedbackGood: "😊 Foarte bine",
    feedbackBad: "😕 De îmbunătățit",
    googleTitle: "Ajutați-ne să creștem",
    googleText: "Dacă boom.contact v-a simplificat viața, o recenzie Google durează 30 de secunde și ajută alți șoferi să ne găsească.",
    googleBtn: "⭐ Lăsați o recenzie Google",
    shareTitle: "Distribuiți cu cei dragi",
    shareText: "Un accident se poate întâmpla oricui. Trimiteți acest link celor dragi — raportul digital este gratuit de realizat.",
    shareBtn: "📲 Distribuiți boom.contact",
    signupTitle: "Pregătit pentru data viitoare?",
    signupText: "Creați un cont gratuit și înregistrați-vă vehiculul. Data viitoare, raportul dumneavoastră va fi completat automat în 10 secunde.",
    signupBtn: "🚗 Înregistrați vehiculul meu",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Elveția<br>Raport digital cu dată și oră · Conform RGPD",
  },
  sk: {
    insurerTitle: "🟢 Váš poisťovateľ identifikovaný OCR",
    insurerHint: "Kontaktujte priamo svojho poisťovateľa. Kontaktné údaje nájdete vo svojej zmluve alebo na ich webovej stránke.",
    pdfAttached: "PDF je priložené k tomuto emailu",
    nextStepsLabel: "ĎALŠIE KROKY",
    subject: "✅ Váš podpísaný protokol — PDF v prílohe · boom.contact",
    heading: "Protokol dokončený & podpísaný",
    intro: "Protokol je podpísaný. Váš digitálny časovo označený report je priložený k tomuto emailu vo formáte PDF.",
    step1: "Otvorenie priloženého PDF a overenie informácií",
    step2: "Kontaktujte <strong>svojho vlastného poisťovateľa</strong> na nahlásenie škody",
    step3: "Zašlite im tento PDF v lehote stanovenej vašou poistnou zmluvou",
    deadline: "⏰ Nezdržujte sa — váš poisťovateľ musí byť rýchlo kontaktovaný po nehode.",
    feedbackTitle: "Vaša skúsenosť je dôležitá",
    feedbackQ: "Ako prebehol váš protokol?",
    feedbackGood: "😊 Veľmi dobre",
    feedbackBad: "😕 Na zlepšenie",
    googleTitle: "Pomôžte nám rásť",
    googleText: "Ak vám boom.contact uľahčil život, recenzia na Google zaberie 30 sekúnd a pomôže iným vodičom nás nájsť.",
    googleBtn: "⭐ Nechať recenziu na Google",
    shareTitle: "Zdieľajte so svojimi blízkymi",
    shareText: "Nehoda sa môže stať každému. Pošlite tento odkaz svojim blízkym — digitálny protokol je zadarmo.",
    shareBtn: "📲 Zdieľať boom.contact",
    signupTitle: "Pripravení na nabudúce?",
    signupText: "Vytvorte si bezplatný účet a zaregistrujte svoje vozidlo. Nabudúce bude váš protokol predvyplnený za 10 sekúnd.",
    signupBtn: "🚗 Registrovať moje vozidlo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švajčiarsko<br>Digitálny časovo označený protokol · V súlade s GDPR",
  },
  sl: {
    insurerTitle: "🟢 Vaš zavarovalec, identificiran z OCR",
    insurerHint: "Kontaktirajte neposredno svojega zavarovalca. Podatki so na vaši polici ali njihovi spletni strani.",
    pdfAttached: "PDF je priložen temu e-poštnemu sporočilu",
    nextStepsLabel: "NASLEDNJI KORAKI",
    subject: "✅ Vaš podpisan zapis — PDF v priponki · boom.contact",
    heading: "Zapis končan & podpisan",
    intro: "Zapis je podpisan. Vaš digitalni časovno označen poročilo je priloženo temu e-poštnemu sporočilu v PDF-ju.",
    step1: "Odprite priloženi PDF in preverite informacije",
    step2: "Kontaktirajte <strong>svojega lastnega zavarovalca</strong> za prijavo škode",
    step3: "Posredujte jim ta PDF v rokih, predvidenih v vaši zavarovalni pogodbi",
    deadline: "⏰ Ne odlašajte — vaš zavarovalec mora biti hitro kontaktiran po nesreči.",
    feedbackTitle: "Vaša izkušnja šteje",
    feedbackQ: "Kako je potekal vaš zapis?",
    feedbackGood: "😊 Zelo dobro",
    feedbackBad: "😕 Potrebno izboljšati",
    googleTitle: "Pomagajte nam rasti",
    googleText: "Če vam je boom.contact olajšal življenje, mnenje na Googlu traja 30 sekund in pomaga drugim voznikom, da nas najdejo.",
    googleBtn: "⭐ Pustite mnenje na Googlu",
    shareTitle: "Delite s svojimi bližnjimi",
    shareText: "Nesreča se lahko zgodi vsakomur. Pošljite to povezavo svojim bližnjim — digitalni zapis je brezplačen.",
    shareBtn: "📲 Delite boom.contact",
    signupTitle: "Pripravljeni za naslednjič?",
    signupText: "Ustvarite brezplačen račun in registrirajte svoje vozilo. Naslednjič bo vaš zapis predhodno izpolnjen v 10 sekundah.",
    signupBtn: "🚗 Registriraj moje vozilo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švica<br>Digitalni časovno označen zapis · Usklajen z RGPD",
  },
  so: {
    insurerTitle: "🟢 Caymiskaaga oo la aqoonsaday iyadoo la adeegsanayo OCR",
    insurerHint: "Si toos ah ula xiriir caymiskaaga. Xogta xiriirka ku jirta siyaasaddaada ama boggooda internetka.",
    pdfAttached: "PDF-ga ayaa lagu daray email-kan",
    nextStepsLabel: "TALLAABOoyinka XIGA",
    subject: "✅ Warqaddaada la saxiixay — PDF ku lifaaqan · boom.contact",
    heading: "Warqad la dhammeeyey & la saxiixay",
    intro: "Warqadda ayaa la saxiixay. Warbixintaada dijitaalka ah ee waqtiga lagu qoro ayaa lagu daray email-kan PDF ahaan.",
    step1: "Fur PDF-ga ku lifaaqan oo hubi macluumaadka",
    step2: "La xiriir <strong>caymiskaaga gaarka ah</strong> si aad u sheegto shilka",
    step3: "U gudbi PDF-kan waqtiga loogu talagalay ee ku jira heshiiskaaga caymiska",
    deadline: "⏰ Ha daahin — caymiskaaga waa in si degdeg ah lala xiriiraa ka dib shilka.",
    feedbackTitle: "Khibradaada ayaa muhiim ah",
    feedbackQ: "Sidee bay u dhacday warqaddaada?",
    feedbackGood: "😊 Aad u wanaagsan",
    feedbackBad: "😕 In la hagaajiyo",
    googleTitle: "Na caawi inaan koraan",
    googleText: "Haddii boom.contact ay kuu fududeysay nolosha, dib u eegis Google ah waxay qaadaneysaa 30 ilbiriqsi waxayna caawineysaa darawalada kale inay na helaan.",
    googleBtn: "⭐ Ka tag dib u eegis Google",
    shareTitle: "La wadaag qaraabadaada",
    shareText: "Shil ayaa dhici kara qof kasta. Linkigan u dir qaraabadaada — warqadda dijitaalka ah waa bilaash in la sameeyo.",
    shareBtn: "📲 La wadaag boom.contact",
    signupTitle: "Ma diyaar u tahay mar kale?",
    signupText: "Abuur akoon bilaash ah oo diiwaan geli gaadhigaaga. Mar kale, warqaddaada waxay noqon doontaa mid horey loo buuxiyey 10 ilbiriqsi gudahood.",
    signupBtn: "🚗 Diiwaangeli gaadhigaaga",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Switzerland<br>Warqad dijitaal ah oo waqtiga lagu qoro · Waafaqsan RGPD",
  },
  sq: {
    insurerTitle: "🟢 Siguruesi juaj i identifikuar nga OCR",
    insurerHint: "Kontaktoni drejtpërdrejt siguruesin tuaj. Të dhënat në policën tuaj ose në faqen e tyre të internetit.",
    pdfAttached: "PDF-ja është e bashkangjitur në këtë email",
    nextStepsLabel: "HAPAT NË VAZHDIM",
    subject: "✅ Konstati juaj i nënshkruar — PDF i bashkangjitur · boom.contact",
    heading: "Konstati i përfunduar & i nënshkruar",
    intro: "Konstati është nënshkruar. Raporti juaj digjital me datë është i bashkangjitur në këtë email në PDF.",
    step1: "Hapni PDF-në e bashkangjitur dhe kontrolloni informacionet",
    step2: "Kontaktoni <strong>siguruesin tuaj</strong> për të deklaruar dëmin",
    step3: "Dërgoni këtë PDF brenda afateve të parashikuara nga kontrata juaj e sigurimit",
    deadline: "⏰ Mos vononi — siguruesi juaj duhet të kontaktohet shpejt pas aksidentit.",
    feedbackTitle: "Përvoja juaj ka rëndësi",
    feedbackQ: "Si kaloi konstati juaj?",
    feedbackGood: "😊 Shumë mirë",
    feedbackBad: "😕 Për t'u përmirësuar",
    googleTitle: "Na ndihmoni të rritemi",
    googleText: "Nëse boom.contact ju ka lehtësuar jetën, një rishikim në Google zë 30 sekonda dhe ndihmon drejtuesit e tjerë të na gjejnë.",
    googleBtn: "⭐ Lini një rishikim në Google",
    shareTitle: "Ndani me të afërmit tuaj",
    shareText: "Një aksident mund të ndodhë me këdo. Dërgoni këtë lidhje te të afërmit tuaj — konstati digjital është falas për t'u bërë.",
    shareBtn: "📲 Ndani boom.contact",
    signupTitle: "Gati për herën tjetër?",
    signupText: "Krijoni një llogari falas dhe regjistroni automjetin tuaj. Herën tjetër, konstati juaj do të jetë i parashkruar brenda 10 sekondash.",
    signupBtn: "🚗 Regjistro automjetin tim",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Zvicër<br>Konstati digjital me datë · I përputhshëm me RGPD",
  },
  sr: {
    insurerTitle: "🟢 Vaš osiguravač identifikovan putem OCR-a",
    insurerHint: "Kontaktirajte direktno svog osiguravača. Podaci su na vašoj polici ili njihovom veb sajtu.",
    pdfAttached: "PDF je priložen ovom emailu",
    nextStepsLabel: "NAREDNI KORACI",
    subject: "✅ Vaš potpisani izveštaj — PDF u prilogu · boom.contact",
    heading: "Izveštaj finalizovan & potpisan",
    intro: "Izveštaj je potpisan. Vaš digitalni izveštaj sa vremenskim pečatom je priložen ovom emailu u PDF formatu.",
    step1: "Otvorite priloženi PDF i proverite informacije",
    step2: "Kontaktirajte <strong>svog osiguravača</strong> da prijavite štetu",
    step3: "Pošaljite im ovaj PDF u rokovima predviđenim vašim osiguravajućim ugovorom",
    deadline: "⏰ Ne čekajte — vaš osiguravač mora biti kontaktiran brzo nakon nesreće.",
    feedbackTitle: "Vaše iskustvo je važno",
    feedbackQ: "Kako je prošao vaš izveštaj?",
    feedbackGood: "😊 Veoma dobro",
    feedbackBad: "😕 Može bolje",
    googleTitle: "Pomozite nam da rastemo",
    googleText: "Ako vam je boom.contact olakšao život, Google recenzija traje 30 sekundi i pomaže drugim vozačima da nas pronađu.",
    googleBtn: "⭐ Ostavite Google recenziju",
    shareTitle: "Podelite sa svojim bližnjima",
    shareText: "Nesreća se može desiti svakome. Pošaljite ovu vezu svojim bližnjima — digitalni izveštaj je besplatan za izradu.",
    shareBtn: "📲 Podeli boom.contact",
    signupTitle: "Spremni za sledeći put?",
    signupText: "Kreirajte besplatan nalog i registrujte svoje vozilo. Sledeći put, vaš izveštaj će biti unapred popunjen za 10 sekundi.",
    signupBtn: "🚗 Registruj moje vozilo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švajcarska<br>Digitalni izveštaj sa vremenskim pečatom · U skladu sa RGPD",
  },
  hr: {
    insurerTitle: "🟢 Vaš osiguratelj identificiran putem OCR-a",
    insurerHint: "Izravno kontaktirajte svog osiguratelja. Podaci su na vašoj polici ili njihovoj web stranici.",
    pdfAttached: "PDF je priložen ovom emailu",
    nextStepsLabel: "SLJEDEĆI KORACI",
    subject: "✅ Vaš potpisani izvještaj — PDF u privitku · boom.contact",
    heading: "Izvještaj finaliziran & potpisan",
    intro: "Izvještaj je potpisan. Vaš digitalni izvještaj s vremenskim oznakama priložen je ovom emailu u PDF formatu.",
    step1: "Otvorite priloženi PDF i provjerite informacije",
    step2: "Kontaktirajte <strong>svog vlastitog osiguratelja</strong> kako biste prijavili štetu",
    step3: "Proslijedite im ovaj PDF u rokovima predviđenim vašim ugovorom o osiguranju",
    deadline: "⏰ Ne odugovlačite — vaš osiguratelj mora biti kontaktiran brzo nakon nesreće.",
    feedbackTitle: "Vaše iskustvo je važno",
    feedbackQ: "Kako je prošao vaš izvještaj?",
    feedbackGood: "😊 Vrlo dobro",
    feedbackBad: "😕 Za poboljšanje",
    googleTitle: "Pomozite nam da rastemo",
    googleText: "Ako vam je boom.contact olakšao život, Google recenzija traje 30 sekundi i pomaže drugim vozačima da nas pronađu.",
    googleBtn: "⭐ Ostavite Google recenziju",
    shareTitle: "Podijelite s vašim bližnjima",
    shareText: "Nesreća se može dogoditi svakome. Pošaljite ovu poveznicu svojim bližnjima — digitalni izvještaj je besplatan za izradu.",
    shareBtn: "📲 Podijelite boom.contact",
    signupTitle: "Spremni za sljedeći put?",
    signupText: "Kreirajte besplatan račun i registrirajte svoje vozilo. Sljedeći put, vaš izvještaj će biti unaprijed ispunjen za 10 sekundi.",
    signupBtn: "🚗 Registrirajte svoje vozilo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švicarska<br>Digitalni izvještaj s vremenskim oznakama · U skladu s RGPD-om",
  },
  hu: {
    insurerTitle: "🟢 Az OCR által azonosított biztosítója",
    insurerHint: "Közvetlenül lépjen kapcsolatba a biztosítójával. Elérhetőségek a kötvényén vagy a weboldalukon.",
    pdfAttached: "A PDF csatolva van ehhez az emailhez",
    nextStepsLabel: "KÖVETKEZŐ LÉPÉSEK",
    subject: "✅ Az aláírt nyilatkozat — PDF csatolva · boom.contact",
    heading: "Nyilatkozat véglegesítve és aláírva",
    intro: "A nyilatkozat aláírva. Az időbélyeggel ellátott digitális jelentése csatolva van ehhez az emailhez PDF formátumban.",
    step1: "Nyissa meg a csatolt PDF-et és ellenőrizze az adatokat",
    step2: "Lépjen kapcsolatba <strong>a saját biztosítójával</strong> a kár bejelentéséhez",
    step3: "Küldje el nekik ezt a PDF-et a biztosítási szerződésében előírt határidőn belül",
    deadline: "⏰ Ne késlekedjen — a biztosítóját gyorsan értesíteni kell a baleset után.",
    feedbackTitle: "A tapasztalata fontos",
    feedbackQ: "Hogyan zajlott a nyilatkozat?",
    feedbackGood: "😊 Nagyon jól",
    feedbackBad: "😕 Fejlesztésre szorul",
    googleTitle: "Segítsen nekünk növekedni",
    googleText: "Ha a boom.contact megkönnyítette az életét, egy Google-értékelés 30 másodpercet vesz igénybe, és segít más sofőröknek, hogy ránk találjanak.",
    googleBtn: "⭐ Google-értékelés hagyása",
    shareTitle: "Ossza meg szeretteivel",
    shareText: "Baleset bárkivel megtörténhet. Küldje el ezt a linket szeretteinek — a digitális nyilatkozat ingyenesen elkészíthető.",
    shareBtn: "📲 Megosztás boom.contact",
    signupTitle: "Készen áll a következő alkalomra?",
    signupText: "Hozzon létre egy ingyenes fiókot és regisztrálja járművét. A következő alkalommal a nyilatkozat 10 másodperc alatt előre kitöltve lesz.",
    signupBtn: "🚗 Járművem regisztrálása",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Svájc<br>Időbélyeggel ellátott digitális nyilatkozat · GDPR megfelelőség",
  },
  id: {
    insurerTitle: "🟢 Asuransi Anda diidentifikasi oleh OCR",
    insurerHint: "Hubungi langsung asuransi Anda. Kontak ada di polis Anda atau situs web mereka.",
    pdfAttached: "PDF terlampir pada email ini",
    nextStepsLabel: "LANGKAH SELANJUTNYA",
    subject: "✅ Laporan Anda yang ditandatangani — PDF terlampir · boom.contact",
    heading: "Laporan selesai & ditandatangani",
    intro: "Laporan telah ditandatangani. Laporan digital bertanggal Anda terlampir dalam format PDF pada email ini.",
    step1: "Buka PDF terlampir dan periksa informasi",
    step2: "Hubungi <strong>asuransi Anda sendiri</strong> untuk melaporkan klaim",
    step3: "Kirimkan PDF ini kepada mereka dalam batas waktu yang ditentukan oleh kontrak asuransi Anda",
    deadline: "⏰ Jangan tunda — asuransi Anda harus dihubungi segera setelah kecelakaan.",
    feedbackTitle: "Pengalaman Anda penting",
    feedbackQ: "Bagaimana pengalaman laporan Anda?",
    feedbackGood: "😊 Sangat baik",
    feedbackBad: "😕 Perlu perbaikan",
    googleTitle: "Bantu kami untuk berkembang",
    googleText: "Jika boom.contact mempermudah hidup Anda, ulasan Google memerlukan 30 detik dan membantu pengemudi lain menemukan kami.",
    googleBtn: "⭐ Tinggalkan ulasan Google",
    shareTitle: "Bagikan dengan orang terdekat",
    shareText: "Kecelakaan bisa terjadi pada siapa saja. Kirimkan tautan ini kepada orang terdekat Anda — laporan digital gratis untuk dibuat.",
    shareBtn: "📲 Bagikan boom.contact",
    signupTitle: "Siap untuk lain kali?",
    signupText: "Buat akun gratis dan daftarkan kendaraan Anda. Lain kali, laporan Anda akan terisi otomatis dalam 10 detik.",
    signupBtn: "🚗 Daftarkan kendaraan saya",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Swiss<br>Laporan digital bertanggal · Sesuai RGPD",
  },
  ka: {
    insurerTitle: "🟢 თქვენი დაზღვევითი კომპანია, რომელიც იდენტიფიცირებულია OCR-ით",
    insurerHint: "კონტაქტი პირდაპირ თქვენს დაზღვევით კომპანიასთან. ინფორმაცია თქვენი პოლის ან მათი ვებსაიტზე.",
    pdfAttached: "PDF ამ ელ.წერილში არის მიმაგრებული",
    nextStepsLabel: "შემდეგი ნაბიჯები",
    subject: "✅ თქვენი ხელმოწერილი constat — PDF მიმაგრებულია · boom.contact",
    heading: "კონსტატი დასრულებულია & ხელმოწერილია",
    intro: "კონსტატი ხელმოწერილია. თქვენი ციფრული, დროით მონიშნული ანგარიში ამ ელ.წერილში PDF-ით არის მიმაგრებული.",
    step1: "გახსენით მიმაგრებული PDF და შეამოწმეთ ინფორმაცია",
    step2: "კონტაქტი <strong>თქვენს დაზღვევით კომპანიასთან</strong> შემთხვევის შეტყობინებისათვის",
    step3: "გააგზავნეთ ეს PDF მათთვის თქვენი დაზღვევის ხელშეკრულებით განსაზღვრულ ვადებში",
    deadline: "⏰ არ დააყოვნოთ — თქვენი დაზღვევითი კომპანია უნდა იყოს სწრაფად დაკავშირებული შემთხვევის შემდეგ.",
    feedbackTitle: "თქვენი გამოცდილება მნიშვნელოვანია",
    feedbackQ: "როგორ ჩაიარა თქვენს კონსტატს?",
    feedbackGood: "😊 ძალიან კარგად",
    feedbackBad: "😕 გასაუმჯობესებელია",
    googleTitle: "დაგვეხმარეთ განვითარებაში",
    googleText: "თუ boom.contact-მა თქვენი ცხოვრება გაამარტივა, Google-ის შეფასება 30 წამი სჭირდება და სხვა მძღოლებს დაგვეხმარება ჩვენს პოვნაში.",
    googleBtn: "⭐ დატოვეთ Google-ის შეფასება",
    shareTitle: "გაზიარეთ თქვენს ახლობლებთან",
    shareText: "შემთხვევა ნებისმიერისთვის შეიძლება მოხდეს. გაუგზავნეთ ეს ბმული თქვენს ახლობლებს — ციფრული კონსტატი უფასოა.",
    shareBtn: "📲 გაზიარეთ boom.contact",
    signupTitle: "მომავალი შემთხვევისთვის მზად ხართ?",
    signupText: "შექმენით უფასო ანგარიში და რეგისტრირდით თქვენს ავტომობილზე. მომდევნო ჯერზე, თქვენი კონსტატი 10 წამში იქნება წინასწარ შევსებული.",
    signupBtn: "🚗 რეგისტრირდი ჩემს ავტომობილზე",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>ციფრული, დროით მონიშნული კონსტატი · შესაბამისი RGPD",
  },
  ko: {
    insurerTitle: "🟢 OCR로 확인된 귀하의 보험사",
    insurerHint: "보험사에 직접 문의하십시오. 연락처는 귀하의 보험증서나 웹사이트에 있습니다.",
    pdfAttached: "PDF가 이 이메일에 첨부되었습니다.",
    nextStepsLabel: "다음 단계",
    subject: "✅ 귀하의 서명된 사고 보고서 — PDF 첨부 · boom.contact",
    heading: "최종 보고서 & 서명됨",
    intro: "보고서가 서명되었습니다. 귀하의 디지털 타임스탬프 보고서가 이 이메일에 PDF로 첨부되었습니다.",
    step1: "첨부된 PDF를 열고 정보를 확인하십시오.",
    step2: "사고를 신고하기 위해 <strong>귀하의 보험사</strong>에 연락하십시오.",
    step3: "보험 계약에 명시된 기한 내에 이 PDF를 전달하십시오.",
    deadline: "⏰ 지체하지 마십시오 — 사고 후 신속하게 보험사에 연락해야 합니다.",
    feedbackTitle: "귀하의 경험이 중요합니다",
    feedbackQ: "귀하의 사고 보고서는 어땠습니까?",
    feedbackGood: "😊 매우 좋음",
    feedbackBad: "😕 개선이 필요함",
    googleTitle: "우리를 성장시키는 데 도움을 주세요",
    googleText: "boom.contact가 귀하의 삶을 간소화했다면, Google 리뷰는 30초가 소요되며 다른 운전자가 저희를 찾는 데 도움이 됩니다.",
    googleBtn: "⭐ Google 리뷰 남기기",
    shareTitle: "가족과 공유하세요",
    shareText: "사고는 누구에게나 일어날 수 있습니다. 이 링크를 가족에게 보내십시오 — 디지털 보고서는 무료로 작성할 수 있습니다.",
    shareBtn: "📲 boom.contact 공유하기",
    signupTitle: "다음 번을 준비하시겠습니까?",
    signupText: "무료 계정을 만들고 귀하의 차량을 등록하십시오. 다음 번에는 귀하의 보고서가 10초 만에 미리 채워집니다.",
    signupBtn: "🚗 내 차량 등록하기",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>디지털 타임스탬프 보고서 · GDPR 준수",
  },
  lt: {
    insurerTitle: "🟢 Jūsų draudikas identifikuotas OCR",
    insurerHint: "Susisiekite tiesiogiai su savo draudiku. Kontaktai nurodyti jūsų polise arba jų svetainėje.",
    pdfAttached: "PDF pridedamas prie šio el. laiško",
    nextStepsLabel: "KITOS ŽINGSNIAI",
    subject: "✅ Jūsų pasirašytas konstatas — PDF pridedamas · boom.contact",
    heading: "Konstatas užbaigtas ir pasirašytas",
    intro: "Konstatas pasirašytas. Jūsų laiku pažymėtas skaitmeninis ataskaitos PDF pridedamas prie šio el. laiško.",
    step1: "Atidarykite pridedamą PDF ir patikrinkite informaciją",
    step2: "Susisiekite su <strong>savo draudiku</strong>, kad praneštumėte apie įvykį",
    step3: "Perduokite jiems šį PDF per jūsų draudimo sutartyje numatytus terminus",
    deadline: "⏰ Nevilkinkite — su savo draudiku reikia susisiekti greitai po įvykio.",
    feedbackTitle: "Jūsų patirtis svarbi",
    feedbackQ: "Kaip praėjo jūsų konstatas?",
    feedbackGood: "😊 Labai gerai",
    feedbackBad: "😕 Reikia tobulinti",
    googleTitle: "Padėkite mums augti",
    googleText: "Jei boom.contact palengvino jūsų gyvenimą, Google atsiliepimas užtrunka 30 sekundžių ir padeda kitiems vairuotojams mus rasti.",
    googleBtn: "⭐ Palikti Google atsiliepimą",
    shareTitle: "Pasidalykite su artimaisiais",
    shareText: "Įvykis gali nutikti bet kam. Siųskite šį nuorodą savo artimiesiems — skaitmeninis konstatas yra nemokamas.",
    shareBtn: "📲 Pasidalinti boom.contact",
    signupTitle: "Pasiruošę kitam kartui?",
    signupText: "Sukurkite nemokamą paskyrą ir užregistruokite savo transporto priemonę. Kitą kartą jūsų konstatas bus išankstinis užpildytas per 10 sekundžių.",
    signupBtn: "🚗 Užregistruoti savo transporto priemonę",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Šveicarija<br>Laiku pažymėtas skaitmeninis konstatas · Atitinka GDPR",
  },
  lv: {
    insurerTitle: "🟢 Jūsu apdrošinātājs identificēts ar OCR",
    insurerHint: "Sazinieties tieši ar savu apdrošinātāju. Kontakti ir norādīti jūsu polisē vai viņu tīmekļa vietnē.",
    pdfAttached: "PDF ir pievienots šim e-pastam",
    nextStepsLabel: "NĀKAMIE SOĻI",
    subject: "✅ Jūsu parakstītais konstatējums — PDF pievienots · boom.contact",
    heading: "Konstatējums pabeigts un parakstīts",
    intro: "Konstatējums ir parakstīts. Jūsu digitālais laika zīmogs ir pievienots šim e-pastam PDF formātā.",
    step1: "Atveriet pievienoto PDF un pārbaudiet informāciju",
    step2: "Sazinieties ar <strong>jūsu paša apdrošinātāju</strong>, lai paziņotu par negadījumu",
    step3: "Nosūtiet viņiem šo PDF saskaņā ar jūsu apdrošināšanas līguma noteikumiem",
    deadline: "⏰ Nepalaidiet garām — jūsu apdrošinātājam jābūt ātri sazinātam pēc negadījuma.",
    feedbackTitle: "Jūsu pieredze ir svarīga",
    feedbackQ: "Kā noritēja jūsu konstatējums?",
    feedbackGood: "😊 Ļoti labi",
    feedbackBad: "😕 Jāuzlabo",
    googleTitle: "Palīdziet mums augt",
    googleText: "Ja boom.contact jums atviegloja dzīvi, Google atsauksme aizņem 30 sekundes un palīdz citiem vadītājiem mūs atrast.",
    googleBtn: "⭐ Atstāt Google atsauksmi",
    shareTitle: "Kopīgojiet ar saviem tuviniekiem",
    shareText: "Negadījums var notikt ar ikvienu. Nosūtiet šo saiti saviem tuviniekiem — digitālais konstatējums ir bez maksas.",
    shareBtn: "📲 Kopīgot boom.contact",
    signupTitle: "Gatavs nākamajai reizei?",
    signupText: "Izveidojiet bezmaksas kontu un reģistrējiet savu transportlīdzekli. Nākamreiz jūsu konstatējums tiks iepriekš aizpildīts 10 sekunžu laikā.",
    signupBtn: "🚗 Reģistrēt manu transportlīdzekli",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Šveice<br>Digitālais laika zīmogs · Atbilst RGPD",
  },
  mk: {
    insurerTitle: "🟢 Вашиот осигурител идентификуван преку OCR",
    insurerHint: "Контактирајте директно со вашиот осигурител. Контакт информации на вашата полиса или нивната веб страница.",
    pdfAttached: "PDF-то е прикачено на овој емаил",
    nextStepsLabel: "СЛЕДНИ ЧЕКОРИ",
    subject: "✅ Вашиот потпишан извештај — PDF во прилог · boom.contact",
    heading: "Извештајот е завршен и потпишан",
    intro: "Извештајот е потпишан. Вашиот дигитален извештај со времето на настанување е прикачен на овој емаил во PDF формат.",
    step1: "Отворете го прикачениот PDF и проверете ги информациите",
    step2: "Контактирајте <strong>вашиот сопствен осигурител</strong> за да пријавите штета",
    step3: "Испратете им го овој PDF во роковите предвидени со вашиот осигурителен договор",
    deadline: "⏰ Не одложувајте — вашиот осигурител мора да биде контактиран брзо по несреќата.",
    feedbackTitle: "Вашето искуство е важно",
    feedbackQ: "Како помина вашиот извештај?",
    feedbackGood: "😊 Многу добро",
    feedbackBad: "😕 За подобрување",
    googleTitle: "Помогнете ни да растеме",
    googleText: "Ако boom.contact ви го олесни животот, рецензија на Google трае 30 секунди и помага на други возачи да не најдат.",
    googleBtn: "⭐ Оставете рецензија на Google",
    shareTitle: "Споделете со вашите блиски",
    shareText: "Несреќа може да се случи на секого. Испратете го овој линк на вашите блиски — дигиталниот извештај е бесплатен за правење.",
    shareBtn: "📲 Споделете boom.contact",
    signupTitle: "Подготвени за следниот пат?",
    signupText: "Создајте бесплатен профил и регистрирајте го вашето возило. Следниот пат, вашиот извештај ќе биде пополнет за 10 секунди.",
    signupBtn: "🚗 Регистрирајте го моето возило",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Швајцарија<br>Дигитален извештај со времето на настанување · Сообразно со RGPD",
  },
  am: {
    insurerTitle: "🟢 የእርስዎ የኢንሹራንስ አንደኛ በ OCR የተመለከተ",
    insurerHint: "በቀጥታ ወደ የእርስዎ የኢንሹራን አንደኛ ይደውሉ። ዝርዝሮች በየእርስዎ ፖሊሲ ወይም በእነርሱ ድረ-ገጽ ላይ አለው።",
    pdfAttached: "PDF በዚህ ኢሜይል ውስጥ ተያይዞ አለ",
    nextStepsLabel: "የቀጣይ ደረጃዎች",
    subject: "✅ የእርስዎ የተፈረሰ ኮንስታት — PDF በዚህ ተያይዞ አለ · boom.contact",
    heading: "ኮንስታት ተጠናቋል & ተፈረሰ",
    intro: "ኮንስታት ተፈረሰ። የእርስዎ የዳግመ የእንደነበር ሪፖርት በPDF በዚህ ኢሜይል ተያይዞ አለ።",
    step1: "በዚህ ተያይዞ ያለውን PDF ክፈት እና መረጃውን ይረጋግጡ",
    step2: "ወደ <strong>የእርስዎ የኢንሹራን አንደኛ</strong> ይደውሉ እና እንደ ስንቅ ይገልጹ",
    step3: "ይህን የPDF በእንደ ወንጀል የእርስዎ የኢንሹራን ውል ውስጥ በተወሰነ ጊዜ ይላኩ",
    deadline: "⏰ አይቆሙ — የእርስዎ የኢንሹራን አንደኛ ከአደጋው በኋላ በፍጥነት መደውል አለብዎት።",
    feedbackTitle: "የእርስዎ ประสบการณ์ አስተያየት አለው",
    feedbackQ: "የእርስዎ ኮንስታት እንዴት ነበር?",
    feedbackGood: "😊 በጣም ጥሩ",
    feedbackBad: "😕 ወይም ይሻሻል",
    googleTitle: "እንደ እኛ ይህን ይረዳ",
    googleText: "እንደ boom.contact የእርስዎን ሕይወት ቀላል አድርጎ ከሆነ የጉግል አስተያየት 30 ሰከንድ ይወስዳል እና ሌላ እንደ እኛ ይረዳል።",
    googleBtn: "⭐ የጉግል አስተያየት ይቅርታ",
    shareTitle: "ከወዳጆችዎ ጋር ይጋሩ",
    shareText: "አደጋ ማንኛውም ሰው ሊኖር ይችላል። ይህን የድር አገናኝ ወደ ወዳጆችዎ ይላኩ — የዳግመ ኮንስታት ነፃ ነው ማድረግ።",
    shareBtn: "📲 boom.contact ይጋሩ",
    signupTitle: "በሚቀጥለው ጊዜ ዝግጁ?",
    signupText: "አንደኛ ነጻ መለያ ይፍጠሩ እና የእርስዎን ተሽከርካሪ ይመዝገቡ። በሚቀጥለው ጊዜ የእርስዎ ኮንስታት በ10 ሰከንድ ይሞላ.",
    signupBtn: "🚗 የእርስዎን ተሽከርካሪ ይመዝገቡ",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>የዳግመ ኮንስታት የተመለከተ · የ RGPD መሠረት ይህ ነው",
  },
  az: {
    insurerTitle: "🟢 Sizin OCR ilə tanınmış sığortaçınız",
    insurerHint: "Birbaşa sığortaçınızla əlaqə saxlayın. Əlaqə məlumatları sığorta müqavilənizdə və ya onların veb saytında.",
    pdfAttached: "PDF bu e-poçta əlavə olunub",
    nextStepsLabel: "NÖVBƏTİ ADDIMLAR",
    subject: "✅ Sizin imzalanmış constat — PDF əlavə olunub · boom.contact",
    heading: "Constat tamamlandı & imzalandı",
    intro: "Constat imzalanıb. Sizin tarixli rəqəmsal hesabat bu e-poçta PDF formatında əlavə olunub.",
    step1: "Əlavə olunmuş PDF-i açın və məlumatları yoxlayın",
    step2: "Zərəri bildirmək üçün <strong>öz sığortaçınızla</strong> əlaqə saxlayın",
    step3: "Sığorta müqavilənizdə nəzərdə tutulmuş müddətlərdə bu PDF-i onlara göndərin",
    deadline: "⏰ Gecikməyin — sığortaçınızla qısa müddətdə əlaqə saxlanmalıdır.",
    feedbackTitle: "Sizin təcrübəniz önəmlidir",
    feedbackQ: "Constatınız necə keçdi?",
    feedbackGood: "😊 Çox yaxşı",
    feedbackBad: "😕 Təkmilləşdirmək lazımdır",
    googleTitle: "Bizə böyüməkdə kömək edin",
    googleText: "Əgər boom.contact sizə həyatı asanlaşdırdısa, Google-da rəy yazmaq 30 saniyə çəkir və digər sürücülərin bizi tapmasına kömək edir.",
    googleBtn: "⭐ Google-da rəy yazın",
    shareTitle: "Yaxınlarınızla paylaşın",
    shareText: "Qəzalar hər kəsin başına gələ bilər. Bu linki yaxınlarınıza göndərin — rəqəmsal constatın hazırlanması pulsuzdur.",
    shareBtn: "📲 boom.contact ilə paylaşın",
    signupTitle: "Növbəti dəfə üçün hazırsınızmı?",
    signupText: "Pulsuz hesab yaradın və avtomobilinizi qeyd edin. Növbəti dəfə constatınız 10 saniyə ərzində əvvəlcədən doldurulacaq.",
    signupBtn: "🚗 Avtomobilimi qeyd et",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, İsveçrə<br>Tarixli rəqəmsal constat · RGPD-yə uyğun",
  },
  bg: {
    insurerTitle: "🟢 Вашият застраховател, идентифициран чрез OCR",
    insurerHint: "Свържете се директно с вашия застраховател. Данни на вашата полица или на техния уебсайт.",
    pdfAttached: "PDF файлът е приложен към този имейл",
    nextStepsLabel: "СЛЕДВАЩИ СТЪПКИ",
    subject: "✅ Вашият подписан отчет — PDF в прикачения файл · boom.contact",
    heading: "Отчетът е финализиран и подписан",
    intro: "Отчетът е подписан. Вашият цифров доклад с времеви печат е приложен към този имейл в PDF формат.",
    step1: "Отворете приложеното PDF и проверете информацията",
    step2: "Свържете се с <strong>вашия собствен застраховател</strong>, за да подадете иск",
    step3: "Изпратете им този PDF в сроковете, предвидени от вашия застрахователен договор",
    deadline: "⏰ Не се бавете — вашият застраховател трябва да бъде контактуван бързо след инцидента.",
    feedbackTitle: "Вашият опит е важен",
    feedbackQ: "Как премина вашият отчет?",
    feedbackGood: "😊 Много добре",
    feedbackBad: "😕 За подобрение",
    googleTitle: "Помогнете ни да растем",
    googleText: "Ако boom.contact ви е улеснил, отнема 30 секунди да оставите отзив в Google и помага на други шофьори да ни намерят.",
    googleBtn: "⭐ Оставете отзив в Google",
    shareTitle: "Споделете с близките си",
    shareText: "Инцидент може да се случи на всеки. Изпратете този линк на близките си — цифровият отчет е безплатен за изготвяне.",
    shareBtn: "📲 Споделете boom.contact",
    signupTitle: "Готови ли сте за следващия път?",
    signupText: "Създайте безплатен акаунт и регистрирайте вашето превозно средство. Следващия път, вашият отчет ще бъде предварително попълнен за 10 секунди.",
    signupBtn: "🚗 Регистрирайте моето превозно средство",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Швейцария<br>Цифров отчет с времеви печат · Съответства на RGPD",
  },
  bn: {
    insurerTitle: "🟢 আপনার বীমাকারী OCR দ্বারা চিহ্নিত",
    insurerHint: "আপনার বীমাকারীর সাথে সরাসরি যোগাযোগ করুন। যোগাযোগের তথ্য আপনার পলিসিতে বা তাদের ওয়েবসাইটে রয়েছে।",
    pdfAttached: "PDF এই ইমেইলে সংযুক্ত করা হয়েছে",
    nextStepsLabel: "পরবর্তী পদক্ষেপ",
    subject: "✅ আপনার স্বাক্ষরিত প্রতিবেদন — PDF সংযুক্ত · boom.contact",
    heading: "প্রতিবেদন সম্পন্ন ও স্বাক্ষরিত",
    intro: "প্রতিবেদন স্বাক্ষরিত হয়েছে। আপনার ডিজিটাল সময়মত প্রতিবেদন এই ইমেইলে PDF আকারে সংযুক্ত করা হয়েছে।",
    step1: "সংযুক্ত PDF খুলুন এবং তথ্য যাচাই করুন",
    step2: "দুর্ঘটনা ঘোষণা করতে <strong>আপনার নিজস্ব বীমাকারীর</strong> সাথে যোগাযোগ করুন",
    step3: "আপনার বীমা চুক্তির শর্ত অনুযায়ী এই PDF তাদের কাছে পাঠান",
    deadline: "⏰ দেরি করবেন না — দুর্ঘটনার পর আপনার বীমাকারীর সাথে দ্রুত যোগাযোগ করতে হবে।",
    feedbackTitle: "আপনার অভিজ্ঞতা গুরুত্বপূর্ণ",
    feedbackQ: "আপনার প্রতিবেদন কেমন হলো?",
    feedbackGood: "😊 খুব ভালো",
    feedbackBad: "😕 উন্নতির প্রয়োজন",
    googleTitle: "আমাদের বাড়তে সাহায্য করুন",
    googleText: "যদি boom.contact আপনার জীবন সহজ করে থাকে, একটি Google রিভিউ দিতে 30 সেকেন্ড সময় লাগে এবং অন্য চালকদের আমাদের খুঁজে পেতে সাহায্য করে।",
    googleBtn: "⭐ একটি Google রিভিউ দিন",
    shareTitle: "আপনার নিকটজনদের সাথে শেয়ার করুন",
    shareText: "একটি দুর্ঘটনা যেকারো সাথে ঘটতে পারে। এই লিঙ্কটি আপনার নিকটজনদের পাঠান — ডিজিটাল প্রতিবেদন তৈরি করা বিনামূল্যে।",
    shareBtn: "📲 boom.contact শেয়ার করুন",
    signupTitle: "পরবর্তী সময়ের জন্য প্রস্তুত?",
    signupText: "একটি বিনামূল্যের অ্যাকাউন্ট তৈরি করুন এবং আপনার যানবাহন নিবন্ধন করুন। পরবর্তী সময়ে, আপনার প্রতিবেদন 10 সেকেন্ডে পূর্ণ হবে।",
    signupBtn: "🚗 আমার যানবাহন নিবন্ধন করুন",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>ডিজিটাল সময়মত প্রতিবেদন · RGPD অনুযায়ী",
  },
  bs: {
    insurerTitle: "🟢 Vaš osiguravatelj identificiran putem OCR-a",
    insurerHint: "Kontaktirajte direktno svog osiguravatelja. Podaci su na vašoj polici ili njihovoj web stranici.",
    pdfAttached: "PDF je priložen ovom emailu",
    nextStepsLabel: "SLJEDEĆI KORACI",
    subject: "✅ Vaš potpisani izvještaj — PDF u privitku · boom.contact",
    heading: "Izvještaj finaliziran & potpisan",
    intro: "Izvještaj je potpisan. Vaš digitalni izvještaj s vremenskim oznakama je priložen ovom emailu u PDF formatu.",
    step1: "Otvorite priloženi PDF i provjerite informacije",
    step2: "Kontaktirajte <strong>svog vlastitog osiguravatelja</strong> da prijavite štetu",
    step3: "Pošaljite im ovaj PDF u rokovima predviđenim vašim ugovorom o osiguranju",
    deadline: "⏰ Ne odgađajte — vaš osiguravatelj mora biti kontaktiran brzo nakon nesreće.",
    feedbackTitle: "Vaše iskustvo je važno",
    feedbackQ: "Kako je prošao vaš izvještaj?",
    feedbackGood: "😊 Vrlo dobro",
    feedbackBad: "😕 Za poboljšanje",
    googleTitle: "Pomozite nam da rastemo",
    googleText: "Ako vam je boom.contact olakšao život, Google recenzija traje 30 sekundi i pomaže drugim vozačima da nas pronađu.",
    googleBtn: "⭐ Ostavite Google recenziju",
    shareTitle: "Podijelite s vašim bližnjima",
    shareText: "Nesreća se može dogoditi svakome. Pošaljite ovu poveznicu svojim bližnjima — digitalni izvještaj je besplatan za izradu.",
    shareBtn: "📲 Podijelite boom.contact",
    signupTitle: "Spremni za sljedeći put?",
    signupText: "Kreirajte besplatan račun i registrirajte svoje vozilo. Sljedeći put, vaš izvještaj će biti unaprijed ispunjen za 10 sekundi.",
    signupBtn: "🚗 Registrirajte svoje vozilo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švicarska<br>Digitalni izvještaj s vremenskim oznakama · U skladu s RGPD-om",
  },
  cs: {
    insurerTitle: "🟢 Váš pojistitel identifikovaný OCR",
    insurerHint: "Kontaktujte přímo svého pojistitele. Kontaktní údaje najdete na své smlouvě nebo na jejich webových stránkách.",
    pdfAttached: "PDF je přiloženo k tomuto e-mailu",
    nextStepsLabel: "DALŠÍ KROKY",
    subject: "✅ Váš podepsaný protokol — PDF v příloze · boom.contact",
    heading: "Protokol dokončen & podepsán",
    intro: "Protokol je podepsán. Váš digitální časově označený report je přiložen k tomuto e-mailu ve formátu PDF.",
    step1: "Otevřete přiložené PDF a zkontrolujte informace",
    step2: "Kontaktujte <strong>svého vlastního pojistitele</strong> pro nahlášení škody",
    step3: "Předložte jim toto PDF v termínech stanovených vaší pojistnou smlouvou",
    deadline: "⏰ Neotálejte — váš pojistitel musí být kontaktován co nejdříve po nehodě.",
    feedbackTitle: "Vaše zkušenost je důležitá",
    feedbackQ: "Jak probíhal váš protokol?",
    feedbackGood: "😊 Velmi dobře",
    feedbackBad: "😕 Je co zlepšovat",
    googleTitle: "Pomozte nám růst",
    googleText: "Pokud vám boom.contact usnadnil život, recenze na Googlu zabere 30 sekund a pomůže dalším řidičům nás najít.",
    googleBtn: "⭐ Zanechat recenzi na Googlu",
    shareTitle: "Sdílejte se svými blízkými",
    shareText: "Nehoda se může stát komukoli. Pošlete tento odkaz svým blízkým — digitální protokol je zdarma.",
    shareBtn: "📲 Sdílet boom.contact",
    signupTitle: "Připraven na příště?",
    signupText: "Vytvořte si zdarma účet a zaregistrujte své vozidlo. Příště bude váš protokol předvyplněn za 10 sekund.",
    signupBtn: "🚗 Registrovat moje vozidlo",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Švýcarsko<br>Digitální časově označený protokol · V souladu s GDPR",
  },
  da: {
    insurerTitle: "🟢 Din forsikring identificeret af OCR",
    insurerHint: "Kontakt din forsikring direkte. Oplysninger findes på din police eller deres hjemmeside.",
    pdfAttached: "PDF'en er vedhæftet denne e-mail",
    nextStepsLabel: "NÆSTE TRIN",
    subject: "✅ Din underskrevne rapport — PDF vedhæftet · boom.contact",
    heading: "Rapport afsluttet & underskrevet",
    intro: "Rapporten er underskrevet. Din tidsstemplede digitale rapport er vedhæftet denne e-mail i PDF-format.",
    step1: "Åbn den vedhæftede PDF og tjek oplysningerne",
    step2: "Kontakt <strong>din egen forsikring</strong> for at anmelde skaden",
    step3: "Send dem denne PDF inden for de frister, der er angivet i din forsikringsaftale",
    deadline: "⏰ Vent ikke — din forsikring skal kontaktes hurtigt efter ulykken.",
    feedbackTitle: "Din oplevelse tæller",
    feedbackQ: "Hvordan gik din rapport?",
    feedbackGood: "😊 Meget godt",
    feedbackBad: "😕 Til forbedring",
    googleTitle: "Hjælp os med at vokse",
    googleText: "Hvis boom.contact har gjort dit liv lettere, tager en Google-anmeldelse 30 sekunder og hjælper andre bilister med at finde os.",
    googleBtn: "⭐ Efterlad en Google-anmeldelse",
    shareTitle: "Del med dine nærmeste",
    shareText: "En ulykke kan ske for enhver. Send dette link til dine nærmeste — den digitale rapport er gratis at lave.",
    shareBtn: "📲 Del boom.contact",
    signupTitle: "Klar til næste gang?",
    signupText: "Opret en gratis konto og registrer dit køretøj. Næste gang vil din rapport være forudfyldt på 10 sekunder.",
    signupBtn: "🚗 Registrer mit køretøj",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Schweiz<br>Digital tidsstemplet rapport · GDPR-kompatibel",
  },
  el: {
    insurerTitle: "🟢 Ο ασφαλιστής σας αναγνωρίστηκε από OCR",
    insurerHint: "Επικοινωνήστε απευθείας με τον ασφαλιστή σας. Στοιχεία επικοινωνίας στην πολιτική σας ή στην ιστοσελίδα τους.",
    pdfAttached: "Το PDF είναι συνημμένο σε αυτό το email",
    nextStepsLabel: "ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ",
    subject: "✅ Η υπογεγραμμένη αναφορά σας — PDF συνημμένο · boom.contact",
    heading: "Οριστική & υπογεγραμμένη αναφορά",
    intro: "Η αναφορά είναι υπογεγραμμένη. Η ψηφιακή σας αναφορά με χρονοσήμανση είναι συνημμένη σε αυτό το email σε PDF.",
    step1: "Ανοίξτε το συνημμένο PDF και ελέγξτε τις πληροφορίες",
    step2: "Επικοινωνήστε με <strong>τον δικό σας ασφαλιστή</strong> για να δηλώσετε την ζημία",
    step3: "Στείλτε τους αυτό το PDF εντός των προθεσμιών που προβλέπει η ασφαλιστική σας σύμβαση",
    deadline: "⏰ Μην καθυστερείτε — ο ασφαλιστής σας πρέπει να επικοινωνηθεί γρήγορα μετά το ατύχημα.",
    feedbackTitle: "Η εμπειρία σας μετράει",
    feedbackQ: "Πώς ήταν η αναφορά σας;",
    feedbackGood: "😊 Πολύ καλά",
    feedbackBad: "😕 Χρειάζεται βελτίωση",
    googleTitle: "Βοηθήστε μας να μεγαλώσουμε",
    googleText: "Αν το boom.contact σας έχει διευκολύνει, μια κριτική στο Google διαρκεί 30 δευτερόλεπτα και βοηθά άλλους οδηγούς να μας βρουν.",
    googleBtn: "⭐ Αφήστε μια κριτική στο Google",
    shareTitle: "Μοιραστείτε με τους κοντινούς σας",
    shareText: "Ένα ατύχημα μπορεί να συμβεί σε οποιονδήποτε. Στείλτε αυτόν τον σύνδεσμο στους κοντινούς σας — η ψηφιακή αναφορά είναι δωρεάν.",
    shareBtn: "📲 Μοιραστείτε το boom.contact",
    signupTitle: "Έτοιμοι για την επόμενη φορά;",
    signupText: "Δημιουργήστε έναν δωρεάν λογαριασμό και καταχωρίστε το όχημά σας. Την επόμενη φορά, η αναφορά σας θα είναι προ-συμπληρωμένη σε 10 δευτερόλεπτα.",
    signupBtn: "🚗 Καταχωρίστε το όχημά μου",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Ελβετία<br>Ψηφιακή αναφορά με χρονοσήμανση · Συμμορφώνεται με RGPD",
  },
  et: {
    insurerTitle: "🟢 Teie kindlustaja tuvastatud OCR-i kaudu",
    insurerHint: "Võtke otse ühendust oma kindlustajaga. Kontaktandmed teie poliisil või nende veebisaidil.",
    pdfAttached: "PDF on selle e-kirja külge lisatud",
    nextStepsLabel: "JÄRGMINE SAMM",
    subject: "✅ Teie allkirjastatud raport — PDF lisatud · boom.contact",
    heading: "Raport lõpetatud ja allkirjastatud",
    intro: "Raport on allkirjastatud. Teie ajastatud digitaalne raport on selle e-kirja külge lisatud PDF-formaadis.",
    step1: "Avage lisatud PDF ja kontrollige andmeid",
    step2: "Võtke ühendust <strong>oma kindlustajaga</strong>, et teatada juhtumist",
    step3: "Edastage neile see PDF oma kindlustuslepingu tähtaegade jooksul",
    deadline: "⏰ Ärge viivitage — teie kindlustajat tuleb kiiresti pärast õnnetust teavitada.",
    feedbackTitle: "Teie kogemus on oluline",
    feedbackQ: "Kuidas läks teie raport?",
    feedbackGood: "😊 Väga hästi",
    feedbackBad: "😕 Parandamist vajav",
    googleTitle: "Aita meil kasvada",
    googleText: "Kui boom.contact on teie elu lihtsamaks teinud, võtab Google'i arvustus 30 sekundit ja aitab teistel juhtidel meid leida.",
    googleBtn: "⭐ Jätke Google'i arvustus",
    shareTitle: "Jagage oma lähedastega",
    shareText: "Õnnetus võib juhtuda igaühega. Saatke see link oma lähedastele — digitaalne raport on tasuta.",
    shareBtn: "📲 Jagada boom.contact",
    signupTitle: "Kas olete valmis järgmiseks korraks?",
    signupText: "Looge tasuta konto ja registreerige oma sõiduk. Järgmine kord on teie raport eelnevalt täidetud 10 sekundiga.",
    signupBtn: "🚗 Registreeri oma sõiduk",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Šveits<br>Ajastatud digitaalne raport · Vastab RGPD-le",
  },
  fa: {
    insurerTitle: "🟢 بیمه‌گر شما شناسایی شده توسط OCR",
    insurerHint: "به طور مستقیم با بیمه‌گر خود تماس بگیرید. اطلاعات تماس در بیمه‌نامه یا وب‌سایت آنها موجود است.",
    pdfAttached: "PDF به این ایمیل پیوست شده است",
    nextStepsLabel: "مراحل بعدی",
    subject: "✅ گزارش امضا شده شما — PDF پیوست شده · boom.contact",
    heading: "گزارش نهایی و امضا شده",
    intro: "گزارش امضا شده است. گزارش دیجیتال زمان‌بندی شده شما به این ایمیل به صورت PDF پیوست شده است.",
    step1: "PDF پیوست شده را باز کنید و اطلاعات را بررسی کنید",
    step2: "با <strong>بیمه‌گر خود</strong> برای اعلام خسارت تماس بگیرید",
    step3: "این PDF را در مهلت‌های مقرر در قرارداد بیمه‌تان به آنها ارسال کنید",
    deadline: "⏰ تعلل نکنید — بیمه‌گر شما باید به سرعت پس از حادثه تماس گرفته شود.",
    feedbackTitle: "تجربه شما مهم است",
    feedbackQ: "گزارش شما چگونه بود؟",
    feedbackGood: "😊 بسیار خوب",
    feedbackBad: "😕 نیاز به بهبود",
    googleTitle: "به ما در رشد کمک کنید",
    googleText: "اگر boom.contact زندگی شما را آسان کرده است، یک نظر در گوگل 30 ثانیه زمان می‌برد و به دیگر رانندگان کمک می‌کند ما را پیدا کنند.",
    googleBtn: "⭐ نظر خود را در گوگل بگذارید",
    shareTitle: "با عزیزان خود به اشتراک بگذارید",
    shareText: "یک حادثه می‌تواند برای هر کسی اتفاق بیفتد. این لینک را به عزیزان خود ارسال کنید — گزارش دیجیتال رایگان است.",
    shareBtn: "📲 به اشتراک گذاری boom.contact",
    signupTitle: "آماده برای دفعه بعد؟",
    signupText: "یک حساب کاربری رایگان ایجاد کنید و وسیله نقلیه خود را ثبت کنید. دفعه بعد، گزارش شما در 10 ثانیه پیش‌پر شده خواهد بود.",
    signupBtn: "🚗 ثبت وسیله نقلیه من",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>گزارش دیجیتال زمان‌بندی شده · مطابق با RGPD",
  },
  fi: {
    insurerTitle: "🟢 Vakuuttajasi tunnistettu OCR:llä",
    insurerHint: "Ota suoraan yhteyttä vakuuttajaasi. Yhteystiedot vakuutussopimuksessasi tai heidän verkkosivustollaan.",
    pdfAttached: "PDF on liitetty tähän sähköpostiin",
    nextStepsLabel: "SEURAAVAT ASKELEET",
    subject: "✅ Allekirjoitettu raporttisi — PDF liitetty · boom.contact",
    heading: "Raportti valmis & allekirjoitettu",
    intro: "Raportti on allekirjoitettu. Aikaleimattu digitaalinen raporttisi on liitetty tähän sähköpostiin PDF-muodossa.",
    step1: "Avaa liitetty PDF ja tarkista tiedot",
    step2: "Ota yhteyttä <strong>omaan vakuuttajaasi</strong> vahingon ilmoittamiseksi",
    step3: "Toimita heille tämä PDF vakuutussopimuksesi aikarajojen mukaisesti",
    deadline: "⏰ Älä viivyttele — vakuuttajaasi on otettava nopeasti yhteyttä onnettomuuden jälkeen.",
    feedbackTitle: "Kokemuksesi on tärkeä",
    feedbackQ: "Miten raporttisi sujui?",
    feedbackGood: "😊 Erittäin hyvin",
    feedbackBad: "😕 Parannettavaa",
    googleTitle: "Auta meitä kasvamaan",
    googleText: "Jos boom.contact helpotti elämääsi, Google-arvion antaminen vie 30 sekuntia ja auttaa muita kuljettajia löytämään meidät.",
    googleBtn: "⭐ Jätä Google-arvostelu",
    shareTitle: "Jaa läheistesi kanssa",
    shareText: "Onnettomuus voi tapahtua kenelle tahansa. Lähetä tämä linkki läheisillesi — digitaalinen raportti on ilmainen tehdä.",
    shareBtn: "📲 Jaa boom.contact",
    signupTitle: "Valmis seuraavaa kertaa varten?",
    signupText: "Luo ilmainen tili ja rekisteröi ajoneuvosi. Seuraavalla kerralla raporttisi on esitäytetty 10 sekunnissa.",
    signupBtn: "🚗 Rekisteröi ajoneuvoni",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Sveitsi<br>Aikaleimattu digitaalinen raportti · GDPR-yhteensopiva",
  },
  he: {
    insurerTitle: "🟢 המבטח שלכם זוהה על ידי OCR",
    insurerHint: "צרו קשר ישיר עם המבטח שלכם. פרטים בפוליסה או באתר האינטרנט שלהם.",
    pdfAttached: "ה-PDF מצורף לאימייל זה",
    nextStepsLabel: "צעדים הבאים",
    subject: "✅ הדו\"ח שלכם חתום — PDF מצורף · boom.contact",
    heading: "דו\"ח סופי & חתום",
    intro: "הדו\"ח חתום. הדו\"ח הדיגיטלי שלכם עם תאריך מצורף לאימייל זה בפורמט PDF.",
    step1: "פתחו את ה-PDF המצורף ובדקו את המידע",
    step2: "צרו קשר עם <strong>המבטח שלכם</strong> כדי לדווח על התאונה",
    step3: "שלחו להם את ה-PDF הזה במועדים שנקבעו על ידי חוזה הביטוח שלכם",
    deadline: "⏰ אל תתעכבו — המבטח שלכם צריך להיות מקושר במהירות לאחר התאונה.",
    feedbackTitle: "הניסיון שלכם חשוב",
    feedbackQ: "איך היה הדו\"ח שלכם?",
    feedbackGood: "😊 מאוד טוב",
    feedbackBad: "😕 יש לשפר",
    googleTitle: "עזרו לנו לגדול",
    googleText: "אם boom.contact הפך את חייכם לפשוטים יותר, חוות דעת בגוגל לוקחת 30 שניות ועוזרת לנהגים אחרים למצוא אותנו.",
    googleBtn: "⭐ להשאיר חוות דעת בגוגל",
    shareTitle: "שתפו עם הקרובים לכם",
    shareText: "תאונה יכולה לקרות לכל אחד. שלחו את הקישור הזה לקרובים לכם — הדו\"ח הדיגיטלי הוא חינם.",
    shareBtn: "📲 לשתף boom.contact",
    signupTitle: "מוכן לפעם הבאה?",
    signupText: "צרו חשבון חינם ורשמו את הרכב שלכם. בפעם הבאה, הדו\"ח שלכם יתמלא מראש תוך 10 שניות.",
    signupBtn: "🚗 לרשום את הרכב שלי",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>דו\"ח דיגיטלי עם תאריך · תואם ל-RGPD",
  },
  hi: {
    insurerTitle: "🟢 आपका बीमा कंपनी OCR द्वारा पहचाना गया",
    insurerHint: "अपने बीमा कंपनी से सीधे संपर्क करें। संपर्क विवरण आपकी पॉलिसी या उनकी वेबसाइट पर हैं।",
    pdfAttached: "PDF इस ईमेल के साथ संलग्न है",
    nextStepsLabel: "अगले कदम",
    subject: "✅ आपका हस्ताक्षरित रिपोर्ट — PDF संलग्न · boom.contact",
    heading: "रिपोर्ट पूर्ण एवं हस्ताक्षरित",
    intro: "रिपोर्ट पर हस्ताक्षर हो गए हैं। आपका समय-चिह्नित डिजिटल रिपोर्ट इस ईमेल के साथ PDF में संलग्न है।",
    step1: "संलग्न PDF खोलें और जानकारी की जांच करें",
    step2: "<strong>अपने स्वयं के बीमा कंपनी</strong> से संपर्क करें ताकि आप नुकसान की रिपोर्ट कर सकें",
    step3: "अपने बीमा अनुबंध द्वारा निर्धारित समय सीमा के भीतर इस PDF को उन्हें भेजें",
    deadline: "⏰ देर न करें — आपके बीमा कंपनी से दुर्घटना के तुरंत बाद संपर्क किया जाना चाहिए।",
    feedbackTitle: "आपका अनुभव महत्वपूर्ण है",
    feedbackQ: "आपकी रिपोर्ट कैसे रही?",
    feedbackGood: "😊 बहुत अच्छा",
    feedbackBad: "😕 सुधार की आवश्यकता है",
    googleTitle: "हमें बढ़ने में मदद करें",
    googleText: "यदि boom.contact ने आपकी जिंदगी को आसान बनाया है, तो एक Google समीक्षा देने में 30 सेकंड लगते हैं और यह अन्य ड्राइवरों को हमें खोजने में मदद करता है।",
    googleBtn: "⭐ Google समीक्षा छोड़ें",
    shareTitle: "अपने प्रियजनों के साथ साझा करें",
    shareText: "एक दुर्घटना किसी के साथ भी हो सकती है। इस लिंक को अपने प्रियजनों को भेजें — डिजिटल रिपोर्ट बनाना मुफ्त है।",
    shareBtn: "📲 साझा करें boom.contact",
    signupTitle: "अगली बार के लिए तैयार?",
    signupText: "एक मुफ्त खाता बनाएं और अपने वाहन को पंजीकृत करें। अगली बार, आपकी रिपोर्ट 10 सेकंड में पूर्व-भरी होगी।",
    signupBtn: "🚗 मेरा वाहन पंजीकृत करें",
    footer: "boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, स्विट्ज़रलैंड<br>समय-चिह्नित डिजिटल रिपोर्ट · RGPD के अनुरूप",
  },
  ja: {
    insurerTitle: '🟢 OCRで識別された保険会社',
    insurerHint: '保険会社に直接ご連絡ください。詳細は保険証券または公式サイトをご覧ください。',
    pdfAttached: 'PDFはこのメールに添付されています',
    nextStepsLabel: '次のステップ',
    subject: '✅ 署名済み事故報告書 — PDF添付 · boom.contact',
    heading: '事故報告書が完成・署名されました',
    intro: '報告書は署名されました。タイムスタンプ付きデジタル報告書がPDFで添付されています。',
    step1: '添付のPDFを開いて内容を確認してください',
    step2: '<strong>ご自身の保険会社</strong>に連絡して事故を申告してください',
    step3: 'このPDFを送付してください — 期限: <strong>5～10営業日</strong>',
    deadline: '⏰ 遅延しないでください — できるだけ早く保険会社に連絡してください。',
    feedbackTitle: 'ご意見をお聞かせください',
    feedbackQ: 'boom.contactのご体験はいかがでしたか？',
    feedbackGood: '😊 とても良かった',
    feedbackBad: '😕 改善が必要',
    googleTitle: '私たちの成長を助けてください',
    googleText: 'boom.contactがお役に立てたなら、Googleレビューは30秒で書けます。',
    googleBtn: '⭐ Googleレビューを書く',
    shareTitle: 'ご家族・お友達に共有',
    shareText: '事故は誰にでも起こりえます。このリンクを送ってください — デジタル報告書は無料です。',
    shareBtn: '📲 boom.contactをシェア',
    signupTitle: '次回に備えますか？',
    signupText: '無料アカウントを作成して車両を登録。次回は10秒で自動入力されます。',
    signupBtn: '🚗 車両を登録する',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, ジュラ州, スイス',
  },
  tr: {
    insurerTitle: '🟢 OCR ile belirlenen sigortacınız',
    insurerHint: 'Sigortacınızla doğrudan iletişime geçin. Bilgiler poliçenizde veya web sitelerindedir.',
    pdfAttached: 'PDF bu e-postaya eklenmiştir',
    nextStepsLabel: 'SONRAKİ ADIMLAR',
    subject: '✅ İmzalanmış tutanağınız — PDF ekli · boom.contact',
    heading: 'Kaza tutanağı tamamlandı ve imzalandı',
    intro: 'Tutanak imzalandı. Zaman damgalı dijital raporunuz PDF olarak ekte.',
    step1: "Ekli PDF'i açın ve bilgileri doğrulayın",
    step2: 'Hasarı bildirmek için <strong>kendi sigorta şirketinizle</strong> iletişime geçin',
    step3: "Bu PDF'i gönderin — süre: <strong>7 iş günü</strong>",
    deadline: '⏰ Gecikmeyin — sigorta şirketinizle en kısa sürede iletişime geçin.',
    feedbackTitle: 'Deneyiminiz önemli',
    feedbackQ: 'boom.contact deneyiminiz nasıldı?',
    feedbackGood: '😊 Harika',
    feedbackBad: '😕 Geliştirilebilir',
    googleTitle: 'Büyümemize yardımcı olun',
    googleText: 'boom.contact işinizi kolaylaştırdıysa, Google yorumu yazmak sadece 30 saniye.',
    googleBtn: '⭐ Google yorumu yaz',
    shareTitle: 'Arkadaşlarınızla paylaşın',
    shareText: 'Kaza herkese olabilir. Bu bağlantıyı gönderin — dijital tutanak ücretsiz.',
    shareBtn: "📲 boom.contact'ı paylaş",
    signupTitle: 'Bir sonraki sefere hazır mısınız?',
    signupText: 'Ücretsiz hesap oluşturun ve aracınızı kaydedin. Bir sonraki seferde 10 saniyede doldurulur.',
    signupBtn: '🚗 Aracımı kaydet',
    footer: 'boom.contact · PEP\'s Swiss SA · Bellevue 7, 2950 Courgenay, Jura, İsviçre',
  },

};

function getTemplate(lang?: string) {
  const code = (lang || 'fr').split('-')[0].toLowerCase();
  return TEMPLATES[code] || TEMPLATES.en;
}

function buildEmailHTML(params: SendPDFToDriverParams): string {
  const t = getTemplate(params.language);
  // SECURITY: Escape all user-supplied data before inserting into HTML
  const safeInsurerName = params.insurerName ? escapeHtml(params.insurerName) : undefined;
  const safeSessionId = escapeHtml(params.sessionId);
  const safeLang = escapeHtml(params.language || 'fr');
  const BASE = 'https://www.boom.contact';
  const GOOGLE_REVIEW = process.env.GOOGLE_REVIEW_URL || ''; // configurable via env ; vide = bloc avis masqué
  const shareUrl = encodeURIComponent(BASE);
  const shareText = encodeURIComponent('boom.contact — Constat d\'accident numérique en quelques minutes, à transmettre à votre assureur');
  const isRegistered = !!params.driverEmail; // s'ils ont un email, peut-être pas encore de compte

  const rtl = ['ar', 'he', 'fa', 'ur'].includes((params.language || '').toLowerCase());
  const dir = rtl ? 'rtl' : 'ltr';
  const side = rtl ? 'right' : 'left';

  const insurerSection = safeInsurerName ? `
    <tr><td style="padding:0 0 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;">
        <tr><td style="padding:16px 18px;text-align:${side};">
          <div style="font-weight:700;color:#166534;font-size:13px;margin-bottom:6px;">${t.insurerTitle}</div>
          <div style="font-size:17px;font-weight:700;color:#111;margin-bottom:4px;">${safeInsurerName}</div>
          <div style="font-size:12px;color:#5b6b5f;line-height:1.5;">${t.insurerHint}</div>
        </td></tr>
      </table>
    </td></tr>
  ` : '';

  const stepsRows = [t.step1, t.step2, t.step3].map((step, i) => `
    <tr><td style="padding:0 0 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}"><tr>
        <td width="34" valign="top" style="padding-top:2px;">
          <div style="width:28px;height:28px;background:#FF3500;border-radius:50%;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:28px;">${i + 1}</div>
        </td>
        <td valign="top" style="font-size:14px;color:#333333;line-height:1.55;padding:4px 12px 0;text-align:${side};">${step}</td>
      </tr></table>
    </td></tr>`).join('');

  const googleSection = GOOGLE_REVIEW ? `
    <tr><td style="padding:0 0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <div style="font-size:30px;line-height:1;margin-bottom:8px;">⭐</div>
      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">${t.googleTitle}</div>
      <div style="font-size:13px;color:#6b6b6b;margin:0 auto 16px;line-height:1.55;max-width:380px;">${t.googleText}</div>
      <a href="${GOOGLE_REVIEW}" style="display:inline-block;background:#4285F4;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">${t.googleBtn}</a>
    </td></tr></table></td></tr>
    <tr><td style="padding:0 0 26px;"><div style="border-top:1px solid #f0f0f0;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="${safeLang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${t.subject}</title>
  <style>
    a { text-decoration:none; }
    @media only screen and (max-width:600px) {
      .bc-card { width:100%!important; }
      .bc-px { padding-left:22px!important; padding-right:22px!important; }
      .bc-btn { display:block!important; width:100%!important; box-sizing:border-box; }
    }
  </style>
</head>
<body dir="${dir}" style="margin:0;padding:0;background:#F0EDE8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.heading} — ${t.intro}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;"><tr><td align="center" style="padding:24px 12px 48px;">
  <table role="presentation" class="bc-card" width="580" cellpadding="0" cellspacing="0" style="width:580px;max-width:580px;">

    <!-- HEADER -->
    <tr><td style="background:#06060C;border-radius:16px 16px 0 0;padding:26px 32px 22px;" class="bc-px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}"><tr>
        <td valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" dir="${dir}"><tr>
            <td valign="middle"><div style="background:#FF3500;border-radius:10px;width:42px;height:42px;text-align:center;line-height:42px;font-size:21px;">💥</div></td>
            <td valign="middle" style="padding:0 12px;"><span style="color:#FF3500;font-size:20px;font-weight:800;letter-spacing:-0.3px;">boom.contact</span></td>
          </tr></table>
        </td>
        <td valign="middle" align="${rtl ? 'left' : 'right'}">
          <span style="color:rgba(255,255,255,0.32);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">SESSION ${safeSessionId}</span>
        </td>
      </tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:18px;" align="center">
        <div style="font-size:30px;line-height:1;margin-bottom:6px;">✅</div>
        <div style="color:#4ade80;font-size:18px;font-weight:700;line-height:1.3;">${t.heading}</div>
        <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px;line-height:1.5;">${t.intro}</div>
      </td></tr></table>
    </td></tr>

    <!-- BODY -->
    <tr><td style="background:#ffffff;padding:28px 32px 8px;" class="bc-px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

        <!-- PDF attached -->
        <tr><td style="padding:0 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#fff8f7;border:2px solid #FF3500;border-radius:12px;padding:18px;">
          <div style="font-size:30px;line-height:1;margin-bottom:6px;">📎</div>
          <div style="font-weight:700;font-size:15px;color:#111;">${t.pdfAttached}</div>
          <div style="font-size:12px;color:#8a8a8a;margin-top:4px;font-family:monospace;">constat-${safeSessionId}.pdf</div>
        </td></tr></table></td></tr>

        ${insurerSection}

        <!-- Next steps -->
        <tr><td style="padding:0 0 6px;text-align:${side};">
          <div style="font-size:11px;font-weight:700;color:#FF3500;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">${t.nextStepsLabel}</div>
        </td></tr>
        ${stepsRows}

        <!-- Deadline -->
        <tr><td style="padding:6px 0 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fffbeb;border-${side}:4px solid #f59e0b;border-radius:8px;padding:12px 16px;text-align:${side};">
            <div style="font-size:13px;color:#92400e;line-height:1.5;">${t.deadline}</div>
          </td></tr></table>
        </td></tr>

        <tr><td style="padding:0 0 26px;"><div style="border-top:1px solid #f0f0f0;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <!-- Feedback -->
        <tr><td style="padding:0 0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <div style="font-size:16px;font-weight:700;color:#111;margin-bottom:6px;">${t.feedbackTitle}</div>
          <div style="font-size:14px;color:#6b6b6b;margin-bottom:16px;">${t.feedbackQ}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="padding:0 6px;"><a href="${BASE}/?feedback=good&session=${safeSessionId}" style="display:inline-block;background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 22px;font-size:15px;color:#166534;font-weight:600;">${t.feedbackGood}</a></td>
            <td style="padding:0 6px;"><a href="${BASE}/?feedback=bad&session=${safeSessionId}" style="display:inline-block;background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:12px 22px;font-size:15px;color:#991b1b;font-weight:600;">${t.feedbackBad}</a></td>
          </tr></table>
        </td></tr></table></td></tr>

        <tr><td style="padding:0 0 26px;"><div style="border-top:1px solid #f0f0f0;height:1px;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        ${googleSection}

        <!-- Share -->
        <tr><td style="padding:0 0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <div style="font-size:30px;line-height:1;margin-bottom:8px;">📲</div>
          <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">${t.shareTitle}</div>
          <div style="font-size:13px;color:#6b6b6b;margin:0 auto 16px;line-height:1.55;max-width:380px;">${t.shareText}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="padding:0 4px;"><a href="https://wa.me/?text=${shareText}%20${shareUrl}" style="display:inline-block;background:#25D366;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">WhatsApp</a></td>
            <td style="padding:0 4px;"><a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" style="display:inline-block;background:#0088CC;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">Telegram</a></td>
            <td style="padding:0 4px;"><a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" style="display:inline-block;background:#1877F2;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">Facebook</a></td>
            <td style="padding:0 4px;"><a href="sms:?body=${shareText}%20${shareUrl}" style="display:inline-block;background:#34C759;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">SMS</a></td>
          </tr></table>
        </td></tr></table></td></tr>

        <!-- Signup CTA -->
        <tr><td style="padding:0 0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#06060C;border-radius:14px;padding:26px 24px;">
          <div style="font-size:28px;line-height:1;margin-bottom:8px;">🚗</div>
          <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:6px;">${t.signupTitle}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:18px;line-height:1.55;">${t.signupText}</div>
          <a href="${BASE}/?action=signup" class="bc-btn" style="display:inline-block;background:#FF3500;color:#fff;padding:14px 30px;border-radius:10px;font-size:14px;font-weight:700;">${t.signupBtn} ${rtl ? '←' : '→'}</a>
        </td></tr></table></td></tr>

      </table>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#f8f7f5;border-radius:0 0 16px 16px;padding:18px 32px;border-top:1px solid #e8e5e0;" class="bc-px" align="center">
      <div style="font-size:11px;color:#7a7a7a;line-height:1.8;text-align:center;">${t.footer}</div>
    </td></tr>

  </table>
  </td></tr></table>
</body>
</html>`;
}

// ── Main send function ────────────────────────────────────────
export async function sendPDFToDriver(params: SendPDFToDriverParams): Promise<EmailResult> {
  const RESEND_KEY = RESEND_API_KEY;

  if (!RESEND_KEY) {
    logger.warn('RESEND_API_KEY not set — email not sent');
    return { ok: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  try {
    const resend = await getResendClient();

    const t = getTemplate(params.language);
    const html = buildEmailHTML(params);

    const safeSessionId = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const { data, error } = await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: params.driverEmail,
      subject: t.subject,
      html,
      attachments: [{
        filename: `constat-${safeSessionId}.pdf`,
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


// ── B2B Outreach email ───────────────────────────────────────
interface B2BOutreachResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendB2BOutreach(recipientEmail: string, recipientName?: string): Promise<B2BOutreachResult> {
  const RESEND_KEY = RESEND_API_KEY;
  if (!RESEND_KEY) {
    logger.warn('RESEND_API_KEY not set — B2B outreach not sent');
    return { ok: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  try {
    const resend = await getResendClient();
    const safeName = recipientName ? escapeHtml(recipientName) : 'there';

    const subject = 'Digitalize accident reports — boom.contact API';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0EDE8;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:580px;margin:0 auto;padding:24px 16px 48px;">

  <!-- HEADER -->
  <div style="background:#06060C;border-radius:16px 16px 0 0;padding:28px 32px 24px;">
    <div style="background:#FF3500;border-radius:10px;width:44px;height:44px;text-align:center;line-height:44px;font-size:22px;display:inline-block;vertical-align:middle;">&#128165;</div>
    <span style="vertical-align:middle;margin-left:12px;color:#FF3500;font-size:20px;font-weight:800;letter-spacing:-0.3px;">boom.contact</span>
  </div>

  <!-- BODY -->
  <div style="background:#ffffff;padding:28px 32px;">

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Hi ${safeName},</p>

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
      I'm reaching out because <strong>boom.contact</strong> is a digital accident report platform, and we believe it could transform how your organization handles claims intake.
    </p>

    <div style="background:#fff8f7;border:2px solid #FF3500;border-radius:12px;padding:20px;margin:24px 0;">
      <div style="font-size:13px;font-weight:700;color:#FF3500;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">WHAT IT DOES</div>
      <table style="width:100%;font-size:14px;color:#333;line-height:2;">
        <tr><td style="font-weight:600;">Digital report completion</td><td style="text-align:right;font-weight:700;">~5 min</td></tr>
        <tr><td style="font-weight:600;">Document capture</td><td style="text-align:right;font-weight:700;">OCR + AI</td></tr>
        <tr><td style="font-weight:600;">Structured data export</td><td style="text-align:right;font-weight:700;">JSON webhook</td></tr>
        <tr><td style="font-weight:600;">Languages supported</td><td style="text-align:right;font-weight:700;">50</td></tr>
        <tr><td style="font-weight:600;">Tamper-evidence</td><td style="text-align:right;font-weight:700;">Blockchain timestamp</td></tr>
      </table>
    </div>

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
      <strong>How it works:</strong> Your policyholder opens boom.contact after an accident. The drivers fill the digital report in minutes (QR code pairing, OCR document scan, voice input). Your system receives structured JSON via webhook + PDF with a cryptographic blockchain timestamp (OpenTimestamps / Bitcoin).
    </p>

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">
      <strong>No paper. No re-keying. No delays.</strong> Built around the European Accident Statement (constat amiable) model. Designed with GDPR in mind. Works offline (PWA).
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="https://www.boom.contact/b2b" style="display:inline-block;background:#FF3500;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">See the B2B Platform &rarr;</a>
    </div>

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">
      I'd love to schedule a 30-minute demo to show you the API integration and white-label options. Would you have time this week or next?
    </p>

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;">Best regards,</p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;font-weight:700;">Olivier Juillerat</p>
    <p style="font-size:13px;color:#595959;margin:0;">Founder & CEO, boom.contact<br>PEP's Swiss SA &middot; Bellevue 7, 2950 Courgenay, Switzerland</p>
  </div>

  <!-- FOOTER -->
  <div style="background:#f8f7f5;border-radius:0 0 16px 16px;padding:16px 32px;border-top:1px solid #e8e5e0;">
    <div style="font-size:11px;color:#595959;line-height:1.8;text-align:center;">
      boom.contact &middot; PEP's Swiss SA &middot; IDE CHE-476.484.632 &middot; Bellevue 7, 2950 Courgenay, Jura, Switzerland<br>
      Digital accident report &middot; available in multiple languages
    </div>
  </div>

</div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: recipientEmail,
      subject,
      html,
    });

    if (error) {
      logger.error('B2B outreach email send failed', { error: error.message, to: recipientEmail });
      return { ok: false, error: error.message };
    }

    logger.email('b2b-outreach', recipientEmail, subject);
    return { ok: true, messageId: data?.id };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown email error';
    logger.error('B2B outreach email error', { error: msg });
    return { ok: false, error: msg };
  }
}

// ── Magic link email ──────────────────────────────────────────
export async function sendMagicLink(email: string, magicUrl: string): Promise<void> {
  const RESEND_KEY = RESEND_API_KEY;
  if (!RESEND_KEY) { logger.warn('RESEND missing — magic link not sent'); return; }

  try {
    const resend = await getResendClient();
    await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: email,
      subject: '🔑 Votre lien de connexion boom.contact',
      html: `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#F5F8FC;margin:0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(16,32,51,0.10);border:1px solid #DDE7F0;">
  <div style="background:#123A5A;padding:22px 28px;">
    <span style="color:#FFFFFF;font-size:19px;font-weight:700;letter-spacing:-0.01em;">💥 boom.contact</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#102033;">Votre lien de connexion</h2>
    <p style="color:#5D6B7C;margin:0 0 24px;line-height:1.6;">Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable <strong>1 heure</strong>.</p>
    <a href="${magicUrl}" style="display:inline-block;background:#FF6B1A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:16px;">Se connecter →</a>
    <p style="color:#5D6B7C;font-size:13px;margin:24px 0 6px;">Ou copiez ce lien dans votre navigateur :</p>
    <p style="margin:0 0 24px;"><a href="${magicUrl}" style="color:#123A5A;font-size:13px;word-break:break-all;">${magicUrl}</a></p>
    <p style="color:#9AA8B6;font-size:12px;margin:0;border-top:1px solid #EEF4FA;padding-top:16px;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
  </div>
</div></body></html>`,
    });
    logger.email('magic-link', email, 'magic link sent');
  } catch (err) {
    logger.error('sendMagicLink failed', { error: String(err) });
  }
}

// ── Gift credits email ────────────────────────────────────────
export async function sendGiftCreditsLink(recipientEmail: string, giftUrl: string, credits: number): Promise<void> {
  const RESEND_KEY = RESEND_API_KEY;
  if (!RESEND_KEY) { logger.warn('RESEND missing — gift email not sent'); return; }

  try {
    const resend = await getResendClient();
    await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: recipientEmail,
      subject: `🎁 ${credits} crédit${credits > 1 ? 's' : ''} offert${credits > 1 ? 's' : ''} sur boom.contact`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#06060C;padding:24px 28px;">
    <span style="color:#FF3500;font-size:20px;font-weight:700;">💥 boom.contact</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111;">🎁 ${credits} crédit${credits > 1 ? 's' : ''} offert${credits > 1 ? 's' : ''} !</h2>
    <p style="color:#595959;margin:0 0 24px;line-height:1.6;">Vous recevez <strong>${credits} crédit${credits > 1 ? 's' : ''}</strong> pour utiliser boom.contact gratuitement. Cliquez ci-dessous pour les réclamer.</p>
    <a href="${giftUrl}" style="display:inline-block;background:#FF3500;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;">Réclamer mes crédits →</a>
    <p style="color:#595959;font-size:12px;margin-top:24px;">Lien valable 7 jours. Un compte sera créé automatiquement si nécessaire.</p>
  </div>
</div></body></html>`,
    });
    logger.email('gift-credits', recipientEmail, `${credits} credits gift sent`);
  } catch (err) {
    logger.error('Failed to send gift credits email', { error: String(err) });
  }
}

// ── Police report email ────────────────────────────────────────

interface SendPoliceReportParams {
  recipientEmail: string;
  sessionId: string;
  pdfBase64: string;
  filename: string;
  agentName: string;
  stationName: string;
}

export async function sendPoliceReportEmail(params: SendPoliceReportParams): Promise<EmailResult> {
  const RESEND_KEY = RESEND_API_KEY;

  if (!RESEND_KEY) {
    logger.warn('RESEND_API_KEY not set — police report email not sent');
    return { ok: false, error: 'Email service not configured (RESEND_API_KEY missing)' };
  }

  try {
    const resend = await getResendClient();
    const safeSessionId = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const safeAgentName = escapeHtml(params.agentName);
    const safeStationName = escapeHtml(params.stationName);
    const date = new Date().toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const subject = `Rapport d'intervention police — Session ${safeSessionId} · boom.contact`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0EDE8;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:580px;margin:0 auto;padding:24px 16px 48px;">

  <!-- HEADER -->
  <div style="background:#06060C;border-radius:16px 16px 0 0;padding:28px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="background:#FF3500;border-radius:10px;width:44px;height:44px;text-align:center;line-height:44px;font-size:22px;display:inline-block;vertical-align:middle;">💥</div>
        <span style="vertical-align:middle;margin-left:12px;color:#FF3500;font-size:20px;font-weight:800;letter-spacing:-0.3px;">boom.contact</span>
      </td>
      <td align="right">
        <span style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1px;text-transform:uppercase;font-family:monospace;">POLICE</span>
      </td>
    </tr></table>

    <div style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:10px;padding:16px;margin-top:20px;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">🚔</div>
      <div style="color:#93c5fd;font-size:18px;font-weight:700;">Rapport d'intervention police</div>
      <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px;">Session ${safeSessionId}</div>
    </div>
  </div>

  <!-- BODY -->
  <div style="background:#ffffff;padding:28px 32px;">

    <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">📎</div>
      <div style="font-weight:700;font-size:15px;color:#111;">Le rapport PDF est joint à cet email</div>
      <div style="font-size:12px;color:#595959;margin-top:4px;">${escapeHtml(params.filename)}</div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#3b82f6;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">DÉTAILS</div>
      <table style="width:100%;font-size:14px;color:#333;line-height:1.8;">
        <tr><td style="font-weight:600;width:140px;">Agent</td><td>${safeAgentName}</td></tr>
        <tr><td style="font-weight:600;">Poste</td><td>${safeStationName}</td></tr>
        <tr><td style="font-weight:600;">Session</td><td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px;">${safeSessionId}</code></td></tr>
        <tr><td style="font-weight:600;">Date d'envoi</td><td>${date}</td></tr>
      </table>
    </div>

    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px;">
      <div style="font-size:13px;color:#92400e;line-height:1.5;">Ce rapport est généré automatiquement par boom.contact et contient les données du constat ainsi que les annotations de l'agent intervenant.</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#f8f7f5;border-radius:0 0 16px 16px;padding:16px 32px;border-top:1px solid #e8e5e0;">
    <div style="font-size:11px;color:#595959;line-height:1.8;text-align:center;">
      boom.contact · PEP's Swiss SA · IDE CHE-476.484.632 · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>
      Document confidentiel — Rapport d'intervention police
    </div>
  </div>

</div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: params.recipientEmail,
      subject,
      html,
      attachments: [{
        filename: params.filename,
        content: Buffer.from(params.pdfBase64, 'base64'),
      }],
    });

    if (error) {
      logger.error('Police report email send failed', { error: error.message });
      return { ok: false, error: error.message };
    }

    logger.email('police-report', params.recipientEmail, subject);
    return { ok: true, messageId: data?.id };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown email error';
    logger.error('Police report email error', { error: msg });
    return { ok: false, error: msg };
  }
}
// ── Fleet B2B — Email d'invitation membre ────────────────────────────────────
export async function sendOrganizationInvite(
  email: string, organizationName: string, role: 'driver' | 'fleet_admin', inviteUrl: string,
): Promise<void> {
  if (!RESEND_API_KEY) { logger.warn('RESEND missing — org invite not sent'); return; }
  const roleLabel = role === 'fleet_admin' ? 'administrateur de flotte' : 'chauffeur';
  try {
    const resend = await getResendClient();
    await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: email,
      subject: 'Invitation à rejoindre une flotte sur boom.contact',
      html: `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#F5F8FC;margin:0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(16,32,51,0.10);border:1px solid #DDE7F0;">
  <div style="background:#123A5A;padding:22px 28px;">
    <span style="color:#FFFFFF;font-size:19px;font-weight:700;letter-spacing:-0.01em;">💥 boom.contact</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#102033;">Vous êtes invité·e à rejoindre une flotte</h2>
    <p style="color:#5D6B7C;margin:0 0 16px;line-height:1.6;">Vous avez été invité·e à rejoindre <strong>${organizationName}</strong> sur boom.contact, en tant que <strong>${roleLabel}</strong>.</p>
    <p style="color:#5D6B7C;margin:0 0 24px;line-height:1.6;">boom.contact permet de sélectionner un véhicule d'entreprise lors d'un constat, pour gagner du temps.</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#FF6B1A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:16px;">Accepter l'invitation →</a>
    <p style="color:#5D6B7C;font-size:13px;margin:24px 0 6px;">Ce lien est valable 7 jours. Ou copiez-le dans votre navigateur :</p>
    <p style="margin:0 0 24px;"><a href="${inviteUrl}" style="color:#123A5A;font-size:13px;word-break:break-all;">${inviteUrl}</a></p>
    <p style="color:#9AA8B6;font-size:12px;margin:0;border-top:1px solid #EEF4FA;padding-top:16px;">Si vous n'êtes pas concerné·e par cette invitation, ignorez cet email.</p>
  </div>
</div></body></html>`,
    });
    logger.email('org-invite', email, 'org invite sent');
  } catch (err) {
    logger.error('sendOrganizationInvite failed', { error: String(err) });
  }
}
