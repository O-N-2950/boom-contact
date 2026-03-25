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
    subject: '✅ Votre constat signé — PDF ci-joint · boom.contact',
    heading: 'Constat finalisé & signé',
    intro: 'Les deux conducteurs ont signé. Votre constat numérique certifié est joint à cet email en PDF.',
    step1: 'Ouvrez le PDF ci-joint et vérifiez les informations',
    step2: 'Contactez <strong>votre propre assureur</strong> pour déclarer le sinistre',
    step3: 'Transmettez-leur ce PDF — délai : <strong>5 jours (FR) · 8 jours (CH)</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Suisse<br>Constat numérique certifié · Valable dans 150+ pays · Conforme RGPD',
  },
  de: {
    subject: '✅ Ihr unterzeichneter Unfallbericht — PDF anbei · boom.contact',
    heading: 'Unfallbericht abgeschlossen & unterzeichnet',
    intro: 'Beide Fahrer haben unterschrieben. Ihr zertifizierter digitaler Unfallbericht ist als PDF beigefügt.',
    step1: 'Öffnen Sie das beigefügte PDF und prüfen Sie die Angaben',
    step2: 'Kontaktieren Sie <strong>Ihre eigene Versicherung</strong> zur Schadenmeldung',
    step3: 'Übermitteln Sie dieses PDF — Frist: <strong>8 Tage (CH)</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Gruppe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Schweiz',
  },
  it: {
    subject: '✅ Il vostro modulo firmato — PDF allegato · boom.contact',
    heading: 'Constatazione completata e firmata',
    intro: 'Entrambi i conducenti hanno firmato. Il vostro modulo digitale certificato è allegato in PDF.',
    step1: 'Aprite il PDF allegato e verificate le informazioni',
    step2: 'Contattate <strong>la vostra assicurazione</strong> per dichiarare il sinistro',
    step3: 'Inviate loro questo PDF — termine: <strong>8 giorni</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Gruppo NEUKOMM · Bellevue 7, 2950 Courgenay, Giura, Svizzera',
  },
  en: {
    subject: '✅ Your signed accident report — PDF attached · boom.contact',
    heading: 'Accident report completed & signed',
    intro: 'Both drivers have signed. Your certified digital accident report is attached as a PDF.',
    step1: 'Open the attached PDF and verify the information',
    step2: 'Contact <strong>your own insurance company</strong> to file the claim',
    step3: 'Send them this PDF — deadline: <strong>5–10 working days</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Switzerland',
  },
  es: {
    subject: '✅ Su declaración firmada — PDF adjunto · boom.contact',
    heading: 'Declaración completada y firmada',
    intro: 'Ambos conductores han firmado. Su declaración digital certificada está adjunta en PDF.',
    step1: 'Abra el PDF adjunto y verifique la información',
    step2: 'Contacte <strong>a su propia aseguradora</strong> para declarar el siniestro',
    step3: 'Envíeles este PDF — plazo: <strong>7 días hábiles</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Suiza',
  },
  pt: {
    subject: '✅ A sua declaração assinada — PDF em anexo · boom.contact',
    heading: 'Declaração concluída e assinada',
    intro: 'Ambos os condutores assinaram. A sua declaração digital certificada está anexada em PDF.',
    step1: 'Abra o PDF em anexo e verifique as informações',
    step2: 'Contacte <strong>a sua seguradora</strong> para declarar o sinistro',
    step3: 'Envie-lhes este PDF — prazo: <strong>8 dias úteis</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Suíça',
  },
  nl: {
    subject: '✅ Uw ondertekend aanrijdingsformulier — PDF bijgevoegd · boom.contact',
    heading: 'Aanrijdingsformulier voltooid en ondertekend',
    intro: 'Beide bestuurders hebben getekend. Uw gecertificeerd digitaal formulier is bijgevoegd als PDF.',
    step1: 'Open de bijgevoegde PDF en controleer de gegevens',
    step2: 'Neem contact op met <strong>uw eigen verzekeraar</strong> om de schade te melden',
    step3: 'Stuur hen deze PDF — termijn: <strong>8 werkdagen</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Zwitserland',
  },
  pl: {
    subject: '✅ Twoje podpisane oświadczenie — PDF w załączniku · boom.contact',
    heading: 'Oświadczenie o zdarzeniu zakończone i podpisane',
    intro: 'Obaj kierowcy podpisali. Twoje certyfikowane cyfrowe oświadczenie jest dołączone jako PDF.',
    step1: 'Otwórz załączony PDF i sprawdź dane',
    step2: 'Skontaktuj się <strong>ze swoim ubezpieczycielem</strong>, aby zgłosić szkodę',
    step3: 'Prześlij im ten PDF — termin: <strong>7 dni roboczych</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Bellevue 7, 2950 Courgenay, Jura, Szwajcaria',
  },
  ru: {
    subject: '✅ Ваш подписанный протокол — PDF во вложении · boom.contact',
    heading: 'Протокол о ДТП завершён и подписан',
    intro: 'Оба водителя подписали. Ваш сертифицированный цифровой протокол прилагается в формате PDF.',
    step1: 'Откройте прилагаемый PDF и проверьте данные',
    step2: 'Свяжитесь <strong>со своей страховой компанией</strong> для подачи заявления',
    step3: 'Отправьте им этот PDF — срок: <strong>5–8 рабочих дней</strong>',
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
    footer: 'boom.contact · PEP\'s Swiss SA · Groupe NEUKOMM · Белльвю 7, 2950 Куржено, Юра, Швейцария',
  },
  ar: {
    subject: '✅ تقريركم الموقع — PDF مرفق · boom.contact',
    heading: 'تقرير الحادث مكتمل وموقع',
    intro: 'وقّع كلا السائقين. تقريركم الرقمي المعتمد مرفق بصيغة PDF.',
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
    footer: 'boom.contact · PEP\'s Swiss SA · مجموعة NEUKOMM · Bellevue 7, 2950 Courgenay، جورا، سويسرا',
  },
  zh: {
    subject: '✅ 您已签署的事故报告 — PDF附件 · boom.contact',
    heading: '事故报告已完成并签署',
    intro: '双方驾驶员均已签署。您的认证数字报告以PDF格式附上。',
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
    footer: 'boom.contact · PEP\'s Swiss SA · NEUKOMM集团 · Bellevue 7, 2950 Courgenay, 瑞士汝拉州',
  },
  ja: {
    subject: '✅ 署名済み事故報告書 — PDF添付 · boom.contact',
    heading: '事故報告書が完成・署名されました',
    intro: '両ドライバーが署名しました。認定デジタル報告書がPDFで添付されています。',
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
    footer: 'boom.contact · PEP\'s Swiss SA · NEUKOMMグループ · Bellevue 7, 2950 Courgenay, ジュラ州, スイス',
  },
  tr: {
    subject: '✅ İmzalanmış tutanağınız — PDF ekli · boom.contact',
    heading: 'Kaza tutanağı tamamlandı ve imzalandı',
    intro: 'Her iki sürücü de imzaladı. Sertifikalı dijital tutanağınız PDF olarak ekte.',
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
    footer: 'boom.contact · PEP\'s Swiss SA · NEUKOMM Grubu · Bellevue 7, 2950 Courgenay, Jura, İsviçre',
  },

};

function getTemplate(lang?: string) {
  const code = (lang || 'fr').split('-')[0].toLowerCase();
  return TEMPLATES[code] || TEMPLATES.en;
}

function buildEmailHTML(params: SendPDFToDriverParams): string {
  const t = getTemplate(params.language);
  const BASE = 'https://www.boom.contact';
  const GOOGLE_REVIEW = 'https://g.page/r/boom-contact/review'; // à personnaliser avec la vraie URL Google
  const shareUrl = encodeURIComponent(BASE);
  const shareText = encodeURIComponent('boom.contact — Constat d\'accident numérique en 5 min, valable dans 150 pays');
  const isRegistered = !!params.driverEmail; // s'ils ont un email, peut-être pas encore de compte

  const insurerSection = params.insurerName ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin:0 0 20px;">
      <div style="font-weight:700;color:#166534;font-size:13px;margin-bottom:6px;">🟢 Votre assureur identifié par OCR</div>
      <div style="font-size:17px;font-weight:700;color:#111;margin-bottom:4px;">${params.insurerName}</div>
      <div style="font-size:12px;color:#555;line-height:1.5;">
        Contactez directement votre assureur. Coordonnées sur votre police ou leur site web.
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="${params.language || 'fr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background:#F0EDE8;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="max-width:580px;margin:0 auto;padding:24px 16px 48px;">

  <!-- ═══ HEADER ═══ -->
  <div style="background:#06060C;border-radius:16px 16px 0 0;padding:28px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="background:#FF3500;border-radius:10px;width:44px;height:44px;text-align:center;line-height:44px;font-size:22px;display:inline-block;vertical-align:middle;">💥</div>
        <span style="vertical-align:middle;margin-left:12px;color:#FF3500;font-size:20px;font-weight:800;letter-spacing:-0.3px;">boom.contact</span>
      </td>
      <td align="right">
        <span style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">SESSION ${params.sessionId}</span>
      </td>
    </tr></table>

    <!-- Green success banner -->
    <div style="background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:16px;margin-top:20px;text-align:center;">
      <div style="font-size:28px;margin-bottom:6px;">✅</div>
      <div style="color:#4ade80;font-size:18px;font-weight:700;">${t.heading}</div>
      <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px;">${t.intro}</div>
    </div>
  </div>

  <!-- ═══ BODY ═══ -->
  <div style="background:#ffffff;padding:28px 32px;">

    <!-- PDF attached notice -->
    <div style="background:#fff8f7;border:2px solid #FF3500;border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">📎</div>
      <div style="font-weight:700;font-size:15px;color:#111;">Le PDF est joint à cet email</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">constat-${params.sessionId}.pdf</div>
    </div>

    ${insurerSection}

    <!-- Next steps -->
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#FF3500;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">PROCHAINES ÉTAPES</div>
      ${[t.step1, t.step2, t.step3].map((step, i) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="min-width:28px;height:28px;background:#FF3500;border-radius:50%;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:28px;flex-shrink:0;">${i + 1}</div>
        <div style="font-size:14px;color:#333;line-height:1.55;padding-top:5px;">${step}</div>
      </div>`).join('')}
    </div>

    <!-- Deadline -->
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:28px;">
      <div style="font-size:13px;color:#92400e;line-height:1.5;">${t.deadline}</div>
    </div>

    <!-- ─── DIVIDER ─── -->
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 28px;">

    <!-- ═══ FEEDBACK ═══ -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:16px;font-weight:700;color:#111;margin-bottom:6px;">${t.feedbackTitle}</div>
      <div style="font-size:14px;color:#666;margin-bottom:16px;">${t.feedbackQ}</div>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="padding:0 6px;">
          <a href="${BASE}/?feedback=good&session=${params.sessionId}" style="display:inline-block;background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 24px;font-size:15px;text-decoration:none;color:#166534;font-weight:600;">${t.feedbackGood}</a>
        </td>
        <td style="padding:0 6px;">
          <a href="${BASE}/?feedback=bad&session=${params.sessionId}" style="display:inline-block;background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:12px 24px;font-size:15px;text-decoration:none;color:#991b1b;font-weight:600;">${t.feedbackBad}</a>
        </td>
      </tr></table>
    </div>

    <!-- ─── DIVIDER ─── -->
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 28px;">

    <!-- ═══ GOOGLE REVIEW ═══ -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:32px;margin-bottom:8px;">⭐</div>
      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">${t.googleTitle}</div>
      <div style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.55;max-width:380px;margin-left:auto;margin-right:auto;">${t.googleText}</div>
      <a href="${GOOGLE_REVIEW}" style="display:inline-block;background:#4285F4;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">${t.googleBtn}</a>
    </div>

    <!-- ─── DIVIDER ─── -->
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 28px;">

    <!-- ═══ SHARE ═══ -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:32px;margin-bottom:8px;">📲</div>
      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">${t.shareTitle}</div>
      <div style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.55;max-width:380px;margin-left:auto;margin-right:auto;">${t.shareText}</div>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td style="padding:0 4px;">
          <a href="https://wa.me/?text=${shareText}%20${shareUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">WhatsApp</a>
        </td>
        <td style="padding:0 4px;">
          <a href="https://t.me/share/url?url=${shareUrl}&text=${shareText}" style="display:inline-block;background:#0088CC;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">Telegram</a>
        </td>
        <td style="padding:0 4px;">
          <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">Facebook</a>
        </td>
        <td style="padding:0 4px;">
          <a href="sms:?body=${shareText}%20${shareUrl}" style="display:inline-block;background:#34C759;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700;">SMS</a>
        </td>
      </tr></table>
    </div>

    <!-- ─── DIVIDER ─── -->
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 28px;">

    <!-- ═══ SIGNUP / SAVE VEHICLE ═══ -->
    <div style="background:#06060C;border-radius:12px;padding:24px;text-align:center;margin-bottom:8px;">
      <div style="font-size:28px;margin-bottom:8px;">🚗</div>
      <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:6px;">${t.signupTitle}</div>
      <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-bottom:18px;line-height:1.55;">${t.signupText}</div>
      <a href="${BASE}/?action=signup" style="display:inline-block;background:#FF3500;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;">${t.signupBtn} →</a>
    </div>

  </div>

  <!-- ═══ FOOTER ═══ -->
  <div style="background:#f8f7f5;border-radius:0 0 16px 16px;padding:16px 32px;border-top:1px solid #e8e5e0;">
    <div style="font-size:11px;color:#aaa;line-height:1.8;text-align:center;">
      ${t.footer}
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
      from: 'boom.contact <contact@boom.contact>',
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


// ── Magic link email ──────────────────────────────────────────
export async function sendMagicLink(email: string, magicUrl: string): Promise<void> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) { logger.warn('RESEND missing — magic link not sent'); return; }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_KEY);
    await resend.emails.send({
      from: 'boom.contact <contact@boom.contact>',
      to: email,
      subject: '🔑 Votre lien de connexion boom.contact',
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;margin:0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#06060C;padding:24px 28px;">
    <span style="color:#FF3500;font-size:20px;font-weight:700;">💥 boom.contact</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111;">Votre lien de connexion</h2>
    <p style="color:#555;margin:0 0 24px;line-height:1.6;">Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable <strong>15 minutes</strong>.</p>
    <a href="${magicUrl}" style="display:inline-block;background:#FF3500;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;">Se connecter →</a>
    <p style="color:#999;font-size:12px;margin-top:24px;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
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
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) { logger.warn('RESEND missing — gift email not sent'); return; }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_KEY);
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
    <p style="color:#555;margin:0 0 24px;line-height:1.6;">Vous recevez <strong>${credits} crédit${credits > 1 ? 's' : ''}</strong> pour utiliser boom.contact gratuitement. Cliquez ci-dessous pour les réclamer.</p>
    <a href="${giftUrl}" style="display:inline-block;background:#FF3500;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;">Réclamer mes crédits →</a>
    <p style="color:#999;font-size:12px;margin-top:24px;">Lien valable 7 jours. Un compte sera créé automatiquement si nécessaire.</p>
  </div>
</div></body></html>`,
    });
    logger.email('gift-credits', recipientEmail, `${credits} credits gift sent`);
  } catch (err) {
    logger.error('sendGiftCreditsLink failed', { error: String(err) });
  }
}
