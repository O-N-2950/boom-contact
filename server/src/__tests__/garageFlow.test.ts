import { describe, it, expect } from 'vitest';
import { mapGarageVehicleToParticipant, shouldOfferGarage, isScanRequiredAfterGarageSelection } from '../../../client/src/components/constat/garageVehicleMap';

describe('Garage-to-Constat — mapping vehicule -> participant (prerempli, scan saute)', () => {
  it('mappe les champs vehicule + role A par defaut', () => {
    const r = mapGarageVehicleToParticipant({ plate: 'JU 12345', make: 'VW', model: 'Golf', color: 'Bleue', year: 2022, category: 'tourisme' });
    expect(r.role).toBe('A');
    expect(r.vehicle.licensePlate).toBe('JU 12345');
    expect(r.vehicle.make).toBe('VW');
    expect(r.vehicle.model).toBe('Golf');
    expect(r.vehicle.vehicleCategory).toBe('tourisme');
  });
  it('normalise l assurance (company/companyName/policyNumber)', () => {
    const r = mapGarageVehicleToParticipant({ plate: 'BE 1', insuranceData: { companyName: 'AXA', policyNumber: 'P-9' } });
    expect(r.insurance).toBeTruthy();
    expect(r.insurance!.company).toBe('AXA');
    expect(r.insurance!.companyName).toBe('AXA');
    expect(r.insurance!.policyNumber).toBe('P-9');
  });
  it('sans assurance -> insurance undefined (pas d objet vide)', () => {
    expect(mapGarageVehicleToParticipant({ plate: 'X' }).insurance).toBeUndefined();
    expect(mapGarageVehicleToParticipant({ plate: 'X', insuranceData: {} }).insurance).toBeUndefined();
  });
  it('fusionne licenseData (donnees permis deja connues)', () => {
    const r = mapGarageVehicleToParticipant({ plate: 'X', licenseData: { vin: 'WVWZZZ', firstReg: '2019' } as any });
    expect((r.vehicle as any).vin).toBe('WVWZZZ');
    expect((r.vehicle as any).firstReg).toBe('2019');
  });
  it('role explicite (B/C/D/E) supporte', () => {
    expect(mapGarageVehicleToParticipant({ plate: 'X' }, 'B').role).toBe('B');
  });
});

describe('Garage-to-Constat — quand proposer le garage / scan optionnel (cas A-H)', () => {
  it('A. connecte + 0 vehicule -> ne propose PAS le garage', () => {
    expect(shouldOfferGarage('tok', 0)).toBe(false);
  });
  it('B. connecte + 1 vehicule -> propose le garage', () => {
    expect(shouldOfferGarage('tok', 1)).toBe(true);
  });
  it('C. connecte + plusieurs -> propose le garage', () => {
    expect(shouldOfferGarage('tok', 5)).toBe(true);
  });
  it('D. non connecte -> ne propose JAMAIS le garage (meme si count>0)', () => {
    expect(shouldOfferGarage(undefined, 3)).toBe(false);
    expect(shouldOfferGarage('', 3)).toBe(false);
  });
  it('scan OCR NON obligatoire apres selection garage (UX: ne pas rescanner)', () => {
    expect(isScanRequiredAfterGarageSelection()).toBe(false);
  });
});
