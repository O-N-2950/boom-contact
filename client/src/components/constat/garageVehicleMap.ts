/**
 * Mapping PUR d'un vehicule enregistre (garage) vers les donnees participant du constat.
 * Sans dependance React/navigateur -> testable unitairement.
 *
 * Objectif UX : quand l'utilisateur choisit un vehicule de son garage, on prerempli
 * tout ce qui est connu (vehicule + assurance + donnees permis) afin de POUVOIR SAUTER
 * le scan OCR (permis de circulation / carte verte). Le scan ne reste qu'une option
 * pour ajouter un nouveau vehicule ou completer des informations manquantes.
 */
export interface GarageVehicleInput {
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string | number;
  category?: string;
  nickname?: string;
  licenseData?: Record<string, unknown> | null;
  insuranceData?: Record<string, any> | null;
}

export interface MappedParticipant {
  role: string;
  vehicle: Record<string, unknown>;
  insurance?: Record<string, unknown>;
}

export function mapGarageVehicleToParticipant(v: GarageVehicleInput, role: string = 'A'): MappedParticipant {
  const ins = v.insuranceData || undefined;
  const hasInsurance = !!ins && Object.keys(ins).length > 0;
  return {
    role,
    vehicle: {
      licensePlate:    v.plate,
      make:            v.make,
      model:           v.model,
      color:           v.color,
      year:            v.year,
      vehicleCategory: v.category,
      ...(v.licenseData || {}),
    },
    insurance: hasInsurance
      ? {
          ...ins,
          // Normaliser : 'company' est le champ utilise par ConstatForm
          company:      ins!.company || ins!.companyName || '',
          companyName:  ins!.company || ins!.companyName || '',
          policyNumber: ins!.policyNumber || '',
        }
      : undefined,
  };
}

/**
 * Faut-il proposer le selecteur "vehicule de mon garage" a l'etape de scan ?
 * Oui seulement si l'utilisateur est authentifie ET possede au moins un vehicule.
 */
export function shouldOfferGarage(authToken: string | undefined | null, vehicleCount: number): boolean {
  return !!authToken && vehicleCount > 0;
}

/**
 * Quand un vehicule du garage est selectionne, le scan OCR doit-il etre obligatoire ?
 * Non : il devient optionnel (le vehicule est deja preremplit).
 */
export function isScanRequiredAfterGarageSelection(): boolean {
  return false;
}
