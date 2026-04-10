// server/src/services/pdf.labels.ts
// Labels multilingues pour le PDF constat
// Règle : langue principale = pays du conducteur, langue secondaire = pays de l'accident

export type PdfLang = 'fr' | 'de' | 'it' | 'en' | 'es' | 'pt' | 'nl' | 'pl' | 'ru' | 'uk' | 'zh' | 'ar';

// ── Mapping pays ISO → langue PDF ───────────────────────────
const COUNTRY_TO_LANG: Record<string, PdfLang> = {
  // Français
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', MA: 'fr', TN: 'fr', DZ: 'fr',
  // Allemand
  DE: 'de', AT: 'de', LI: 'de',
  // Suisse — on se base sur la langue choisie par le conducteur, pas le pays
  CH: 'fr', // fallback CH → fr (remplacé par langue du conducteur si disponible)
  // Italien
  IT: 'it', SM: 'it', VA: 'it',
  // Anglais
  GB: 'en', US: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en', ZA: 'en', IN: 'en',
  // Espagnol
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  // Portugais
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  // Néerlandais
  NL: 'nl',
  // Polonais
  PL: 'pl',
  // Russe
  RU: 'ru', KZ: 'ru', BY: 'ru',
  // Ukrainien
  UA: 'uk',
  // Chinois
  CN: 'zh', TW: 'zh', HK: 'zh',
  // Arabe
  SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', LB: 'ar',
};

export function countryToLang(countryCode?: string): PdfLang {
  if (!countryCode) return 'fr';
  return COUNTRY_TO_LANG[countryCode.toUpperCase()] ?? 'fr';
}

// ── Détermination des langues A et B ─────────────────────────
export interface PdfLangConfig {
  langA: PdfLang;       // langue principale PDF conducteur A
  langB: PdfLang;       // langue principale PDF conducteur B
  langAccident: PdfLang; // langue du pays de l'accident (secondaire si différente)
}

export function determineLangs(
  participantA: Record<string, unknown>,
  participantB: Record<string, unknown>,
  accident: Record<string, unknown>
): PdfLangConfig {
  const pA = participantA as any;
  const pB = participantB as any;
  const acc = accident as any;
  // Pays du conducteur A : d'abord l'OCR du permis, sinon la langue choisie dans l'UI
  const countryA = pA?.driver?.country
    || pA?.vehicle?.country
    || null;
  const langChosenA = pA?.language as PdfLang | undefined;
  const langA: PdfLang = langChosenA ?? (countryA ? countryToLang(countryA) : 'fr');

  // Pays du conducteur B
  const countryB = pB?.driver?.country
    || pB?.vehicle?.country
    || null;
  const langChosenB = pB?.language as PdfLang | undefined;
  const langB: PdfLang = langChosenB ?? (countryB ? countryToLang(countryB) : langA);

  // Pays du lieu de l'accident
  const accidentCountry = acc?.location?.country;
  const langAccident: PdfLang = accidentCountry ? countryToLang(accidentCountry) : langA;

  return { langA, langB, langAccident };
}

// ── Interface labels ─────────────────────────────────────────
export interface PdfLabels {
  // Titre
  title: string;
  subtitle: string;
  // Section 1
  s1: string;
  date: string;
  time: string;
  country: string;
  injuries: string;
  yes: string;
  no: string;
  location: string;
  // Section 2
  s2: string;
  vehicleA: string;
  vehicleB: string;
  driver: string;
  plate: string;
  brand: string;
  name: string;
  address: string;
  birthDate: string;
  licence: string;
  // Section 3
  s3: string;
  insurer: string;
  policyNo: string;
  // Section 4
  s4: string;
  // Section 5
  s5: string;
  // Section 6
  s6: string;
  fault_A: string;
  fault_B: string;
  fault_shared: string;
  fault_unknown: string;
  // Section 7
  s7: string;
  // Section 8
  s8: string;
  sigA: string;
  sigB: string;
  signedAt: string;
  // Sketch
  sketchTitle: string;
  // Photos
  photosTitle: string;
  // Circumstances
  witnesses: string;
  thirdParty: string;
  thirdPartyYes: string;
  // Footer
  footer: string;
  // Circumstances labels
  circ: Record<string, string>;
}

// ── Fonction helper : label bilingue ─────────────────────────
// Si les deux langues sont identiques → label simple
// Si différentes → "label_principal / label_secondaire"
export function biLabel(main: string, secondary: string, mainLang: PdfLang, secLang: PdfLang): string {
  if (mainLang === secLang) return main;
  return `${main} / ${secondary}`;
}

// ── Labels par langue ─────────────────────────────────────────
const LABELS: Record<PdfLang, PdfLabels> = {

  fr: {
    title: 'CONSTAT AMIABLE D\'ACCIDENT',
    subtitle: 'Document numerique certifie - Valable mondialement',
    s1: '1. ACCIDENT', date: 'DATE', time: 'HEURE', country: 'PAYS',
    injuries: 'BLESSES ?', yes: 'OUI', no: 'NON', location: 'LIEU DE L\'ACCIDENT',
    s2: '2. CONDUCTEURS', vehicleA: 'VEHICULE A', vehicleB: 'VEHICULE B',
    driver: 'Conducteur', plate: 'IMMATRICULATION', brand: 'MARQUE / MODELE',
    name: 'NOM COMPLET', address: 'ADRESSE', birthDate: 'DATE DE NAISSANCE', licence: 'PERMIS',
    s3: '3. ASSURANCES', insurer: 'ASSUREUR', policyNo: 'N\xB0 POLICE',
    s4: '4. CIRCONSTANCES',
    s5: '5. ZONES ENDOMMAGEES',
    s6: '6. DECLARATION DE RESPONSABILITE',
    fault_A: 'Le conducteur A se declare responsable',
    fault_B: 'Le conducteur B se declare responsable',
    fault_shared: 'Responsabilite partagee',
    fault_unknown: 'Responsabilite non determinee',
    s7: '7. OBSERVATIONS', s8: '8. SIGNATURES',
    sigA: 'SIGNATURE CONDUCTEUR A', sigB: 'SIGNATURE CONDUCTEUR B',
    signedAt: 'Signe le',
    witnesses: 'TEMOINS', thirdParty: 'DEGATS A DES TIERS',
    thirdPartyYes: 'OUI - Degats tiers signales',
    sketchTitle: 'CROQUIS DE L\'ACCIDENT',
    photosTitle: 'PHOTOS DE LA SCENE',
    footer: 'Constat amiable numerique - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'En stationnement/arret', c2: 'Quittait un stationnement',
      c3: 'Prenait un stationnement', c4: 'Sortait d\'un parking',
      c5: 'S\'engageait dans un parking', c6: 'S\'engageait dans une voie',
      c7: 'Meme sens, meme file', c8: 'Meme sens, file differente',
      c9: 'Changeait de file', c10: 'Doublait',
      c11: 'Prenait la droite', c12: 'Prenait la gauche',
      c13: 'Reculait', c14: 'Empietait sur voie inverse',
      c15: 'Venait de droite (carrefour)', c16: 'N\'avait pas respecte priorite/feu',
      c17: 'Autre (voir observations)',
    },
  },

  de: {
    title: 'EUROPAEISCHER UNFALLBERICHT',
    subtitle: 'Digitales zertifiziertes Dokument - Weltweite Gueltigkeit',
    s1: '1. UNFALL', date: 'DATUM', time: 'UHRZEIT', country: 'LAND',
    injuries: 'VERLETZTE ?', yes: 'JA', no: 'NEIN', location: 'UNFALLORT',
    s2: '2. FAHRER', vehicleA: 'FAHRZEUG A', vehicleB: 'FAHRZEUG B',
    driver: 'Fahrer', plate: 'KENNZEICHEN', brand: 'MARKE / MODELL',
    name: 'VOLLSTAENDIGER NAME', address: 'ADRESSE', birthDate: 'GEBURTSDATUM', licence: 'FUEHRERSCHEIN',
    s3: '3. VERSICHERUNGEN', insurer: 'VERSICHERUNG', policyNo: 'POLICEN-NR.',
    s4: '4. UMSTAENDE',
    s5: '5. BESCHAEDIGTE ZONEN',
    s6: '6. HAFTUNGSERKLAERUNG',
    fault_A: 'Fahrer A erklaert sich fuer verantwortlich',
    fault_B: 'Fahrer B erklaert sich fuer verantwortlich',
    fault_shared: 'Geteilte Haftung',
    fault_unknown: 'Haftung nicht bestimmt',
    s7: '7. BEMERKUNGEN', s8: '8. UNTERSCHRIFTEN',
    sigA: 'UNTERSCHRIFT FAHRER A', sigB: 'UNTERSCHRIFT FAHRER B',
    signedAt: 'Unterzeichnet am',
    witnesses: 'ZEUGEN', thirdParty: 'SACHSCHAEDEN DRITTER',
    thirdPartyYes: 'JA - Drittschaeden gemeldet',
    sketchTitle: 'UNFALLSKIZZE',
    photosTitle: 'FOTOS VOM UNFALLORT',
    footer: 'Digitaler Unfallbericht - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Geparkt/haltend', c2: 'Verliess Parkplatz',
      c3: 'Fuhr auf Parkplatz', c4: 'Kam aus privatem Gelaende',
      c5: 'Fuhr in Parkhaus', c6: 'Fuhr auf Fahrbahn',
      c7: 'Gleiche Richtung, gleiche Spur', c8: 'Gleiche Richtung, andere Spur',
      c9: 'Spurwechsel', c10: 'Ueberholen',
      c11: 'Abbiegung rechts', c12: 'Abbiegung links',
      c13: 'Rueckwaerts', c14: 'Ueberquerte Gegenfahrbahn',
      c15: 'Kam von rechts (Kreuzung)', c16: 'Missachtete Vorfahrt/Ampel',
      c17: 'Sonstiges (siehe Bemerkungen)',
    },
  },

  it: {
    title: 'CONSTATAZIONE AMICHEVOLE D\'INCIDENTE',
    subtitle: 'Documento digitale certificato - Valido in tutto il mondo',
    s1: '1. INCIDENTE', date: 'DATA', time: 'ORA', country: 'PAESE',
    injuries: 'FERITI ?', yes: 'SI', no: 'NO', location: 'LUOGO DELL\'INCIDENTE',
    s2: '2. CONDUCENTI', vehicleA: 'VEICOLO A', vehicleB: 'VEICOLO B',
    driver: 'Conducente', plate: 'TARGA', brand: 'MARCA / MODELLO',
    name: 'NOME COMPLETO', address: 'INDIRIZZO', birthDate: 'DATA DI NASCITA', licence: 'PATENTE',
    s3: '3. ASSICURAZIONI', insurer: 'ASSICURATORE', policyNo: 'N\xB0 POLIZZA',
    s4: '4. CIRCOSTANZE',
    s5: '5. ZONE DANNEGGIATE',
    s6: '6. DICHIARAZIONE DI RESPONSABILITA',
    fault_A: 'Il conducente A si dichiara responsabile',
    fault_B: 'Il conducente B si dichiara responsabile',
    fault_shared: 'Responsabilita condivisa',
    fault_unknown: 'Responsabilita non determinata',
    s7: '7. OSSERVAZIONI', s8: '8. FIRME',
    sigA: 'FIRMA CONDUCENTE A', sigB: 'FIRMA CONDUCENTE B',
    signedAt: 'Firmato il',
    witnesses: 'TESTIMONI', thirdParty: 'DANNI A TERZI',
    thirdPartyYes: 'SI - Danni a terzi segnalati',
    sketchTitle: 'SCHEMA DELL\'INCIDENTE',
    photosTitle: 'FOTO DELLA SCENA',
    footer: 'Constatazione digitale - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Parcheggiato/fermo', c2: 'Lasciava parcheggio',
      c3: 'Prendeva parcheggio', c4: 'Usciva da area privata',
      c5: 'Entrava in parcheggio', c6: 'Entrava in corsia',
      c7: 'Stessa direzione, stessa corsia', c8: 'Stessa direzione, corsia diversa',
      c9: 'Cambio corsia', c10: 'Sorpasso',
      c11: 'Svolta a destra', c12: 'Svolta a sinistra',
      c13: 'Retromarcia', c14: 'Invadeva corsia opposta',
      c15: 'Veniva da destra (incrocio)', c16: 'Non rispettava precedenza/semaforo',
      c17: 'Altro (vedere osservazioni)',
    },
  },

  en: {
    title: 'EUROPEAN ACCIDENT STATEMENT',
    subtitle: 'Certified digital document - Valid worldwide',
    s1: '1. ACCIDENT', date: 'DATE', time: 'TIME', country: 'COUNTRY',
    injuries: 'INJURIES ?', yes: 'YES', no: 'NO', location: 'ACCIDENT LOCATION',
    s2: '2. DRIVERS', vehicleA: 'VEHICLE A', vehicleB: 'VEHICLE B',
    driver: 'Driver', plate: 'REGISTRATION', brand: 'MAKE / MODEL',
    name: 'FULL NAME', address: 'ADDRESS', birthDate: 'DATE OF BIRTH', licence: 'LICENCE',
    s3: '3. INSURANCE', insurer: 'INSURER', policyNo: 'POLICY NO.',
    s4: '4. CIRCUMSTANCES',
    s5: '5. DAMAGED AREAS',
    s6: '6. LIABILITY DECLARATION',
    fault_A: 'Driver A declares liability',
    fault_B: 'Driver B declares liability',
    fault_shared: 'Shared liability',
    fault_unknown: 'Liability undetermined',
    s7: '7. OBSERVATIONS', s8: '8. SIGNATURES',
    sigA: 'DRIVER A SIGNATURE', sigB: 'DRIVER B SIGNATURE',
    signedAt: 'Signed on',
    witnesses: 'WITNESSES', thirdParty: 'THIRD PARTY DAMAGE',
    thirdPartyYes: 'YES - Third party damage reported',
    sketchTitle: 'ACCIDENT SKETCH',
    photosTitle: 'SCENE PHOTOS',
    footer: 'Digital accident report - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Parked/stationary', c2: 'Leaving parking',
      c3: 'Entering parking', c4: 'Exiting private area',
      c5: 'Entering car park', c6: 'Entering roadway',
      c7: 'Same direction, same lane', c8: 'Same direction, different lane',
      c9: 'Changing lane', c10: 'Overtaking',
      c11: 'Turning right', c12: 'Turning left',
      c13: 'Reversing', c14: 'On wrong side of road',
      c15: 'Coming from right (junction)', c16: 'Failed to observe priority/red light',
      c17: 'Other (see observations)',
    },
  },

  es: {
    title: 'DECLARACION AMISTOSA DE ACCIDENTE',
    subtitle: 'Documento digital certificado - Valido en todo el mundo',
    s1: '1. ACCIDENTE', date: 'FECHA', time: 'HORA', country: 'PAIS',
    injuries: 'HERIDOS ?', yes: 'SI', no: 'NO', location: 'LUGAR DEL ACCIDENTE',
    s2: '2. CONDUCTORES', vehicleA: 'VEHICULO A', vehicleB: 'VEHICULO B',
    driver: 'Conductor', plate: 'MATRICULA', brand: 'MARCA / MODELO',
    name: 'NOMBRE COMPLETO', address: 'DIRECCION', birthDate: 'FECHA DE NACIMIENTO', licence: 'PERMISO',
    s3: '3. SEGUROS', insurer: 'ASEGURADORA', policyNo: 'N\xB0 POLIZA',
    s4: '4. CIRCUNSTANCIAS', s5: '5. ZONAS DANADAS',
    s6: '6. DECLARACION DE RESPONSABILIDAD',
    fault_A: 'El conductor A se declara responsable',
    fault_B: 'El conductor B se declara responsable',
    fault_shared: 'Responsabilidad compartida',
    fault_unknown: 'Responsabilidad no determinada',
    s7: '7. OBSERVACIONES', s8: '8. FIRMAS',
    sigA: 'FIRMA CONDUCTOR A', sigB: 'FIRMA CONDUCTOR B',
    signedAt: 'Firmado el',
    witnesses: 'TESTIGOS', thirdParty: 'DANOS A TERCEROS',
    thirdPartyYes: 'SI - Danos a terceros reportados',
    sketchTitle: 'CROQUIS DEL ACCIDENTE',
    photosTitle: 'FOTOS DE LA ESCENA',
    footer: 'Declaracion digital - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Aparcado/parado', c2: 'Salia del aparcamiento', c3: 'Entraba al aparcamiento',
      c4: 'Salia de zona privada', c5: 'Entraba en parking', c6: 'Entraba en calzada',
      c7: 'Mismo sentido, mismo carril', c8: 'Mismo sentido, carril diferente',
      c9: 'Cambio de carril', c10: 'Adelantando', c11: 'Girando a la derecha',
      c12: 'Girando a la izquierda', c13: 'Marcha atras', c14: 'En carril contrario',
      c15: 'Venia por la derecha (cruce)', c16: 'No respeto prioridad/semaforo',
      c17: 'Otro (ver observaciones)',
    },
  },

  pt: {
    title: 'DECLARACAO AMIGAVEL DE ACIDENTE',
    subtitle: 'Documento digital certificado - Valido em todo o mundo',
    s1: '1. ACIDENTE', date: 'DATA', time: 'HORA', country: 'PAIS',
    injuries: 'FERIDOS ?', yes: 'SIM', no: 'NAO', location: 'LOCAL DO ACIDENTE',
    s2: '2. CONDUTORES', vehicleA: 'VEICULO A', vehicleB: 'VEICULO B',
    driver: 'Condutor', plate: 'MATRICULA', brand: 'MARCA / MODELO',
    name: 'NOME COMPLETO', address: 'MORADA', birthDate: 'DATA DE NASCIMENTO', licence: 'CARTA',
    s3: '3. SEGUROS', insurer: 'SEGURADORA', policyNo: 'N\xB0 APOLICE',
    s4: '4. CIRCUNSTANCIAS', s5: '5. ZONAS DANIFICADAS',
    s6: '6. DECLARACAO DE RESPONSABILIDADE',
    fault_A: 'O condutor A declara-se responsavel',
    fault_B: 'O condutor B declara-se responsavel',
    fault_shared: 'Responsabilidade partilhada',
    fault_unknown: 'Responsabilidade nao determinada',
    s7: '7. OBSERVACOES', s8: '8. ASSINATURAS',
    sigA: 'ASSINATURA CONDUTOR A', sigB: 'ASSINATURA CONDUTOR B',
    signedAt: 'Assinado em',
    witnesses: 'TESTEMUNHAS', thirdParty: 'DANOS A TERCEIROS',
    thirdPartyYes: 'SIM - Danos a terceiros reportados',
    sketchTitle: 'ESQUEMA DO ACIDENTE',
    photosTitle: 'FOTOS DA CENA',
    footer: 'Declaracao digital - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Estacionado/parado', c2: 'A sair do estacionamento', c3: 'A entrar no estacionamento',
      c4: 'A sair de zona privada', c5: 'A entrar em parque', c6: 'A entrar na via',
      c7: 'Mesma direcao, mesma faixa', c8: 'Mesma direcao, faixa diferente',
      c9: 'Mudanca de faixa', c10: 'A ultrapassar', c11: 'A virar a direita',
      c12: 'A virar a esquerda', c13: 'Em marcha atras', c14: 'Na faixa contraria',
      c15: 'Vinha pela direita (cruzamento)', c16: 'Nao respeitou prioridade/sinal',
      c17: 'Outro (ver observacoes)',
    },
  },

  nl: {
    title: 'EUROPEES AANRIJDINGSFORMULIER',
    subtitle: 'Gecertificeerd digitaal document - Wereldwijd geldig',
    s1: '1. AANRIJDING', date: 'DATUM', time: 'TIJDSTIP', country: 'LAND',
    injuries: 'GEWONDEN ?', yes: 'JA', no: 'NEE', location: 'PLAATS VAN AANRIJDING',
    s2: '2. BESTUURDERS', vehicleA: 'VOERTUIG A', vehicleB: 'VOERTUIG B',
    driver: 'Bestuurder', plate: 'KENTEKEN', brand: 'MERK / MODEL',
    name: 'VOLLEDIGE NAAM', address: 'ADRES', birthDate: 'GEBOORTEDATUM', licence: 'RIJBEWIJS',
    s3: '3. VERZEKERINGEN', insurer: 'VERZEKERAAR', policyNo: 'POLISNR.',
    s4: '4. OMSTANDIGHEDEN', s5: '5. BESCHADIGDE ZONES',
    s6: '6. AANSPRAKELIJKHEIDSVERKLARING',
    fault_A: 'Bestuurder A verklaart aansprakelijk te zijn',
    fault_B: 'Bestuurder B verklaart aansprakelijk te zijn',
    fault_shared: 'Gedeelde aansprakelijkheid',
    fault_unknown: 'Aansprakelijkheid onbepaald',
    s7: '7. OPMERKINGEN', s8: '8. HANDTEKENINGEN',
    sigA: 'HANDTEKENING BESTUURDER A', sigB: 'HANDTEKENING BESTUURDER B',
    signedAt: 'Ondertekend op',
    witnesses: 'GETUIGEN', thirdParty: 'SCHADE AAN DERDEN',
    thirdPartyYes: 'JA - Schade aan derden gemeld',
    sketchTitle: 'SCHETS AANRIJDING',
    photosTitle: "FOTO'S VAN DE PLAATS",
    footer: 'Digitaal aanrijdingsformulier - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Geparkeerd/stilstaand', c2: 'Verliet parkeerplaats', c3: 'Ging parkeren',
      c4: 'Verliet prive-terrein', c5: 'Reed parkeergarage in', c6: 'Reed rijbaan op',
      c7: 'Zelfde richting, zelfde rijstrook', c8: 'Zelfde richting, andere rijstrook',
      c9: 'Van rijstrook gewisseld', c10: 'Aan het inhalen', c11: 'Afslaand rechts',
      c12: 'Afslaand links', c13: 'Achteruitrijdend', c14: 'Op verkeerde weghelft',
      c15: 'Kwam van rechts (kruispunt)', c16: 'Negeerde voorrang/rood licht',
      c17: 'Anders (zie opmerkingen)',
    },
  },

  pl: {
    title: 'EUROPEJSKIE OSWIADCZENIE O WYPADKU',
    subtitle: 'Certyfikowany dokument cyfrowy - Wazny na calym swiecie',
    s1: '1. WYPADEK', date: 'DATA', time: 'GODZINA', country: 'KRAJ',
    injuries: 'RANNI ?', yes: 'TAK', no: 'NIE', location: 'MIEJSCE WYPADKU',
    s2: '2. KIEROWCY', vehicleA: 'POJAZD A', vehicleB: 'POJAZD B',
    driver: 'Kierowca', plate: 'REJESTRACJA', brand: 'MARKA / MODEL',
    name: 'PELNE IMIE I NAZWISKO', address: 'ADRES', birthDate: 'DATA URODZENIA', licence: 'PRAWO JAZDY',
    s3: '3. UBEZPIECZENIA', insurer: 'UBEZPIECZYCIEL', policyNo: 'NR POLISY',
    s4: '4. OKOLICZNOSCI', s5: '5. USZKODZONE STREFY',
    s6: '6. DEKLARACJA ODPOWIEDZIALNOSCI',
    fault_A: 'Kierowca A oswiadcza odpowiedzialnosc',
    fault_B: 'Kierowca B oswiadcza odpowiedzialnosc',
    fault_shared: 'Wspolna odpowiedzialnosc',
    fault_unknown: 'Odpowiedzialnosc nieustalona',
    s7: '7. UWAGI', s8: '8. PODPISY',
    sigA: 'PODPIS KIEROWCY A', sigB: 'PODPIS KIEROWCY B',
    signedAt: 'Podpisano dnia',
    witnesses: 'SWIADKOWIE', thirdParty: 'SZKODY OSOB TRZECICH',
    thirdPartyYes: 'TAK - Zgloszone szkody osob trzecich',
    sketchTitle: 'SZKIC WYPADKU',
    photosTitle: 'ZDJECIA Z MIEJSCA',
    footer: 'Cyfrowy raport wypadku - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Zaparkowany/stojacy', c2: 'Opuszczal parking', c3: 'Wjezdzal na parking',
      c4: 'Wyjezdzal z terenu prywatnego', c5: 'Wjezdzal do parkingu', c6: 'Wjezdzal na jezdnie',
      c7: 'Ten sam kierunek, ten sam pas', c8: 'Ten sam kierunek, inny pas',
      c9: 'Zmiana pasa', c10: 'Wyprzedzanie', c11: 'Skret w prawo',
      c12: 'Skret w lewo', c13: 'Cofanie', c14: 'Na przeciwnym pasie',
      c15: 'Nadjechal z prawej (skrzyzowanie)', c16: 'Nie zachowal pierwszenstwa/sygnal',
      c17: 'Inne (patrz uwagi)',
    },
  },

  ru: {
    title: 'EVROPEISKOE IZVESHENIE OB AVARII',
    subtitle: 'Sertifitsirovannyi tsifrovoi dokument - Deistvitelen vo vsem mire',
    s1: '1. AVARIA', date: 'DATA', time: 'VREMIA', country: 'STRANA',
    injuries: 'POSTRADAVSHIE ?', yes: 'DA', no: 'NET', location: 'MESTO AVARII',
    s2: '2. VODITELI', vehicleA: 'AVTOMOBIL A', vehicleB: 'AVTOMOBIL B',
    driver: 'Voditel', plate: 'GOSNOM.ZNAK', brand: 'MARKA / MODEL',
    name: 'POLNOE IMIa', address: 'ADRES', birthDate: 'DATA ROZhDENIia', licence: 'PRAVA',
    s3: '3. STRAKhOVKA', insurer: 'STRAKhOVShchIK', policyNo: 'NOM. POLISa',
    s4: '4. OBSTOIaTELSTVA', s5: '5. POVREZHDENNYE ZONY',
    s6: '6. ZaIaVLENIE OB OTVETSTVENNOSTi',
    fault_A: 'Voditel A priznaet otvetstvennost',
    fault_B: 'Voditel B priznaet otvetstvennost',
    fault_shared: 'Sovmestnaia otvetstvennost',
    fault_unknown: 'Otvetstvennost ne ustanovlena',
    s7: '7. ZAMEChANIIa', s8: '8. PODPISI',
    sigA: 'PODPIS VODITELIa A', sigB: 'PODPIS VODITELIa B',
    signedAt: 'Podpisano',
    witnesses: 'SVIDETELi', thirdParty: 'USHCHERB TRETiIM LITsAM',
    thirdPartyYes: 'DA - Ushcherb tretim litsam zafiksirovaN',
    sketchTitle: 'SKhEMA AVARII',
    photosTitle: 'FOTO S MESTA AVARII',
    footer: 'Tsifrovoi otchet ob avarii - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Zaparkovan/stoyal', c2: 'Vyezzhal s parkovki', c3: 'Parkovalsya',
      c4: 'Vyezzhal s chastnoi territorii', c5: 'Vezzhal na parkovku', c6: 'Vezzhal na dorogu',
      c7: 'To zhe napravlenie, tot zhe riad', c8: 'To zhe napravlenie, drugoi riad',
      c9: 'Smena polosy', c10: 'Obgon', c11: 'Povorot napravo',
      c12: 'Povorot nalevo', c13: 'Dvizheniye zadnim khodom', c14: 'Na polose vstrechnogo dvizheniya',
      c15: 'Exal sprava (perekrestok)', c16: 'Ne soblyudal prioritet/svetofor',
      c17: 'Drugoe (sm. zamechaniya)',
    },
  },

  uk: {
    title: 'IeVROPEISKE POVIDOMLENNIa PRO DTP',
    subtitle: 'Sertyfikovanyi tsyfrovyi dokument - Diie v usomu sviti',
    s1: '1. DTP', date: 'DATA', time: 'ChAS', country: 'KRAINA',
    injuries: 'POSTRAZhDALI ?', yes: 'TAK', no: 'NI', location: 'MISIeTsE DTP',
    s2: '2. VIiYI', vehicleA: 'AVTO A', vehicleB: 'AVTO B',
    driver: 'Vodii', plate: 'DERZhNOMER', brand: 'MARKA / MODEL',
    name: 'POVNE IMIa', address: 'ADRESA', birthDate: 'DATA NARODZhENNIa', licence: 'PRAVA',
    s3: '3. STRAKhUVANNIa', insurer: 'STRAKhOVIK', policyNo: 'NOM. POLISu',
    s4: '4. OBSTAVYNy', s5: '5. POShKODZhENI ZONY',
    s6: '6. ZaIaVA PRO VIDPOVIDALNISTb',
    fault_A: 'Vodii A vyznaye vidovdalnist',
    fault_B: 'Vodii B vyznaye vidpovdalnist',
    fault_shared: 'Spilna vidpovidalnist',
    fault_unknown: 'Vidpovidalnist ne vstanovlena',
    s7: '7. ZAUVAZhENNIa', s8: '8. PIDPISy',
    sigA: 'PIDPYS VODIIa A', sigB: 'PIDPYS VODIIa B',
    signedAt: 'Pidpysano',
    witnesses: 'SVIDKy', thirdParty: 'ZBITKy TRETIm OSOBam',
    thirdPartyYes: 'TAK - Zbitky tretim osobam zafiksovano',
    sketchTitle: 'SKhEMA DTP',
    photosTitle: 'FOTO Z MISIeTsIa DTP',
    footer: 'Tsyfrovyi zvit pro DTP - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Zaparkovanyi/stoiav', c2: 'Vyizhdzhav z parkovky', c3: 'Parkovavsia',
      c4: 'Vyizhdzhav z pryvatnoi teritorii', c5: 'Vyzhdzhav na parkovku', c6: 'Vyizhdzhav na dorohu',
      c7: 'Odyn napriam, odna smuha', c8: 'Odyn napriam, insha smuha',
      c9: 'Zmina smugy', c10: 'Obhyn', c11: 'Povorot pravoruch',
      c12: 'Povorot livoruch', c13: 'Rukh zadorom', c14: 'Na zustrichnii smugi',
      c15: 'Ixav sprava (perekhrystia)', c16: 'Ne dotrymavsIa pryorytetu/svitlofora',
      c17: 'Inshe (dyvytsia zauvazhenniia)',
    },
  },

  zh: {
    title: 'OUZHOU JIAOTONGSHOUGUDAN',
    subtitle: 'Renzhen shuziwenjian - Quanqiu youxiao',
    s1: '1. SHIGU', date: 'RIQI', time: 'SHIJIAN', country: 'GUOJIA',
    injuries: 'SHANGYUAN ?', yes: 'SHI', no: 'FOU', location: 'SHIGU DIDIAN',
    s2: '2. SIJI', vehicleA: 'CHELIANG A', vehicleB: 'CHELIANG B',
    driver: 'Siji', plate: 'CHEPAI', brand: 'PINPAI / XINGHAO',
    name: 'QUANCHENG', address: 'DIZHI', birthDate: 'CHUSHENG RIQI', licence: 'JIAZHAO',
    s3: '3. BAOXIAN', insurer: 'BAOXIAN GONGSI', policyNo: 'BAODANHAO',
    s4: '4. QINGJING', s5: '5. SUNSHANG BUWEI',
    s6: '6. ZEREN SHENGMING',
    fault_A: 'Siji A chengren ze ren',
    fault_B: 'Siji B chengren ze ren',
    fault_shared: 'Gongtong ze ren',
    fault_unknown: 'Ze ren wei que ding',
    s7: '7. BEIZHU', s8: '8. QIANMING',
    sigA: 'SIJI A QIANMING', sigB: 'SIJI B QIANMING',
    signedAt: 'Qianming yu',
    witnesses: 'ZHENGRENREN', thirdParty: 'DISANFANG SUNSHI',
    thirdPartyYes: 'SHI - Yi baogao disanfang sunshi',
    sketchTitle: 'SHIGU CAOTU',
    photosTitle: 'XIANCHANG ZHAOPIAN',
    footer: 'Shuzi shigu baogao - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Tingche/jingzhi', c2: 'Li kai tingche chang', c3: 'Jin ru tingche chang',
      c4: 'Li kai si ren qu yu', c5: 'Jin ru tingchechang', c6: 'Jin ru lu mian',
      c7: 'Tong yi fangxiang, tong yi che dao', c8: 'Tong yi fangxiang, bu tong che dao',
      c9: 'Huan che dao', c10: 'Chao yue', c11: 'You zhuan',
      c12: 'Zuo zhuan', c13: 'Dao che', c14: 'Zai dui xiang che dao',
      c15: 'Cong you ce lai (lu kou)', c16: 'Wei zun shou you xian/hong deng',
      c17: 'Qi ta (jian beizhu)',
    },
  },

  ar: {
    title: 'TAQRIR HADITH MURUR URUBI',
    subtitle: 'Wathiqa raqmiya muassada - Salida fi jamia anha al-alam',
    s1: '1. AL-HADITH', date: 'AT-TARIKH', time: 'AL-WAQT', country: 'AD-DAWLA',
    injuries: 'MUSABIN ?', yes: 'NAAM', no: 'LA', location: 'MAWQIA AL-HADITH',
    s2: '2. AS-SUWWAQ', vehicleA: 'AL-ARABIYA A', vehicleB: 'AL-ARABIYA B',
    driver: 'As-Saiq', plate: 'RAQM AL-LAWHA', brand: 'AL-MARKA / AT-TIRAZ',
    name: 'AL-ISM AL-KAMIL', address: 'AL-INWAN', birthDate: 'TARIKH AL-MILAD', licence: 'RUKHSAT AQ-QIADA',
    s3: '3. AT-TAMIN', insurer: 'SHARIKA AT-TAMIN', policyNo: 'RAQM AL-BOLIS',
    s4: '4. AL-MULABBISAT', s5: '5. MANATIQ AT-TALAF',
    s6: '6. TAQRIR AL-MASULIYA',
    fault_A: 'As-saiq A yaqbal al-masuliya',
    fault_B: 'As-saiq B yaqbal al-masuliya',
    fault_shared: 'Masuliya mushtaraka',
    fault_unknown: 'Al-masuliya ghayr muhadada',
    s7: '7. MULAHAZAT', s8: '8. AT-TAWAQIA',
    sigA: 'TAWQIA AS-SAIQ A', sigB: 'TAWQIA AS-SAIQ B',
    signedAt: 'Muwaqqa fi',
    witnesses: 'SHUHUD', thirdParty: 'DARAR LI-ATRAF UKHRA',
    thirdPartyYes: 'NAAM - Darar li-atraf ukhra mujallad',
    sketchTitle: 'RASM TAKHITTI LI-L-HADITH',
    photosTitle: 'SUWWAR MIN AL-MAWQIA',
    footer: 'Taqrir murur raqmi - boom.contact - PEP\'s Swiss SA',
    circ: {
      c1: 'Mawquf', c2: 'Kharij min mawqif', c3: 'Dakhal mawqif',
      c4: 'Kharij min mintaqa khassa', c5: 'Dakhal mawqif sayyarat', c6: 'Dakhal al-tariq',
      c7: 'Nafs al-ittijah, nafs al-masar', c8: 'Nafs al-ittijah, masar mukhtalif',
      c9: 'Taghyir al-masar', c10: 'Mutajawiz', c11: 'Iltifaf yamın',
      c12: 'Iltifaf yasar', c13: 'Al-rajua lil-wara', c14: 'Ala al-masar al-muqabil',
      c15: 'Qadim min al-yamin (taqatu)', c16: 'Lam yahtaram al-awlawiya/al-isharaa',
      c17: 'Ukhra (unzur al-mulahazat)',
    },
  },
};

export function getLabels(lang: PdfLang): PdfLabels {
  return LABELS[lang] ?? LABELS.fr;
}

// ── Police report labels ──────────────────────────────────────
// Labels for the police intervention report PDF (Module Police)

export interface PoliceLabels {
  // Header
  reportTitle: string;
  reportTitleCont: string;
  reportTitleField: string;
  countryLabels: Record<string, string>;
  confidential: string;
  doNotShare: string;
  // Report metadata
  reportNumber: string;
  reportNumberNone: string;
  reportDate: string;
  // Section 1 — Accident
  s1: string;
  accidentDate: string;
  accidentTime: string;
  injuries: string;
  injuriesYes: string;
  injuriesNo: string;
  vehicleCount: string;
  accidentLocation: string;
  gpsCoords: string;
  // Section 2 — Drivers
  driverA: string;
  driverB: string;
  driverBMissing: string;
  nameLabel: string;
  birthDate: string;
  addressLabel: string;
  plate: string;
  brandModel: string;
  color: string;
  insurer: string;
  policyNo: string;
  // Section 3 — Infractions
  s3: string;
  infrCode: string;
  infrDescription: string;
  infrParty: string;
  noInfractions: string;
  // Section 4 — Measures
  s4: string;
  measureLabels: Record<string, string>;
  partyLabel: string;
  noMeasures: string;
  // Section 5 — Witnesses
  s5: string;
  phone: string;
  declaration: string;
  noWitnesses: string;
  // Section 6 — Observations
  s6: string;
  noObservations: string;
  // Section 7 — Agent signature block
  agentAuthor: string;
  badge: string;
  signatureStamp: string;
  signatureRequired: string;
  // Section 7b — Driver states (intervention page)
  s7: string;
  driverLabel: string;
  stateLabels: Record<string, string>;
  apparentState: string;
  alcoholTestYes: string;
  alcoholTestNo: string;
  alcoholPositive: string;
  alcoholNegative: string;
  alcoholRate: string;
  drugTestYes: string;
  drugTestNo: string;
  drugPositive: string;
  drugNegative: string;
  testRefused: string;
  noData: string;
  // Section 8 — Conditions
  s8: string;
  weatherLabels: Record<string, string>;
  visibilityLabels: Record<string, string>;
  roadLabels: Record<string, string>;
  signageLabels: Record<string, string>;
  weatherLabel: string;
  visibilityLabel: string;
  roadStateLabel: string;
  signageLabel: string;
  signageDetails: string;
  speedLimit: string;
  noConditions: string;
  // Section 9 — Responsibility
  s9: string;
  respLabels: Record<string, string>;
  respNone: string;
  // Section 10 — Police photos
  s10: string;
  photoCount: string;
  photoCatLabels: Record<string, string>;
  // Footer
  footerGenerated: string;
  footerConfidential: string;
  footerModule: string;
  footerAuthor: string;
  page: string;
  // Page 3 header
  reportTitleFieldData: string;
  fieldObservations: string;
  annotationsCont: string;
}

const POLICE_LABELS: Record<'fr' | 'de' | 'it' | 'en', PoliceLabels> = {

  fr: {
    reportTitle: 'RAPPORT D\'INTERVENTION',
    reportTitleCont: 'RAPPORT D\'INTERVENTION - SUITE',
    reportTitleField: 'RAPPORT D\'INTERVENTION - DONNEES TERRAIN',
    countryLabels: { CH: 'Confederation Helvetique', FR: 'Republique Francaise', BE: 'Royaume de Belgique', LU: 'Grand-Duche de Luxembourg' },
    confidential: 'CONFIDENTIEL - USAGE OFFICIEL',
    doNotShare: 'Ne pas diffuser aux parties',
    reportNumber: 'N\xB0 DE RAPPORT',
    reportNumberNone: '(non attribue)',
    reportDate: 'DATE DE REDACTION',
    s1: '1. CIRCONSTANCES DE L\'ACCIDENT',
    accidentDate: 'DATE DE L\'ACCIDENT',
    accidentTime: 'HEURE',
    injuries: 'BLESSES',
    injuriesYes: 'OUI',
    injuriesNo: 'NON',
    vehicleCount: 'NB VEHICULES',
    accidentLocation: 'LIEU DE L\'ACCIDENT',
    gpsCoords: 'COORDONNEES GPS',
    driverA: 'CONDUCTEUR A',
    driverB: 'CONDUCTEUR B',
    driverBMissing: 'Conducteur B non encore enregistre dans la session',
    nameLabel: 'NOM / PRENOM',
    birthDate: 'DATE DE NAISSANCE',
    addressLabel: 'ADRESSE',
    plate: 'PLAQUE',
    brandModel: 'MARQUE / MODELE',
    color: 'COULEUR',
    insurer: 'ASSUREUR',
    policyNo: 'N\xB0 POLICE',
    s3: '3. INFRACTIONS CONSTATEES',
    infrCode: 'CODE',
    infrDescription: 'DESCRIPTION',
    infrParty: 'PARTIE',
    noInfractions: 'Aucune infraction constatee',
    s4: '4. MESURES PRISES',
    measureLabels: { alcotest: 'Alcotest', drug_test: 'Test stupefiants', licence_seized: 'Permis saisi', vehicle_towed: 'Vehicule deplace / evacue', pv_issued: 'PV dresse', warning: 'Avertissement verbal', other: 'Autre mesure' },
    partyLabel: 'Partie',
    noMeasures: 'Aucune mesure prise',
    s5: '5. TEMOINS',
    phone: 'Tel',
    declaration: 'Declaration:',
    noWitnesses: 'Aucun temoin enregistre',
    s6: '6. OBSERVATIONS DE L\'AGENT',
    noObservations: '(aucune observation)',
    agentAuthor: 'AGENT REDACTEUR',
    badge: 'Badge',
    signatureStamp: 'SIGNATURE ET CACHET OFFICIEL',
    signatureRequired: '(signature manuscrite requise)',
    s7: '7. ETAT DES CONDUCTEURS',
    driverLabel: 'CONDUCTEUR',
    stateLabels: { normal: 'Normal', shocked: 'Choque', minor_injury: 'Blesse leger', serious_injury: 'Blesse grave', under_influence: 'Sous influence apparente' },
    apparentState: 'Etat apparent',
    alcoholTestYes: 'Alcotest: OUI - Resultat',
    alcoholTestNo: 'Alcotest: NON effectue',
    alcoholPositive: 'Positif',
    alcoholNegative: 'Negatif',
    alcoholRate: 'Taux',
    drugTestYes: 'Test stupefiants: OUI - Resultat',
    drugTestNo: 'Test stupefiants: NON effectue',
    drugPositive: 'Positif',
    drugNegative: 'Negatif',
    testRefused: 'REFUS DE SE SOUMETTRE AU TEST',
    noData: 'Aucune donnee saisie',
    s8: '8. CONDITIONS DE L\'ACCIDENT',
    weatherLabels: { clear: 'Beau temps', rain: 'Pluie', fog: 'Brouillard', snow_ice: 'Neige/Verglas', strong_wind: 'Vent fort' },
    visibilityLabels: { good: 'Bonne', reduced: 'Reduite', night_no_light: 'Nuit sans eclairage', night_with_light: 'Nuit avec eclairage' },
    roadLabels: { dry: 'Seche', wet: 'Mouillee', icy: 'Verglacee', gravel: 'Gravillons', construction: 'Travaux' },
    signageLabels: { compliant: 'Conforme', defective: 'Defaillante', missing: 'Absente' },
    weatherLabel: 'METEO',
    visibilityLabel: 'VISIBILITE',
    roadStateLabel: 'ETAT DE LA CHAUSSEE',
    signageLabel: 'SIGNALISATION',
    signageDetails: 'DETAILS SIGNALISATION',
    speedLimit: 'LIMITATION DE VITESSE SUR ZONE',
    noConditions: 'Aucune condition saisie',
    s9: '9. ESTIMATION DE RESPONSABILITE (INDICATIF)',
    respLabels: { A_responsible: 'Conducteur A responsable', B_responsible: 'Conducteur B responsable', shared: 'Responsabilite partagee', undetermined: 'Indeterminee' },
    respNone: '(non renseignee)',
    s10: '10. PHOTOS POLICE',
    photoCount: 'photo(s) prises par l\'agent',
    photoCatLabels: { overview: 'Vue globale', tracks: 'Detail traces', signage: 'Signalisation', other: 'Autre' },
    footerGenerated: 'Document genere le',
    footerConfidential: 'Ce document est confidentiel et a usage interne exclusivement',
    footerModule: 'boom.contact - Module Police | police.boom.contact',
    footerAuthor: 'Redige par',
    page: 'Page',
    reportTitleFieldData: 'RAPPORT D\'INTERVENTION - DONNEES TERRAIN',
    fieldObservations: 'Constatations sur les lieux - CONFIDENTIEL',
    annotationsCont: 'Annotations de l\'agent - CONFIDENTIEL',
  },

  de: {
    reportTitle: 'INTERVENTIONSBERICHT',
    reportTitleCont: 'INTERVENTIONSBERICHT - FORTSETZUNG',
    reportTitleField: 'INTERVENTIONSBERICHT - FELDDATEN',
    countryLabels: { CH: 'Schweizerische Eidgenossenschaft', FR: 'Franzoesische Republik', BE: 'Koenigreich Belgien', LU: 'Grossherzogtum Luxemburg', DE: 'Bundesrepublik Deutschland', AT: 'Republik Oesterreich', LI: 'Fuerstentum Liechtenstein' },
    confidential: 'VERTRAULICH - DIENSTGEBRAUCH',
    doNotShare: 'Nicht an die Parteien weitergeben',
    reportNumber: 'BERICHTSNUMMER',
    reportNumberNone: '(nicht zugewiesen)',
    reportDate: 'ERSTELLUNGSDATUM',
    s1: '1. UNFALLUMSTAENDE',
    accidentDate: 'UNFALLDATUM',
    accidentTime: 'UHRZEIT',
    injuries: 'VERLETZTE',
    injuriesYes: 'JA',
    injuriesNo: 'NEIN',
    vehicleCount: 'ANZ. FAHRZEUGE',
    accidentLocation: 'UNFALLORT',
    gpsCoords: 'GPS-KOORDINATEN',
    driverA: 'FAHRER A',
    driverB: 'FAHRER B',
    driverBMissing: 'Fahrer B noch nicht in der Sitzung registriert',
    nameLabel: 'NAME / VORNAME',
    birthDate: 'GEBURTSDATUM',
    addressLabel: 'ADRESSE',
    plate: 'KENNZEICHEN',
    brandModel: 'MARKE / MODELL',
    color: 'FARBE',
    insurer: 'VERSICHERUNG',
    policyNo: 'POLICEN-NR.',
    s3: '3. FESTGESTELLTE VERSTOESSE',
    infrCode: 'CODE',
    infrDescription: 'BESCHREIBUNG',
    infrParty: 'PARTEI',
    noInfractions: 'Keine Verstoesse festgestellt',
    s4: '4. ERGRIFFENE MASSNAHMEN',
    measureLabels: { alcotest: 'Atemalkoholtest', drug_test: 'Drogentest', licence_seized: 'Fuehrerschein eingezogen', vehicle_towed: 'Fahrzeug abgeschleppt', pv_issued: 'Bussgeld erteilt', warning: 'Muendliche Verwarnung', other: 'Andere Massnahme' },
    partyLabel: 'Partei',
    noMeasures: 'Keine Massnahmen ergriffen',
    s5: '5. ZEUGEN',
    phone: 'Tel',
    declaration: 'Aussage:',
    noWitnesses: 'Keine Zeugen erfasst',
    s6: '6. BEMERKUNGEN DES BEAMTEN',
    noObservations: '(keine Bemerkungen)',
    agentAuthor: 'VERFASSENDER BEAMTER',
    badge: 'Dienstnr.',
    signatureStamp: 'UNTERSCHRIFT UND DIENSTSIEGEL',
    signatureRequired: '(Handunterschrift erforderlich)',
    s7: '7. ZUSTAND DER FAHRER',
    driverLabel: 'FAHRER',
    stateLabels: { normal: 'Normal', shocked: 'Unter Schock', minor_injury: 'Leicht verletzt', serious_injury: 'Schwer verletzt', under_influence: 'Offensichtlich beeinflusst' },
    apparentState: 'Erkennbarer Zustand',
    alcoholTestYes: 'Atemalkoholtest: JA - Ergebnis',
    alcoholTestNo: 'Atemalkoholtest: NICHT durchgefuehrt',
    alcoholPositive: 'Positiv',
    alcoholNegative: 'Negativ',
    alcoholRate: 'Wert',
    drugTestYes: 'Drogentest: JA - Ergebnis',
    drugTestNo: 'Drogentest: NICHT durchgefuehrt',
    drugPositive: 'Positiv',
    drugNegative: 'Negativ',
    testRefused: 'TESTVERWEIGERUNG',
    noData: 'Keine Daten erfasst',
    s8: '8. UNFALLBEDINGUNGEN',
    weatherLabels: { clear: 'Schoen', rain: 'Regen', fog: 'Nebel', snow_ice: 'Schnee/Glatteis', strong_wind: 'Starker Wind' },
    visibilityLabels: { good: 'Gut', reduced: 'Eingeschraenkt', night_no_light: 'Nacht ohne Beleuchtung', night_with_light: 'Nacht mit Beleuchtung' },
    roadLabels: { dry: 'Trocken', wet: 'Nass', icy: 'Vereist', gravel: 'Schotter', construction: 'Baustelle' },
    signageLabels: { compliant: 'Konform', defective: 'Defekt', missing: 'Fehlend' },
    weatherLabel: 'WETTER',
    visibilityLabel: 'SICHT',
    roadStateLabel: 'FAHRBAHNZUSTAND',
    signageLabel: 'SIGNALISATION',
    signageDetails: 'SIGNALISATIONSDETAILS',
    speedLimit: 'GESCHWINDIGKEITSBEGRENZUNG',
    noConditions: 'Keine Bedingungen erfasst',
    s9: '9. HAFTUNGSSCHAETZUNG (RICHTWERT)',
    respLabels: { A_responsible: 'Fahrer A verantwortlich', B_responsible: 'Fahrer B verantwortlich', shared: 'Geteilte Haftung', undetermined: 'Unbestimmt' },
    respNone: '(nicht angegeben)',
    s10: '10. POLIZEIFOTOS',
    photoCount: 'Foto(s) vom Beamten aufgenommen',
    photoCatLabels: { overview: 'Uebersicht', tracks: 'Spurendetail', signage: 'Signalisation', other: 'Sonstiges' },
    footerGenerated: 'Dokument erstellt am',
    footerConfidential: 'Dieses Dokument ist vertraulich und nur fuer den internen Gebrauch',
    footerModule: 'boom.contact - Polizeimodul | police.boom.contact',
    footerAuthor: 'Erstellt von',
    page: 'Seite',
    reportTitleFieldData: 'INTERVENTIONSBERICHT - FELDDATEN',
    fieldObservations: 'Feststellungen vor Ort - VERTRAULICH',
    annotationsCont: 'Bemerkungen des Beamten - VERTRAULICH',
  },

  it: {
    reportTitle: 'RAPPORTO D\'INTERVENTO',
    reportTitleCont: 'RAPPORTO D\'INTERVENTO - SEGUITO',
    reportTitleField: 'RAPPORTO D\'INTERVENTO - DATI SUL CAMPO',
    countryLabels: { CH: 'Confederazione Svizzera', FR: 'Repubblica Francese', BE: 'Regno del Belgio', LU: 'Granducato di Lussemburgo', IT: 'Repubblica Italiana', SM: 'Repubblica di San Marino' },
    confidential: 'RISERVATO - USO UFFICIALE',
    doNotShare: 'Non divulgare alle parti',
    reportNumber: 'N. DI RAPPORTO',
    reportNumberNone: '(non assegnato)',
    reportDate: 'DATA DI REDAZIONE',
    s1: '1. CIRCOSTANZE DELL\'INCIDENTE',
    accidentDate: 'DATA DELL\'INCIDENTE',
    accidentTime: 'ORA',
    injuries: 'FERITI',
    injuriesYes: 'SI',
    injuriesNo: 'NO',
    vehicleCount: 'N. VEICOLI',
    accidentLocation: 'LUOGO DELL\'INCIDENTE',
    gpsCoords: 'COORDINATE GPS',
    driverA: 'CONDUCENTE A',
    driverB: 'CONDUCENTE B',
    driverBMissing: 'Conducente B non ancora registrato nella sessione',
    nameLabel: 'COGNOME / NOME',
    birthDate: 'DATA DI NASCITA',
    addressLabel: 'INDIRIZZO',
    plate: 'TARGA',
    brandModel: 'MARCA / MODELLO',
    color: 'COLORE',
    insurer: 'ASSICURATORE',
    policyNo: 'N. POLIZZA',
    s3: '3. INFRAZIONI RISCONTRATE',
    infrCode: 'CODICE',
    infrDescription: 'DESCRIZIONE',
    infrParty: 'PARTE',
    noInfractions: 'Nessuna infrazione riscontrata',
    s4: '4. PROVVEDIMENTI ADOTTATI',
    measureLabels: { alcotest: 'Etilometro', drug_test: 'Test antidroga', licence_seized: 'Patente ritirata', vehicle_towed: 'Veicolo rimosso', pv_issued: 'Verbale emesso', warning: 'Ammonimento verbale', other: 'Altro provvedimento' },
    partyLabel: 'Parte',
    noMeasures: 'Nessun provvedimento adottato',
    s5: '5. TESTIMONI',
    phone: 'Tel',
    declaration: 'Dichiarazione:',
    noWitnesses: 'Nessun testimone registrato',
    s6: '6. OSSERVAZIONI DELL\'AGENTE',
    noObservations: '(nessuna osservazione)',
    agentAuthor: 'AGENTE REDATTORE',
    badge: 'Distintivo',
    signatureStamp: 'FIRMA E TIMBRO UFFICIALE',
    signatureRequired: '(firma autografa richiesta)',
    s7: '7. STATO DEI CONDUCENTI',
    driverLabel: 'CONDUCENTE',
    stateLabels: { normal: 'Normale', shocked: 'Sotto shock', minor_injury: 'Ferito lieve', serious_injury: 'Ferito grave', under_influence: 'Apparentemente alterato' },
    apparentState: 'Stato apparente',
    alcoholTestYes: 'Etilometro: SI - Risultato',
    alcoholTestNo: 'Etilometro: NON effettuato',
    alcoholPositive: 'Positivo',
    alcoholNegative: 'Negativo',
    alcoholRate: 'Tasso',
    drugTestYes: 'Test antidroga: SI - Risultato',
    drugTestNo: 'Test antidroga: NON effettuato',
    drugPositive: 'Positivo',
    drugNegative: 'Negativo',
    testRefused: 'RIFIUTO DI SOTTOPORSI AL TEST',
    noData: 'Nessun dato inserito',
    s8: '8. CONDIZIONI DELL\'INCIDENTE',
    weatherLabels: { clear: 'Sereno', rain: 'Pioggia', fog: 'Nebbia', snow_ice: 'Neve/Ghiaccio', strong_wind: 'Vento forte' },
    visibilityLabels: { good: 'Buona', reduced: 'Ridotta', night_no_light: 'Notte senza illuminazione', night_with_light: 'Notte con illuminazione' },
    roadLabels: { dry: 'Asciutta', wet: 'Bagnata', icy: 'Ghiacciata', gravel: 'Ghiaia', construction: 'Lavori in corso' },
    signageLabels: { compliant: 'Conforme', defective: 'Difettosa', missing: 'Assente' },
    weatherLabel: 'METEO',
    visibilityLabel: 'VISIBILITA',
    roadStateLabel: 'STATO DEL MANTO STRADALE',
    signageLabel: 'SEGNALETICA',
    signageDetails: 'DETTAGLI SEGNALETICA',
    speedLimit: 'LIMITE DI VELOCITA NELLA ZONA',
    noConditions: 'Nessuna condizione inserita',
    s9: '9. STIMA DI RESPONSABILITA (INDICATIVA)',
    respLabels: { A_responsible: 'Conducente A responsabile', B_responsible: 'Conducente B responsabile', shared: 'Responsabilita condivisa', undetermined: 'Indeterminata' },
    respNone: '(non indicata)',
    s10: '10. FOTO POLIZIA',
    photoCount: 'foto scattate dall\'agente',
    photoCatLabels: { overview: 'Vista d\'insieme', tracks: 'Dettaglio tracce', signage: 'Segnaletica', other: 'Altro' },
    footerGenerated: 'Documento generato il',
    footerConfidential: 'Questo documento e riservato e ad uso esclusivamente interno',
    footerModule: 'boom.contact - Modulo Polizia | police.boom.contact',
    footerAuthor: 'Redatto da',
    page: 'Pagina',
    reportTitleFieldData: 'RAPPORTO D\'INTERVENTO - DATI SUL CAMPO',
    fieldObservations: 'Constatazioni sul luogo - RISERVATO',
    annotationsCont: 'Annotazioni dell\'agente - RISERVATO',
  },

  en: {
    reportTitle: 'INTERVENTION REPORT',
    reportTitleCont: 'INTERVENTION REPORT - CONTINUED',
    reportTitleField: 'INTERVENTION REPORT - FIELD DATA',
    countryLabels: { CH: 'Swiss Confederation', FR: 'French Republic', BE: 'Kingdom of Belgium', LU: 'Grand Duchy of Luxembourg', GB: 'United Kingdom', US: 'United States', DE: 'Federal Republic of Germany', AT: 'Republic of Austria' },
    confidential: 'CONFIDENTIAL - OFFICIAL USE',
    doNotShare: 'Do not share with the parties',
    reportNumber: 'REPORT NUMBER',
    reportNumberNone: '(not assigned)',
    reportDate: 'DATE OF ISSUE',
    s1: '1. ACCIDENT CIRCUMSTANCES',
    accidentDate: 'ACCIDENT DATE',
    accidentTime: 'TIME',
    injuries: 'INJURIES',
    injuriesYes: 'YES',
    injuriesNo: 'NO',
    vehicleCount: 'NO. OF VEHICLES',
    accidentLocation: 'ACCIDENT LOCATION',
    gpsCoords: 'GPS COORDINATES',
    driverA: 'DRIVER A',
    driverB: 'DRIVER B',
    driverBMissing: 'Driver B not yet registered in the session',
    nameLabel: 'LAST NAME / FIRST NAME',
    birthDate: 'DATE OF BIRTH',
    addressLabel: 'ADDRESS',
    plate: 'REGISTRATION',
    brandModel: 'MAKE / MODEL',
    color: 'COLOUR',
    insurer: 'INSURER',
    policyNo: 'POLICY NO.',
    s3: '3. OBSERVED INFRACTIONS',
    infrCode: 'CODE',
    infrDescription: 'DESCRIPTION',
    infrParty: 'PARTY',
    noInfractions: 'No infractions observed',
    s4: '4. MEASURES TAKEN',
    measureLabels: { alcotest: 'Breathalyser test', drug_test: 'Drug test', licence_seized: 'Licence seized', vehicle_towed: 'Vehicle towed', pv_issued: 'Fine issued', warning: 'Verbal warning', other: 'Other measure' },
    partyLabel: 'Party',
    noMeasures: 'No measures taken',
    s5: '5. WITNESSES',
    phone: 'Phone',
    declaration: 'Statement:',
    noWitnesses: 'No witnesses recorded',
    s6: '6. OFFICER\'S OBSERVATIONS',
    noObservations: '(no observations)',
    agentAuthor: 'REPORTING OFFICER',
    badge: 'Badge',
    signatureStamp: 'SIGNATURE AND OFFICIAL STAMP',
    signatureRequired: '(handwritten signature required)',
    s7: '7. DRIVER CONDITION',
    driverLabel: 'DRIVER',
    stateLabels: { normal: 'Normal', shocked: 'In shock', minor_injury: 'Minor injury', serious_injury: 'Serious injury', under_influence: 'Apparently under the influence' },
    apparentState: 'Apparent state',
    alcoholTestYes: 'Breathalyser: YES - Result',
    alcoholTestNo: 'Breathalyser: NOT performed',
    alcoholPositive: 'Positive',
    alcoholNegative: 'Negative',
    alcoholRate: 'Level',
    drugTestYes: 'Drug test: YES - Result',
    drugTestNo: 'Drug test: NOT performed',
    drugPositive: 'Positive',
    drugNegative: 'Negative',
    testRefused: 'REFUSED TO SUBMIT TO TEST',
    noData: 'No data entered',
    s8: '8. ACCIDENT CONDITIONS',
    weatherLabels: { clear: 'Clear', rain: 'Rain', fog: 'Fog', snow_ice: 'Snow/Ice', strong_wind: 'Strong wind' },
    visibilityLabels: { good: 'Good', reduced: 'Reduced', night_no_light: 'Night without lighting', night_with_light: 'Night with lighting' },
    roadLabels: { dry: 'Dry', wet: 'Wet', icy: 'Icy', gravel: 'Gravel', construction: 'Construction zone' },
    signageLabels: { compliant: 'Compliant', defective: 'Defective', missing: 'Missing' },
    weatherLabel: 'WEATHER',
    visibilityLabel: 'VISIBILITY',
    roadStateLabel: 'ROAD CONDITION',
    signageLabel: 'SIGNAGE',
    signageDetails: 'SIGNAGE DETAILS',
    speedLimit: 'SPEED LIMIT IN ZONE',
    noConditions: 'No conditions entered',
    s9: '9. LIABILITY ESTIMATE (INDICATIVE)',
    respLabels: { A_responsible: 'Driver A responsible', B_responsible: 'Driver B responsible', shared: 'Shared liability', undetermined: 'Undetermined' },
    respNone: '(not specified)',
    s10: '10. POLICE PHOTOS',
    photoCount: 'photo(s) taken by the officer',
    photoCatLabels: { overview: 'Overview', tracks: 'Track detail', signage: 'Signage', other: 'Other' },
    footerGenerated: 'Document generated on',
    footerConfidential: 'This document is confidential and for internal use only',
    footerModule: 'boom.contact - Police Module | police.boom.contact',
    footerAuthor: 'Prepared by',
    page: 'Page',
    reportTitleFieldData: 'INTERVENTION REPORT - FIELD DATA',
    fieldObservations: 'On-site observations - CONFIDENTIAL',
    annotationsCont: 'Officer annotations - CONFIDENTIAL',
  },
};

export type PoliceLang = 'fr' | 'de' | 'it' | 'en';

export function getPoliceLabels(lang: PoliceLang): PoliceLabels {
  return POLICE_LABELS[lang] ?? POLICE_LABELS.fr;
}

/** Map a country code to the best police report language */
export function countryToPoliceLocale(countryCode?: string): PoliceLang {
  if (!countryCode) return 'fr';
  const map: Record<string, PoliceLang> = {
    CH: 'fr', FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
    DE: 'de', AT: 'de', LI: 'de',
    IT: 'it', SM: 'it', VA: 'it',
    GB: 'en', US: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
  };
  return map[countryCode.toUpperCase()] ?? 'en';
}

// Construire un objet bilingue : chaque clé = "main / secondary" si différent
export function getBilingualLabels(mainLang: PdfLang, secLang: PdfLang): PdfLabels {
  if (mainLang === secLang) return getLabels(mainLang);
  const main = getLabels(mainLang);
  const sec  = getLabels(secLang);

  // Helper
  const bi = (m: string, s: string) => m === s ? m : `${m} / ${s}`;

  return {
    title:         bi(main.title, sec.title),
    subtitle:      main.subtitle, // pas bilingue — trop long
    s1:            bi(main.s1, sec.s1),
    date:          bi(main.date, sec.date),
    time:          bi(main.time, sec.time),
    country:       bi(main.country, sec.country),
    injuries:      bi(main.injuries, sec.injuries),
    yes:           bi(main.yes, sec.yes),
    no:            bi(main.no, sec.no),
    location:      bi(main.location, sec.location),
    s2:            bi(main.s2, sec.s2),
    vehicleA:      bi(main.vehicleA, sec.vehicleA),
    vehicleB:      bi(main.vehicleB, sec.vehicleB),
    driver:        bi(main.driver, sec.driver),
    plate:         bi(main.plate, sec.plate),
    brand:         bi(main.brand, sec.brand),
    name:          bi(main.name, sec.name),
    address:       bi(main.address, sec.address),
    birthDate:     bi(main.birthDate, sec.birthDate),
    licence:       bi(main.licence, sec.licence),
    s3:            bi(main.s3, sec.s3),
    insurer:       bi(main.insurer, sec.insurer),
    policyNo:      bi(main.policyNo, sec.policyNo),
    s4:            bi(main.s4, sec.s4),
    s5:            bi(main.s5, sec.s5),
    s6:            bi(main.s6, sec.s6),
    fault_A:       bi(main.fault_A, sec.fault_A),
    fault_B:       bi(main.fault_B, sec.fault_B),
    fault_shared:  bi(main.fault_shared, sec.fault_shared),
    fault_unknown: bi(main.fault_unknown, sec.fault_unknown),
    s7:            bi(main.s7, sec.s7),
    s8:            bi(main.s8, sec.s8),
    sigA:          bi(main.sigA, sec.sigA),
    sigB:          bi(main.sigB, sec.sigB),
    signedAt:      bi(main.signedAt, sec.signedAt),
    witnesses:     bi(main.witnesses, sec.witnesses),
    thirdParty:    bi(main.thirdParty, sec.thirdParty),
    thirdPartyYes: bi(main.thirdPartyYes, sec.thirdPartyYes),
    sketchTitle:   bi(main.sketchTitle, sec.sketchTitle),
    photosTitle:   bi(main.photosTitle, sec.photosTitle),
    footer:        main.footer,
    // Circumstances — bilingues aussi
    circ: Object.fromEntries(
      Object.keys(main.circ).map(k => [
        k,
        main.circ[k] === sec.circ[k]
          ? main.circ[k]
          : `${main.circ[k]} / ${sec.circ[k]}`
      ])
    ),
  };
}
