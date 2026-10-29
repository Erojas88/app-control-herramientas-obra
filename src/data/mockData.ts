export type ToolStatus = 'available' | 'loaned' | 'maintenance' | 'out_of_service';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type Tool = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: ToolStatus;
  photoUrl?: string;
  photoLabel?: string;
  observations: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RequestItem = {
  id: string;
  requestId: string;
  toolId: string;
  toolName: string;
  quantity: number;
  purpose: string;
  workArea: string;
  dueDate: string;
  training: 'yes' | 'no' | 'n/a';
  condition: 'Excellent' | 'Good' | 'Regular' | 'Damaged';
  approvalStatus: ApprovalStatus;
  approvalComment?: string;
  notes?: string;
  photoUrls?: string[];
  createdAt?: string;
};

export type ToolRequest = {
  id: string;
  requesterUid: string;
  requesterName: string;
  role: string;
  company: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  status: RequestStatus;
  items: RequestItem[];
  observations?: string;
};

export const mockTools: Tool[] = [
  { id: 'GC114', name: 'Taladro atornillador Makita XPH14', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC114', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC283', name: 'Nivel óptico y plataforma Bosch', category: 'Medición', brand: 'Bosch', model: 'Nivel óptico', serialNumber: 'GC283', status: 'available', photoLabel: '📏', observations: 'Incluye estuche de transporte.' },
  { id: 'GC293', name: 'Lijadora eléctrica PK0800K', category: 'Mecanizado', brand: 'Makita', model: 'PK0800K', serialNumber: 'GC293', status: 'available', photoLabel: '🪚', observations: 'Listo para uso general.' },
  { id: 'GC295', name: 'Taladro percutor RH328VC', category: 'Electricidad', brand: 'Bosch', model: 'RH328VC', serialNumber: 'GC295', status: 'available', photoLabel: '🔨', observations: 'Revisión reciente del cable.' },
  { id: 'GC330', name: 'Pistola de calor eléctrica CM531', category: 'Calefacción', brand: 'Craftsman', model: 'CM531', serialNumber: 'GC330', status: 'available', photoLabel: '🔥', observations: 'Uso en obra interior.' },
  { id: 'GC332', name: 'Pistola de calor eléctrica CM531', category: 'Calefacción', brand: 'Craftsman', model: 'CM531', serialNumber: 'GC332', status: 'available', photoLabel: '🔥', observations: 'Uso en obra interior.' },
  { id: 'GC333', name: 'Laser para cerámica GTL 3060', category: 'Medición', brand: 'Bosch', model: 'GTL 3060', serialNumber: 'GC333', status: 'available', photoLabel: '📐', observations: 'En perfecto estado.' },
  { id: 'GC334', name: 'Metro láser Bosch', category: 'Medición', brand: 'Bosch', model: 'Laser 50 MT', serialNumber: 'GC334', status: 'available', photoLabel: '📏', observations: 'Incluye estuche y baterías.' },
  { id: 'GC336', name: 'Metro láser Bosch', category: 'Medición', brand: 'Bosch', model: 'Laser 50 MT', serialNumber: 'GC336', status: 'available', photoLabel: '📏', observations: 'Incluye estuche y baterías.' },
  { id: 'GC338', name: 'Detector de metales wall scanner', category: 'Seguridad', brand: 'Bosch', model: 'GSM120', serialNumber: 'GC338', status: 'available', photoLabel: '🛰️', observations: 'Verificar calibración antes del uso.' },
  { id: 'GC340', name: 'Sierra caladora Craftsman', category: 'Mecanizado', brand: 'Craftsman', model: 'Eléctrica', serialNumber: 'GC340', status: 'available', photoLabel: '🪵', observations: 'Operativa para cortes en madera.' },
  { id: 'GC342', name: 'Dremel 4300', category: 'Mecánica', brand: 'Dremel', model: '4300', serialNumber: 'GC342', status: 'available', photoLabel: '🧰', observations: 'Juegos de brocas disponibles.' },
  { id: 'GC344', name: 'Esmeril 7" Metabo', category: 'Mecanizado', brand: 'Metabo', model: '7"', serialNumber: 'GC344', status: 'available', photoLabel: '🪵', observations: 'Disponible para corte y desbaste.' },
  { id: 'GC353', name: 'Taladro atornillador Makita XPH14', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC353', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC355', name: 'Taladro atornillador Makita XPH14', category: 'Electricidad', brand: 'Makita', model: 'XPH14', serialNumber: 'GC355', status: 'available', photoLabel: '🔨', observations: 'Inventario de obra. Estado operativo.' },
  { id: 'GC357', name: 'Atornillador de impacto Makita XDT19', category: 'Electricidad', brand: 'Makita', model: 'XDT19', serialNumber: 'GC357', status: 'available', photoLabel: '🔩', observations: 'Con bolso y accesorios.' },
  { id: 'GC359', name: 'Atornillador de impacto Makita XDT19', category: 'Electricidad', brand: 'Makita', model: 'XDT19', serialNumber: 'GC359', status: 'available', photoLabel: '🔩', observations: 'Con bolso y accesorios.' },
  { id: 'GC361', name: 'Atornillador inalámbrico Makita', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC361', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC363', name: 'Atornillador inalámbrico Makita', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC363', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC368', name: 'Atornillador inalámbrico Makita', category: 'Electricidad', brand: 'Makita', model: 'Inalámbrico', serialNumber: 'GC368', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas incluida.' },
  { id: 'GC370', name: 'Lámpara LED reflector SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC370', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC382', name: 'Lámparas LED SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC382', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC442', name: 'Lámparas LED SD054', category: 'Iluminación', brand: 'General', model: 'SD054', serialNumber: 'GC442', status: 'available', photoLabel: '💡', observations: '50W IP66.' },
  { id: 'GC518', name: 'Rotomartillo Makita con puntas', category: 'Demolición', brand: 'Makita', model: 'Rotomartillo', serialNumber: 'GC518', status: 'available', photoLabel: '🪓', observations: 'Con puntas y accesorios.' },
  { id: 'GC520', name: 'Tronzadora 14" DEWALT', category: 'Mecanizado', brand: 'DeWalt', model: 'D28715', serialNumber: 'GC520', status: 'available', photoLabel: '🪵', observations: 'Uso en obra, sin incidencias.' },
  { id: 'GC539', name: 'Aspiradora Craftsman roja', category: 'Limpieza', brand: 'Craftsman', model: 'Robótica', serialNumber: 'GC539', status: 'available', photoLabel: '🧹', observations: 'Limpieza de polvo y residuos.' },
  { id: 'GC541', name: 'Pistola caladora para concreto GNB18W-12K14', category: 'Concreto', brand: 'General', model: 'GNB18W-12K14', serialNumber: 'GC541', status: 'available', photoLabel: '🧱', observations: 'Con cargador y batería.' },
  { id: 'GC543', name: 'Compresor de aire Craftsman', category: 'Aire comprimido', brand: 'Craftsman', model: 'Air compressor', serialNumber: 'GC543', status: 'available', photoLabel: '🌀', observations: 'Listo para herramientas neumáticas.' },
  { id: 'GC545', name: 'Compresor de aire Craftsman', category: 'Aire comprimido', brand: 'Craftsman', model: 'Air compressor', serialNumber: 'GC545', status: 'available', photoLabel: '🌀', observations: 'Listo para herramientas neumáticas.' },
  { id: 'GC562', name: 'Pulverizadora de pintura airless Magnum', category: 'Pintura', brand: 'Magnum', model: 'Airless', serialNumber: 'GC562', status: 'available', photoLabel: '🎨', observations: 'Ideal para pintura industrial.' },
  { id: 'GC568', name: 'Pulverizadora de pintura airless Magnum', category: 'Pintura', brand: 'Magnum', model: 'Airless', serialNumber: 'GC568', status: 'available', photoLabel: '🎨', observations: 'Ideal para pintura industrial.' },
  { id: 'GC570', name: 'Linterna YXQVA', category: 'Iluminación', brand: 'YXQVA', model: 'Linterna', serialNumber: 'GC570', status: 'available', photoLabel: '🔦', observations: 'Recargable con batería.' },
  { id: 'GC572', name: 'Linterna YXQVA', category: 'Iluminación', brand: 'YXQVA', model: 'Linterna', serialNumber: 'GC572', status: 'available', photoLabel: '🔦', observations: 'Recargable con batería.' },
  { id: 'GC574', name: 'Linterna YXQVA', category: 'Iluminación', brand: 'YXQVA', model: 'Linterna', serialNumber: 'GC574', status: 'available', photoLabel: '🔦', observations: 'Recargable con batería.' },
  { id: 'GC591', name: 'Esmeril Craftsman inalámbrico', category: 'Mecanizado', brand: 'Craftsman', model: 'Inalámbrico', serialNumber: 'GC591', status: 'available', photoLabel: '🪚', observations: 'Estricto control de carga.' },
  { id: 'GC593', name: 'Máquina de soldar Lincoln Megaforce', category: 'Soldadura', brand: 'Lincoln', model: 'Megaforce 300', serialNumber: 'GC593', status: 'available', photoLabel: '⚡', observations: 'Color rojo. Revisión de cable.' },
  { id: 'GC601', name: 'Lijadora orbital DEWALT', category: 'Mecanizado', brand: 'DeWalt', model: 'Orbital', serialNumber: 'GC601', status: 'available', photoLabel: '🪚', observations: 'Batería y cargador incluidos.' },
  { id: 'GC616', name: 'Lijadora orbital DEWALT', category: 'Mecanizado', brand: 'DeWalt', model: 'Orbital', serialNumber: 'GC616', status: 'available', photoLabel: '🪚', observations: 'Batería y cargador incluidos.' },
  { id: 'GC625', name: 'Nivel láser para cielo raso DEWALT', category: 'Medición', brand: 'DeWalt', model: 'Laser nivel', serialNumber: 'GC625', status: 'available', photoLabel: '📏', observations: 'En uso para nivelación de obra.' },
  { id: 'GC628', name: 'Radio BAOFENG', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC628', status: 'available', photoLabel: '📡', observations: 'Comunicaciones operativas.' },
  { id: 'GC642', name: 'Radio BAOFENG', category: 'Comunicaciones', brand: 'Baofeng', model: 'Radio', serialNumber: 'GC642', status: 'available', photoLabel: '📡', observations: 'Comunicaciones operativas.' },
  { id: 'GC643', name: 'Linterna HEADLIGHT', category: 'Iluminación', brand: 'Headlight', model: 'LED', serialNumber: 'GC643', status: 'available', photoLabel: '🔦', observations: 'Para tareas nocturnas.' },
  { id: 'GC645', name: 'Pistola de pintura DEWALT', category: 'Pintura', brand: 'DeWalt', model: 'Pistola', serialNumber: 'GC645', status: 'available', photoLabel: '🎨', observations: 'Incluye accesorios.' },
  { id: 'GC646', name: 'Pistola de pintura DEWALT', category: 'Pintura', brand: 'DeWalt', model: 'Pistola', serialNumber: 'GC646', status: 'available', photoLabel: '🎨', observations: 'Incluye accesorios.' },
  { id: 'GC647', name: 'Lijadora DEWALT', category: 'Mecanizado', brand: 'DeWalt', model: 'Lijadora', serialNumber: 'GC647', status: 'available', photoLabel: '🪚', observations: 'Diseño para acabado y preparación.' },
  { id: 'GC648', name: 'Nivel Craftsman 48', category: 'Medición', brand: 'Craftsman', model: '48', serialNumber: 'GC648', status: 'available', photoLabel: '📏', observations: 'Nivel de precisión para obra.' },
  { id: 'GC649', name: 'Bosch Escáner de pared GMS120', category: 'Medición', brand: 'Bosch', model: 'GMS120', serialNumber: 'GC649', status: 'available', photoLabel: '🧭', observations: 'Excelente para detección de materiales.' },
  { id: 'GC650', name: 'Atornillador inalámbrico Drywall Makita', category: 'Electricidad', brand: 'Makita', model: 'Drywall', serialNumber: 'GC650', status: 'available', photoLabel: '🔧', observations: 'Caja con mechas y cargador.' },
  { id: 'GC651', name: 'Esmeril Bosch', category: 'Mecanizado', brand: 'Bosch', model: 'Esmeril', serialNumber: 'GC651', status: 'available', photoLabel: '🪚', observations: 'Preparado para cortes y desbaste.' },
  { id: 'GC652', name: 'Máquina de soldar Miller', category: 'Soldadura', brand: 'Miller', model: 'Soldadora', serialNumber: 'GC652', status: 'available', photoLabel: '⚡', observations: 'Revisión general de electrodos.' },
  { id: 'GC654', name: 'Taladro XPH12 Makita inalámbrico', category: 'Electricidad', brand: 'Makita', model: 'XPH12', serialNumber: 'GC654', status: 'available', photoLabel: '🔨', observations: 'Incluye batería y cargador.' },
  { id: 'GC655', name: 'Taladro GreenWORK', category: 'Electricidad', brand: 'GreenWork', model: 'Taladro', serialNumber: 'GC655', status: 'available', photoLabel: '🔨', observations: 'Disponible para trabajos de montaje.' },
  { id: 'GC658', name: 'Taladro GreenWORK', category: 'Electricidad', brand: 'GreenWork', model: 'Taladro', serialNumber: 'GC658', status: 'available', photoLabel: '🔨', observations: 'Disponible para trabajos de montaje.' },
  { id: 'GC659', name: 'Sierra de tapomestería Makita', category: 'Mecanizado', brand: 'Makita', model: 'Sierra', serialNumber: 'GC659', status: 'available', photoLabel: '🪚', observations: 'Con extracción de polvo.' },
];

export const mockRequests: ToolRequest[] = [];

export const dashboardMetrics = {
  availableTools: 59,
  loanedTools: 0,
  overdueReturns: 0,
  damagedTools: 0,
  pendingRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  totalLoans: 0,
  topTools: ['Taladro atornillador Makita XPH14', 'Sierra caladora Craftsman', 'Radio BAOFENG'],
  topWorkers: ['Sin solicitudes'],
  damageCost: 0,
};

export const notifications = [
  { id: 'N1', title: 'Sistema listo', body: 'El inventario ya está preparado con herramientas reales de obra.', read: false },
  { id: 'N2', title: 'Solicitudes', body: 'A partir de ahora podrás registrar nuevas solicitudes desde el catálogo real.', read: false },
];
