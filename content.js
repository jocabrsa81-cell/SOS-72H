// Estrutura dos conteúdos (sem textos). Os textos vêm de lang-xx.js e são aplicados por applyContent().
// Quem importa NUMBERS, GUIDES, etc. recebe sempre a versão na língua atual (ligações "live" dos módulos ES).

const BASE = {
 "numbers": [
  {
   "flag": "LU",
   "r": "lu",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "113"
    },
    {
     "n": "80025500",
     "d": "8002 5500"
    },
    {
     "n": "454545",
     "d": "45 45 45"
    }
   ]
  },
  {
   "flag": "FR",
   "r": "lu",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "15"
    },
    {
     "n": "17"
    },
    {
     "n": "18"
    },
    {
     "n": "114",
     "sms": true
    },
    {
     "n": "0383225050",
     "d": "03 83 22 50 50"
    }
   ]
  },
  {
   "flag": "DE",
   "r": "lu",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "110"
    },
    {
     "n": "0613119240",
     "d": "06131 19240"
    }
   ]
  },
  {
   "flag": "BE",
   "r": "lu",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "101"
    },
    {
     "n": "070245245",
     "d": "070 245 245"
    }
   ]
  },
  {
   "flag": "PT",
   "r": "pt",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "808242424",
     "d": "808 24 24 24"
    },
    {
     "n": "800250250",
     "d": "800 250 250"
    },
    {
     "n": "808200520",
     "d": "808 200 520"
    },
    {
     "n": "144"
    },
    {
     "n": "213544545",
     "d": "21 354 45 45"
    }
   ]
  },
  {
   "flag": "ES",
   "r": "pt",
   "items": [
    {
     "n": "112"
    },
    {
     "n": "091"
    },
    {
     "n": "062"
    },
    {
     "n": "915620420",
     "d": "91 562 04 20"
    }
   ]
  }
 ],
 "nearby": [
  {
   "id": "hospital",
   "icon": "alert"
  },
  {
   "id": "pharmacy",
   "icon": "kit"
  },
  {
   "id": "fuel",
   "icon": "battery"
  },
  {
   "id": "police",
   "icon": "phone"
  },
  {
   "id": "water",
   "icon": "water"
  }
 ],
 "guides": [
  {
   "id": "bleeding",
   "kind": "aid",
   "icon": "alert",
   "call": true
  },
  {
   "id": "recovery",
   "kind": "aid",
   "icon": "alert",
   "call": true
  },
  {
   "id": "cpr",
   "kind": "aid",
   "icon": "alert",
   "call": true,
   "extra": "metronome"
  },
  {
   "id": "choking",
   "kind": "aid",
   "icon": "alert"
  },
  {
   "id": "burn",
   "kind": "aid",
   "icon": "alert"
  },
  {
   "id": "hypothermia",
   "kind": "aid",
   "icon": "alert"
  },
  {
   "id": "heatstroke",
   "kind": "aid",
   "icon": "alert",
   "call": true
  },
  {
   "id": "fracture",
   "kind": "aid",
   "icon": "alert"
  },
  {
   "id": "stroke",
   "kind": "aid",
   "icon": "alert",
   "call": true
  },
  {
   "id": "poison",
   "kind": "aid",
   "icon": "alert",
   "sr": {
    "1": "lu",
    "2": "pt"
   }
  },
  {
   "id": "sirens",
   "kind": "proc",
   "icon": "siren",
   "r": "lu"
  },
  {
   "id": "nuclear",
   "kind": "proc",
   "icon": "siren",
   "r": "lu"
  },
  {
   "id": "chemical",
   "kind": "proc",
   "icon": "siren"
  },
  {
   "id": "fire",
   "kind": "proc",
   "icon": "alert",
   "call": true
  },
  {
   "id": "gas",
   "kind": "proc",
   "icon": "alert"
  },
  {
   "id": "blackout",
   "kind": "proc",
   "icon": "torch"
  },
  {
   "id": "flood",
   "kind": "proc",
   "icon": "water",
   "sr": {
    "3": "lu",
    "4": "pt"
   }
  },
  {
   "id": "storm",
   "kind": "proc",
   "icon": "alert"
  },
  {
   "id": "heatwave",
   "kind": "proc",
   "icon": "alert"
  },
  {
   "id": "evacuate",
   "kind": "proc",
   "icon": "pin"
  },
  {
   "id": "nowater",
   "kind": "proc",
   "icon": "water"
  },
  {
   "id": "alertspt",
   "kind": "proc",
   "icon": "siren",
   "r": "pt"
  },
  {
   "id": "wildfire",
   "kind": "proc",
   "icon": "alert",
   "call": true
  },
  {
   "id": "earthquake",
   "kind": "proc",
   "icon": "alert",
   "r": "pt"
  },
  {
   "id": "tsunami",
   "kind": "proc",
   "icon": "water",
   "r": "pt"
  },
  {
   "id": "campfire",
   "kind": "skill",
   "icon": "flame"
  },
  {
   "id": "bowline",
   "kind": "skill",
   "icon": "knot"
  },
  {
   "id": "reefknot",
   "kind": "skill",
   "icon": "knot"
  },
  {
   "id": "clovehitch",
   "kind": "skill",
   "icon": "knot"
  },
  {
   "id": "tautline",
   "kind": "skill",
   "icon": "knot"
  },
  {
   "id": "purifywater",
   "kind": "skill",
   "icon": "water"
  },
  {
   "id": "shelter",
   "kind": "skill",
   "icon": "tent"
  },
  {
   "id": "rescuesignals",
   "kind": "skill",
   "icon": "sos"
  },
  {
   "id": "navigate",
   "kind": "skill",
   "icon": "compass"
  },
  {
   "id": "toilet",
   "kind": "skill",
   "icon": "trash"
  },
  {
   "id": "shutoff",
   "kind": "skill",
   "icon": "tools"
  },
  {
   "id": "chargephone",
   "kind": "skill",
   "icon": "battery"
  }
 ]
};

const KIT_BASE = [
  { id: 'water', cat: 'water', q: (p, d, s) => ({ n: Math.ceil(p * d * s.waterPerPerson + s.pets * d * s.waterPerPet), u: 'L' }) },
  { id: 'purify', cat: 'water', l: ['Pastilhas ou filtro para purificar água', 'Pastilles ou filtre de purification', 'Wasserentkeimungstabletten oder Filter', 'Water purification tablets or filter', 'Pastillas o filtro para potabilizar agua'] },
  { id: 'food', cat: 'food', q: (p, d, s) => ({ n: p * d * s.kcalPerPerson, u: 'kcal' }) },
  { id: 'opener', cat: 'food', l: ['Abre-latas manual', 'Ouvre-boîte manuel', 'Manueller Dosenöffner', 'Manual can opener', 'Abrelatas manual'] },
  { id: 'stove', cat: 'food', l: ['Fogareiro de campismo e gás (usar só ao ar livre)', 'Réchaud de camping et gaz (dehors uniquement)', 'Campingkocher mit Gas (nur im Freien)', 'Camping stove and gas (outdoors only)', 'Hornillo de camping y gas (usar solo al aire libre)'] },
  { id: 'firstaid', cat: 'medical', l: ['Estojo de primeiros socorros', 'Trousse de premiers secours', 'Erste-Hilfe-Set', 'First aid kit', 'Botiquín de primeros auxilios'] },
  { id: 'meds', cat: 'medical', l: ['Medicação habitual para 7 dias', 'Traitement habituel pour 7 jours', 'Dauermedikamente für 7 Tage', 'Regular medication for 7 days', 'Medicación habitual para 7 días'] },
  { id: 'iodine', cat: 'medical', l: ['Pastilhas de iodo (tomar só por ordem das autoridades)', 'Comprimés d’iode (uniquement sur ordre des autorités)', 'Jodtabletten (nur auf Anweisung der Behörden)', 'Iodine tablets (only when authorities say so)', 'Pastillas de yodo (tomar solo por orden de las autoridades)'] },
  { id: 'masks', cat: 'medical', q: (p, d) => ({ n: p * d, u: '' }) },
  { id: 'radio', cat: 'energy', l: ['Rádio a pilhas ou a manivela', 'Radio à piles ou à manivelle', 'Batterie- oder Kurbelradio', 'Battery or wind-up radio', 'Radio de pilas o de manivela'] },
  { id: 'torch', cat: 'energy', q: p => ({ n: p, u: '' }) },
  { id: 'powerbank', cat: 'energy', l: ['Bateria externa carregada e cabos', 'Batterie externe chargée et câbles', 'Geladene Powerbank und Kabel', 'Charged power bank and cables', 'Batería externa cargada y cables'] },
  { id: 'lighter', cat: 'energy', l: ['Isqueiro e fósforos', 'Briquet et allumettes', 'Feuerzeug und Streichhölzer', 'Lighter and matches', 'Mechero y cerillas'] },
  { id: 'hygiene', cat: 'hygiene', l: ['Higiene: sabão, gel, escova de dentes', 'Hygiène : savon, gel, brosse à dents', 'Hygiene: Seife, Gel, Zahnbürste', 'Hygiene: soap, gel, toothbrush', 'Higiene: jabón, gel, cepillo de dientes'] },
  { id: 'toilet', cat: 'hygiene', l: ['Papel higiénico e sacos do lixo resistentes', 'Papier toilette et sacs poubelle solides', 'Toilettenpapier und feste Müllbeutel', 'Toilet paper and strong bin bags', 'Papel higiénico y bolsas de basura resistentes'] },
  { id: 'wipes', cat: 'hygiene', l: ['Toalhitas húmidas', 'Lingettes', 'Feuchttücher', 'Wet wipes', 'Toallitas húmedas'] },
  { id: 'blanket', cat: 'equipment', q: p => ({ n: p, u: '' }) },
  { id: 'clothes', cat: 'equipment', l: ['Roupa quente, impermeável e calçado firme', 'Vêtements chauds, imperméable, chaussures solides', 'Warme Kleidung, Regenjacke, feste Schuhe', 'Warm clothes, rain jacket, sturdy shoes', 'Ropa de abrigo, impermeable y calzado firme'] },
  { id: 'whistle', cat: 'equipment', l: ['Apito', 'Sifflet', 'Trillerpfeife', 'Whistle', 'Silbato'] },
  { id: 'multitool', cat: 'equipment', l: ['Canivete multiusos e fita adesiva', 'Couteau multifonction et ruban adhésif', 'Multitool und Klebeband', 'Multitool and duct tape', 'Navaja multiusos y cinta adhesiva'] },
  { id: 'gloves', cat: 'equipment', l: ['Luvas de trabalho', 'Gants de travail', 'Arbeitshandschuhe', 'Work gloves', 'Guantes de trabajo'] },
  { id: 'map', cat: 'equipment', l: ['Mapa em papel da região', 'Carte papier de la région', 'Papierkarte der Region', 'Paper map of the region', 'Mapa en papel de la región'] },
  { id: 'keys', cat: 'documents', l: ['Chaves suplentes de casa e do carro', 'Doubles des clés (maison, voiture)', 'Ersatzschlüssel (Haus, Auto)', 'Spare house and car keys', 'Llaves de repuesto de casa y del coche'] },
  { id: 'cash', cat: 'documents', l: ['Dinheiro em notas pequenas e moedas', 'Argent liquide en petites coupures', 'Bargeld in kleinen Scheinen', 'Cash in small notes and coins', 'Dinero en billetes pequeños y monedas'] },
  { id: 'copies', cat: 'documents', l: ['Cópias dos documentos (papel e cofre da app)', 'Copies des documents (papier et coffre)', 'Dokumentkopien (Papier und Tresor)', 'Document copies (paper and app vault)', 'Copias de los documentos (papel y caja fuerte de la app)'] },
  { id: 'paperlist', cat: 'documents', l: ['Lista de contactos em papel', 'Liste de contacts sur papier', 'Kontaktliste auf Papier', 'Paper list of contacts', 'Lista de contactos en papel'] },
  { id: 'kids', cat: 'other', l: ['Fraldas, leite e conforto para crianças (se aplicável)', 'Couches, lait, doudou (si besoin)', 'Windeln, Milch, Kuscheltier (falls nötig)', 'Nappies, milk, comfort items for kids (if needed)', 'Pañales, leche y objetos de consuelo para niños (si procede)'] },
  { id: 'petsupplies', cat: 'other', l: ['Comida, trela e transportadora para animais (se aplicável)', 'Nourriture, laisse, caisse pour animaux (si besoin)', 'Futter, Leine, Box für Tiere (falls nötig)', 'Pet food, lead and carrier (if needed)', 'Comida, correa y transportín para animales (si procede)'] },
];

// Fontes de cada guia (onde confirmar o conteúdo).
const SRC = {
  erc: { n: 'European Resuscitation Council — Guidelines 2021', u: 'https://cprguidelines.eu/' },
  ifrc: { n: 'IFRC — International First Aid Guidelines 2020', u: 'https://www.ifrc.org/document/international-first-aid-resuscitation-and-education-guidelines' },
  infocrise: { n: 'Gouvernement du Luxembourg — infocrise.lu', u: 'https://infocrise.public.lu/' },
  anepc: { n: 'ANEPC — Proteção Civil (Portugal)', u: 'https://prociv.gov.pt/' },
  ipma: { n: 'IPMA', u: 'https://www.ipma.pt/' },
  gouvfr: { n: 'Gouvernement français — Risques', u: 'https://www.gouvernement.fr/risques' },
  who: { n: 'OMS / WHO — Drinking-water', u: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water' },
  scouts: { n: 'Técnicas de escutismo / campismo (conhecimento comum)', u: '' },
};
const GUIDE_SRC = {
  bleeding: ['ifrc'], recovery: ['erc', 'ifrc'], cpr: ['erc'], choking: ['erc'], burn: ['ifrc'], hypothermia: ['ifrc'],
  heatstroke: ['ifrc'], fracture: ['ifrc'], stroke: ['ifrc'], poison: ['ifrc'],
  sirens: ['infocrise', 'gouvfr'], nuclear: ['infocrise'], chemical: ['infocrise', 'gouvfr'], fire: ['gouvfr', 'anepc'],
  gas: ['gouvfr'], blackout: ['infocrise', 'gouvfr'], flood: ['infocrise', 'ipma'], storm: ['infocrise', 'gouvfr'],
  heatwave: ['infocrise', 'anepc'], evacuate: ['infocrise', 'anepc'], nowater: ['who'],
  alertspt: ['anepc', 'ipma'], wildfire: ['anepc'], earthquake: ['anepc'], tsunami: ['anepc'],
  campfire: ['anepc', 'scouts'], bowline: ['scouts'], reefknot: ['scouts'], clovehitch: ['scouts'], tautline: ['scouts'],
  purifywater: ['who'], shelter: ['scouts'], rescuesignals: ['scouts'], navigate: ['scouts'], toilet: ['who'], shutoff: ['gouvfr'], chargephone: ['infocrise'],
};

// Artigos prontos para o inventário. kcal e volumes são valores típicos de rótulo (aproximados).
const PRESETS_BASE = [
  { id: 'w15', cat: 'water', unit: 'bottle', content: 1.5, cu: 'L' },
  { id: 'w05', cat: 'water', unit: 'bottle', content: 0.5, cu: 'L' },
  { id: 'w6x15', cat: 'water', unit: 'pack', content: 9, cu: 'L' },
  { id: 'w5', cat: 'water', unit: 'jerrycan', content: 5, cu: 'L' },
  { id: 'pasta', cat: 'food', unit: 'pack', content: 500, cu: 'g', kcal: 1780 },
  { id: 'rice', cat: 'food', unit: 'pack', content: 1, cu: 'kg', kcal: 3500 },
  { id: 'oats', cat: 'food', unit: 'pack', content: 500, cu: 'g', kcal: 1850 },
  { id: 'tuna', cat: 'food', unit: 'can', content: 120, cu: 'g', kcal: 220 },
  { id: 'sardines', cat: 'food', unit: 'can', content: 120, cu: 'g', kcal: 240 },
  { id: 'chickpeas', cat: 'food', unit: 'can', content: 400, cu: 'g', kcal: 300 },
  { id: 'beans', cat: 'food', unit: 'can', content: 400, cu: 'g', kcal: 280 },
  { id: 'fruitcan', cat: 'food', unit: 'can', content: 420, cu: 'g', kcal: 300 },
  { id: 'crackers', cat: 'food', unit: 'pack', content: 200, cu: 'g', kcal: 900 },
  { id: 'bar', cat: 'food', unit: 'un', content: 25, cu: 'g', kcal: 100 },
  { id: 'nuts', cat: 'food', unit: 'bag', content: 200, cu: 'g', kcal: 1200 },
  { id: 'pb', cat: 'food', unit: 'jar', content: 350, cu: 'g', kcal: 2100 },
  { id: 'honey', cat: 'food', unit: 'jar', content: 500, cu: 'g', kcal: 1520 },
  { id: 'choc', cat: 'food', unit: 'un', content: 100, cu: 'g', kcal: 540 },
  { id: 'milk', cat: 'food', unit: 'box', content: 1, cu: 'L', kcal: 470 },
  { id: 'soup', cat: 'food', unit: 'bag', kcal: 90 },
  { id: 'batteries', cat: 'energy', unit: 'pack' },
  { id: 'gas', cat: 'energy', unit: 'un' },
  { id: 'tp', cat: 'hygiene', unit: 'un' },
  { id: 'firstaid', cat: 'medical', unit: 'un' },
];
export let PRESETS = [];

export let NUMBERS = [], NEARBY = [], REGIONS = {}, KIT = [], DOC_CHECKLIST = [], GUIDES = [];

// Um passo pode ser texto ou { r: 'pt', x: texto } quando só vale para uma região.
export const stepText = st => (typeof st === 'string' ? st : st.x);
export const stepRegion = st => (typeof st === 'string' ? null : st.r);

// Aplica os textos da língua atual (d), com o português como reserva para o que faltar.
export function applyContent(d, pt) {
  const g = (sec, key) => (d[sec] && d[sec][key] !== undefined ? d[sec][key] : pt[sec][key]);
  REGIONS = { ...pt.regions, ...d.regions };
  DOC_CHECKLIST = (d.docs && d.docs.length === pt.docs.length) ? d.docs : pt.docs;
  NUMBERS = BASE.numbers.map(c => {
    const tx = g('numbers', c.flag);
    return { flag: c.flag, r: c.r, country: tx.country, items: c.items.map(i => ({ ...i, l: (tx.items && tx.items[i.n]) || pt.numbers[c.flag].items[i.n] })) };
  });
  NEARBY = BASE.nearby.map(n => ({ ...n, ...g('nearby', n.id) }));
  KIT = KIT_BASE.map(k => ({ ...k, l: g('kit', k.id) }));
  PRESETS = PRESETS_BASE.map(p => ({ ...p, name: g('presets', p.id) }));
  GUIDES = BASE.guides.map(b => {
    let tx = d.guides && d.guides[b.id];
    const ref = pt.guides[b.id];
    // Se a tradução tiver um número de passos diferente, usa o português (evita passos trocados).
    if (!tx || tx.s.length !== ref.s.length || (tx.d || []).length !== (ref.d || []).length) tx = ref;
    const s = tx.s.map((x, i) => (b.sr && b.sr[i] ? { r: b.sr[i], x } : x));
    return { ...b, t: tx.t, k: tx.k, i: tx.i, s, d: tx.d || [], src: (GUIDE_SRC[b.id] || []).map(k => SRC[k]) };
  });
}
