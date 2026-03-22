import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccidentData, VehicleType } from '../../../../shared/types';

interface Props {
  onComplete: (data: Partial<AccidentData> & { vehicleType: VehicleType }) => void;
  initialVehicleType?: VehicleType | null;
}

type VehicleGroup = {
  groupKey: string;
  types: { id: VehicleType; icon: string; labelKey: string; subKey: string }[];
};

const VEHICLE_GROUPS: VehicleGroup[] = [
  { groupKey: 'location.groups.light', types: [
    { id: 'car',          icon: '🚗', labelKey: 'location.vehicles.car.label',          subKey: 'location.vehicles.car.sub' },
    { id: 'van',          icon: '🚐', labelKey: 'location.vehicles.van.label',          subKey: 'location.vehicles.van.sub' },
    { id: 'motorcycle',   icon: '🏍️', labelKey: 'location.vehicles.motorcycle.label',   subKey: 'location.vehicles.motorcycle.sub' },
    { id: 'scooter',      icon: '🛵', labelKey: 'location.vehicles.scooter.label',      subKey: 'location.vehicles.scooter.sub' },
    { id: 'moped',        icon: '🛵', labelKey: 'location.vehicles.moped.label',        subKey: 'location.vehicles.moped.sub' },
    { id: 'escooter',     icon: '🛴', labelKey: 'location.vehicles.escooter.label',     subKey: 'location.vehicles.escooter.sub' },
    { id: 'quad',         icon: '🏎️', labelKey: 'location.vehicles.quad.label',         subKey: 'location.vehicles.quad.sub' },
  ]},
  { groupKey: 'location.groups.heavy', types: [
    { id: 'truck',        icon: '🚚', labelKey: 'location.vehicles.truck.label',        subKey: 'location.vehicles.truck.sub' },
    { id: 'bus',          icon: '🚌', labelKey: 'location.vehicles.bus.label',          subKey: 'location.vehicles.bus.sub' },
    { id: 'construction', icon: '🚜', labelKey: 'location.vehicles.construction.label', subKey: 'location.vehicles.construction.sub' },
    { id: 'tractor',      icon: '🚜', labelKey: 'location.vehicles.tractor.label',      subKey: 'location.vehicles.tractor.sub' },
  ]},
  { groupKey: 'location.groups.rail', types: [
    { id: 'tram',         icon: '🚋', labelKey: 'location.vehicles.tram.label',         subKey: 'location.vehicles.tram.sub' },
    { id: 'train',        icon: '🚆', labelKey: 'location.vehicles.train.label',        subKey: 'location.vehicles.train.sub' },
  ]},
  { groupKey: 'location.groups.cycles', types: [
    { id: 'bicycle',      icon: '🚲', labelKey: 'location.vehicles.bicycle.label',      subKey: 'location.vehicles.bicycle.sub' },
    { id: 'cargo_bike',   icon: '🚲', labelKey: 'location.vehicles.cargo_bike.label',   subKey: 'location.vehicles.cargo_bike.sub' },
  ]},
  { groupKey: 'location.groups.other', types: [
    { id: 'pedestrian',   icon: '🚶', labelKey: 'location.vehicles.pedestrian.label',   subKey: 'location.vehicles.pedestrian.sub' },
    { id: 'boat',         icon: '⛵', labelKey: 'location.vehicles.boat.label',         subKey: 'location.vehicles.boat.sub' },
    { id: 'other',        icon: '❓', labelKey: 'location.vehicles.other.label',        subKey: 'location.vehicles.other.sub' },
  ]},
];

type GeoStatus = 'idle' | 'loading' | 'success' | 'denied' | 'error';

export function LocationStep({ onComplete, initialVehicleType }: Props) {
  const { t } = useTranslation();
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(initialVehicleType ?? null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [accidentDate, setAccidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accidentTime, setAccidentTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [injuries, setInjuries] = useState<boolean | null>(null);
  const [injuryDesc, setInjuryDesc] = useState('');
  const [ambulance, setAmbulance] = useState(false);
  const [hospitalized, setHospitalized] = useState(false);
  const [injurySeverity, setInjurySeverity] = useState<'minor' | 'moderate' | 'serious'>('minor');

  useEffect(() => { requestGeo(); }, []);

  const requestGeo = () => {
    if (!navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setGeoStatus('success');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
            { headers: { 'User-Agent': 'boom.contact/1.0' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          setAddress([addr.road, addr.house_number].filter(Boolean).join(' ') || addr.pedestrian || addr.path || '');
          setCity(addr.city || addr.town || addr.village || addr.municipality || '');
          setCountry(addr.country_code?.toUpperCase() || '');
        } catch { /* ignore */ }
      },
      (err) => { setGeoStatus(err.code === 1 ? 'denied' : 'error'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const canContinue = vehicleType !== null && injuries !== null && (city || address) && accidentDate && accidentTime;

  const handleContinue = () => {
    if (!vehicleType || injuries === null) return;
    onComplete({
      vehicleType,
      date: accidentDate,
      time: accidentTime,
      location: { address, city, country, lat: coords?.lat, lng: coords?.lng },
      injuries,
      injuryDetails: injuries ? { hasInjuries: true, description: injuryDesc, ambulance, hospitalized, severity: injurySeverity } : undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 8,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '20px 20px 32px', maxWidth: 480, margin: '0 auto' }}>

      {/* Vehicle type */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>
          {t('location.vehicle_label')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {VEHICLE_GROUPS.map(group => (
            <div key={group.groupKey}>
              <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.3, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>{t(group.groupKey)}</div>
              {initialVehicleType && (
                <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>✅</span>
                  <span>Véhicule détecté automatiquement — vous pouvez modifier si nécessaire</span>
                </div>
              )}
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
                        {t(v.labelKey)}
                      </span>
                      <span style={{ fontSize: 9, opacity: 0.4, textAlign: 'center', lineHeight: 1.3 }}>
                        {t(v.subKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
          {t('location.datetime_label')}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>{t('location.date_label')}</div>
            <input type="date" value={accidentDate} max={new Date().toISOString().split('T')[0]}
              onChange={e => setAccidentDate(e.target.value)} style={{ ...inputStyle, fontSize: 14 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>{t('location.time_label')}</div>
            <input type="time" value={accidentTime} onChange={e => setAccidentTime(e.target.value)}
              style={{ ...inputStyle, fontSize: 14 }} />
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.35, marginTop: 6, lineHeight: 1.5 }}>
          {t('location.datetime_warning')}
        </div>
      </div>

      {/* Geolocation */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
          {t('location.geo_label')}
        </div>

        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: geoStatus === 'success' ? 'rgba(34,197,94,0.08)' : geoStatus === 'loading' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${geoStatus === 'success' ? 'rgba(34,197,94,0.25)' : geoStatus === 'loading' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {geoStatus === 'success' ? '📍' : geoStatus === 'loading' ? '⏳' : geoStatus === 'denied' ? '🚫' : '📍'}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: geoStatus === 'success' ? '#22c55e' : geoStatus === 'denied' ? '#ef4444' : 'var(--text)' }}>
                {geoStatus === 'success' && coords
                  ? t('location.gps_captured', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })
                  : geoStatus === 'loading' ? t('location.gps_loading')
                  : geoStatus === 'denied' ? t('location.gps_denied')
                  : t('location.gps_missing')}
              </div>
              {geoStatus === 'success' && (
                <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>{t('location.gps_saved')}</div>
              )}
            </div>
          </div>
          {(geoStatus === 'denied' || geoStatus === 'error') && (
            <button onClick={requestGeo} style={{
              padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap',
            }}>{t('common.retry')}</button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t('location.address_label')}</div>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder={t('location.address_placeholder')} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t('location.city_label')}</div>
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                placeholder={t('location.city_placeholder')} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t('location.country_label')}</div>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)}
                placeholder={t('location.country_placeholder')} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)' }}>
          <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: t('location.location_tip') }} />
        </div>
      </div>

      {/* Injuries */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.4, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
          {t('location.injuries_label')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {([
            { val: false, label: t('location.no_injuries'), icon: '✅', color: '#22c55e' },
            { val: true,  label: t('location.yes_injuries'), icon: '🚑', color: '#ef4444' },
          ] as const).map(opt => (
            <button key={String(opt.val)} onClick={() => setInjuries(opt.val)} style={{
              flex: 1, padding: '14px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: injuries === opt.val ? `${opt.color}15` : 'rgba(255,255,255,0.03)',
              outline: injuries === opt.val ? `2px solid ${opt.color}` : '1.5px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 24 }}>{opt.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: injuries === opt.val ? opt.color : 'rgba(240,237,232,0.6)' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {injuries === true && (
          <div style={{ padding: 16, borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>
              {t('location.injury_details_title')}
            </div>

            <div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>{t('location.severity_label')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([
                  { val: 'minor',    label: t('location.severity_minor'),    color: '#f59e0b' },
                  { val: 'moderate', label: t('location.severity_moderate'), color: '#f97316' },
                  { val: 'serious',  label: t('location.severity_serious'),  color: '#ef4444' },
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

            <div>
              <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 5 }}>{t('location.injury_desc_label')}</div>
              <textarea value={injuryDesc} onChange={e => setInjuryDesc(e.target.value)}
                placeholder={t('location.injury_desc_placeholder')} rows={3}
                style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { val: ambulance,    set: setAmbulance,    label: t('location.ambulance') },
                { val: hospitalized, set: setHospitalized, label: t('location.hospitalized') },
              ].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div onClick={() => item.set(!item.val)} style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: item.val ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    background: item.val ? '#ef4444' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                  }}>
                    {item.val && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>{item.label}</span>
                </label>
              ))}
            </div>

            <div style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.6 }}>{t('location.injury_footer')}</div>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={handleContinue} disabled={!canContinue} style={{
        width: '100%', padding: '16px', borderRadius: 12, border: 'none',
        background: canContinue ? 'var(--boom)' : 'rgba(255,255,255,0.08)',
        color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
        cursor: canContinue ? 'pointer' : 'not-allowed',
        fontSize: 15, fontWeight: 700, transition: 'all 0.2s',
      }}>
        {!vehicleType ? t('location.cta_no_vehicle') :
         injuries === null ? t('location.cta_no_injuries') :
         !(city || address) ? t('location.cta_no_location') :
         t('common.continue')}
      </button>

      {/* Emergency numbers */}
      {(() => {
        const EMERGENCY: Record<string, { police: string; ambulance: string }> = {
          CH: { police: '117',  ambulance: '144' }, FR: { police: '17',   ambulance: '15'  },
          DE: { police: '110',  ambulance: '112' }, AT: { police: '133',  ambulance: '144' },
          IT: { police: '113',  ambulance: '118' }, ES: { police: '091',  ambulance: '112' },
          PT: { police: '112',  ambulance: '112' }, BE: { police: '101',  ambulance: '100' },
          NL: { police: '0900-8844', ambulance: '112' }, LU: { police: '113', ambulance: '112' },
          GB: { police: '999',  ambulance: '999' }, IE: { police: '999',  ambulance: '999' },
          US: { police: '911',  ambulance: '911' }, CA: { police: '911',  ambulance: '911' },
          AU: { police: '000',  ambulance: '000' }, NZ: { police: '111',  ambulance: '111' },
          JP: { police: '110',  ambulance: '119' }, CN: { police: '110',  ambulance: '120' },
          MA: { police: '19',   ambulance: '15'  }, SN: { police: '17',   ambulance: '15'  },
          TN: { police: '197',  ambulance: '190' }, DZ: { police: '17',   ambulance: '14'  },
          ZA: { police: '10111',ambulance: '10177'}, BR: { police: '190',  ambulance: '192' },
          MX: { police: '911',  ambulance: '911' }, AR: { police: '911',  ambulance: '107' },
          IN: { police: '100',  ambulance: '102' }, RU: { police: '102',  ambulance: '103' },
          PL: { police: '997',  ambulance: '999' }, CZ: { police: '158',  ambulance: '155' },
          HU: { police: '107',  ambulance: '104' }, RO: { police: '112',  ambulance: '112' },
          GR: { police: '100',  ambulance: '166' }, TR: { police: '155',  ambulance: '112' },
          SE: { police: '114 14', ambulance: '112'}, NO: { police: '112',  ambulance: '113' },
          DK: { police: '114',  ambulance: '112' }, FI: { police: '0295 419 800', ambulance: '112'},
        };
        const nums = EMERGENCY[country] || { police: '112', ambulance: '112' };
        const label = country ? `(${country})` : '(EU)';
        return (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`tel:${nums.police}`} style={{
                flex: 1, padding: '11px', borderRadius: 10, textDecoration: 'none',
                border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)',
                color: '#ef4444', fontSize: 13, fontWeight: 600, textAlign: 'center' as const,
              }}>
                {t('location.emergency_police', { number: nums.police, label })}
              </a>
              <a href={`tel:${nums.ambulance}`} style={{
                flex: 1, padding: '11px', borderRadius: 10, textDecoration: 'none',
                border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)',
                color: '#ef4444', fontSize: 13, fontWeight: 600, textAlign: 'center' as const,
              }}>
                {t('location.emergency_ambulance', { number: nums.ambulance, label })}
              </a>
            </div>
            <div style={{ fontSize: 11, opacity: 0.28, textAlign: 'center' }}>
              {t('location.emergency_voluntary')}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
