// client/src/components/police/ConstatDataView.tsx
// Vue lecture seule des donnees conducteurs en temps reel

interface ParticipantData {
  role?: string;
  vehicle?: {
    licensePlate?: string;
    plate?: string;
    brand?: string;
    make?: string;
    model?: string;
    color?: string;
    vehicleType?: string;
  };
  driver?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
  };
  insurance?: {
    company?: string;
    policyNumber?: string;
  };
  circumstances?: string[];
  damagedZones?: string[];
  signature?: string;
}

interface AccidentData {
  date?: string;
  time?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  injuries?: boolean;
  description?: string;
  sketchImage?: string;
  photos?: { id: string; category: string; base64: string; caption?: string }[];
}

interface Props {
  accident?: AccidentData;
  participantA?: ParticipantData;
  participantB?: ParticipantData;
  vehicleCount?: number;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-white/40 uppercase tracking-wider block">{label}</span>
      <span className="text-sm text-white/90 break-words">{value || '-'}</span>
    </div>
  );
}

function ParticipantCard({ data, label }: { data?: ParticipantData; label: string }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="p-4 rounded-lg border border-white/10 bg-white/5">
        <h4 className="text-sm font-semibold text-white mb-2">{label}</h4>
        <p className="text-sm text-white/40">Pas encore rejoint la session</p>
      </div>
    );
  }

  const d = data.driver || {};
  const v = data.vehicle || {};
  const ins = data.insurance || {};
  const driverName = [d.lastName, d.firstName].filter(Boolean).join(' ') || d.name || '-';
  const plate = v.licensePlate || v.plate || '-';
  const vehicleDesc = [v.brand || v.make, v.model].filter(Boolean).join(' ') || '-';

  return (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{label}</h4>
        {data.signature && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
            Signe
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom / Prenom" value={driverName} />
        <Field label="Telephone" value={d.phone} />
        <Field label="Adresse" value={d.address} />
        <Field label="Permis" value={d.licenseNumber} />
      </div>

      <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-3">
        <Field label="Plaque" value={plate} />
        <Field label="Vehicule" value={vehicleDesc} />
        <Field label="Couleur" value={v.color} />
        <Field label="Type" value={v.vehicleType} />
      </div>

      <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-3">
        <Field label="Assureur" value={ins.company} />
        <Field label="N Police" value={ins.policyNumber} />
      </div>

      {data.circumstances && data.circumstances.length > 0 && (
        <div className="border-t border-white/10 pt-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Circonstances</span>
          <div className="flex flex-wrap gap-1">
            {data.circumstances.map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConstatDataView({ accident, participantA, participantB, vehicleCount }: Props) {
  const loc = accident?.location;
  const address = [loc?.address, loc?.city, loc?.country].filter(Boolean).join(', ') || '-';

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
        Donnees du constat (lecture seule)
      </h3>

      {/* Accident info */}
      <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
        <h4 className="text-sm font-semibold text-white">Accident</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Date" value={accident?.date} />
          <Field label="Heure" value={accident?.time} />
          <Field label="Blesses" value={accident?.injuries ? 'OUI' : 'NON'} />
          <Field label="Vehicules" value={String(vehicleCount || 2)} />
        </div>
        <Field label="Lieu" value={address} />
        {loc?.lat && loc?.lng && (
          <Field label="GPS" value={`${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`} />
        )}
        {accident?.description && (
          <Field label="Description" value={accident.description} />
        )}
      </div>

      {/* Participants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ParticipantCard data={participantA} label="Conducteur A" />
        <ParticipantCard data={participantB} label="Conducteur B" />
      </div>

      {/* Sketch */}
      {accident?.sketchImage && (
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <h4 className="text-sm font-semibold text-white mb-2">Croquis de l'accident</h4>
          <img
            src={accident.sketchImage}
            alt="Croquis de l'accident"
            className="w-full max-w-md rounded border border-white/10"
          />
        </div>
      )}

      {/* Photos */}
      {accident?.photos && accident.photos.length > 0 && (
        <div className="p-4 rounded-lg border border-white/10 bg-white/5">
          <h4 className="text-sm font-semibold text-white mb-2">
            Photos ({accident.photos.length})
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {accident.photos.map((photo, i) => (
              <div key={photo.id || i} className="relative rounded overflow-hidden">
                <img
                  src={photo.base64}
                  alt={photo.caption || `Photo ${i + 1}`}
                  className="w-full h-20 object-cover"
                />
                {photo.caption && (
                  <p className="text-[10px] text-white/50 p-1 truncate">{photo.caption}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
