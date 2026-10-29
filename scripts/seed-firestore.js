const fs = require('fs');
const os = require('os');
const path = require('path');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'control-herramientas-obra';
const firebaseToolsConfigPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

const tools = [
  { id: 'GC114', name: 'Taladro atornillador Makita XPH14', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC114', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC115', name: 'Atornillador de impacto Makita XDT19', category: 'Electricidad', brand: 'Makita', model: 'XDT19', serialNumber: 'GC115', status: 'available', photoLabel: '🔩', observations: 'Con bolso '.$ },
  { id: 'GC283', name: 'Nivel óptico y plomada Bosch', category: 'Medición', brand: 'Bosch', model: 'Nivel óptico', serialNumber: 'GC283', status: 'available', photoLabel: '📏', observations: 'Incluye estuche de transporte.' },
  { id: 'GC290', name: 'Distribuidor portátil de corriente Southwire 1970 XTREME BOX', category: 'Energía', brand: 'Southwire', model: '1970 XTREME BOX', serialNumber: 'GC290', status: 'available', photoLabel: '🔌', observations: 'Araña para alimentación portátil.' },
  { id: 'GC293', name: 'Lijadora eléctrica KP0800K', category: 'Mecanizado', brand: 'Makita', model: 'KP0800K', serialNumber: 'GC293', status: 'available', photoLabel: '🪚', observations: 'Listo para uso general.' },
  { id: 'GC294', name: 'Taladro percutor RH328VC', category: 'Electricidad', brand: 'Bosch', model: 'RH328VC', serialNumber: 'GC294', status: 'available', photoLabel: '🔨', observations: 'Equipo operativo, revisión reciente del cable.' },
  { id: 'GC295', name: 'Pistola de calor eléctrica CM531', category: 'Calefacción', brand: 'Craftsman', model: 'CM531', serialNumber: 'GC295', status: 'available', photoLabel: '🔥', observations: 'Uso en obra interior.' },
  { id: 'GC296', name: 'Pistola de calor eléctrica CM531', category: 'Calefacción', brand: 'Craftsman', model: 'CM531', serialNumber: 'GC296', status: 'available', photoLabel: '🔥', observations: 'Duplicado de referencia por stock.' },
  { id: 'GC330', name: 'Laser para cerámica Bosch GTL3 060', category: 'Medición', brand: 'Bosch', model: 'GTL3 060', serialNumber: 'GC330', status: 'available', photoLabel: '📐', observations: 'Incluye accesorios y estuche.' },
  { id: 'GC331', name: 'Metro láser Bosch 50 MT', category: 'Medición', brand: 'Bosch', model: '50 MT', serialNumber: 'GC331', status: 'available', photoLabel: '📏', observations: 'Con estuche azul.' },
  { id: 'GC332', name: 'Metro láser Bosch 50 MT', category: 'Medición', brand: 'Bosch', model: '50 MT', serialNumber: 'GC332', status: 'available', photoLabel: '📏', observations: 'Con estuche azul.' },
  { id: 'GC333', name: 'Detector de metales Bosch GSM120', category: 'Seguridad', brand: 'Bosch', model: 'GSM120', serialNumber: 'GC333', status: 'available', photoLabel: '🛰️', observations: 'Verificar calibración antes del uso.' },
  { id: 'GC334', name: 'Sierra caladora Craftsman eléctrica', category: 'Mecanizado', brand: 'Craftsman', model: 'Eléctrica', serialNumber: 'GC334', status: 'available', photoLabel: '🪵', observations: 'Operativa para cortes de madera.' },
  { id: 'GC335', name: 'Dremel 4300 con 40 piezas', category: 'Mecánica', brand: 'Dremel', model: '4300', serialNumber: 'GC335', status: 'available', photoLabel: '🧰', observations: 'Kit completo con brocas.' },
  { id: 'GC336', name: 'Esmeril 7" Metabo', category: 'Mecanizado', brand: 'Metabo', model: '7"', serialNumber: 'GC336', status: 'available', photoLabel: '🪵', observations: 'Disponible para corte y desbaste.' },
  { id: 'GC337', name: 'Taladro atornillador Makita XPH14 con bolso', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC337', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC338', name: 'Taladro atornillador Makita XPH14 con bolso', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC338', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC339', name: 'Atornillador de impacto Makita XDT19 con bolso', category: 'Electricidad', brand: 'Makita', model: 'XDT19', serialNumber: 'GC339', status: 'available', photoLabel: '🔩', observations: 'Con bolso y accesorios.' },
  { id: 'GC340', name: 'Atornillador de impacto Makita XDT19 con bolso', category: 'Electricidad', brand: 'Makita', model: 'XDT19', serialNumber: 'GC340', status: 'available', photoLabel: '🔩', observations: 'Con bolso y accesorios.' },
  { id: 'GC341', name: 'Atornillador inalámbrico Makita con cargador y caja de mechas', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC341', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC342', name: 'Atornillador inalámbrico Makita con cargador y caja de mechas', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC342', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC343', name: 'Atornillador inalámbrico Makita con cargador y caja de mechas', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC343', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC344', name: 'Atornillador inalámbrico Makita con cargador y caja de mechas', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC344', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC348', name: 'Esmeril eléctrico 4" Makita', category: 'Mecanizado', brand: 'Makita', model: '4"', serialNumber: 'GC348', status: 'available', photoLabel: '🪚', observations: 'Uso general de obra.' },
  { id: 'GC353', name: 'Lámpara LED reflector de trabajo SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC353', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC354', name: 'Lámparas LED SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC354', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC355', name: 'Lámparas LED SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC355', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC356', name: 'Lámparas LED SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC356', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC357', name: 'Rotomartillo Makita con puntas', category: 'Demolición', brand: 'Makita', model: 'Rotomartillo', serialNumber: 'GC357', status: 'available', photoLabel: '🪓', observations: 'Con puntas y accesorios.' },
  { id: 'GC358', name: 'Tronzadora 14" DeWalt D28715', category: 'Mecanizado', brand: 'DeWalt', model: 'D28715', serialNumber: 'GC358', status: 'available', photoLabel: '🪵', observations: 'Uso en obra, sin incidencias.' },
  { id: 'GC359', name: 'Aspiradora Craftsman roja', category: 'Limpieza', brand: 'Craftsman', model: 'Aspiradora', serialNumber: 'GC359', status: 'available', photoLabel: '🧹', observations: 'Limpieza de polvo y residuos.' },
  { id: 'GC360', name: 'Pistola caladora para concreto GNB18V-12K14', category: 'Concreto', brand: 'General', model: 'GNB18V-12K14', serialNumber: 'GC360', status: 'available', photoLabel: '🧱', observations: 'Con cargador y batería.' },
  { id: 'GC361', name: 'Compresor de aire Craftsman', category: 'Aire comprimido', brand: 'Craftsman', model: 'Compresor', serialNumber: 'GC361', status: 'available', photoLabel: '🌀', observations: 'Listo para herramientas neumáticas.' },
  { id: 'GC362', name: 'Compresor de aire Craftsman', category: 'Aire comprimido', brand: 'Craftsman', model: 'Compresor', serialNumber: 'GC362', status: 'available', photoLabel: '🌀', observations: 'Listo para herramientas neumáticas.' },
  { id: 'GC363', name: 'Pulverizadora de pintura airless Magnum', category: 'Pintura', brand: 'Magnum', model: 'Airless', serialNumber: 'GC363', status: 'available', photoLabel: '🎨', observations: 'Ideal para pintura industrial.' },
  { id: 'GC364', name: 'Pulverizadora de pintura airless Magnum', category: 'Pintura', brand: 'Magnum', model: 'Airless', serialNumber: 'GC364', status: 'available', photoLabel: '🎨', observations: 'Ideal para pintura industrial.' },
  { id: 'GC368', name: 'Linterna YXQVA recargable', category: 'Iluminación', brand: 'YXQVA', model: 'YXQVA', serialNumber: 'GC368', status: 'available', photoLabel: '🔦', observations: 'Linterna de trabajo recargable.' },
  { id: 'GC369', name: 'Linterna YXQVA recargable', category: 'Iluminación', brand: 'YXQVA', model: 'YXQVA', serialNumber: 'GC369', status: 'available', photoLabel: '🔦', observations: 'Linterna de trabajo recargable.' },
  { id: 'GC370', name: 'Linterna YXQVA recargable', category: 'Iluminación', brand: 'YXQVA', model: 'YXQVA', serialNumber: 'GC370', status: 'available', photoLabel: '🔦', observations: 'Linterna de trabajo recargable.' },
  { id: 'GC371', name: 'Linterna YXQVA recargable', category: 'Iluminación', brand: 'YXQVA', model: 'YXQVA', serialNumber: 'GC371', status: 'available', photoLabel: '🔦', observations: 'Linterna de trabajo recargable.' },
  { id: 'GC382', name: 'Esmeril Craftsman inalámbrico', category: 'Mecanizado', brand: 'Craftsman', model: 'Inalámbrico', serialNumber: 'GC382', status: 'available', photoLabel: '🪵', observations: 'Usado para desbaste y corte.' },
  { id: 'GC441', name: 'Máquina de soldar Lincoln Megaforce 300ist', category: 'Soldadura', brand: 'Lincoln', model: 'MEGAFORCE 300ist', serialNumber: 'GC441', status: 'available', photoLabel: '⚡', observations: 'Equipo de soldadura industrial.' },
  { id: 'GC442', name: 'Máquina de soldar', category: 'Soldadura', brand: 'General', model: 'Soldadora', serialNumber: 'GC442', status: 'available', photoLabel: '⚡', observations: 'Sin especificación técnica completa.' },
  { id: 'GC517', name: 'Lijadora orbital DeWalt inalambrica DCW210', category: 'Mecanizado', brand: 'DeWalt', model: 'DCW210', serialNumber: 'GC517', status: 'available', photoLabel: '🪚', observations: 'Sin novedades.' },
  { id: 'GC518', name: 'Lijadora orbital DeWalt', category: 'Mecanizado', brand: 'DeWalt', model: 'Orbital', serialNumber: 'GC518', status: 'available', photoLabel: '🪚', observations: 'Disponible para acabado superficial.' },
  { id: 'GC519', name: 'Lijadora orbital DeWalt', category: 'Mecanizado', brand: 'DeWalt', model: 'Orbital', serialNumber: 'GC519', status: 'available', photoLabel: '🪚', observations: 'Disponible para acabado superficial.' },
  { id: 'GC520', name: 'Nivel láser para cielo raso DeWalt', category: 'Medición', brand: 'DeWalt', model: 'Laser', serialNumber: 'GC520', status: 'available', photoLabel: '📐', observations: 'Equipo de precisión para instalaciones.' },
  { id: 'GC538', name: 'Radio Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC538', status: 'available', photoLabel: '📡', observations: 'Comunicación de obra.' },
  { id: 'GC539', name: 'Radio Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC539', status: 'available', photoLabel: '📡', observations: 'Comunicación de obra.' },
  { id: 'GC540', name: 'Radio Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC540', status: 'available', photoLabel: '📡', observations: 'Comunicación de obra.' },
  { id: 'GC541', name: 'Radio Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC541', status: 'available', photoLabel: '📡', observations: 'Comunicación de obra.' },
  { id: 'GC542', name: 'Cargador Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Cargador', serialNumber: 'GC542', status: 'available', photoLabel: '🔋', observations: 'Accesorio de radio.' },
  { id: 'GC543', name: 'Cargador Baofeng', category: 'Comunicaciones', brand: 'Baofeng', model: 'Cargador', serialNumber: 'GC543', status: 'available', photoLabel: '🔋', observations: 'Accesorio de radio.' },
  { id: 'GC544', name: 'Aire acondicionado portátil negro RIBELLE 14000BTU RI14NAP', category: 'Climatización', brand: 'Ribelle', model: 'RI14NAP', serialNumber: 'GC544', status: 'available', photoLabel: '❄️', observations: 'Aire portátil para sitio.' },
  { id: 'GC545', name: 'Aire acondicionado portátil negro RIBELLE 14000BTU RI14NAP', category: 'Climatización', brand: 'Ribelle', model: 'RI14NAP', serialNumber: 'GC545', status: 'available', photoLabel: '❄️', observations: 'Aire portátil para sitio.' },
  { id: 'GC560', name: 'Pistolas de pulverización marca TCP global HVLP', category: 'Pintura', brand: 'TCP Global', model: 'HVLP', serialNumber: 'GC560', status: 'available', photoLabel: '🎨', observations: 'Equipo para pintura y acabados.' },
  { id: 'GC562', name: 'Sierra circular Saw kit con bolso Makita XRS01', category: 'Mecanizado', brand: 'Makita', model: 'XRS01', serialNumber: 'GC562', status: 'available', photoLabel: '🪚', observations: 'Kit completo con bolso.' },
  { id: 'GC567', name: 'Linterna recargable waterproof', category: 'Iluminación', brand: 'General', model: 'Waterproof', serialNumber: 'GC567', status: 'available', photoLabel: '🔦', observations: 'Con porta batería AAA y cable de carga.' },
  { id: 'GC568', name: 'Linterna recargable waterproof', category: 'Iluminación', brand: 'General', model: 'Waterproof', serialNumber: 'GC568', status: 'available', photoLabel: '🔦', observations: 'Con porta batería AAA y cable de carga.' },
  { id: 'GC569', name: 'Linterna recargable waterproof', category: 'Iluminación', brand: 'General', model: 'Waterproof', serialNumber: 'GC569', status: 'available', photoLabel: '🔦', observations: 'Con porta batería AAA y cable de carga.' },
  { id: 'GC570', name: 'Linterna recargable waterproof', category: 'Iluminación', brand: 'General', model: 'Waterproof', serialNumber: 'GC570', status: 'available', photoLabel: '🔦', observations: 'Con porta batería AAA y cable de carga.' },
  { id: 'GC571', name: 'Linterna recargable Y1915C Childbot', category: 'Iluminación', brand: 'Childbot', model: 'Y1915C', serialNumber: 'GC571', status: 'available', photoLabel: '🔦', observations: 'Con batería y cable de carga.' },
  { id: 'GC572', name: 'Linterna recargable Y1915C Childbot', category: 'Iluminación', brand: 'Childbot', model: 'Y1915C', serialNumber: 'GC572', status: 'available', photoLabel: '🔦', observations: 'Con batería y cable de carga.' },
  { id: 'GC573', name: 'Linterna recargable Y1915C Childbot', category: 'Iluminación', brand: 'Childbot', model: 'Y1915C', serialNumber: 'GC573', status: 'available', photoLabel: '🔦', observations: 'Con batería y cable de carga.' },
  { id: 'GC574', name: 'Linterna recargable Y1915C Childbot', category: 'Iluminación', brand: 'Childbot', model: 'Y1915C', serialNumber: 'GC574', status: 'available', photoLabel: '🔦', observations: 'Con batería y cable de carga.' },
  { id: 'GC587', name: 'Linterna headlight', category: 'Iluminación', brand: 'General', model: 'Headlight', serialNumber: 'GC587', status: 'available', photoLabel: '🔦', observations: 'Luz frontal para trabajo.' },
  { id: 'GC591', name: 'Pistola de pintura DeWalt', category: 'Pintura', brand: 'DeWalt', model: 'Pistola', serialNumber: 'GC591', status: 'available', photoLabel: '🎨', observations: 'Accesorio de pintura y acabado.' },
  { id: 'GC592', name: 'Pistola de pintura DeWalt', category: 'Pintura', brand: 'DeWalt', model: 'Pistola', serialNumber: 'GC592', status: 'available', photoLabel: '🎨', observations: 'Accesorio de pintura y acabado.' },
  { id: 'GC593', name: 'Lijadora DeWalt', category: 'Mecanizado', brand: 'DeWalt', model: 'Lijadora', serialNumber: 'GC593', status: 'available', photoLabel: '🪚', observations: 'Uso general y pulido.' },
  { id: 'GC595', name: 'Nivel Craftsman 48', category: 'Medición', brand: 'Craftsman', model: '48', serialNumber: 'GC595', status: 'available', photoLabel: '📏', observations: 'Nivel manual para obra.' },
  { id: 'GC601', name: 'Bosch escáner de pared GMS120', category: 'Seguridad', brand: 'Bosch', model: 'GMS120', serialNumber: 'GC601', status: 'available', photoLabel: '🛰️', observations: 'Escáner de pared y detección.' },
  { id: 'GC612', name: 'Atornillador inalámbrico para drywall Makita XSF03', category: 'Electricidad', brand: 'Makita', model: 'XSF03', serialNumber: 'GC612', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas y cargador.' },
  { id: 'GC616', name: 'Esmeril Bosch', category: 'Mecanizado', brand: 'Bosch', model: 'Esmeril', serialNumber: 'GC616', status: 'available', photoLabel: '🪵', observations: 'Equipo de corte y desbaste.' },
  { id: 'GC624', name: 'Máquina de soldar Miller', category: 'Soldadura', brand: 'Miller', model: 'Soldadora', serialNumber: 'GC624', status: 'available', photoLabel: '⚡', observations: 'Maquinaria de soldadura industrial.' },
  { id: 'GC625', name: 'Taladro XPH12 Makita inalámbrico', category: 'Electricidad', brand: 'Makita', model: 'XPH12', serialNumber: 'GC625', status: 'available', photoLabel: '🔨', observations: 'Taladro de servicio general.' },
  { id: 'GC627', name: 'Taladro atornillador GreenWork', category: 'Electricidad', brand: 'GreenWork', model: 'Taladro', serialNumber: 'GC627', status: 'available', photoLabel: '🔨', observations: 'Equipo de obra general.' },
  { id: 'GC628', name: 'Taladro GreenWork', category: 'Electricidad', brand: 'GreenWork', model: 'Taladro', serialNumber: 'GC628', status: 'available', photoLabel: '🔨', observations: 'Equipo de obra general.' },
  { id: 'GC632', name: 'Makita sierra de mampostería seca con extracción de polvo', category: 'Mecanizado', brand: 'Makita', model: 'Sierra', serialNumber: 'GC632', status: 'available', photoLabel: '🪵', observations: 'Con extracción de polvo.' },
];

function readAccessToken() {
  if (!fs.existsSync(firebaseToolsConfigPath)) {
    throw new Error(`No se encontró Firebase CLI config en ${firebaseToolsConfigPath}. Ejecuta 'firebase login' y vuelve a intentar.`);
  }

  const config = JSON.parse(fs.readFileSync(firebaseToolsConfigPath, 'utf8'));
  const token = config?.tokens?.access_token;

  if (!token) {
    throw new Error('No se pudo leer el access_token de Firebase CLI. Ejecuta "firebase login" y vuelve a intentar.');
  }

  return token;
}

function toFieldValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  return { stringValue: String(value) };
}

function createToolWrite(tool) {
  const now = new Date().toISOString();

  return {
    update: {
      name: `projects/${projectId}/databases/(default)/documents/tools/${tool.id}`,
      fields: {
        id: toFieldValue(tool.id),
        name: toFieldValue(tool.name),
        category: toFieldValue(tool.category),
        brand: toFieldValue(tool.brand),
        model: toFieldValue(tool.model),
        serialNumber: toFieldValue(tool.serialNumber),
        status: toFieldValue(tool.status),
        photoUrl: toFieldValue(tool.photoUrl ?? ''),
        photoLabel: toFieldValue(tool.photoLabel ?? '🧰'),
        observations: toFieldValue(tool.observations ?? 'Sin observaciones'),
        createdAt: toFieldValue(tool.createdAt ?? now),
        updatedAt: toFieldValue(tool.updatedAt ?? now),
      },
    },
  };
}

async function batchWrite(batch) {
  const token = readAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes: batch }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('BatchWrite failed:', response.status, text);
    throw new Error(`Firestore batchWrite failed: ${response.status}`);
  }

  return text;
}

async function seedInventory() {
  const batches = [];

  for (const tool of tools) {
    batches.push(createToolWrite(tool));
    if (batches.length === 500) {
      await batchWrite(batches);
      batches.length = 0;
    }
  }

  if (batches.length) {
    await batchWrite(batches);
  }

  console.log(`Se cargaron ${tools.length} herramientas en Firestore (${projectId}).`);
}

seedInventory().catch((error) => {
  console.error('Error al cargar la lista real de herramientas:', error);
  process.exit(1);
});
