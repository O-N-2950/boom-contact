import { useState, useEffect } from 'react';
import type { AccidentData, VehicleType } from '../../../../shared/types';

interface Props {
  onComplete: (data: Partial<AccidentData> & { vehicleType: VehicleType }) => void;
}

const VEHICLE_GROUPS: {
  group: string;
  types: { id: VehicleType; icon: string; label: string; sub: string }[];
}[] = [
  { group: 'Véhicules légers', types: [
    { id: 'car',          icon: '🚗', label: 'Voiture',              sub: 'Berline, SUV, break, 4×4, citadine' },
    { id: 'van',          icon: '🚐', label: 'Fourgon / Utilitaire', sub: 'Camionnette, van, utilitaire léger' },
    { id: 'motorcycle',   icon: '🏍️', label: 'Moto',                 sub: 'Moto, motocyclette' },
    { id: 'scooter',      icon: '🛵', label: 'Scooter / Cyclomoteur', sub: 'Scooter, 50cm³' },
    { id: 'moped',        icon: '🛵', label: 'Vélomoteur',           sub: '2 roues <45km/h, 125cm³' },
    { id: 'escooter',     icon: '🛴', label: 'Trottinette électrique', sub: 'EDPM, gyroroue, hoverboard' },
    { id: 'quad',         icon: '🏎️', label: 'Quad / Buggy',         sub: 'Véhicule tout-terrain motorisé' },
  ]},
  { group: 'Véhicules lourds', types: [
    { id: 'truck',        icon: '🚚', label: 'Camion / Poids lourd', sub: 'Semi-remorque, porteur, benne' },
    { id: 'bus',          icon: '🚌', label: 'Bus / Autocar',        sub: 'Bus urbain, car, minibus' },
    { id: 'construction', icon: '🚜', label: 'Engin de chantier',    sub: 'Tractopelle, grue, pelleteuse, dumper' },
    { id: 'tractor',      icon: '🚜', label: 'Tracteur agricole',    sub: 'Tracteur, engin agricole' },
  ]},
  { group: 'Transport en commun / rail', types: [
    { id: 'tram',         icon: '🚋', label: 'Tramway',              sub: 'Tram, métro léger' },
    { id: 'train',        icon: '🚆', label: 'Train / Métro',        sub: 'Train, RER, métro souterrain' },
  ]},
  { group: 'Cycles', types: [
    { id: 'bicycle',      icon: '🚲', label: 'Vélo',                 sub: 'Vélo classique, VAE, vélo électrique' },
    { id: 'cargo_bike',   icon: '🚲', label: 'Vélo cargo',           sub: 'Bakfiets, triporteur, cargo électrique' },
  ]},
  { group: 'Personne / Autre', types: [
    { id: 'pedestrian',   icon: '🚶', label: 'Piéton',               sub: 'Personne à pied, rollers, skateboard' },
    { id: 'boat',         icon: '⛵', label: 'Bateau',               sub: 'Embarcation, jet-ski, canot' },
    { id: 'other',        icon: '❓', label: 'Autre véhicule',       sub: 'Non listé — préciser dans observations' },
  ]},
];

type GeoStatus = 'idle' | 'loading' | 'success' | 'denied' | 'error';

export function LocationStep({ onComplete }: Props) {
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [accidentDate, setAccidentDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [accidentTime, setAccidentTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // HH:MM
  });
  const [injuries, setInjuries] = useState<boolean | null>(null);
  const [injuryDesc, setInjuryDesc] = useState('');
  const [ambulance, setAmbulance] = useState(false);
  const [hospitalized, setHospitalized] = useState(false);
  const [injurySeverity, setInjurySeverity] = useState<'minor' | 'moderate' | 'serious'>('minor');

  // Auto-géolocalisation au montage
  useEffect(() => {
    requestGeo();
  }, []);

  const requestGeo = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setGeoStatus('success');
        // Reverse geocoding via nominatim (gratuit, aucune clé API)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
            { headers: { 'User-Agent': 'boom.contact/1.0' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          setAddress(
            [addr.road, addr.house_number].filter(Boolean).join(' ') ||
            addr.pedestrian || addr.path || ''
          );
          setCity(addr.city || addr.town || addr.village || addr.municipality || '');
          setCountry(addr.country_code?.toUpperCase() || '');
        } catch { /* ignore reverse geocoding errors */ }
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const canContinue = vehicleType !== null && injuries !== null &&
    (city || address) && accidentDate && accidentTime;

  const handleContinue = () => {
    if (!vehicleType || injuries === null) return;
    onComplete({
      vehicleType,
      date: accidentDate,
      time: accidentTime,
      location: { address, city, country, lat: coords?.lat, lng: coords?.lng },
      injuries,
      injuryDetails: injuries ? {
        hasInjuries: true,
        description: injuryDesc,
        ambulance,
        hospitalized,
        severity: injurySeverity,
      } : undefined,
    });
  };

  return (
    <div style={{ padding: '20px 20px 32px', maxWidth: 480, margin: '0 auto' }}>

      {/* ── Type de véhicule ─────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: 12 }}>
          Votre véhicule
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {VEHICLE_GROUPS.map(group => (
            <div key={group.group}>
              <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.3, textTransform: 'uppercase',
                fontFamily: 'monospace', marginBottom: 8 }}>{group.group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {group.types.map(v => {
                  const sel = vehicleType === v.id;
                  return (
                    <button key={v.id} onClick={() => setVehicleType(v.id)} style={{
                      padding: '12px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: sel ? 'rgba(255,53,0,0.12)' : 'rgba(255,255,255,0.03)',
                      outline: sel ? '2px solid var(--boom)' : '1.5px solid rgba(255,255,255,0.08)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: 26 }}>{v.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? 'var(--boom)' : 'var(--text)' }}>
                        {v.label}
                      </span>
                      <span style={{ fontSize: 9, opacity: 0.4, textAlign: 'center', lineHeight: 1.3 }}>
                        {v.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Date & heure ────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: 10 }}>
          Date & heure de l'accident
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>Date</div>
            <input
              type="date"
              value={accidentDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setAccidentDate(e.target.value)}
              style={{
                width: '100%', padding: '11px 13px', borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>Heure</div>
            <input
              type="time"
              value={accidentTime}
              onChange={e => setAccidentTime(e.target.value)}
              style={{
                width: '100%', padding: '11px 13px', borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6, lineHeight: 1.5 }}>
          ⚠️ Indiquez l'heure réelle de l'accident, pas l'heure actuelle.
        </div>
      </div>

      {/* ── Géolocalisation ──────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: 10 }}>
          Lieu de l'accident
        </div>

        {/* GPS status bar */}
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: geoStatus === 'success' ? 'rgba(34,197,94,0.08)' :
                      geoStatus === 'loading' ? 'rgba(245,158,11,0.08)' :
                      'rgba(255,255,255,0.04)',
          border: `1px solid ${geoStatus === 'success' ? 'rgba(34,197,94,0.25)' :
                                geoStatus === 'loading' ? 'rgba(245,158,11,0.25)' :
                                'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {geoStatus === 'success' ? '📍' : geoStatus === 'loading' ? '⏳' :
               geoStatus === 'denied' ? '🚫' : '📍'}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600,
                color: geoStatus === 'success' ? '#22c55e' : geoStatus === 'denied' ? '#ef4444' : 'var(--text)' }}>
                {geoStatus === 'success' && coords
                  ? `GPS capturé — ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                  : geoStatus === 'loading' ? 'Localisation en cours…'
                  : geoStatus === 'denied' ? 'Accès GPS refusé — saisie manuelle'
                  : 'Position GPS non capturée'}
              </div>
              {geoStatus === 'success' && (
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>
                  Coordonnées enregistrées dans le document
                </div>
              )}
            </div>
          </div>
          {(geoStatus === 'denied' || geoStatus === 'error') && (
            <button onClick={requestGeo} style={{
              padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 11,
              whiteSpace: 'nowrap',
            }}>
              Réessayer
            </button>
          )}
        </div>

        {/* Adresse manuelle — toujours visible pour correction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>
              Rue / Lieu-dit / Autoroute (ex: A1 sortie 12, Carrefour des Quatre-Routes)
            </div>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Ex: Avenue de la Gare 4, A1 direction Berne km 47..."
              style={{
                width: '100%', padding: '11px 13px', borderRadius: 8,
                border: '1.5px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Ville / Localité</div>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Lausanne, Paris..."
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Pays</div>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="CH, FR..."
                style={{
                  width: '100%', padding: '11px 13px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)' }}>
          <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.6 }}>
            💡 <strong>Important :</strong> Indiquez le lieu <strong>exact de l'accident</strong>,
            même si vous avez déplacé les véhicules sur le côté.
            Le GPS capture votre position <em>actuelle</em> — corrigez si vous avez bougé.
          </div>
        </div>
      </div>

      {/* ── Blessés ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: 10 }}>
          Y a-t-il des blessés ?
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {([
            { val: false, label: 'Non — aucun blessé', icon: '✅', color: '#22c55e' },
            { val: true,  label: 'Oui — blessure(s)',  icon: '🚑', color: '#ef4444' },
          ] as const).map(opt => (
            <button key={String(opt.val)} onClick={() => setInjuries(opt.val)} style={{
              flex: 1, padding: '14px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: injuries === opt.val ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
              outline: injuries === opt.val ? `2px solid ${opt.color}` : '1.5px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600,
                color: injuries === opt.val ? opt.color : 'rgba(240,237,232,0.6)' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Détails blessures — si oui */}
        {injuries === true && (
          <div style={{
            padding: 16, borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.25)',
            background: 'rgba(239,68,68,0.05)', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>
              🚑 Détails des blessures
            </div>

            {/* Gravité */}
            <div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>Gravité apparente</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { val: 'minor',    label: 'Légère',    color: '#f59e0b' },
                  { val: 'moderate', label: 'Modérée',   color: '#f97316' },
                  { val: 'serious',  label: 'Grave',     color: '#ef4444' },
                ] as const).map(s => (
                  <button key={s.val} onClick={() => setInjurySeverity(s.val)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: injurySeverity === s.val ? `${s.color}20` : 'transparent',
                    outline: injurySeverity === s.val ? `1.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)',
                    color: injurySeverity === s.val ? s.color : 'rgba(240,237,232,0.5)',
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>
                Description (zone du corps, douleurs, blessures visibles)
              </div>
              <textarea
                value={injuryDesc}
                onChange={e => setInjuryDesc(e.target.value)}
                placeholder="Ex: Douleur cervicale, contusion genou gauche, coupure front…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 13px', borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text)', fontSize: 13, resize: 'none',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Ambulance / hospitalisation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { val: ambulance,    set: setAmbulance,    label: '🚑 Prise en charge par ambulance / SMUR' },
                { val: hospitalized, set: setHospitalized, label: '🏥 Hospitalisation nécessaire ou envisagée' },
              ].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => item.set(!item.val)} style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: item.val ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    background: item.val ? '#ef4444' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {item.val && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>{item.label}</span>
                </label>
              ))}
            </div>

            <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.6 }}>
              En cas de blessés graves, appelez le 112 (EU) ou 144 (CH) immédiatement.
              Ces informations seront incluses dans le document final.
            </div>
          </div>
        )}
      </div>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <button
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: canContinue ? 'var(--boom)' : 'rgba(255,255,255,0.08)',
          color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
          cursor: canContinue ? 'pointer' : 'not-allowed',
          fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
        }}
      >
        {!vehicleType ? 'Sélectionnez votre type de véhicule' :
         injuries === null ? 'Indiquez s\'il y a des blessés' :
         !(city || address) ? 'Indiquez le lieu de l\'accident' :
         'Continuer →'}
      </button>
    </div>
  );
}
