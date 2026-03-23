import { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import { OCRScanner } from '../components/constat/OCRScanner';
import type { OCRResult } from '../../../shared/types';

interface AccountPageProps {
  user: { id: string; email: string; role: string; credits: number };
  token: string;
  onBack: () => void;
  onLogout: () => void;
}

type PageView = 'garage' | 'add_vehicle' | 'edit_vehicle';

interface VehicleData {
  id?: string;
  nickname?: string;
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  category?: string;
  licenseData?: Record<string, any>;
  insuranceData?: Record<string, any>;
}

export function AccountPage({ user, token, onBack, onLogout }: AccountPageProps) {
  const [view, setView]             = useState<PageView>('garage');
  const [editVehicle, setEditVehicle] = useState<VehicleData | null>(null);
  const [scanMode, setScanMode]     = useState<'license' | 'insurance' | null>(null);
  const [form, setForm]             = useState<VehicleData>({});
  const [saving, setSaving]         = useState(false);
  const [feedback, setFeedback]     = useState('');

  const vehicleListQ = trpc.vehicle.list.useQuery(undefined, {
    enabled: !!token,
  });
  const saveMut   = trpc.vehicle.save.useMutation();
  const deleteMut = trpc.vehicle.delete.useMutation();

  const startAdd = () => {
    setForm({});
    setEditVehicle(null);
    setScanMode(null);
    setView('add_vehicle');
  };

  const startEdit = (v: VehicleData) => {
    setForm({ ...v });
    setEditVehicle(v);
    setScanMode(null);
    setView('edit_vehicle');
  };

  const handleOCRResult = (result: OCRResult) => {
    setScanMode(null);
    if (result.type === 'driving_license' || result.type === 'vehicle_registration') {
      setForm(prev => ({
        ...prev,
        plate:    result.licensePlate  || prev.plate,
        make:     result.make          || prev.make,
        model:    result.model         || prev.model,
        color:    result.color         || prev.color,
        year:     result.year          || prev.year,
        category: result.vehicleCategory || prev.category,
        licenseData: { ...prev.licenseData, ...result },
      }));
      setFeedback('✅ Permis de circuler scanné !');
    } else if (result.type === 'insurance_card') {
      setForm(prev => ({
        ...prev,
        insuranceData: { ...prev.insuranceData, ...result },
      }));
      setFeedback('✅ Carte verte scannée !');
    }
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleSave = async () => {
    if (!form.plate && !form.make && !form.nickname) {
      setFeedback('Ajoutez au moins une information (plaque, marque ou surnom).');
      return;
    }
    setSaving(true);
    try {
      await saveMut.mutateAsync({ ...form });
      await vehicleListQ.refetch();
      setView('garage');
      setFeedback('✅ Véhicule sauvegardé !');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e: any) {
      setFeedback('Erreur : ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nickname?: string) => {
    if (!confirm(`Supprimer ${nickname || 'ce véhicule'} ?`)) return;
    try {
      await deleteMut.mutateAsync({ id });
      await vehicleListQ.refetch();
    } catch (e: any) {
      setFeedback('Erreur : ' + e.message);
    }
  };

  // ── OCR scan overlay ────────────────────────────────────────
  if (scanMode) {
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setScanMode(null)} style={backBtnStyle}>← Annuler</button>
          <h2 style={{ color: '#fff', marginBottom: 16 }}>
            {scanMode === 'license' ? '📄 Scannez votre permis de circuler' : '🛡️ Scannez votre carte verte'}
          </h2>
          <OCRScanner
            onResult={handleOCRResult}
            documentType={scanMode === 'license' ? 'driving_license' : 'insurance_card'}
          />
        </div>
      </div>
    );
  }

  // ── Vehicle form (add/edit) ──────────────────────────────────
  if (view === 'add_vehicle' || view === 'edit_vehicle') {
    const isEdit = view === 'edit_vehicle';
    return (
      <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setView('garage')} style={backBtnStyle}>← Garage</button>
          <h2 style={{ color: '#fff', marginBottom: 4, fontSize: 22, fontWeight: 800 }}>
            {isEdit ? '✏️ Modifier le véhicule' : '➕ Ajouter un véhicule'}
          </h2>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
            Scannez vos documents une fois — tout sera pré-rempli lors de vos prochains constats.
          </p>

          {feedback && (
            <div style={{ background: feedback.startsWith('✅') ? '#0a2a0a' : '#2a0a0a',
              border: `1px solid ${feedback.startsWith('✅') ? '#1a5c1a' : '#5c1a1a'}`,
              borderRadius: 10, padding: 12, marginBottom: 16, color: '#ccc', fontSize: 14 }}>
              {feedback}
            </div>
          )}

          {/* Scan buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button onClick={() => setScanMode('license')} style={scanBtnStyle}>
              📄 Scanner permis de circuler
            </button>
            <button onClick={() => setScanMode('insurance')} style={scanBtnStyle}>
              🛡️ Scanner carte verte
            </button>
          </div>

          {/* Manual fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={labelStyle}>Surnom du véhicule (pour vous repérer)</label>
            <input placeholder='ex: "Ma Golf bleue"' value={form.nickname || ''} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} style={inputStyle} />

            <label style={labelStyle}>Plaque d'immatriculation</label>
            <input placeholder="JU 12345 ou 75-ABC-123" value={form.plate || ''} onChange={e => setForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))} style={inputStyle} />

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Marque</label>
                <input placeholder="Volkswagen" value={form.make || ''} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Modèle</label>
                <input placeholder="Golf 7" value={form.model || ''} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Couleur</label>
                <input placeholder="Bleue" value={form.color || ''} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Année</label>
                <input placeholder="2021" value={form.year || ''} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* Insurance summary */}
            {form.insuranceData && Object.keys(form.insuranceData).length > 0 && (
              <div style={{ background: '#0d2a0d', border: '1px solid #1a4a1a', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>🛡️ Assurance enregistrée</div>
                {form.insuranceData.companyName && <div style={{ color: '#ccc', fontSize: 13 }}>Compagnie : {form.insuranceData.companyName}</div>}
                {form.insuranceData.policyNumber && <div style={{ color: '#ccc', fontSize: 13 }}>Police n° : {form.insuranceData.policyNumber}</div>}
                <button onClick={() => setScanMode('insurance')} style={{ ...scanBtnStyle, marginTop: 8, width: '100%' }}>
                  Mettre à jour l'assurance
                </button>
              </div>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              background: '#FF3500', color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px 20px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8,
            }}>
              {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Garage view ──────────────────────────────────────────────
  const vehicles = vehicleListQ.data || [];

  return (
    <div style={{ minHeight: '100vh', background: '#06060C', padding: 16 }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button onClick={onBack} style={backBtnStyle}>← Retour</button>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}>
            Déconnexion
          </button>
        </div>

        {/* Profile badge */}
        <div style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ color: '#FF3500', fontWeight: 800, fontSize: 18 }}>💥 Mon compte</div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{user.email}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ color: '#FF3500', fontSize: 20, fontWeight: 800 }}>{user.credits}</div>
              <div style={{ color: '#666', fontSize: 11 }}>crédit{user.credits !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{vehicles.length}</div>
              <div style={{ color: '#666', fontSize: 11 }}>véhicule{vehicles.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {feedback && (
          <div style={{ background: '#0a2a0a', border: '1px solid #1a5c1a', borderRadius: 10, padding: 12, marginBottom: 16, color: '#ccc', fontSize: 14 }}>
            {feedback}
          </div>
        )}

        {/* Garage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>🚗 Mon garage</h2>
          <button onClick={startAdd} style={{
            background: '#FF3500', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            + Ajouter
          </button>
        </div>

        {vehicleListQ.isLoading && (
          <div style={{ color: '#555', textAlign: 'center', padding: 32 }}>Chargement...</div>
        )}

        {!vehicleListQ.isLoading && vehicles.length === 0 && (
          <div style={{ background: '#111', border: '1px dashed #333', borderRadius: 14, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
            <div style={{ color: '#888', fontSize: 14, lineHeight: 1.6 }}>
              Aucun véhicule enregistré.<br />
              Ajoutez votre véhicule pour ne plus rien saisir lors d'un accident.
            </div>
            <button onClick={startAdd} style={{
              marginTop: 16, background: '#FF3500', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              ➕ Ajouter mon premier véhicule
            </button>
          </div>
        )}

        {vehicles.map((v: any) => (
          <div key={v.id} style={{
            background: '#111', border: '1px solid #222', borderRadius: 14,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  {v.nickname || [v.make, v.model].filter(Boolean).join(' ') || 'Véhicule sans nom'}
                </div>
                {v.plate && <div style={{ color: '#FF3500', fontFamily: 'monospace', fontSize: 14, marginTop: 2 }}>{v.plate}</div>}
                <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  {[v.make, v.model, v.color, v.year].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => startEdit(v)} style={iconBtnStyle}>✏️</button>
                <button onClick={() => handleDelete(v.id, v.nickname)} style={{ ...iconBtnStyle, color: '#ff4444' }}>🗑️</button>
              </div>
            </div>

            {/* Insurance badge */}
            {v.insuranceData && Object.keys(v.insuranceData).length > 0 ? (
              <div style={{ marginTop: 10, background: '#0d2a0d', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#4ade80', fontSize: 13 }}>🛡️</span>
                <span style={{ color: '#ccc', fontSize: 12 }}>
                  {v.insuranceData.companyName || 'Assurance enregistrée'}
                  {v.insuranceData.policyNumber ? ` · ${v.insuranceData.policyNumber}` : ''}
                </span>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { startEdit(v); setScanMode('insurance'); }} style={{ background: 'none', border: '1px dashed #333', borderRadius: 8, padding: '6px 12px', color: '#666', fontSize: 12, cursor: 'pointer' }}>
                  + Ajouter l'assurance
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '4px 0', marginBottom: 16, display: 'block',
};
const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 10,
  color: '#fff', padding: '11px 14px', fontSize: 14, width: '100%',
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  color: '#888', fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
};
const scanBtnStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 10,
  color: '#ccc', padding: '10px 12px', fontSize: 12, cursor: 'pointer', flex: 1,
};
const iconBtnStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #222', borderRadius: 8,
  padding: '6px 10px', cursor: 'pointer', fontSize: 16,
};
