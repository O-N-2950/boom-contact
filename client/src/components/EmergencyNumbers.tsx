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
  contacts: EmergencyContact[];
}

export const EMERGENCY_DATA: CountryEmergency[] = [
  {
    code: 'CH', flag: '🇨🇭', name: 'Suisse',
    contacts: [
      { name: 'Police', number: '117', type: 'police', free: true },
      { name: 'Ambulance / SAMU', number: '144', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '118', type: 'rescue', free: true },
      { name: 'Numéro d\'urgence européen', number: '112', type: 'rescue', free: true },
      { name: 'TCS (dépannage 24h/7j)', number: '0800 140 140', type: 'roadside', free: true, note: 'Touring Club Suisse' },
      { name: 'ACS (dépannage)', number: '0800 246 246', type: 'roadside', free: true, note: 'Automobile Club Suisse' },
      { name: 'REGA (hélicoptère)', number: '1414', type: 'ambulance', note: 'Garde aérienne de sauvetage' },
      { name: 'Helsana sinistres', number: '0800 80 80 80', type: 'insurance', free: true },
      { name: 'AXA sinistres CH', number: '0800 809 809', type: 'insurance', free: true },
      { name: 'Allianz sinistres CH', number: '0800 800 801', type: 'insurance', free: true },
      { name: 'Mobilière sinistres', number: '0800 111 110', type: 'insurance', free: true },
      { name: 'Zurich Connect sinistres', number: '0800 80 8080', type: 'insurance', free: true },
    ],
  },
  {
    code: 'FR', flag: '🇫🇷', name: 'France',
    contacts: [
      { name: 'Police / Gendarmerie', number: '17', type: 'police', free: true },
      { name: 'SAMU', number: '15', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '18', type: 'rescue', free: true },
      { name: 'Numéro d\'urgence européen', number: '112', type: 'rescue', free: true },
      { name: 'Numéro urgence sourds/muets', number: '114', type: 'rescue', free: true },
      { name: 'AXA Assistance France', number: '0 800 200 200', type: 'roadside', free: true },
      { name: 'MACIF dépannage', number: '0 800 004 003', type: 'roadside', free: true },
      { name: 'MAIF assistance', number: '0 800 20 22 20', type: 'roadside', free: true },
      { name: 'Allianz France sinistres', number: '0800 000 632', type: 'insurance', free: true },
      { name: 'Groupama assistance', number: '0800 000 845', type: 'roadside', free: true },
      { name: 'Auto autorisation devis', number: '09 69 32 28 00', type: 'insurance', note: 'Déclaration en ligne recommandée' },
    ],
  },
  {
    code: 'BE', flag: '🇧🇪', name: 'Belgique',
    contacts: [
      { name: 'Police', number: '101', type: 'police', free: true },
      { name: 'Ambulance / Pompiers', number: '100', type: 'ambulance', free: true },
      { name: 'Numéro d\'urgence européen', number: '112', type: 'rescue', free: true },
      { name: 'Touring Assist', number: '070 344 777', type: 'roadside', note: 'Touring Club Belgique' },
      { name: 'VAB Assistance', number: '0800 82 000', type: 'roadside', free: true },
      { name: 'AXA Assistance Belgique', number: '02 550 05 55', type: 'roadside' },
      { name: 'AG Insurance sinistres', number: '02 664 81 11', type: 'insurance' },
      { name: 'Assuralia (info)', number: '02 547 56 11', type: 'insurance', note: 'Fédération des assureurs' },
    ],
  },
  {
    code: 'LU', flag: '🇱🇺', name: 'Luxembourg',
    contacts: [
      { name: 'Police', number: '113', type: 'police', free: true },
      { name: 'Ambulance / SAMU', number: '112', type: 'ambulance', free: true },
      { name: 'Pompiers', number: '112', type: 'rescue', free: true },
      { name: 'ACL Assistance (dépannage)', number: '26 000', type: 'roadside', note: 'Automobile Club Luxembourg' },
      { name: 'AXA Luxembourg sinistres', number: '27 750 750', type: 'insurance' },
      { name: 'Foyer sinistres', number: '437 437', type: 'insurance' },
      { name: 'La Luxembourgeoise', number: '4761 1', type: 'insurance' },
    ],
  },
  {
    code: 'DE', flag: '🇩🇪', name: 'Deutschland',
    contacts: [
      { name: 'Polizei', number: '110', type: 'police', free: true },
      { name: 'Feuerwehr / Rettung', number: '112', type: 'rescue', free: true },
      { name: 'ADAC Pannenhilfe', number: '0800 5 10 11 12', type: 'roadside', free: true, note: 'Allg. Dt. Automobil-Club' },
      { name: 'ADAC Europa Service', number: '+49 89 22 22 22', type: 'roadside' },
      { name: 'HUK-Coburg Schaden', number: '0800 2153153', type: 'insurance', free: true },
      { name: 'Allianz Schaden DE', number: '0800 4 100 400', type: 'insurance', free: true },
    ],
  },
  {
    code: 'IT', flag: '🇮🇹', name: 'Italia',
    contacts: [
      { name: 'Polizia', number: '113', type: 'police', free: true },
      { name: 'Carabinieri', number: '112', type: 'police', free: true },
      { name: 'Soccorso stradale (ACI)', number: '803 116', type: 'roadside', free: true, note: 'Automobile Club Italia' },
      { name: 'Pronto soccorso', number: '118', type: 'ambulance', free: true },
    ],
  },
  {
    code: 'ES', flag: '🇪🇸', name: 'España',
    contacts: [
      { name: 'Policía Nacional', number: '091', type: 'police', free: true },
      { name: 'Guardia Civil', number: '062', type: 'police', free: true },
      { name: 'Urgencias', number: '112', type: 'rescue', free: true },
      { name: 'RACE Asistencia', number: '900 100 992', type: 'roadside', free: true },
    ],
  },
  {
    code: 'GB', flag: '🇬🇧', name: 'United Kingdom',
    contacts: [
      { name: 'Police (emergency)', number: '999', type: 'police', free: true },
      { name: 'Police (non-emergency)', number: '101', type: 'police', free: true },
      { name: 'Ambulance / Fire', number: '999', type: 'ambulance', free: true },
      { name: 'AA Breakdown', number: '0800 887 766', type: 'roadside', free: true },
      { name: 'RAC Breakdown', number: '0800 828 282', type: 'roadside', free: true },
    ],
  },
  {
    code: 'NL', flag: '🇳🇱', name: 'Nederland',
    contacts: [
      { name: 'Politie (noodgeval)', number: '112', type: 'police', free: true },
      { name: 'Politie (geen spoed)', number: '0900 8844', type: 'police' },
      { name: 'ANWB Wegenwacht', number: '0800 0888', type: 'roadside', free: true },
    ],
  },
  {
    code: 'AT', flag: '🇦🇹', name: 'Österreich',
    contacts: [
      { name: 'Polizei', number: '133', type: 'police', free: true },
      { name: 'Rettung', number: '144', type: 'ambulance', free: true },
      { name: 'ÖAMTC Pannendienst', number: '120', type: 'roadside', free: true },
    ],
  },
];

// ── Detect country from browser language ──────────────────────
function detectCountry(): string {
  const lang = navigator.language?.slice(0,2).toUpperCase();
  const map: Record<string, string> = { FR: 'CH', DE: 'CH', IT: 'CH', EN: 'GB' };
  // Try to detect country from navigator.language locale
  const full = navigator.language?.toUpperCase();
  if (full?.includes('-CH')) return 'CH';
  if (full?.includes('-FR')) return 'FR';
  if (full?.includes('-BE')) return 'BE';
  if (full?.includes('-LU')) return 'LU';
  if (full?.includes('-DE')) return 'DE';
  if (full?.includes('-IT')) return 'IT';
  if (full?.includes('-GB')) return 'GB';
  return map[lang] || 'CH';
}

const TYPE_ICON: Record<string, string> = {
  police:    '🚔',
  ambulance: '🚑',
  rescue:    '🚒',
  roadside:  '🔧',
  insurance: '🛡️',
};

const TYPE_COLOR: Record<string, string> = {
  police:    '#60c8f0',
  ambulance: '#f87171',
  rescue:    '#fb923c',
  roadside:  '#fbbf24',
  insurance: '#4ade80',
};

// ── Props ─────────────────────────────────────────────────────
interface EmergencyNumbersProps {
  mode?: 'full' | 'compact';     // full = standalone page, compact = inline in flow
  initialCountry?: string;
  onClose?: () => void;
}

export function EmergencyNumbers({ mode = 'full', initialCountry, onClose }: EmergencyNumbersProps) {
  const [country, setCountry]   = useState(initialCountry || detectCountry());
  const [filter, setFilter]     = useState<'all' | 'police' | 'ambulance' | 'roadside' | 'insurance'>('all');
  const [search, setSearch]     = useState('');

  const selected = EMERGENCY_DATA.find(c => c.code === country) || EMERGENCY_DATA[0];
  const contacts = selected.contacts.filter(c => {
    if (filter !== 'all' && c.type !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.number.includes(search)) return false;
    return true;
  });

  if (mode === 'compact') {
    // Inline version — show only critical numbers for current country
    const critical = selected.contacts.filter(c => ['police','ambulance','rescue'].includes(c.type)).slice(0, 4);
    return (
      <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>🆘 Numéros d'urgence · {selected.flag} {selected.name}</div>
          <select value={country} onChange={e => setCountry(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#ccc', padding: '4px 8px', fontSize: 12 }}>
            {EMERGENCY_DATA.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {critical.map(c => (
            <a key={c.number} href={`tel:${c.number.replace(/\s/g, '')}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: '#111',
              border: '1px solid #1a1a1a', borderRadius: 8, padding: '10px 12px',
              textDecoration: 'none',
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

  // ── Full page ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#06060C', color: '#fff', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14 }}>← Retour</button>}
          <div style={{ color: '#FF3500', fontWeight: 900, fontSize: 20 }}>🆘 Urgences</div>
          <div style={{ width: 60 }} />
        </div>

        {/* Country selector */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' as any }}>
          {EMERGENCY_DATA.map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)} style={{
              background: country === c.code ? '#FF3500' : '#111',
              border: '1px solid ' + (country === c.code ? '#FF3500' : '#222'),
              color: '#fff', borderRadius: 8, padding: '7px 12px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const,
              flexShrink: 0,
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
            { key: 'police',    label: '🚔 Police' },
            { key: 'ambulance', label: '🚑 SAMU' },
            { key: 'rescue',    label: '🚒 Pompiers' },
            { key: 'roadside',  label: '🔧 Dépannage' },
            { key: 'insurance', label: '🛡️ Assurance' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)} style={{
              background: filter === f.key ? '#222' : 'none',
              border: '1px solid ' + (filter === f.key ? '#444' : '#1a1a1a'),
              color: filter === f.key ? '#fff' : '#666',
              borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Country name */}
        <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          {selected.flag} <strong style={{ color: '#fff' }}>{selected.name}</strong> — {contacts.length} numéro{contacts.length !== 1 ? 's' : ''}
        </div>

        {/* Contact cards */}
        {contacts.map((c, i) => (
          <a key={i} href={`tel:${c.number.replace(/[\s().]/g, '')}`} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#111', border: '1px solid #1a1a1a', borderRadius: 12,
            padding: '14px 16px', marginBottom: 8, textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              background: TYPE_COLOR[c.type] + '15',
              border: '1px solid ' + TYPE_COLOR[c.type] + '30',
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

        {/* Footer note */}
        <div style={{ color: '#333', fontSize: 11, textAlign: 'center' as const, marginTop: 20, lineHeight: 1.6 }}>
          Appuyez sur un numéro pour appeler directement.<br />
          En cas d'urgence vitale, composez toujours le <strong style={{ color: '#666' }}>112</strong>.
        </div>
      </div>
    </div>
  );
}
