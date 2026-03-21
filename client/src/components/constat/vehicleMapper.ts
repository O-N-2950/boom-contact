/**
 * boom.contact — Mapper véhicules
 * Marque + Modèle → type de carrosserie + couleur
 * ~700 modèles, tous pays
 */

export type BodyStyle =
  | 'hatchback_3' | 'hatchback_5' | 'sedan' | 'coupe'
  | 'convertible' | 'estate' | 'suv_small' | 'suv_medium'
  | 'suv_large' | 'mpv' | 'minivan' | 'pickup'
  | 'van_small' | 'van_medium' | 'van_large'
  | 'moto_naked' | 'moto_sport' | 'moto_touring'
  | 'scooter' | 'bicycle' | 'escooter'
  | 'truck_rigid' | 'truck_semi' | 'bus' | 'tram'
  | 'pedestrian' | 'unknown';

// ── Couleurs OCR → hex ───────────────────────────────────────
const COLOR_TABLE: [string[], string][] = [
  [['blanc','white','weiss','bianco','blanco','wit','beyaz','alb','bílá','fehér','hvid','hvit','vit'], '#F2F2F0'],
  [['blanc perle','pearl white','perlweiss','bianco perla'], '#EEEAE2'],
  [['argent','silver','silber','argento','plateado','zilver','gümüş','srebrny','ezüst'], '#C4C4C4'],
  [['gris','gray','grey','grau','grigio','gris','grijs','gri','szary','šedá','szürke'], '#888888'],
  [['gris anthracite','anthrazit','anthracite','antracite','grigio scuro'], '#3E3E3E'],
  [['gris foncé','dark grey','dark gray','dunkelgrau','grigio scuro','gris oscuro'], '#555555'],
  [['noir','black','schwarz','nero','negro','zwart','siyah','czarny','černá','fekete'], '#1A1818'],
  [['rouge','red','rot','rosso','rojo','rood','kırmızı','czerwony','červená','piros'], '#CC1100'],
  [['rouge vif','bright red','feuerrot','rosso fuoco','rojo vivo'], '#EE0000'],
  [['bordeaux','burgundy','weinrot','bordò','burdeos','wijnrood','bordo'], '#7A1530'],
  [['bleu','blue','blau','blu','azul','blauw','mavi','niebieski','modrá','kék'], '#1144AA'],
  [['bleu foncé','dark blue','dunkelblau','blu scuro','azul oscuro'], '#0A1A55'],
  [['bleu clair','light blue','hellblau','blu chiaro','azul claro','lichtblauw'], '#3388CC'],
  [['bleu marine','navy','marineblau','blu navy','azul marino'], '#0A122E'],
  [['bleu nuit','midnight blue','nachtblau','blu notte','azul noche'], '#0A0A2A'],
  [['vert','green','grün','verde','groen','yeşil','zielony','zelená','zöld'], '#1A6622'],
  [['vert foncé','dark green','dunkelgrün','verde scuro','verde oscuro'], '#0A3311'],
  [['vert kaki','khaki green','khaki','verde kaki'], '#4A5522'],
  [['vert olive','olive green','olivgrün','verde oliva'], '#5A6022'],
  [['jaune','yellow','gelb','giallo','amarillo','geel','sarı','żółty','žlutá','sárga'], '#DDAA00'],
  [['jaune vif','bright yellow','leuchtgelb','giallo vivo'], '#FFD700'],
  [['orange','oranje','turuncu','pomarańczowy','oranžová','narancssárga'], '#DD6600'],
  [['marron','brown','braun','marrone','marrón','bruin','kahverengi','brązowy'], '#6A3A20'],
  [['beige','crème','cream','elfenbein','avorio','marfil','beige','krem'], '#CCAA88'],
  [['sable','sand','sandfarben','sabbia','arena','zand'], '#C0A070'],
  [['violet','purple','lila','viola','morado','paars','mor','fioletowy','fialová','lila'], '#660088'],
  [['mauve','malve','malva','morado claro','lichtpaars'], '#8844AA'],
  [['rose','pink','rosa','rosa','roos','pembe','różowy','růžová','rózsaszín'], '#DD4488'],
  [['or','gold','gold','oro','oro','goud','altın','złoty','zlatá','arany'], '#B89020'],
  [['doré','champagne','golden','champagner','champagne'], '#C8A840'],
  [['bronze','kupfer','bronzo','bronce','koper'], '#886030'],
  [['titane','titanium','titan','titanio'], '#7A7A88'],
  [['nacré','pearlescent','perlmutt','madreperla','nacarado'], '#E8E4DA'],
  [['métallisé','metallic','metallik','metallizzato','metalizado'], '#A8A8A8'],
];

export function parseColor(raw?: string): string {
  if (!raw) return '#2A3855';
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const [keys, hex] of COLOR_TABLE) {
    if (keys.some(k => s.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))) return hex;
  }
  if (/^#[0-9a-fA-F]{3,6}$/.test(raw)) return raw;
  return '#2A3855';
}

// Assombrir légèrement pour le rendu véhicule (fenêtres, détails)
export function darken(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 255) * (1 - amount)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── Le mapper principal ──────────────────────────────────────
// brand (lowercase) → fragments de modèle (lowercase) → BodyStyle
const BODY_MAP: Record<string, [string, BodyStyle][]> = {
  'volkswagen': [
    ['polo gti','hatchback_5'],['polo','hatchback_5'],
    ['golf gti','hatchback_5'],['golf r','hatchback_5'],['golf variant','estate'],['golf','hatchback_5'],
    ['passat alltrack','estate'],['passat variant','estate'],['passat','sedan'],
    ['arteon shooting','estate'],['arteon','coupe'],
    ['tiguan allspace','suv_large'],['tiguan','suv_medium'],
    ['touareg','suv_large'],['t-roc','suv_small'],['t-cross','suv_small'],
    ['id.7','sedan'],['id.5','suv_medium'],['id.4','suv_medium'],['id.3','hatchback_5'],
    ['touran','mpv'],['sharan','mpv'],
    ['caddy','van_small'],['transporter','van_medium'],['multivan','minivan'],
    ['crafter','van_large'],['amarok','pickup'],
    ['up','hatchback_3'],['beetle','hatchback_3'],['scirocco','coupe'],
  ],
  'audi': [
    ['a1 sportback','hatchback_5'],['a1','hatchback_3'],
    ['a3 cabriolet','convertible'],['a3 sedan','sedan'],['a3 sportback','hatchback_5'],['a3','hatchback_5'],
    ['a4 allroad','estate'],['a4 avant','estate'],['a4','sedan'],
    ['a5 cabriolet','convertible'],['a5 sportback','hatchback_5'],['a5','coupe'],
    ['a6 allroad','estate'],['a6 avant','estate'],['a6','sedan'],
    ['a7','hatchback_5'],['a8','sedan'],
    ['q2','suv_small'],['q3 sportback','suv_small'],['q3','suv_small'],
    ['q5 sportback','suv_medium'],['q5','suv_medium'],
    ['q7','suv_large'],['q8','suv_large'],
    ['tt roadster','convertible'],['tt','coupe'],
    ['r8','coupe'],['e-tron gt','sedan'],
    ['rs3','sedan'],['rs4','estate'],['rs5','coupe'],['rs6','estate'],['rs7','hatchback_5'],
    ['s3','hatchback_5'],['s4','sedan'],['s5','coupe'],
  ],
  'bmw': [
    ['1 series','hatchback_5'],['116','hatchback_5'],['118','hatchback_5'],['120','hatchback_5'],
    ['2 gran coupe','sedan'],['2 series','coupe'],['218','coupe'],['220','coupe'],['228','coupe'],
    ['3 touring','estate'],['316','sedan'],['318','sedan'],['320','sedan'],['330','sedan'],['340','sedan'],
    ['4 gran coupe','sedan'],['4 series','coupe'],['420','coupe'],['430','coupe'],['440','coupe'],
    ['5 touring','estate'],['518','sedan'],['520','sedan'],['530','sedan'],['540','sedan'],['550','sedan'],
    ['6 gran turismo','hatchback_5'],['6 series','coupe'],
    ['7 series','sedan'],['730','sedan'],['740','sedan'],['750','sedan'],['760','sedan'],
    ['8 series','coupe'],['m2','coupe'],['m3','sedan'],['m4','coupe'],['m5','sedan'],['m8','coupe'],
    ['x1','suv_small'],['x2','suv_small'],['x3','suv_medium'],
    ['x4','suv_medium'],['x5','suv_large'],['x6','suv_large'],['x7','suv_large'],
    ['z4','convertible'],['i3','hatchback_5'],['i4','sedan'],['i7','sedan'],['ix','suv_large'],['ix3','suv_medium'],
  ],
  'mercedes': [
    ['a klasse','hatchback_5'],['a-klasse','hatchback_5'],['a class','hatchback_5'],['a 180','hatchback_5'],['a 200','hatchback_5'],
    ['b klasse','mpv'],['b-klasse','mpv'],['b class','mpv'],['b 180','mpv'],
    ['c klasse coupe','coupe'],['c klasse t','estate'],['c klasse','sedan'],
    ['c-klasse coupe','coupe'],['c-klasse t-modell','estate'],['c-klasse','sedan'],
    ['c class estate','estate'],['c class coupe','coupe'],['c class','sedan'],
    ['c 180','sedan'],['c 200','sedan'],['c 220','sedan'],['c 300','sedan'],
    ['e klasse coupe','coupe'],['e klasse t','estate'],['e klasse','sedan'],
    ['e-klasse','sedan'],['e class','sedan'],['e 200','sedan'],['e 220','sedan'],
    ['s klasse','sedan'],['s-klasse','sedan'],['s class','sedan'],
    ['cla shooting','estate'],['cla','coupe'],
    ['cls','coupe'],['amg gt','coupe'],['slk','convertible'],['slc','convertible'],['sl','convertible'],
    ['gla','suv_small'],['glb','suv_small'],['glc coupe','suv_medium'],['glc','suv_medium'],
    ['gle coupe','suv_large'],['gle','suv_large'],['gls','suv_large'],['g-klasse','suv_large'],['g class','suv_large'],
    ['v-klasse','minivan'],['v klasse','minivan'],['vito','van_medium'],['sprinter','van_large'],
    ['citan','van_small'],['eqc','suv_medium'],['eqa','suv_small'],['eqb','suv_small'],['eqs','sedan'],['eqe','sedan'],
  ],
  'peugeot': [
    ['108','hatchback_3'],['208','hatchback_5'],['308 sw','estate'],['308','hatchback_5'],
    ['408','hatchback_5'],['508 sw','estate'],['508','sedan'],
    ['2008','suv_small'],['3008','suv_medium'],['5008','suv_large'],
    ['partner','van_small'],['rifter','van_small'],['traveller','minivan'],
    ['expert','van_medium'],['boxer','van_large'],
    ['e-208','hatchback_5'],['e-2008','suv_small'],
    ['rcz','coupe'],['ion','hatchback_5'],
  ],
  'renault': [
    ['twingo','hatchback_3'],['clio','hatchback_5'],['megane estate','estate'],
    ['megane','hatchback_5'],['laguna','hatchback_5'],['talisman','sedan'],
    ['zoe','hatchback_5'],['captur','suv_small'],['kadjar','suv_medium'],
    ['koleos','suv_large'],['arkana','suv_medium'],['austral','suv_medium'],
    ['kangoo','van_small'],['trafic','van_medium'],['master','van_large'],
    ['espace','mpv'],['scenic','mpv'],['grand scenic','mpv'],
    ['fluence','sedan'],['latitude','sedan'],['modus','mpv'],
  ],
  'citroen': [
    ['c1','hatchback_3'],['c3','hatchback_5'],['c4 cactus','suv_small'],
    ['c4 picasso','mpv'],['c4','hatchback_5'],['c5 aircross','suv_medium'],
    ['c5 x','suv_medium'],['c5','sedan'],['c3 aircross','suv_small'],
    ['berlingo','van_small'],['dispatch','van_medium'],['relay','van_large'],
    ['e-c4','hatchback_5'],['ami','hatchback_3'],
  ],
  'fiat': [
    ['500','hatchback_3'],['500x','suv_small'],['500l','mpv'],['500e','hatchback_3'],
    ['punto','hatchback_5'],['tipo hatchback','hatchback_5'],['tipo station','estate'],['tipo','sedan'],
    ['grande punto','hatchback_5'],['bravo','hatchback_5'],
    ['panda','hatchback_5'],['stilo','hatchback_5'],
    ['doblo','van_small'],['ducato','van_large'],['fiorino','van_small'],
    ['talento','van_medium'],['fullback','pickup'],
  ],
  'toyota': [
    ['aygo','hatchback_3'],['yaris cross','suv_small'],['yaris','hatchback_5'],
    ['corolla touring','estate'],['corolla','hatchback_5'],
    ['camry','sedan'],['avensis','sedan'],['verso','mpv'],
    ['c-hr','suv_small'],['rav4','suv_medium'],['land cruiser','suv_large'],
    ['highlander','suv_large'],['prius','hatchback_5'],['auris','hatchback_5'],
    ['hilux','pickup'],['proace verso','minivan'],['proace','van_medium'],
    ['supra','coupe'],['gr86','coupe'],['gr yaris','hatchback_5'],
    ['mirai','sedan'],['bz4x','suv_medium'],
  ],
  'honda': [
    ['jazz','hatchback_5'],['civic','hatchback_5'],['accord','sedan'],
    ['cr-v','suv_medium'],['hr-v','suv_small'],['zr-v','suv_medium'],
    ['e','hatchback_5'],['fr-v','mpv'],['legend','sedan'],
    ['cb125','moto_naked'],['cb500','moto_naked'],['cb650','moto_naked'],['cb1000','moto_naked'],
    ['cbr500','moto_sport'],['cbr650','moto_sport'],['cbr1000','moto_sport'],
    ['hornet','moto_naked'],['africa twin','moto_touring'],
    ['pcx','scooter'],['forza','scooter'],['sh','scooter'],['x-adv','scooter'],
  ],
  'nissan': [
    ['micra','hatchback_5'],['note','hatchback_5'],['leaf','hatchback_5'],
    ['juke','suv_small'],['qashqai','suv_medium'],['x-trail','suv_large'],
    ['murano','suv_large'],['pathfinder','suv_large'],
    ['370z','coupe'],['gt-r','coupe'],['ariya','suv_medium'],
    ['nv200','van_small'],['navara','pickup'],['primastar','van_medium'],
  ],
  'hyundai': [
    ['i10','hatchback_5'],['i20','hatchback_5'],['i30 fastback','sedan'],
    ['i30 wagon','estate'],['i30','hatchback_5'],['i40','sedan'],
    ['bayon','suv_small'],['kona','suv_small'],['tucson','suv_medium'],
    ['santa fe','suv_large'],['ioniq 5','suv_medium'],['ioniq 6','sedan'],
    ['nexo','suv_medium'],['staria','minivan'],
    ['h1','minivan'],['h350','van_large'],['hd35','van_medium'],
  ],
  'kia': [
    ['picanto','hatchback_3'],['rio','hatchback_5'],['ceed','hatchback_5'],
    ['proceed','estate'],['ceed sportswagon','estate'],
    ['xceed','suv_small'],['stonic','suv_small'],['niro','suv_small'],
    ['sportage','suv_medium'],['sorento','suv_large'],
    ['stinger','sedan'],['ev6','suv_medium'],['ev9','suv_large'],
    ['soul','hatchback_5'],['venga','mpv'],
  ],
  'skoda': [
    ['fabia','hatchback_5'],['rapid','sedan'],['octavia combi','estate'],
    ['octavia','hatchback_5'],['superb comvar','estate'],['superb','sedan'],
    ['kamiq','suv_small'],['karoq','suv_medium'],['kodiaq','suv_large'],
    ['enyaq','suv_medium'],['scala','hatchback_5'],
    ['citygo','hatchback_3'],['roomster','mpv'],['yeti','suv_medium'],
  ],
  'seat': [
    ['mii','hatchback_3'],['ibiza','hatchback_5'],['leon sportstourer','estate'],
    ['leon','hatchback_5'],['toledo','sedan'],
    ['arona','suv_small'],['ateca','suv_medium'],['tarraco','suv_large'],
    ['alhambra','mpv'],['exeo','sedan'],
    ['cupra formentor','suv_medium'],['cupra born','hatchback_5'],['cupra leon','hatchback_5'],
  ],
  'cupra': [
    ['formentor','suv_medium'],['born','hatchback_5'],['leon','hatchback_5'],['ateca','suv_medium'],
  ],
  'opel': [
    ['karl','hatchback_5'],['adam','hatchback_3'],['corsa','hatchback_5'],
    ['astra sports tourer','estate'],['astra','hatchback_5'],
    ['insignia country','estate'],['insignia sports tourer','estate'],['insignia','sedan'],
    ['crossland','suv_small'],['grandland','suv_medium'],['mokka','suv_small'],
    ['zafira','mpv'],['meriva','mpv'],['combo','van_small'],
    ['vivaro','van_medium'],['movano','van_large'],
    ['ampera','hatchback_5'],['manta','coupe'],['cascada','convertible'],
  ],
  'vauxhall': [
    ['corsa','hatchback_5'],['astra','hatchback_5'],['insignia','sedan'],
    ['mokka','suv_small'],['grandland','suv_medium'],['crossland','suv_small'],
    ['combo','van_small'],['vivaro','van_medium'],['movano','van_large'],
    ['zafira','mpv'],
  ],
  'ford': [
    ['ka','hatchback_3'],['fiesta','hatchback_5'],['focus estate','estate'],
    ['focus','hatchback_5'],['mondeo estate','estate'],['mondeo','sedan'],
    ['mustang mach-e','suv_large'],['mustang','coupe'],
    ['puma','suv_small'],['kuga','suv_medium'],['edge','suv_large'],['explorer','suv_large'],
    ['s-max','mpv'],['galaxy','mpv'],['b-max','mpv'],
    ['transit courier','van_small'],['transit connect','van_small'],
    ['transit custom','van_medium'],['transit','van_large'],
    ['ranger','pickup'],['maverick','pickup'],['f-150','pickup'],
    ['tourneo courier','van_small'],['tourneo connect','van_small'],['tourneo custom','minivan'],
  ],
  'volvo': [
    ['c30','hatchback_3'],['c40','suv_medium'],['c70','convertible'],
    ['v40','hatchback_5'],['v60 cross','estate'],['v60','estate'],
    ['v90 cross','estate'],['v90','estate'],
    ['s40','sedan'],['s60','sedan'],['s90','sedan'],
    ['xc40','suv_small'],['xc60','suv_medium'],['xc90','suv_large'],
    ['ex40','suv_small'],['ex90','suv_large'],
  ],
  'jaguar': [
    ['xe','sedan'],['xf sportbrake','estate'],['xf','sedan'],['xj','sedan'],
    ['e-pace','suv_small'],['f-pace','suv_medium'],['i-pace','suv_medium'],
    ['f-type','coupe'],
  ],
  'land rover': [
    ['defender','suv_large'],['discovery sport','suv_medium'],['discovery','suv_large'],
    ['range rover evoque','suv_small'],['range rover velar','suv_medium'],
    ['range rover sport','suv_large'],['range rover','suv_large'],['freelander','suv_medium'],
  ],
  'mini': [
    ['mini countryman','suv_small'],['mini clubman','estate'],['mini cabrio','convertible'],
    ['mini paceman','suv_small'],['mini coupe','coupe'],
    ['mini','hatchback_3'],
  ],
  'porsche': [
    ['macan','suv_medium'],['cayenne coupe','suv_large'],['cayenne','suv_large'],
    ['taycan cross turismo','estate'],['taycan','sedan'],
    ['911','coupe'],['718 boxster','convertible'],['718 cayman','coupe'],
    ['panamera sport turismo','estate'],['panamera','sedan'],
  ],
  'alfa romeo': [
    ['mito','hatchback_3'],['giulietta','hatchback_5'],['giulia','sedan'],
    ['stelvio','suv_medium'],['tonale','suv_small'],['brennero','suv_small'],
    ['147','hatchback_5'],['156','sedan'],['166','sedan'],['brera','coupe'],
  ],
  'lancia': [
    ['ypsilon','hatchback_5'],['delta','hatchback_5'],['musa','mpv'],
  ],
  'jeep': [
    ['renegade','suv_small'],['compass','suv_medium'],['cherokee','suv_medium'],
    ['grand cherokee','suv_large'],['wrangler','suv_large'],['gladiator','pickup'],
    ['avenger','suv_small'],
  ],
  'dodge': [
    ['challenger','coupe'],['charger','sedan'],['durango','suv_large'],
    ['ram','pickup'],['ram 1500','pickup'],
  ],
  'chevrolet': [
    ['spark','hatchback_5'],['aveo','hatchback_5'],['cruze','sedan'],
    ['malibu','sedan'],['camaro','coupe'],['corvette','coupe'],
    ['equinox','suv_medium'],['blazer','suv_medium'],['tahoe','suv_large'],
    ['silverado','pickup'],['colorado','pickup'],
    ['express','van_large'],
  ],
  'tesla': [
    ['model 3','sedan'],['model s','sedan'],['model x','suv_large'],
    ['model y','suv_medium'],['cybertruck','pickup'],
    ['roadster','convertible'],
  ],
  'lexus': [
    ['ct','hatchback_5'],['is','sedan'],['es','sedan'],['gs','sedan'],['ls','sedan'],
    ['ux','suv_small'],['nx','suv_medium'],['rx','suv_large'],['gx','suv_large'],['lx','suv_large'],
    ['lc','coupe'],['rc','coupe'],
  ],
  'infiniti': [
    ['q30','hatchback_5'],['q50','sedan'],['q60','coupe'],['q70','sedan'],
    ['qx30','suv_small'],['qx50','suv_medium'],['qx60','suv_large'],['qx80','suv_large'],
  ],
  'mazda': [
    ['mazda2','hatchback_5'],['mazda3 fastback','hatchback_5'],['mazda3','sedan'],
    ['mazda6 wagon','estate'],['mazda6','sedan'],
    ['cx-3','suv_small'],['cx-30','suv_small'],['cx-5','suv_medium'],
    ['cx-60','suv_large'],['cx-9','suv_large'],
    ['mx-5','convertible'],['rx-8','coupe'],['mx-30','hatchback_5'],
  ],
  'subaru': [
    ['impreza','hatchback_5'],['wrx','sedan'],
    ['legacy','estate'],['outback','estate'],['forester','suv_medium'],
    ['xv','suv_small'],['crosstrek','suv_small'],['ascent','suv_large'],['solterra','suv_medium'],
    ['brz','coupe'],['levorg','estate'],
  ],
  'mitsubishi': [
    ['colt','hatchback_5'],['lancer','sedan'],['galant','sedan'],
    ['eclipse cross','suv_medium'],['asx','suv_small'],['outlander','suv_large'],
    ['pajero','suv_large'],['l200','pickup'],['space star','hatchback_5'],
  ],
  'suzuki': [
    ['alto','hatchback_5'],['swift','hatchback_5'],['baleno','hatchback_5'],
    ['sx4 s-cross','suv_small'],['vitara','suv_small'],['grand vitara','suv_medium'],
    ['jimny','suv_small'],['ignis','suv_small'],['swace','estate'],
    ['gsx-r','moto_sport'],['gsf','moto_naked'],['dl650','moto_touring'],['v-strom','moto_touring'],
  ],
  'dacia': [
    ['sandero stepway','suv_small'],['sandero','hatchback_5'],
    ['logan mcv','estate'],['logan','sedan'],
    ['duster','suv_medium'],['jogger','estate'],['spring','hatchback_5'],
    ['lodgy','mpv'],['dokker','van_small'],
  ],
  'smart': [
    ['fortwo','hatchback_3'],['forfour','hatchback_5'],['#1','suv_small'],['#3','suv_small'],
  ],
  'genesis': [
    ['g70','sedan'],['g80','sedan'],['g90','sedan'],
    ['gv60','suv_medium'],['gv70','suv_medium'],['gv80','suv_large'],
  ],
  // ── MOTOS ─────────────────────────────────────────────────
  'yamaha': [
    ['mt-03','moto_naked'],['mt-07','moto_naked'],['mt-09','moto_naked'],['mt-10','moto_naked'],
    ['yzf-r3','moto_sport'],['yzf-r6','moto_sport'],['yzf-r7','moto_sport'],['yzf-r1','moto_sport'],
    ['tracer 700','moto_touring'],['tracer 9','moto_touring'],
    ['tenere 700','moto_touring'],['super tenere','moto_touring'],
    ['x-max','scooter'],['nmax','scooter'],['tmax','scooter'],['xenter','scooter'],
    ['aerox','scooter'],
  ],
  'kawasaki': [
    ['z400','moto_naked'],['z650','moto_naked'],['z900','moto_naked'],['z1000','moto_naked'],
    ['ninja 400','moto_sport'],['ninja 650','moto_sport'],['ninja zx-6r','moto_sport'],['ninja zx-10r','moto_sport'],
    ['versys 650','moto_touring'],['versys 1000','moto_touring'],['vulcan','moto_touring'],
    ['w800','moto_naked'],['z900rs','moto_naked'],
  ],
  'ducati': [
    ['panigale','moto_sport'],['streetfighter','moto_naked'],
    ['monster','moto_naked'],['hypermotard','moto_naked'],
    ['multistrada','moto_touring'],['diavel','moto_naked'],
    ['scrambler','moto_naked'],['supersport','moto_sport'],
    ['desert sled','moto_touring'],
  ],
  'bmw motorrad': [
    ['s1000rr','moto_sport'],['s1000r','moto_naked'],['s1000xr','moto_touring'],
    ['m1000','moto_sport'],
    ['r1250gs','moto_touring'],['r1250r','moto_naked'],['r1250rt','moto_touring'],
    ['f850gs','moto_touring'],['f750gs','moto_touring'],['f900r','moto_naked'],
    ['g310r','moto_naked'],['g310gs','moto_touring'],
    ['k1600','moto_touring'],['r18','moto_naked'],['ce04','scooter'],
  ],
  'ktm': [
    ['duke 390','moto_naked'],['duke 690','moto_naked'],['duke 790','moto_naked'],['duke 890','moto_naked'],
    ['rc 390','moto_sport'],['rc 8c','moto_sport'],
    ['adventure','moto_touring'],['890 adventure','moto_touring'],['1290 super adventure','moto_touring'],
    ['smcr','moto_naked'],
  ],
  'triumph': [
    ['street triple','moto_naked'],['speed triple','moto_naked'],['tiger 660','moto_touring'],
    ['tiger 900','moto_touring'],['tiger 1200','moto_touring'],
    ['daytona','moto_sport'],['trident','moto_naked'],['scrambler','moto_naked'],
    ['thunderbird','moto_touring'],['bonneville','moto_naked'],['street twin','moto_naked'],
  ],
  'harley-davidson': [
    ['sportster','moto_naked'],['iron','moto_naked'],['nightster','moto_naked'],
    ['softail','moto_touring'],['fat boy','moto_touring'],['street glide','moto_touring'],
    ['road king','moto_touring'],['low rider','moto_naked'],['pan america','moto_touring'],
    ['livewire','moto_naked'],
  ],
  'piaggio': [
    ['vespa','scooter'],['liberty','scooter'],['mp3','scooter'],
    ['beverly','scooter'],['medley','scooter'],
  ],
  'kymco': [
    ['xciting','scooter'],['ak 550','scooter'],['people','scooter'],['agility','scooter'],
    ['like','scooter'],['downtown','scooter'],
  ],
  // ── CAMIONS ───────────────────────────────────────────────
  'iveco': [
    ['daily','van_large'],['eurocargo','truck_rigid'],['stralis','truck_semi'],
    ['trakker','truck_rigid'],['s-way','truck_semi'],['x-way','truck_rigid'],
  ],
  'man': [
    ['tge','van_large'],['tgl','truck_rigid'],['tgm','truck_rigid'],
    ['tgx','truck_semi'],['tgs','truck_rigid'],
  ],
  'mercedes-benz trucks': [
    ['actros','truck_semi'],['arocs','truck_rigid'],['atego','truck_rigid'],
    ['antos','truck_rigid'],
  ],
  'daf': [
    ['xf','truck_semi'],['xg','truck_semi'],['cf','truck_semi'],['lf','truck_rigid'],
  ],
  'volvo trucks': [
    ['fh','truck_semi'],['fm','truck_semi'],['fl','truck_rigid'],['fe','truck_rigid'],
  ],
  'renault trucks': [
    ['t','truck_semi'],['c','truck_rigid'],['k','truck_rigid'],['d','truck_rigid'],
  ],
  'scania': [
    ['r series','truck_semi'],['s series','truck_semi'],['p series','truck_rigid'],['g series','truck_rigid'],
  ],
  // ── BUS ───────────────────────────────────────────────────
  'setra': [['s','bus']],
  'daimler buses': [['citaro','bus'],['o','bus']],
  'van hool': [['a','bus'],['tx','bus'],['ex','bus']],
  'neoplan': [['tourliner','bus'],['cityliner','bus'],['starliner','bus']],
  // ── MARQUES ASIATIQUES / AUTRES MARCHÉS ──────────────────
  'tata': [
    ['nexon','suv_small'],['harrier','suv_medium'],['safari','suv_large'],
    ['tiago','hatchback_5'],['tigor','sedan'],['altroz','hatchback_5'],
    ['ace','van_small'],['prima','truck_rigid'],
  ],
  'mahindra': [
    ['thar','suv_large'],['xuv700','suv_large'],['xuv300','suv_small'],
    ['scorpio','suv_large'],['bolero','suv_medium'],['marazzo','mpv'],
  ],
  'haval': [
    ['h6','suv_medium'],['jolion','suv_small'],['h9','suv_large'],['dargo','suv_medium'],
  ],
  'byd': [
    ['atto 3','suv_medium'],['dolphin','hatchback_5'],['han','sedan'],
    ['seal','sedan'],['tang','suv_large'],['song','suv_medium'],
  ],
  'mg': [
    ['mg3','hatchback_5'],['mg4','hatchback_5'],['mg5','estate'],
    ['zs','suv_small'],['hs','suv_medium'],['rx5','suv_medium'],
    ['cyberster','convertible'],
  ],
  'geely': [
    ['coolray','suv_small'],['atlas','suv_medium'],['tugella','suv_medium'],
  ],
  'chery': [
    ['tiggo 4','suv_small'],['tiggo 7','suv_medium'],['tiggo 8','suv_large'],
    ['arrizo','sedan'],
  ],
};

// Alias de marques (abréviations, variations orthographiques)
const BRAND_ALIASES: Record<string, string> = {
  'vw': 'volkswagen', 'merc': 'mercedes', 'mb': 'mercedes',
  'mercedes benz': 'mercedes', 'mercedes-benz': 'mercedes',
  'bmw m': 'bmw', 'alfa': 'alfa romeo',
  'land-rover': 'land rover', 'landrover': 'land rover',
  'range rover': 'land rover',
  'harley': 'harley-davidson', 'hd': 'harley-davidson',
  'triumph motorcycles': 'triumph',
  'ktm ag': 'ktm', 'ducati motor': 'ducati',
  'bmw motorrad': 'bmw motorrad',
  'chevrolet': 'chevrolet', 'chevy': 'chevrolet',
  'citroën': 'citroen', 'citroën': 'citroen',
};

function normalizeBrand(raw: string): string {
  const s = raw.toLowerCase().trim();
  return BRAND_ALIASES[s] ?? s;
}

function normalizeModel(raw: string): string {
  return raw.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[éèê]/g, 'e')
    .replace(/[àâ]/g, 'a')
    .replace(/[üù]/g, 'u')
    .replace(/[öô]/g, 'o');
}

// Heuristique fallback si modèle non trouvé
function guessFromModelName(model: string): BodyStyle {
  const m = model.toLowerCase();
  if (m.includes('combi') || m.includes('touring') || m.includes('variant') || m.includes(' sw') || m.includes('avant') || m.includes('break') || m.includes('estate') || m.includes('wagon')) return 'estate';
  if (m.includes('cabrio') || m.includes('convertible') || m.includes('roadster') || m.includes('spider') || m.includes('spyder')) return 'convertible';
  if (m.includes('coupe') || m.includes('coupé') || m.includes('fastback')) return 'coupe';
  if (m.includes('suv') || m.includes('crossover') || m.includes('4x4')) return 'suv_medium';
  if (m.includes('pickup') || m.includes('pick-up') || m.includes('navara') || m.includes('hilux') || m.includes('ranger') || m.includes('l200')) return 'pickup';
  if (m.includes('van') || m.includes('fourgon') || m.includes('cargo') || m.includes('transporter')) return 'van_medium';
  if (m.includes('bus') || m.includes('autocar') || m.includes('autobus')) return 'bus';
  if (m.includes('tram')) return 'tram';
  if (m.includes('moto') || m.includes('gsx') || m.includes('cbr') || m.includes('yzf') || m.includes('ninja')) return 'moto_naked';
  if (m.includes('scooter') || m.includes('vespa') || m.includes('nmax') || m.includes('tmax')) return 'scooter';
  if (m.includes('velo') || m.includes('vélo') || m.includes('bike') || m.includes('cycle')) return 'bicycle';
  return 'hatchback_5'; // défaut raisonnable
}

export interface VehicleIdentity {
  bodyStyle: BodyStyle;
  bodyColor: string;       // hex
  bodyColorDark: string;   // hex assombri pour détails
  confidence: 'exact' | 'heuristic' | 'fallback';
  label: string;           // ex: "Berline 4 portes"
}

export const BODY_STYLE_LABELS: Record<BodyStyle, string> = {
  hatchback_3: 'Compacte 3 portes', hatchback_5: 'Compacte 5 portes',
  sedan: 'Berline 4 portes', coupe: 'Coupé',
  convertible: 'Cabriolet', estate: 'Break / Familiale',
  suv_small: 'SUV compact', suv_medium: 'SUV intermédiaire', suv_large: 'Grand SUV',
  mpv: 'Monospace', minivan: 'Minivan', pickup: 'Pick-up',
  van_small: 'Utilitaire léger', van_medium: 'Fourgon moyen', van_large: 'Grand fourgon',
  moto_naked: 'Moto roadster', moto_sport: 'Moto sportive', moto_touring: 'Moto touring',
  scooter: 'Scooter', bicycle: 'Vélo', escooter: 'Trottinette électrique',
  truck_rigid: 'Camion porteur', truck_semi: 'Semi-remorque',
  bus: 'Bus / Autocar', tram: 'Tramway / Train',
  pedestrian: 'Piéton', unknown: 'Véhicule',
};

export function identifyVehicle(brand?: string, model?: string, color?: string): VehicleIdentity {
  const colorHex = parseColor(color);
  const darkHex  = darken(colorHex, 0.38);

  if (!brand && !model) {
    return { bodyStyle: 'unknown', bodyColor: colorHex, bodyColorDark: darkHex, confidence: 'fallback', label: 'Véhicule' };
  }

  const normBrand = normalizeBrand(brand ?? '');
  const normModel = normalizeModel(model ?? '');

  // 1. Lookup exact dans la table
  const brandEntries = BODY_MAP[normBrand];
  if (brandEntries) {
    for (const [fragment, style] of brandEntries) {
      if (normModel.includes(fragment)) {
        return {
          bodyStyle: style,
          bodyColor: colorHex,
          bodyColorDark: darkHex,
          confidence: 'exact',
          label: BODY_STYLE_LABELS[style],
        };
      }
    }
    // Marque trouvée mais modèle non → heuristique sur le modèle
    const style = guessFromModelName(normModel);
    return { bodyStyle: style, bodyColor: colorHex, bodyColorDark: darkHex, confidence: 'heuristic', label: BODY_STYLE_LABELS[style] };
  }

  // 2. Heuristique sur le modèle seul
  const style = guessFromModelName(normModel || brand || '');
  return { bodyStyle: style, bodyColor: colorHex, bodyColorDark: darkHex, confidence: 'heuristic', label: BODY_STYLE_LABELS[style] };
}
