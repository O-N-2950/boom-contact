import { InsuranceSearchWidget } from './constat/InsuranceAssistance';
import { useState } from 'react';
import { trpc } from '../trpc';

// ── Data ──────────────────────────────────────────────────────
interface EmergencyContact {
  name: string;
  number: string;
  type: 'rescue' | 'police' | 'roadside' | 'insurance' | 'ambulance';
  note?: string;
  free?: boolean;
}

interface CountryEmergency {
  code: string;
  flag: string;
  name: string;
  region: string;
  contacts: EmergencyContact[];
}

export const EMERGENCY_DATA: CountryEmergency[] = [
  // ── EUROPE FRANCOPHONE ──────────────────────────────────────
  {
    code: 'CH', flag: '🇨🇭', name: 'Suisse', region: 'Europe',
    contacts: [
      { name: 'Police', number: '117', type: 'police', free: true },
      { name: 'Ambulance / SAMU', number: '144', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '118', type: 'rescue', free: true },
      { name: 'Urgences européen', number: '112', type: 'rescue', free: true },
      { name: 'TCS Dépannage 24h/7j', number: '0800 140 140', type: 'roadside', free: true, note: 'Touring Club Suisse — membres' },
      { name: 'ACS Assistance', number: '044 283 33 77', type: 'roadside', note: 'Automobile Club Suisse (depuis 2018)' },
      { name: 'REGA Hélicoptère', number: '1414', type: 'ambulance', note: 'Garde aérienne de sauvetage' },
      { name: 'emmental versicherung dépannage', number: '031 790 24 24', type: 'roadside', note: 'Panne & remorquage 24h · depuis étranger: +41 31 790 24 24' },
      { name: 'SIMPEGO sinistres 24h', number: '+41 58 521 11 11', type: 'insurance', note: 'Customer Solution Center 24h/24' },
      { name: 'AXA sinistres CH', number: '0800 809 809', type: 'insurance', free: true },
      { name: 'Allianz sinistres CH', number: '0800 800 801', type: 'insurance', free: true },
      { name: 'Mobilière sinistres', number: '0800 111 110', type: 'insurance', free: true },
      { name: 'Helsana', number: '0800 80 80 80', type: 'insurance', free: true },
      { name: 'Zurich Connect', number: '0800 80 8080', type: 'insurance', free: true },
      { name: 'Baloise sinistres', number: '0800 24 800 800', type: 'insurance', free: true },
      { name: 'Helvetia sinistres', number: '058 280 10 00', type: 'insurance' },
      { name: 'Generali sinistres CH', number: '022 704 00 00', type: 'insurance' },
      { name: 'Vaudoise sinistres', number: '0800 31 32 33', type: 'insurance', free: true },
    ],
  },
  {
    code: 'FR', flag: '🇫🇷', name: 'France', region: 'Europe',
    contacts: [
      { name: 'Police / Gendarmerie', number: '17', type: 'police', free: true },
      { name: 'SAMU', number: '15', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '18', type: 'rescue', free: true },
      { name: 'Urgences européen', number: '112', type: 'rescue', free: true },
      { name: 'Urgences sourds/muets', number: '114', type: 'rescue', free: true },
      { name: 'AXA Assistance France', number: '0 800 200 200', type: 'roadside', free: true },
      { name: 'MACIF dépannage', number: '0 800 004 003', type: 'roadside', free: true },
      { name: 'MAIF assistance', number: '0 800 20 22 20', type: 'roadside', free: true },
      { name: 'Allianz France sinistres', number: '0800 000 632', type: 'insurance', free: true },
      { name: 'Groupama assistance', number: '0800 000 845', type: 'roadside', free: true },
      { name: 'MMA sinistres', number: '0 800 010 010', type: 'insurance', free: true },
    ],
  },
  {
    code: 'BE', flag: '🇧🇪', name: 'Belgique', region: 'Europe',
    contacts: [
      { name: 'Police', number: '101', type: 'police', free: true },
      { name: 'Ambulance / Pompiers', number: '100', type: 'ambulance', free: true },
      { name: 'Urgences européen', number: '112', type: 'rescue', free: true },
      { name: 'Touring Assist', number: '070 344 777', type: 'roadside', note: 'Touring Club Belgique' },
      { name: 'VAB Assistance', number: '0800 82 000', type: 'roadside', free: true },
      { name: 'AXA Assistance Belgique', number: '02 550 05 55', type: 'roadside' },
      { name: 'AG Insurance sinistres', number: '02 664 81 11', type: 'insurance' },
    ],
  },
  {
    code: 'LU', flag: '🇱🇺', name: 'Luxembourg', region: 'Europe',
    contacts: [
      { name: 'Police', number: '113', type: 'police', free: true },
      { name: 'Ambulance / SAMU', number: '112', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '112', type: 'rescue', free: true },
      { name: 'ACL Assistance dépannage', number: '26 000', type: 'roadside', note: 'Automobile Club Luxembourg' },
      { name: 'AXA Luxembourg sinistres', number: '27 750 750', type: 'insurance' },
      { name: 'Foyer sinistres', number: '437 437', type: 'insurance' },
      { name: 'La Luxembourgeoise', number: '4761 1', type: 'insurance' },
    ],
  },
  // ── RESTE EUROPE ───────────────────────────────────────────
  {
    code: 'DE', flag: '🇩🇪', name: 'Deutschland', region: 'Europe',
    contacts: [
      { name: 'Polizei', number: '110', type: 'police', free: true },
      { name: 'Feuerwehr / Rettung', number: '112', type: 'rescue', free: true },
      { name: 'ADAC Pannenhilfe', number: '0800 5 10 11 12', type: 'roadside', free: true, note: 'Allg. Dt. Automobil-Club' },
      { name: 'HUK-Coburg Schaden', number: '0800 2153153', type: 'insurance', free: true },
      { name: 'Allianz Schaden DE', number: '0800 4 100 400', type: 'insurance', free: true },
    ],
  },
  {
    code: 'IT', flag: '🇮🇹', name: 'Italia', region: 'Europe',
    contacts: [
      { name: 'Carabinieri / Polizia', number: '112', type: 'police', free: true },
      { name: 'Polizia di Stato', number: '113', type: 'police', free: true },
      { name: 'Pronto soccorso', number: '118', type: 'ambulance', free: true },
      { name: 'ACI Soccorso stradale', number: '803 116', type: 'roadside', free: true, note: 'Automobile Club Italia' },
    ],
  },
  {
    code: 'ES', flag: '🇪🇸', name: 'España', region: 'Europe',
    contacts: [
      { name: 'Policía Nacional', number: '091', type: 'police', free: true },
      { name: 'Guardia Civil', number: '062', type: 'police', free: true },
      { name: 'Urgencias', number: '112', type: 'rescue', free: true },
      { name: 'RACE Asistencia', number: '900 100 992', type: 'roadside', free: true },
    ],
  },
  {
    code: 'GB', flag: '🇬🇧', name: 'United Kingdom', region: 'Europe',
    contacts: [
      { name: 'Police / Ambulance / Fire', number: '999', type: 'police', free: true },
      { name: 'Police non-emergency', number: '101', type: 'police', free: true },
      { name: 'AA Breakdown', number: '0800 887 766', type: 'roadside', free: true },
      { name: 'RAC Breakdown', number: '0800 828 282', type: 'roadside', free: true },
      { name: 'Green Flag', number: '0800 400 600', type: 'roadside', free: true },
    ],
  },
  {
    code: 'NL', flag: '🇳🇱', name: 'Nederland', region: 'Europe',
    contacts: [
      { name: 'Politie / Brandweer / EHBO', number: '112', type: 'police', free: true },
      { name: 'Politie non-urgent', number: '0900 8844', type: 'police' },
      { name: 'ANWB Wegenwacht', number: '0800 0888', type: 'roadside', free: true },
    ],
  },
  {
    code: 'AT', flag: '🇦🇹', name: 'Österreich', region: 'Europe',
    contacts: [
      { name: 'Polizei', number: '133', type: 'police', free: true },
      { name: 'Rettung', number: '144', type: 'ambulance', free: true },
      { name: 'Feuerwehr', number: '122', type: 'rescue', free: true },
      { name: 'ÖAMTC Pannendienst', number: '120', type: 'roadside', free: true },
      { name: 'ARBÖ Pannenhilfe', number: '123', type: 'roadside', free: true },
    ],
  },
  {
    code: 'PT', flag: '🇵🇹', name: 'Portugal', region: 'Europe',
    contacts: [
      { name: 'Polícia / Bombeiros / INEM', number: '112', type: 'rescue', free: true },
      { name: 'ACP Assistência', number: '21 942 50 95', type: 'roadside', note: 'Automóvel Club de Portugal' },
    ],
  },
  {
    code: 'PL', flag: '🇵🇱', name: 'Polska', region: 'Europe',
    contacts: [
      { name: 'Policja', number: '997', type: 'police', free: true },
      { name: 'Pogotowie', number: '999', type: 'ambulance', free: true },
      { name: 'Straż pożarna', number: '998', type: 'rescue', free: true },
      { name: 'Europejski numer', number: '112', type: 'rescue', free: true },
      { name: 'PZM Pomoc drogowa', number: '196', type: 'roadside', note: 'Polski Związek Motorowy' },
    ],
  },
  {
    code: 'SE', flag: '🇸🇪', name: 'Sverige', region: 'Europe',
    contacts: [
      { name: 'Polis / Ambulans / Räddning', number: '112', type: 'rescue', free: true },
      { name: 'Polis non-urgent', number: '114 14', type: 'police' },
      { name: 'Assistancekåren', number: '020-912 912', type: 'roadside', free: true },
    ],
  },
  {
    code: 'NO', flag: '🇳🇴', name: 'Norge', region: 'Europe',
    contacts: [
      { name: 'Politi', number: '112', type: 'police', free: true },
      { name: 'Ambulanse', number: '113', type: 'ambulance', free: true },
      { name: 'Brannvesen', number: '110', type: 'rescue', free: true },
      { name: 'NAF Veihjelp', number: '08505', type: 'roadside', note: 'Norges Automobil-Forbund' },
    ],
  },
  // ── AMÉRIQUES ──────────────────────────────────────────────
  {
    code: 'US', flag: '🇺🇸', name: 'United States', region: 'Americas',
    contacts: [
      { name: 'Police / Fire / Ambulance', number: '911', type: 'police', free: true },
      { name: 'AAA Roadside 24/7', number: '1-800-222-4357', type: 'roadside', free: true, note: 'Members — tow, jump, lockout, fuel' },
      { name: 'State Farm claims', number: '1-800-732-5246', type: 'insurance', free: true },
      { name: 'GEICO claims', number: '1-800-841-3000', type: 'insurance', free: true },
      { name: 'Allstate claims', number: '1-800-255-7828', type: 'insurance', free: true },
    ],
  },
  {
    code: 'CA', flag: '🇨🇦', name: 'Canada', region: 'Americas',
    contacts: [
      { name: 'Police / Fire / Ambulance', number: '911', type: 'police', free: true },
      { name: 'CAA Roadside 24/7', number: '1-800-222-4357', type: 'roadside', free: true, note: 'Canadian Automobile Assoc.' },
    ],
  },
  {
    code: 'MX', flag: '🇲🇽', name: 'México', region: 'Americas',
    contacts: [
      { name: 'Emergencias', number: '911', type: 'rescue', free: true },
      { name: 'Ángeles Verdes (carreteras)', number: '078', type: 'roadside', free: true, note: 'Asistencia en carreteras federales' },
    ],
  },
  {
    code: 'BR', flag: '🇧🇷', name: 'Brasil', region: 'Americas',
    contacts: [
      { name: 'Polícia Militar', number: '190', type: 'police', free: true },
      { name: 'SAMU', number: '192', type: 'ambulance', free: true },
      { name: 'Bombeiros', number: '193', type: 'rescue', free: true },
      { name: 'Polícia Rodoviária Federal', number: '191', type: 'police', free: true, note: 'Rodovias federais' },
    ],
  },
  {
    code: 'AR', flag: '🇦🇷', name: 'Argentina', region: 'Americas',
    contacts: [
      { name: 'Policía', number: '101', type: 'police', free: true },
      { name: 'SAME / Ambulancia', number: '107', type: 'ambulance', free: true },
      { name: 'Bomberos', number: '100', type: 'rescue', free: true },
      { name: 'Emergencias', number: '911', type: 'rescue', free: true },
    ],
  },
  // ── ASIE-PACIFIQUE ─────────────────────────────────────────
  {
    code: 'AU', flag: '🇦🇺', name: 'Australia', region: 'Asia-Pacific',
    contacts: [
      { name: 'Police / Ambulance / Fire', number: '000', type: 'rescue', free: true },
      { name: 'NRMA Roadside (NSW/ACT)', number: '13 11 22', type: 'roadside', free: true },
      { name: 'RACQ Roadside (QLD)', number: '13 1905', type: 'roadside', free: true },
      { name: 'RACV Roadside (VIC)', number: '13 11 11', type: 'roadside', free: true },
      { name: 'RAA Roadside (SA)', number: '8202 4600', type: 'roadside', note: 'Royal Automobile Association SA' },
      { name: 'RAC Roadside (WA)', number: '13 17 03', type: 'roadside', free: true },
    ],
  },
  {
    code: 'NZ', flag: '🇳🇿', name: 'New Zealand', region: 'Asia-Pacific',
    contacts: [
      { name: 'Police / Ambulance / Fire', number: '111', type: 'rescue', free: true },
      { name: 'AA Roadside', number: '0800 500 222', type: 'roadside', free: true, note: 'NZ Automobile Association' },
    ],
  },
  {
    code: 'JP', flag: '🇯🇵', name: '日本 Japan', region: 'Asia-Pacific',
    contacts: [
      { name: '警察 Police', number: '110', type: 'police', free: true },
      { name: '救急/消防 Ambulance/Fire', number: '119', type: 'ambulance', free: true },
      { name: 'JAF 道路救援', number: '0570-00-8139', type: 'roadside', note: 'Japan Automobile Federation' },
    ],
  },
  {
    code: 'CN', flag: '🇨🇳', name: '中国 China', region: 'Asia-Pacific',
    contacts: [
      { name: '公安 Police', number: '110', type: 'police', free: true },
      { name: '急救 Ambulance', number: '120', type: 'ambulance', free: true },
      { name: '消防 Fire', number: '119', type: 'rescue', free: true },
      { name: '交通事故 Traffic accident', number: '122', type: 'police', free: true },
    ],
  },
  {
    code: 'SG', flag: '🇸🇬', name: 'Singapore', region: 'Asia-Pacific',
    contacts: [
      { name: 'Police', number: '999', type: 'police', free: true },
      { name: 'Ambulance / Fire (SCDF)', number: '995', type: 'ambulance', free: true },
      { name: 'AA Singapore Roadside', number: '1800 748 9911', type: 'roadside', free: true },
    ],
  },
  {
    code: 'IN', flag: '🇮🇳', name: 'India', region: 'Asia-Pacific',
    contacts: [
      { name: 'All emergencies', number: '112', type: 'rescue', free: true },
      { name: 'Police', number: '100', type: 'police', free: true },
      { name: 'Ambulance', number: '108', type: 'ambulance', free: true },
      { name: 'Fire', number: '101', type: 'rescue', free: true },
      { name: 'NHAI Autoroutes (panne/accident)', number: '1033', type: 'roadside', free: true, note: '24h/7j — autoroutes nationales' },
      { name: 'Maruti Suzuki assistance', number: '1800 102 1800', type: 'roadside', free: true, note: 'Membres / sous garantie' },
      { name: 'Hyundai assistance', number: '1800 102 4645', type: 'roadside', free: true },
      { name: 'Tata Motors assistance', number: '1800 209 7979', type: 'roadside', free: true },
    ],
  },
  {
    code: 'KR', flag: '🇰🇷', name: '대한민국 Korea', region: 'Asia-Pacific',
    contacts: [
      { name: '경찰 Police', number: '112', type: 'police', free: true },
      { name: '소방/구급 Fire/Ambulance', number: '119', type: 'ambulance', free: true },
    ],
  },
  // ── MOYEN-ORIENT / AFRIQUE ─────────────────────────────────

  {
    code: 'RU', flag: '🇷🇺', name: 'Россия Russia', region: 'Europe',
    contacts: [
      { name: 'Полиция Police', number: '102', type: 'police', free: true, note: 'Ou 112 depuis mobile' },
      { name: 'Скорая Ambulance', number: '103', type: 'ambulance', free: true },
      { name: 'Пожарная Fire', number: '101', type: 'rescue', free: true },
      { name: 'Единый Urgences universal', number: '112', type: 'rescue', free: true, note: 'Toutes urgences — opérateur EN disponible' },
      { name: 'ГИБДД Police route (accidents)', number: '112', type: 'police', free: true, note: 'Rapport accidents — demander ГИБДД' },
      { name: 'RAMC Dépannage 24h/7j', number: '+7 495 623 0503', type: 'roadside', note: 'Russian AutoMotoClub — Moscou et toute la Russie' },
      { name: 'Rosgosstrakh assistance', number: '8 800 200 00 00', type: 'insurance', free: true, note: 'Assurance auto — gratuit depuis mobile' },
    ],
  },
  {
    code: 'AE', flag: '🇦🇪', name: 'UAE / Dubai', region: 'Middle East',
    contacts: [
      { name: 'Police / Emergency', number: '999', type: 'police', free: true },
      { name: 'Ambulance', number: '998', type: 'ambulance', free: true },
      { name: 'Dubai Police (non-urgent)', number: '901', type: 'police', free: true },
      { name: 'RTA Roadside', number: '800 9090', type: 'roadside', free: true, note: 'Roads & Transport Authority' },
    ],
  },
  {
    code: 'MA', flag: '🇲🇦', name: 'Maroc', region: 'Africa',
    contacts: [
      { name: 'Police', number: '19', type: 'police', free: true },
      { name: 'Gendarmerie Royale', number: '177', type: 'police', free: true },
      { name: 'SAMU / Ambulance', number: '15', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '15', type: 'rescue', free: true },
    ],
  },
  {
    code: 'ZA', flag: '🇿🇦', name: 'South Africa', region: 'Africa',
    contacts: [
      { name: 'Police (SAPS)', number: '10111', type: 'police', free: true },
      { name: 'Ambulance', number: '10177', type: 'ambulance', free: true },
      { name: 'All emergencies (mobile)', number: '112', type: 'rescue', free: true },
      { name: 'AA Roadside', number: '0800 01 01 01', type: 'roadside', free: true },
    ],
  },
];

const REGIONS = ['Tous', 'Europe', 'Americas', 'Asia-Pacific', 'Middle East', 'Africa'];

// ── Detect country ────────────────────────────────────────────
function detectCountry(): string {
  const full = navigator.language?.toUpperCase();
  if (full?.includes('-CH')) return 'CH';
  if (full?.includes('-FR')) return 'FR';
  if (full?.includes('-BE')) return 'BE';
  if (full?.includes('-LU')) return 'LU';
  if (full?.includes('-DE')) return 'DE';
  if (full?.includes('-IT')) return 'IT';
  if (full?.includes('-GB') || full?.includes('-EN')) return 'GB';
  if (full?.includes('-US')) return 'US';
  if (full?.includes('-AU')) return 'AU';
  if (full?.includes('-JP')) return 'JP';
  if (full?.includes('-AE')) return 'AE';
  return 'CH';
}

const TYPE_ICON: Record<string, string> = {
  police: '🚔', ambulance: '🚑', rescue: '🚒', roadside: '🔧', insurance: '🛡️',
};
const TYPE_COLOR: Record<string, string> = {
  police: '#60c8f0', ambulance: '#f87171', rescue: '#fb923c', roadside: '#fbbf24', insurance: '#4ade80',
};


// ── Dynamic lookup for any unlisted country ──────────────────
export function UnknownCountryLookup({ countryCode, countryName }: { countryCode: string; countryName?: string }) {
  const { data, isLoading, error } = trpc.emergency.countryLookup.useQuery(
    { countryCode, countryName },
    { enabled: !!countryCode, retry: 1 }
  );

  if (isLoading) return (
    <div className="bg-[#111] rounded-xl p-4" style={{ border: '1px solid #444' }}>
      <div className="text-[#d0d0d0] text-[13px] flex items-center gap-2.5">
        <div className="rounded-full shrink-0 w-4 h-4"  style={{ border: '2px solid #555', borderTopColor: '#FF3500' }} />
        Recherche des numéros d'urgence pour {countryName || countryCode}...
      </div>
    </div>
  );

  if (!data || error) return (
    <div className="rounded-xl p-3.5 bg-[#1a1010]" style={{ border: '1px solid #3a1a1a' }}>
      <div className="text-[13px] text-[#f87171]">⚠️ Numéros non trouvés pour {countryName || countryCode}</div>
      <div className="text-[#d0d0d0] text-xs mt-1">Composez le <strong className="text-white">112</strong> (valable dans 200+ pays).</div>
    </div>
  );

  const sourceLabel = data.source === 'db' ? '✅ Vérifié' : data.source === 'ai' ? '🤖 IA live' : '⚠️';
  const confidenceColor = data.confidence === 'high' ? '#4ade80' : data.confidence === 'medium' ? '#fbbf24' : '#f87171';

  return (
    <div className="rounded-xl p-3.5 bg-[#0d1a0d]" style={{ border: '1px solid #1a3a1a' }}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-green-400 font-bold">🆘 {data.countryName}</div>
        <div className="flex gap-1.5 items-center">
          <span className="text-[#d0d0d0] text-[10px]">{sourceLabel}</span>
          <span className="text-[10px] font-bold" style={{ color: confidenceColor }}>{data.confidence!.toUpperCase()}</span>
        </div>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {[
          { label: '🚔 Police', number: data.police, color: '#60c8f0' },
          { label: '🚑 Ambulance', number: data.ambulance, color: '#f87171' },
          { label: '🚒 Pompiers', number: data.fire, color: '#fb923c' },
          ...(data.roadside ? [{ label: '🔧 Dépannage', number: data.roadside, color: '#fbbf24', note: data.roadsideNote }] : []),
        ].map((item: any, i: number) => (
          <a key={i} href={`tel:${item.number.replace(/[\s().+]/g, '')}`} className="flex rounded-lg no-underline px-3 py-2.5 bg-[#111]" style={{ flexDirection: 'column' as const, border: '1px solid #3a3a3a' }}>
            <div className="text-[#d0d0d0] text-[10px] mb-0.5" >{item.label}</div>
            <div className="font-black text-lg" style={{ color: item.color, fontFamily: 'monospace' }}>{item.number}</div>
            {item.note && <div className="text-[#d0d0d0] text-[10px] mt-0.5" >{item.note}</div>}
          </a>
        ))}
      </div>
      {data.universal && data.universal !== data.police && (
        <div className="mt-2.5 bg-[#111] rounded-lg flex justify-between items-center px-3 py-2" style={{ border: '1px solid #444' }}>
          <span className="text-[#d0d0d0] text-xs">Urgences universel</span>
          <a href={`tel:${data.universal}`} className="text-white font-black text-lg no-underline" style={{ fontFamily: 'monospace' }}>{data.universal}</a>
        </div>
      )}
    </div>
  );
}

// ── Country search widget — for any country in the world ──────
export function CountryEmergencySearch() {
  const [code, setCode]   = useState('');
  const [name, setName]   = useState('');
  const [search, setSearch] = useState(false);
  const [submitted, setSubmitted] = useState<{code: string; name: string} | null>(null);

  const handleSubmit = () => {
    if (!code.trim()) return;
    setSubmitted({ code: code.toUpperCase().trim(), name: name.trim() });
    setSearch(true);
  };

  return (
    <div className="bg-[#111] rounded-[14px] p-4 mb-4" style={{ border: '1px solid #3a3a3a' }}>
      <div className="text-white font-bold mb-3 text-sm">
        🌍 Urgences pour un autre pays
      </div>
      <div className="flex gap-2 mb-3">
        <input
          aria-label="Code pays"
          placeholder="Code pays (ex: MA, KE, VN...)"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0,3))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="rounded-lg text-white text-sm w-[100px] px-2.5 py-[9px] box-border bg-[#1a1a1a]" style={{ border: '1px solid #555' }}
        />
        <input
          aria-label="Nom du pays"
          placeholder="Nom du pays (optionnel)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="flex-1 rounded-lg text-white text-sm px-3 py-[9px] bg-[#1a1a1a]" style={{ border: '1px solid #555' }}
        />
        <button onClick={handleSubmit} disabled={!code.trim()} className="text-white border-0 rounded-lg font-bold cursor-pointer text-sm shrink-0 px-3.5 py-[9px] bg-[#D42D00]">
          🔍
        </button>
      </div>
      {submitted && search && (
        <UnknownCountryLookup countryCode={submitted.code} countryName={submitted.name || undefined} />
      )}
      <div className="text-[11px] mt-2 text-[#b0b0b0]">
        ISO 3166-1 alpha-2 · Si non trouvé, une recherche IA est lancée automatiquement.
      </div>
    </div>
  );
}

interface EmergencyNumbersProps {
  mode?: 'full' | 'compact';
  initialCountry?: string;
  onClose?: () => void;
}

export function EmergencyNumbers({ mode = 'full', initialCountry, onClose }: EmergencyNumbersProps) {
  const [country, setCountry] = useState(initialCountry || detectCountry());
  const [region, setRegion]   = useState('Tous');
  const [filter, setFilter]   = useState<string>('all');
  const [search, setSearch]   = useState('');

  const selected = EMERGENCY_DATA.find(c => c.code === country) || EMERGENCY_DATA[0];
  const contacts = selected.contacts.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.number.includes(search)) return false;
    return true;
  });

  const filteredCountries = region === 'Tous'
    ? EMERGENCY_DATA
    : EMERGENCY_DATA.filter(c => c.region === region);

  // ── Compact mode ─────────────────────────────────────────────
  if (mode === 'compact') {
    const critical = selected.contacts.filter(c => ['police','ambulance','rescue'].includes(c.type)).slice(0, 4);
    return (
      <div className="rounded-xl p-4 mt-4 bg-[#0d1a0d]" style={{ border: '1px solid #1a3a1a' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-green-400 font-bold text-sm">
            🆘 Urgences · {selected.flag} {selected.name}
          </div>
          <select aria-label="Sélectionner un pays" value={country} onChange={e => setCountry(e.target.value)}
            className="rounded-md text-[11px] px-2 py-1 bg-[#1a1a1a] text-[#ccc]" style={{ border: '1px solid #555' }}>
            {EMERGENCY_DATA.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {critical.map((c, i) => (
            <a key={i} href={`tel:${c.number.replace(/[\s().]/g, '')}`} className="flex items-center gap-2 rounded-lg no-underline px-3 py-2.5 bg-[#111]" style={{ border: '1px solid #3a3a3a' }}>
              <span className="text-lg">{TYPE_ICON[c.type]}</span>
              <div>
                <div className="font-bold text-sm" style={{ color: TYPE_COLOR[c.type] }}>{c.number}</div>
                <div className="text-[#d0d0d0] text-[11px]">{c.name}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // ── Full page ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#06060C] text-white p-4">
      <div className="mx-auto max-w-[480px]">
        <div className="flex justify-between items-center mb-5">
          {onClose && <button onClick={onClose} className="bg-transparent border-0 text-[#d0d0d0] cursor-pointer text-sm">← Retour</button>}
          <div className="text-[#FF3500] font-black text-xl">🆘 Urgences mondiales</div>
          <div className="w-[60px]" />
        </div>

        {/* Region filter */}
        <div className="flex gap-1.5 overflow-x-auto mb-2.5 pb-1"  style={{ scrollbarWidth: 'none' as const }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)} className="text-white rounded-md text-[11px] font-semibold cursor-pointer shrink-0 px-2.5 py-[5px]" style={{ background: region === r ? '#D42D00' : '#111', border: '1px solid ' + (region === r ? '#D42D00' : '#444'), whiteSpace: 'nowrap' as const }}>
              {r}
            </button>
          ))}
        </div>

        {/* Country selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3.5"  style={{ scrollbarWidth: 'none' as any }}>
          {filteredCountries.map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)} className="text-white rounded-lg text-[13px] font-semibold cursor-pointer shrink-0 px-3 py-[7px]" style={{ background: country === c.code ? '#D42D00' : '#111', border: '1px solid ' + (country === c.code ? '#D42D00' : '#444'), whiteSpace: 'nowrap' as const }}>
              {c.flag} {c.code}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-[#111] rounded-[10px] text-white text-sm w-full mb-3 px-3.5 py-2.5 box-border" style={{ border: '1px solid #444' }}
          aria-label="Rechercher un numéro d'urgence"
        />

        {/* Type filter */}
        <div className="flex gap-1.5 mb-4" style={{ flexWrap: 'wrap' as const }}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'police', label: '🚔 Police' },
            { key: 'ambulance', label: '🚑 SAMU' },
            { key: 'rescue', label: '🚒 Pompiers' },
            { key: 'roadside', label: '🔧 Dépannage' },
            { key: 'insurance', label: '🛡️ Assurance' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className="rounded-md text-xs cursor-pointer px-2.5 py-[5px]" style={{ background: filter === f.key ? '#444' : 'none', border: '1px solid ' + (filter === f.key ? '#444' : '#3a3a3a'), color: filter === f.key ? '#fff' : '#d0d0d0' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Insurance search widget */}
        <InsuranceSearchWidget />

        {/* Dynamic country lookup */}
        <CountryEmergencySearch />

        <div className="text-[#d0d0d0] text-[13px] mb-3 mt-4">
          {selected.flag} <strong className="text-white">{selected.name}</strong> — {contacts.length} numéro{contacts.length !== 1 ? 's' : ''}
        </div>

        {contacts.map((c, i) => (
          <a key={i} href={`tel:${c.number.replace(/[\s().]/g, '')}`} className="flex items-center gap-3.5 rounded-xl mb-2 no-underline px-4 py-3.5 bg-[#111]" style={{ border: '1px solid #3a3a3a' }}>
            <div className="w-[42px] h-[42px] rounded-[10px] shrink-0 flex items-center justify-center text-xl" style={{ background: TYPE_COLOR[c.type] + '15', border: '1px solid ' + TYPE_COLOR[c.type] + '30' }}>
              {TYPE_ICON[c.type]}
            </div>
            <div className="flex-1 min-w-0" >
              <div className="text-[13px] mb-0.5 text-[#ccc]">{c.name}</div>
              <div className="font-black text-xl tracking-[1px]" style={{ color: TYPE_COLOR[c.type], fontFamily: 'monospace' }}>
                {c.number}
              </div>
              {c.note && <div className="text-[#d0d0d0] text-[11px] mt-0.5" >{c.note}</div>}
            </div>
            <div className="flex items-end gap-1" style={{ flexDirection: 'column' as const }}>
              {c.free && <span className="text-green-400 text-[10px] font-bold rounded px-1.5 py-0.5 bg-[#0d2a0d]">GRATUIT</span>}
              <span className="text-[#d0d0d0] text-lg">📞</span>
            </div>
          </a>
        ))}

        <div className="text-[11px] mt-5 leading-relaxed text-[#b0b0b0] text-center">
          Appuyez pour appeler directement.<br />
          Urgence vitale → toujours composer le <strong className="text-[#d0d0d0]">112</strong> (Europe) ou <strong className="text-[#d0d0d0]">911</strong> (Amériques).
        </div>
      </div>
    </div>
  );
}



