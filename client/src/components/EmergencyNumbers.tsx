import { useState } from 'react';

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
      { name: 'emmental versicherung', number: '031 790 31 11', type: 'insurance', note: 'Siège Konolfingen — sinistres & conseil' },
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
      { name: 'RACQ Roadside (QLD)', number: '13 11 11', type: 'roadside', free: true },
      { name: 'RACV Roadside (VIC)', number: '13 72 28', type: 'roadside', free: true },
      { name: 'RAA Roadside (SA)', number: '13 11 11', type: 'roadside', free: true },
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
      <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>
            🆘 Urgences · {selected.flag} {selected.name}
          </div>
          <select value={country} onChange={e => setCountry(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#ccc', padding: '4px 8px', fontSize: 11 }}>
            {EMERGENCY_DATA.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {critical.map((c, i) => (
            <a key={i} href={`tel:${c.number.replace(/[\s().]/g, '')}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#111',
              border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px', textDecoration: 'none',
            }}>
              <span style={{ fontSize: 18 }}>{TYPE_ICON[c.type]}</span>
              <div>
                <div style={{ color: TYPE_COLOR[c.type], fontWeight: 700, fontSize: 14 }}>{c.number}</div>
                <div style={{ color: '#666', fontSize: 11 }}>{c.name}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // ── Full page ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#fff', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14 }}>← Retour</button>}
          <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 20 }}>🆘 Urgences mondiales</div>
          <div style={{ width: 60 }} />
        </div>

        {/* Region filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' as any }}>
          {REGIONS.map(r => (
            <button key={r} onClick={() => setRegion(r)} style={{
              background: region === r ? '#FF3500' : '#111',
              border: '1px solid ' + (region === r ? '#FF3500' : '#222'),
              color: '#fff', borderRadius: 6, padding: '5px 10px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>
              {r}
            </button>
          ))}
        </div>

        {/* Country selector */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' as any }}>
          {filteredCountries.map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)} style={{
              background: country === c.code ? '#FF3500' : '#111',
              border: '1px solid ' + (country === c.code ? '#FF3500' : '#222'),
              color: '#fff', borderRadius: 8, padding: '7px 12px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>
              {c.flag} {c.code}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#111', border: '1px solid #222', borderRadius: 10, color: '#fff', padding: '10px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box' as const, marginBottom: 12 }}
        />

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' as const }}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'police', label: '🚔 Police' },
            { key: 'ambulance', label: '🚑 SAMU' },
            { key: 'rescue', label: '🚒 Pompiers' },
            { key: 'roadside', label: '🔧 Dépannage' },
            { key: 'insurance', label: '🛡️ Assurance' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              background: filter === f.key ? '#222' : 'none',
              border: '1px solid ' + (filter === f.key ? '#444' : '#1a1a1a'),
              color: filter === f.key ? '#fff' : '#666',
              borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          {selected.flag} <strong style={{ color: '#fff' }}>{selected.name}</strong> — {contacts.length} numéro{contacts.length !== 1 ? 's' : ''}
        </div>

        {contacts.map((c, i) => (
          <a key={i} href={`tel:${c.number.replace(/[\s().]/g, '')}`} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#111', border: '1px solid #1a1a1a', borderRadius: 12,
            padding: '14px 16px', marginBottom: 8, textDecoration: 'none',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: TYPE_COLOR[c.type] + '15', border: '1px solid ' + TYPE_COLOR[c.type] + '30',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {TYPE_ICON[c.type]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#ccc', fontSize: 13, marginBottom: 2 }}>{c.name}</div>
              <div style={{ color: TYPE_COLOR[c.type], fontWeight: 900, fontSize: 20, fontFamily: 'monospace', letterSpacing: 1 }}>
                {c.number}
              </div>
              {c.note && <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{c.note}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 4 }}>
              {c.free && <span style={{ background: '#0d2a0d', color: '#4ade80', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px' }}>GRATUIT</span>}
              <span style={{ color: '#555', fontSize: 18 }}>📞</span>
            </div>
          </a>
        ))}

        <div style={{ color: '#333', fontSize: 11, textAlign: 'center' as const, marginTop: 20, lineHeight: 1.6 }}>
          Appuyez pour appeler directement.<br />
          Urgence vitale → toujours composer le <strong style={{ color: '#666' }}>112</strong> (Europe) ou <strong style={{ color: '#666' }}>911</strong> (Amériques).
        </div>
      </div>
    </div>
  );
}
