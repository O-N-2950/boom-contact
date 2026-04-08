import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccidentData, VehicleType } from '../../../../shared/types';

interface Props {
  onComplete: (data: Partial<AccidentData> & { vehicleType: VehicleType }) => void;
  initialVehicleType?: VehicleType | null;
  // Pour driver B : accident data déjà saisie par driver A
  initialAccidentData?: {
    date?: string;
    time?: string;
    address?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null;
  // Si true → conducteur B : localisation masquée (identique à A), seulement type véhicule + blessés
  isPartyB?: boolean;
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

export function LocationStep({ onComplete, initialVehicleType, initialAccidentData, isPartyB = false }: Props) {
  const { t } = useTranslation();
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(initialVehicleType ?? null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialAccidentData?.lat && initialAccidentData?.lng
      ? { lat: initialAccidentData.lat, lng: initialAccidentData.lng }
      : null
  );
  const [address, setAddress] = useState(initialAccidentData?.address || '');
  const [city, setCity] = useState(initialAccidentData?.city || '');
  const [country, setCountry] = useState(initialAccidentData?.country || '');
  const [accidentDate, setAccidentDate] = useState(initialAccidentData?.date || new Date().toISOString().split('T')[0]);
  const [accidentTime, setAccidentTime] = useState(initialAccidentData?.time || new Date().toTimeString().slice(0, 5));
  const [injuries, setInjuries] = useState<boolean | null>(null);
  const [injuryDesc, setInjuryDesc] = useState('');
  const [ambulance, setAmbulance] = useState(false);
  const [hospitalized, setHospitalized] = useState(false);
  const [injurySeverity, setInjurySeverity] = useState<'minor' | 'moderate' | 'serious'>('minor');

  // Pour le conducteur B : on n'a pas besoin de la géoloc (déjà fournie par A)
  useEffect(() => {
    if (isPartyB) return; // pas de géoloc pour B
    requestGeo();
  }, []);

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

  // Si les données accident sont pré-remplies (driver B), la location est déjà validée par driver A
  const locationOk = isPartyB ? true : !!(city || address) || !!initialAccidentData;
  const canContinue = vehicleType !== null && injuries !== null && locationOk && accidentDate && accidentTime;

  const handleContinue = () => {
    if (!vehicleType || injuries === null) return;
    onComplete({
      vehicleType,
      date: accidentDate,
      time: accidentTime,
      location: {
        address: initialAccidentData?.address || address,
        city: initialAccidentData?.city || city,
        country: initialAccidentData?.country || country,
        lat: initialAccidentData?.lat || coords?.lat,
        lng: initialAccidentData?.lng || coords?.lng,
      },
      injuries,
      injuryDetails: injuries ? { hasInjuries: true, description: injuryDesc, ambulance, hospitalized, severity: injurySeverity } : undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 8,
    border: '1.5px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <div className="mx-auto max-w-[480px] px-5 pt-5 pb-8">

      {/* ── CONDUCTEUR B : badge localisation depuis A ── */}
      {isPartyB && (
        <div className="mb-6 rounded-xl flex items-start gap-3 px-4 py-3.5" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="text-[22px] shrink-0">📍</span>
          <div>
            <div className="font-bold text-[13px] text-green-500 mb-1">
              Lieu du sinistre — identique au conducteur A
            </div>
            {(initialAccidentData?.address || initialAccidentData?.city) && (
              <div className="text-xs leading-normal opacity-75">
                {[initialAccidentData.address, initialAccidentData.city, initialAccidentData.country].filter(Boolean).join(', ')}
              </div>
            )}
            <div className="text-[11px] mt-1 opacity-70" >
              {initialAccidentData?.date && `${initialAccidentData.date}`}
              {initialAccidentData?.time && ` à ${initialAccidentData.time}`}
            </div>
          </div>
        </div>
      )}

      {/* Vehicle type */}
      <div className="mb-7">
        <div className="text-[11px] uppercase mb-3 tracking-[2px] opacity-75" style={{ fontFamily: 'monospace' }}>
          {t('location.vehicle_label')}
        </div>

        {/* Si OCR a détecté le type, afficher confirmation et masquer les autres groupes */}
        {initialVehicleType && vehicleType === initialVehicleType ? (
          <div>
            <div className="rounded-xl flex items-center gap-3 mb-3 px-4 py-3.5" style={{ background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)' }}>
              <span className="text-[28px]">
                {VEHICLE_GROUPS.flatMap(g => g.types).find(v => v.id === vehicleType)?.icon || '🚗'}
              </span>
              <div className="flex-1">
                <div className="font-bold text-sm text-green-500">
                  {VEHICLE_GROUPS.flatMap(g => g.types).find(v => v.id === vehicleType) ? t(VEHICLE_GROUPS.flatMap(g => g.types).find(v => v.id === vehicleType)!.labelKey) : vehicleType}
                </div>
                <div className="text-[11px] mt-0.5 opacity-75">✅ Détecté automatiquement depuis le permis de circulation</div>
              </div>
              <button onClick={() => setVehicleType(null)} className="rounded-md bg-transparent cursor-pointer text-[11px] whitespace-nowrap touch-manipulation min-h-[44px] min-w-[44px] px-2.5 py-[5px]" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.45)' }}>
                Modifier
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {VEHICLE_GROUPS.map(group => (
              <div key={group.groupKey}>
                <div className="text-[9px] uppercase mb-2 tracking-[2px] opacity-75" style={{ fontFamily: 'monospace' }}>{t(group.groupKey)}</div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {group.types.map(v => {
                    const sel = vehicleType === v.id;
                    return (
                      <button key={v.id} onClick={() => setVehicleType(v.id)} className="rounded-xl border-0 cursor-pointer flex flex-col items-center gap-1 px-2.5 py-3 touch-manipulation" style={{ background: sel ? 'rgba(255,53,0,0.12)' : 'rgba(255,255,255,0.03)', outline: sel ? '2px solid var(--boom)' : '1.5px solid rgba(255,255,255,0.25)', transition: 'all 0.15s' }}>
                        <span className="text-[26px]">{v.icon}</span>
                        <span className="text-xs" style={{ fontWeight: sel ? 700 : 500, color: sel ? 'var(--boom)' : 'var(--text)' }}>
                          {t(v.labelKey)}
                        </span>
                        <span className="text-[9px] text-center leading-tight opacity-70" >
                          {t(v.subKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date & Time — masqué pour B (pré-rempli depuis A) */}
      {!isPartyB && (
        <div className="mb-6">
          <div className="text-[11px] uppercase mb-2.5 tracking-[2px] opacity-75" style={{ fontFamily: 'monospace' }}>
            {t('location.datetime_label')}
          </div>
          <div className="flex gap-2.5">
            <div style={{ flex: 2 }}>
              <div className="text-[11px] opacity-70 mb-[5px]" >{t('location.date_label')}</div>
              <input type="date" aria-label="Date de l'accident" value={accidentDate} max={new Date().toISOString().split('T')[0]}
                onChange={e => setAccidentDate(e.target.value)} className="text-sm" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] opacity-70 mb-[5px]" >{t('location.time_label')}</div>
              <input type="time" aria-label="Heure de l'accident" value={accidentTime} onChange={e => setAccidentTime(e.target.value)}
                className="text-sm" />
            </div>
          </div>
          <div className="text-[11px] leading-normal opacity-70 mt-1.5" >
            {t('location.datetime_warning')}
          </div>
        </div>
      )}

      {/* Geolocation — masqué pour B */}
      {!isPartyB && (
        <div className="mb-6">
          <div className="text-[11px] uppercase mb-2.5 tracking-[2px] opacity-75" style={{ fontFamily: 'monospace' }}>
            {t('location.geo_label')}
          </div>

          <div className="rounded-[10px] mb-3 flex items-center justify-between gap-2.5 px-3.5 py-2.5" style={{ background: geoStatus === 'success' ? 'rgba(34,197,94,0.08)' : geoStatus === 'loading' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${geoStatus === 'success' ? 'rgba(34,197,94,0.25)' : geoStatus === 'loading' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.25)'}` }}>
            <div className="flex items-center gap-2">
              <span className="text-base">
                {geoStatus === 'success' ? '📍' : geoStatus === 'loading' ? '⏳' : geoStatus === 'denied' ? '🚫' : '📍'}
              </span>
              <div>
                <div className="text-xs font-semibold" style={{ color: geoStatus === 'success' ? '#22c55e' : geoStatus === 'denied' ? '#ef4444' : 'var(--text)' }}>
                  {geoStatus === 'success' && coords
                    ? t('location.gps_captured', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })
                    : geoStatus === 'loading' ? t('location.gps_loading')
                    : geoStatus === 'denied' ? t('location.gps_denied')
                    : t('location.gps_missing')}
                </div>
                {geoStatus === 'success' && (
                  <div className="text-[10px] mt-px opacity-75">{t('location.gps_saved')}</div>
                )}
              </div>
            </div>
            {(geoStatus === 'denied' || geoStatus === 'error') && (
              <button onClick={requestGeo} className="rounded-md bg-transparent cursor-pointer text-[11px] whitespace-nowrap px-2.5 py-[5px]" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text)' }}>{t('common.retry')}</button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <div className="text-[11px] mb-1 opacity-70" >{t('location.address_label')}</div>
              <input type="text" aria-label="Adresse" value={address} onChange={e => setAddress(e.target.value)}
                placeholder={t('location.address_placeholder')} style={inputStyle} />
            </div>
            <div className="flex gap-2">
              <div style={{ flex: 2 }}>
                <div className="text-[11px] mb-1 opacity-70" >{t('location.city_label')}</div>
                <input type="text" aria-label="Ville" value={city} onChange={e => setCity(e.target.value)}
                  placeholder={t('location.city_placeholder')} style={inputStyle} />
              </div>
              <div className="flex-1">
                <div className="text-[11px] mb-1 opacity-70" >{t('location.country_label')}</div>
                <input type="text" aria-label="Pays" value={country} onChange={e => setCountry(e.target.value)}
                  placeholder={t('location.country_placeholder')} style={inputStyle} />
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg px-3 py-2.5" style={{ background: 'rgba(255,53,0,0.06)', border: '1px solid rgba(255,53,0,0.15)' }}>
            <div className="text-[11px] leading-relaxed opacity-70" >
              {t('location.location_tip')}
            </div>
          </div>
        </div>
      )}

      {/* Injuries */}
      <div className="mb-6">
        <div className="text-[11px] uppercase mb-2.5 tracking-[2px] opacity-75" style={{ fontFamily: 'monospace' }}>
          {t('location.injuries_label')}
        </div>
        <div className="flex gap-2.5 mb-3">
          {([
            { val: false, label: t('location.no_injuries'), icon: '✅', color: '#22c55e' },
            { val: true,  label: t('location.yes_injuries'), icon: '🚑', color: '#ef4444' },
          ] as const).map(opt => (
            <button key={String(opt.val)} onClick={() => setInjuries(opt.val)} className="flex-1 rounded-xl border-0 cursor-pointer flex flex-col items-center gap-1.5 px-2.5 py-3.5" style={{ background: injuries === opt.val ? `${opt.color}15` : 'rgba(255,255,255,0.03)', outline: injuries === opt.val ? `2px solid ${opt.color}` : '1.5px solid rgba(255,255,255,0.25)', transition: 'all 0.15s' }}>
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-xs font-semibold" style={{ color: injuries === opt.val ? opt.color : 'rgba(240,237,232,0.6)' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {injuries === true && (
          <div className="p-4 rounded-xl flex flex-col gap-3" style={{ border: '1.5px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }}>
            <div className="text-xs font-bold text-red-500 mb-0.5" >
              {t('location.injury_details_title')}
            </div>

            <div>
              <div className="text-[11px] mb-1.5 opacity-70" >{t('location.severity_label')}</div>
              <div className="flex gap-1.5">
                {([
                  { val: 'minor',    label: t('location.severity_minor'),    color: '#f59e0b' },
                  { val: 'moderate', label: t('location.severity_moderate'), color: '#f97316' },
                  { val: 'serious',  label: t('location.severity_serious'),  color: '#ef4444' },
                ] as const).map(s => (
                  <button key={s.val} onClick={() => setInjurySeverity(s.val)} className="flex-1 rounded-lg border-0 cursor-pointer text-xs font-semibold px-1 py-2" style={{ background: injurySeverity === s.val ? `${s.color}20` : 'transparent', outline: injurySeverity === s.val ? `1.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.25)', color: injurySeverity === s.val ? s.color : 'rgba(240,237,232,0.5)', transition: 'all 0.15s' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] opacity-70 mb-[5px]" >{t('location.injury_desc_label')}</div>
              <textarea aria-label="Description des blessures" value={injuryDesc} onChange={e => setInjuryDesc(e.target.value)}
                placeholder={t('location.injury_desc_placeholder')} rows={3}
                className="w-full rounded-lg text-[13px] box-border resize-none px-[13px] py-2.5" style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontFamily: 'inherit' }}
              />
            </div>

            <div className="flex flex-col gap-2">
              {[
                { val: ambulance,    set: setAmbulance,    label: t('location.ambulance') },
                { val: hospitalized, set: setHospitalized, label: t('location.hospitalized') },
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={item.val} onChange={() => item.set(!item.val)} aria-label={item.label} className="w-5 h-5 rounded-[5px] shrink-0 cursor-pointer" style={{ accentColor: '#ef4444' }} />
                  <span className="text-[13px] opacity-80" >{item.label}</span>
                </label>
              ))}
            </div>

            <div className="text-[11px] leading-relaxed opacity-75">{t('location.injury_footer')}</div>
          </div>
        )}
      </div>

      {/* CTA */}
      <button onClick={handleContinue} disabled={!canContinue} className="w-full p-4 rounded-xl border-0 font-bold transition-all duration-200 text-[15px]" style={{ background: canContinue ? 'var(--boom)' : 'rgba(255,255,255,0.08)', color: canContinue ? '#fff' : 'rgba(255,255,255,0.6)', cursor: canContinue ? 'pointer' : 'not-allowed' }}>
        {!vehicleType ? t('location.cta_no_vehicle') :
         injuries === null ? t('location.cta_no_injuries') :
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
          <div className="mt-2.5 flex flex-col gap-2">
            <div className="flex gap-2">
              <a href={`tel:${nums.police}`} className="flex-1 p-[11px] rounded-[10px] no-underline text-[13px] font-semibold text-[#ef4444] text-center" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}>
                {t('location.emergency_police', { number: nums.police, label })}
              </a>
              <a href={`tel:${nums.ambulance}`} className="flex-1 p-[11px] rounded-[10px] no-underline text-[13px] font-semibold text-[#ef4444] text-center" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}>
                {t('location.emergency_ambulance', { number: nums.ambulance, label })}
              </a>
            </div>
            <div className="text-[11px] text-center opacity-75">
              {t('location.emergency_voluntary')}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
