import { useState, useEffect } from 'react';
import { trpc } from '../../trpc';

interface InsuranceAssistanceProps {
  insurerA?: string;  // From OCR participant A
  insurerB?: string;  // From OCR participant B
  countryCode?: string;
}

interface AssistanceResult {
  insurer: string;
  assistanceNumber?: string;
  claimsNumber?: string;
  website?: string;
  note?: string;
  source: 'db' | 'ai' | 'not_found';
  confidence: 'high' | 'medium' | 'low';
}

export function InsuranceAssistance({ insurerA, insurerB, countryCode }: InsuranceAssistanceProps) {
  const [resultA, setResultA] = useState<AssistanceResult | null>(null);
  const [resultB, setResultB] = useState<AssistanceResult | null>(null);
  const [loading, setLoading]  = useState(false);
  const [done, setDone]        = useState(false);

  const lookupMut = trpc.emergency.insuranceLookup.useMutation();

  useEffect(() => {
    if (!insurerA && !insurerB) return;
    if (done) return;
    
    setLoading(true);
    lookupMut.mutate(
      { insurerA, insurerB, countryCode },
      {
        onSuccess: (data) => {
          if (data.participantA) setResultA(data.participantA as AssistanceResult);
          if (data.participantB) setResultB(data.participantB as AssistanceResult);
          setDone(true);
          setLoading(false);
        },
        onError: () => setLoading(false),
      }
    );
  }, [insurerA, insurerB]);

  if (!insurerA && !insurerB) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>
        📞 NUMÉROS D'ASSISTANCE ASSURANCES
      </div>

      {loading && (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 20, height: 20, border: '2px solid #333', borderTopColor: '#FF3500', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: '#666', fontSize: 13 }}>Recherche des numéros d'assistance...</div>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {resultA && <AssistanceCard result={resultA} role="A" />}
          {resultB && <AssistanceCard result={resultB} role="B" />}
        </div>
      )}
    </div>
  );
}

// ── Manual search widget ──────────────────────────────────────
export function InsuranceSearchWidget() {
  const [query, setQuery]   = useState('');
  const [country, setCountry] = useState('CH');
  const [result, setResult]   = useState<AssistanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lookupMut = trpc.emergency.singleLookup.useMutation();

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    lookupMut.mutate({ insurer: query.trim(), country }, {
      onSuccess: (data) => { setResult(data as AssistanceResult); setLoading(false); },
      onError: () => setLoading(false),
    });
  };

  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: 16 }}>
      <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
        🔍 Trouver un numéro d'assistance
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Nom de l'assurance..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 14 }}
        />
        <select value={country} onChange={e => setCountry(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#ccc', padding: '9px 10px', fontSize: 13 }}>
          {['CH','FR','BE','LU','DE','IT','ES','GB','NL','AT','US','CA','AU','NZ','JP','CN','IN','KR','SG','RU','AE','ZA','BR'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={handleSearch} disabled={loading || !query.trim()} style={{
          background: '#FF3500', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
        }}>
          {loading ? '...' : '🔍'}
        </button>
      </div>
      {result && <AssistanceCard result={result} />}
    </div>
  );
}

// ── Card sub-component ────────────────────────────────────────
function AssistanceCard({ result, role }: { result: AssistanceResult; role?: 'A' | 'B' }) {
  const sourceLabel = result.source === 'db' ? '✅ DB' : result.source === 'ai' ? '🤖 IA' : '❓';
  const confidenceColor = result.confidence === 'high' ? '#4ade80' : result.confidence === 'medium' ? '#fbbf24' : '#f87171';

  if (result.source === 'not_found') {
    return (
      <div style={{ background: '#1a1010', border: '1px solid #3a1a1a', borderRadius: 12, padding: 14 }}>
        {role && <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>CONDUCTEUR {role}</div>}
        <div style={{ color: '#f87171', fontSize: 13 }}>
          ⚠️ Numéro non trouvé pour <strong>{result.insurer}</strong>
        </div>
        <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
          Consultez votre police d'assurance ou le site de votre assureur.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0d1a0d', border: '1px solid #1a3a1a', borderRadius: 12, padding: 14 }}>
      {role && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ color: '#888', fontSize: 11, fontWeight: 700 }}>CONDUCTEUR {role}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ color: '#555', fontSize: 10 }}>{sourceLabel}</span>
            <span style={{ color: confidenceColor, fontSize: 10, fontWeight: 700 }}>{result.confidence.toUpperCase()}</span>
          </div>
        </div>
      )}

      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
        🛡️ {result.insurer}
      </div>

      {result.assistanceNumber && (
        <a href={`tel:${result.assistanceNumber.replace(/[\s().+]/g, '')}`} style={{
          display: 'flex', alignItems: 'center', gap: 10, background: '#111',
          border: '1px solid #1a3a1a', borderRadius: 8, padding: '10px 12px',
          textDecoration: 'none', marginBottom: 6,
        }}>
          <span style={{ fontSize: 20 }}>🔧</span>
          <div>
            <div style={{ color: '#555', fontSize: 10, marginBottom: 1 }}>DÉPANNAGE / ASSISTANCE 24h</div>
            <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: 20, fontFamily: 'monospace', letterSpacing: 0.5 }}>
              {result.assistanceNumber}
            </div>
          </div>
          <span style={{ color: '#555', marginLeft: 'auto', fontSize: 18 }}>📞</span>
        </a>
      )}

      {result.claimsNumber && result.claimsNumber !== result.assistanceNumber && (
        <a href={`tel:${result.claimsNumber.replace(/[\s().+]/g, '')}`} style={{
          display: 'flex', alignItems: 'center', gap: 10, background: '#111',
          border: '1px solid #1a1a1a', borderRadius: 8, padding: '8px 12px',
          textDecoration: 'none', marginBottom: 6,
        }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <div style={{ color: '#555', fontSize: 10, marginBottom: 1 }}>DÉCLARATION SINISTRE</div>
            <div style={{ color: '#60c8f0', fontWeight: 700, fontSize: 17, fontFamily: 'monospace' }}>
              {result.claimsNumber}
            </div>
          </div>
          <span style={{ color: '#555', marginLeft: 'auto', fontSize: 18 }}>📞</span>
        </a>
      )}

      {result.website && (
        <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
          🌐 {result.website}
        </div>
      )}
      {result.note && (
        <div style={{ color: '#555', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
          {result.note}
        </div>
      )}
    </div>
  );
}
