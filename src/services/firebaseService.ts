import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { mockRequests, mockTools } from '../data/mockData';
import type { NotificationItem, Tool, ToolRequest, ToolRequestItem, UserProfile } from '../types';

const normalizeToolDoc = (toolId: string, data: any): Tool => ({
  id: toolId,
  name: data.name ?? 'Herramienta',
  category: data.category ?? 'General',
  brand: data.brand ?? 'Sin marca',
  model: data.model ?? 'Sin modelo',
  serialNumber: data.serialNumber ?? '',
  status: data.status ?? 'available',
  photoUrl: data.photoUrl ?? '',
  photoLabel: data.photoLabel ?? '🧰',
  observations: data.observations ?? 'Sin observaciones',
  createdAt: data.createdAt ?? new Date().toISOString(),
  updatedAt: data.updatedAt ?? new Date().toISOString(),
});

const normalizeToolRequest = (requestId: string, data: any): ToolRequest => {
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    id: data.id ?? requestId,
    requesterUid: data.requesterUid ?? data.requester_id ?? '',
    requesterName: data.requesterName ?? data.requester ?? 'Solicitante',
    role: data.role ?? 'solicitante',
    company: data.company ?? 'BuildPro',
    projectName: data.projectName ?? data.project ?? 'Proyecto San Martín',
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? data.modifiedAt ?? undefined,
    status: data.status ?? 'pending',
    observations: data.observations ?? '',
    approverName: data.approverName ?? undefined,
    items: items.map((item: any, index: number) => ({
      id: item.id ?? `${requestId}-item-${index}`,
      requestId: data.id ?? requestId,
      toolId: item.toolId ?? '',
      toolName: item.toolName ?? item.name ?? 'Herramienta',
      quantity: Number(item.quantity ?? 1),
      purpose: item.purpose ?? '',
      workArea: item.workArea ?? '',
      dueDate: item.dueDate ?? '',
      training: item.training ?? 'yes',
      condition: item.condition ?? 'Good',
      approvalStatus: item.approvalStatus ?? 'pending',
      approvalComment: item.approvalComment ?? item.comment ?? '',
      approverName: item.approverName ?? undefined,
      notes: item.notes ?? '',
      photoUrls: item.photoUrls ?? [],
      createdAt: item.createdAt ?? data.createdAt ?? new Date().toISOString(),
      approvedAt: item.approvedAt ?? item.approved_at ?? undefined,
    })),
  };
};

const defaultTools = mockTools.map((tool) => ({
  ...tool,
  createdAt: new Date().toISOString(),
})) as Tool[];

const defaultUsers: UserProfile[] = [
  {
    uid: 'demo-solicitante',
    fullName: 'María López',
    role: 'solicitante',
    company: 'BuildPro',
    position: 'Soldador',
    email: 'solicitante@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
  {
    uid: 'demo-jefe',
    fullName: 'Luis Gómez',
    role: 'jefe_obra',
    company: 'BuildPro',
    position: 'Jefe de Obra',
    email: 'jefe@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
  {
    uid: 'demo-admin',
    fullName: 'Ana Torres',
    role: 'admin',
    company: 'BuildPro',
    position: 'Administrador',
    email: 'admin@demo.com',
    active: true,
    projectName: 'Proyecto San Martín',
  },
];

export const getTools = async (): Promise<Tool[]> => {
  if (!db || !isFirebaseConfigured) {
    return defaultTools;
  }

  const snapshot = await getDocs(collection(db, 'tools'));
  if (snapshot.empty) {
    return defaultTools;
  }

  return snapshot.docs.map((docSnap) => normalizeToolDoc(docSnap.id, docSnap.data()));
};

export const createTool = async (payload: Partial<Tool>) => {
  if (!db || !isFirebaseConfigured) {
    return 'demo-tool-id';
  }

  const toolData = {
    ...payload,
    name: payload.name ?? 'Herramienta',
    category: payload.category ?? 'General',
    brand: payload.brand ?? 'Sin marca',
    model: payload.model ?? 'Sin modelo',
    serialNumber: payload.serialNumber ?? '',
    status: payload.status ?? 'available',
    observations: payload.observations ?? '',
    photoUrl: payload.photoUrl ?? '',
    photoLabel: payload.photoLabel ?? '🧰',
    createdAt: payload.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, 'tools'), toolData);
  return ref.id;
};

export const updateTool = async (toolId: string, payload: Partial<Tool>) => {
  if (!db || !isFirebaseConfigured) {
    return;
  }

  const ref = doc(db, 'tools', toolId);
  await updateDoc(ref, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
};

export const cleanupOrphanToolMovements = async () => {
  const firestoreDb = db;

  if (!firestoreDb || !isFirebaseConfigured) {
    return { removedDeliveries: 0, removedReturns: 0 };
  }

  const validToolIds = new Set(
    (await getDocs(collection(firestoreDb, 'tools'))).docs.map((docSnap) => docSnap.id),
  );

  const [deliveriesSnapshot, returnsSnapshot] = await Promise.all([
    getDocs(collection(firestoreDb, 'toolDeliveries')),
    getDocs(collection(firestoreDb, 'toolReturns')),
  ]);

  const orphanDeliveries = deliveriesSnapshot.docs.filter((docSnap) => {
    const toolId = (docSnap.data() as { toolId?: string }).toolId;
    return !!toolId && !validToolIds.has(toolId);
  });

  const orphanReturns = returnsSnapshot.docs.filter((docSnap) => {
    const toolId = (docSnap.data() as { toolId?: string }).toolId;
    return !!toolId && !validToolIds.has(toolId);
  });

  await Promise.all([
    ...orphanDeliveries.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolDeliveries', docSnap.id))),
    ...orphanReturns.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolReturns', docSnap.id))),
  ]);

  return {
    removedDeliveries: orphanDeliveries.length,
    removedReturns: orphanReturns.length,
  };
};

export const resetOperationalState = async () => {
  const firestoreDb = db;

  if (!firestoreDb || !isFirebaseConfigured) {
    throw new Error('Firebase no está configurado para reiniciar el flujo operativo. Verifica la configuración de Firebase y vuelve a intentarlo.');
  }

  const [toolsSnapshot, requestsSnapshot, deliveriesSnapshot, returnsSnapshot, notificationsSnapshot, auditLogsSnapshot] = await Promise.all([
    getDocs(collection(firestoreDb, 'tools')),
    getDocs(collection(firestoreDb, 'toolRequests')),
    getDocs(collection(firestoreDb, 'toolDeliveries')),
    getDocs(collection(firestoreDb, 'toolReturns')),
    getDocs(collection(firestoreDb, 'notifications')),
    getDocs(collection(firestoreDb, 'auditLogs')),
  ]);

  const resetTools = await Promise.all(
    toolsSnapshot.docs.map((docSnap) => updateDoc(doc(firestoreDb, 'tools', docSnap.id), {
      status: 'available',
      updatedAt: new Date().toISOString(),
    })),
  );

  const deleteOperations = [
    ...requestsSnapshot.docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolRequests', docSnap.id))),
    ...deliveriesSnapshot.docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolDeliveries', docSnap.id))),
    ...returnsSnapshot.docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolReturns', docSnap.id))),
    ...notificationsSnapshot.docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'notifications', docSnap.id))),
    ...auditLogsSnapshot.docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'auditLogs', docSnap.id))),
  ];

  await Promise.all(deleteOperations);

  return {
    deletedRequests: requestsSnapshot.size,
    deletedDeliveries: deliveriesSnapshot.size,
    deletedReturns: returnsSnapshot.size,
    deletedNotifications: notificationsSnapshot.size,
    deletedAuditLogs: auditLogsSnapshot.size,
    resetTools: resetTools.length,
  };
};

export const deleteTool = async (toolId: string) => {
  const firestoreDb = db;

  if (!firestoreDb || !isFirebaseConfigured) {
    return;
  }

  if (!toolId || toolId.trim() === '') {
    throw new Error('No se pudo identificar la herramienta para eliminar.');
  }

  const toolRef = doc(firestoreDb, 'tools', toolId);
  const toolDoc = await getDoc(toolRef);

  if (!toolDoc.exists()) {
    throw new Error('La herramienta ya no existe en el inventario.');
  }

  await Promise.all([
    deleteDoc(toolRef),
    ...((await getDocs(query(collection(firestoreDb, 'toolDeliveries'), where('toolId', '==', toolId)))).docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolDeliveries', docSnap.id)))),
    ...((await getDocs(query(collection(firestoreDb, 'toolReturns'), where('toolId', '==', toolId)))).docs.map((docSnap) => deleteDoc(doc(firestoreDb, 'toolReturns', docSnap.id)))),
  ]);

  await cleanupOrphanToolMovements();
};

export const getUsers = async (): Promise<UserProfile[]> => {
  if (!db || !isFirebaseConfigured) {
    return defaultUsers;
  }

  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  })) as UserProfile[];
};

export const getAllRequests = async (): Promise<ToolRequest[]> => {
  if (!db || !isFirebaseConfigured) {
    return mockRequests;
  }

  const snapshot = await getDocs(collection(db, 'toolRequests'));
  return snapshot.docs.map((docSnap) => normalizeToolRequest(docSnap.id, docSnap.data()));
};

export const getRequestsByUser = async (uid: string): Promise<ToolRequest[]> => {
  if (!db || !isFirebaseConfigured) {
    return mockRequests.filter((request) => request.requesterUid === uid || request.requesterName === 'María López' || request.requesterName === 'Carlos Rojas');
  }

  const q = query(collection(db, 'toolRequests'), where('requesterUid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeToolRequest(docSnap.id, docSnap.data()));
};

export const getPendingRequestsForApproval = async (): Promise<ToolRequest[]> => {
  if (!db || !isFirebaseConfigured) {
    return mockRequests.filter((request) => request.status === 'pending' || request.items.some((item) => item.approvalStatus === 'pending'));
  }

  const snapshot = await getDocs(collection(db, 'toolRequests'));
  const requests = snapshot.docs
    .map((docSnap) => normalizeToolRequest(docSnap.id, docSnap.data()))
    .filter((request) => request.status === 'pending' || request.items.some((item) => item.approvalStatus === 'pending'));

  return requests;
};

export const getDashboardSummary = async () => {
  const zeroSummary = {
    totalInventory: 0,
    available: 0,
    loaned: 0,
    overdue: 0,
    damaged: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalLoans: 0,
    topTools: [] as string[],
    topWorkers: [] as string[],
  };

  if (!db || !isFirebaseConfigured) {
    return zeroSummary;
  }

  const [toolSnapshot, requestSnapshot, deliverySnapshot, returnSnapshot] = await Promise.all([
    getDocs(collection(db, 'tools')),
    getDocs(collection(db, 'toolRequests')),
    getDocs(collection(db, 'toolDeliveries')),
    getDocs(collection(db, 'toolReturns')),
  ]);

  const tools = toolSnapshot.docs.map((docSnap) => normalizeToolDoc(docSnap.id, docSnap.data()));
  const requests = requestSnapshot.docs.map((docSnap) => normalizeToolRequest(docSnap.id, docSnap.data()));
  const deliveries = deliverySnapshot.docs.map((docSnap) => docSnap.data());
  const returns = returnSnapshot.docs.map((docSnap) => docSnap.data());

  const totalInventory = tools.length;
  const available = tools.filter((tool) => tool.status === 'available').length;
  const loaned = tools.filter((tool) => tool.status === 'loaned').length;
  const damaged = tools.filter((tool) => tool.status === 'maintenance' || tool.status === 'out_of_service').length;

  const pending = requests.filter((request) => request.status === 'pending').length;
  const approved = requests.filter((request) => request.status === 'approved').length;
  const rejected = requests.filter((request) => request.status === 'rejected').length;

  const today = new Date();
  const overdue = requests.filter((request) => {
    if (request.status !== 'approved') return false;

    return request.items.some((item) => item.dueDate && new Date(item.dueDate) < today && item.approvalStatus === 'approved');
  }).length;

  const toolUsage = new Map<string, number>();
  requests.forEach((request) => {
    request.items.forEach((item) => {
      const toolName = item.toolName || 'Herramienta';
      toolUsage.set(toolName, (toolUsage.get(toolName) ?? 0) + Math.max(1, item.quantity || 1));
    });
  });

  const workerUsage = new Map<string, number>();
  requests.forEach((request) => {
    const key = request.requesterName || 'Solicitante';
    workerUsage.set(key, (workerUsage.get(key) ?? 0) + 1);
  });

  const totalLoans = deliveries.length + returns.length + (loaned > 0 ? loaned : 0);

  const topTools = [...toolUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);

  const topWorkers = [...workerUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);

  return {
    totalInventory,
    available,
    loaned,
    overdue,
    damaged,
    pending,
    approved,
    rejected,
    totalLoans,
    topTools,
    topWorkers,
  };
};

export const getApprovedRequestsForDelivery = async (): Promise<ToolRequest[]> => {
  if (!db || !isFirebaseConfigured) {
    return mockRequests.filter((request) => request.status === 'approved');
  }

  const snapshot = await getDocs(collection(db, 'toolRequests'));

  return snapshot.docs
    .map((docSnap) => normalizeToolRequest(docSnap.id, docSnap.data()))
    .filter((request) => request.status === 'approved' || request.items.some((item) => item.approvalStatus === 'approved'));
};

export const addToolRequest = async (payload: Partial<ToolRequest>) => {
  if (!db || !isFirebaseConfigured) {
    return 'demo-request-id';
  }

  const ref = await addDoc(collection(db, 'toolRequests'), {
    ...payload,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    status: payload.status ?? 'pending',
    items: payload.items ?? [],
  });

  const users = await getUsers();
  const jefeUser = users.find((user) => user.role === 'jefe_obra' && user.active !== false);
  const jefeUid = jefeUser?.uid ?? 'xpLWLDh7M2THOLtGD7BmFbOjyk13';

  await createNotification({
    recipientUid: jefeUid,
    title: 'Nueva solicitud de herramienta',
    body: `${payload.requesterName ?? 'Un solicitante'} envió una solicitud pendiente de aprobación.`,
    type: 'request_created',
    requestId: ref.id,
  });

  return ref.id;
};

export const updateToolRequestStatus = async (requestId: string, status: ToolRequest['status']) => {
  if (!db || !isFirebaseConfigured) {
    return;
  }

  const ref = doc(db, 'toolRequests', requestId);
  await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
};

export const updateToolRequestItemApproval = async (
  requestId: string,
  itemId: string,
  decision: 'approved' | 'rejected',
  approverName: string,
  comment?: string,
) => {
  if (!db || !isFirebaseConfigured) {
    return;
  }

  const ref = doc(db, 'toolRequests', requestId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return;
  }

  const currentRequest = snapshot.data() as Partial<ToolRequest>;
  const nextItems = (currentRequest.items ?? []).map((item: ToolRequestItem) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      approvalStatus: decision,
      approvalComment: comment ?? item.approvalComment ?? '',
      notes: comment ?? item.notes ?? '',
      approvedAt: new Date().toISOString(),
      approverName,
    };
  });

  const allDone = nextItems.every((item) => item.approvalStatus !== 'pending');
  const allApproved = nextItems.every((item) => item.approvalStatus === 'approved');
  const allRejected = nextItems.every((item) => item.approvalStatus === 'rejected');
  const requestStatus = allDone ? (allApproved ? 'approved' : allRejected ? 'rejected' : 'pending') : 'pending';

  await updateDoc(ref, {
    items: nextItems,
    status: requestStatus,
    updatedAt: new Date().toISOString(),
  });

  const targetTool = nextItems.find((item) => item.id === itemId);
  const requesterUid = currentRequest.requesterUid as string | undefined;
  const requesterName = currentRequest.requesterName as string | undefined;

  if (requesterUid) {
    await createNotification({
      recipientUid: requesterUid,
      title: decision === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada',
      body: decision === 'approved'
        ? `Tu herramienta ${targetTool?.toolName ?? 'solicitada'} fue aprobada por ${approverName}.`
        : `Tu herramienta ${targetTool?.toolName ?? 'solicitada'} fue rechazada por ${approverName}.`,
      type: decision === 'approved' ? 'request_approved' : 'request_rejected',
      requestId,
      toolId: targetTool?.toolId,
    });
  }

  await logAuditEvent({
    action: 'tool_request_approval_updated',
    entity: 'toolRequests',
    entityId: requestId,
    userUid: requesterUid,
    userName: requesterName,
    details: { itemId, decision, approverName, comment: comment ?? '' },
  });
};

const logAuditEvent = async (event: {
  action: string;
  entity: string;
  entityId: string;
  userUid?: string;
  userName?: string;
  details?: Record<string, any>;
}) => {
  if (!db || !isFirebaseConfigured) {
    return;
  }

  await addDoc(collection(db, 'auditLogs'), {
    id: `${event.entity}-${Date.now()}`,
    ...event,
    timestamp: new Date().toISOString(),
  });
};

export const createNotification = async (payload: {
  recipientUid: string;
  title: string;
  body: string;
  type: 'request_created' | 'request_approved' | 'request_rejected' | 'delivery_registered' | 'return_registered' | 'damage_reported';
  read?: boolean;
  requestId?: string;
  toolId?: string;
}) => {
  if (!db || !isFirebaseConfigured) {
    return 'demo-notification-id';
  }

  const ref = await addDoc(collection(db, 'notifications'), {
    ...payload,
    read: payload.read ?? false,
    createdAt: new Date().toISOString(),
  });

  return ref.id;
};

export const getNotificationsByUser = async (uid: string): Promise<NotificationItem[]> => {
  if (!db || !isFirebaseConfigured) {
    return [];
  }

  const q = query(collection(db, 'notifications'), where('recipientUid', '==', uid));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<NotificationItem, 'id'>),
    }))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
};

export const getUnreadNotificationCount = async (uid: string) => {
  if (!db || !isFirebaseConfigured) {
    return 0;
  }

  const q = query(collection(db, 'notifications'), where('recipientUid', '==', uid), where('read', '==', false));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const markNotificationsAsRead = async (uid: string) => {
  if (!db || !isFirebaseConfigured) {
    return;
  }

  const snapshot = await getDocs(query(collection(db, 'notifications'), where('recipientUid', '==', uid), where('read', '==', false)));

  for (const docSnap of snapshot.docs) {
    await updateDoc(doc(db, 'notifications', docSnap.id), { read: true });
  }
};

export const recordToolDelivery = async (delivery: {
  requestId: string;
  requesterUid: string;
  requesterName: string;
  toolId: string;
  toolName: string;
  status: string;
  observations?: string;
  photos?: string[];
}) => {
  if (!db || !isFirebaseConfigured) {
    return 'demo-delivery-id';
  }

  const ref = await addDoc(collection(db, 'toolDeliveries'), {
    ...delivery,
    createdAt: new Date().toISOString(),
  });

  await updateDoc(doc(db, 'tools', delivery.toolId), {
    status: 'loaned',
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);

  await createNotification({
    recipientUid: delivery.requesterUid,
    title: 'Entrega registrada',
    body: `La herramienta ${delivery.toolName} fue entregada y queda en uso por ${delivery.requesterName}.`,
    type: 'delivery_registered',
    requestId: delivery.requestId,
    toolId: delivery.toolId,
  });

  await logAuditEvent({
    action: 'tool_delivered',
    entity: 'toolDeliveries',
    entityId: ref.id,
    userUid: delivery.requesterUid,
    userName: delivery.requesterName,
    details: { toolId: delivery.toolId, toolName: delivery.toolName, status: delivery.status },
  });

  return ref.id;
};

export const recordToolReturn = async (payload: {
  requestId: string;
  requesterUid: string;
  requesterName: string;
  toolId: string;
  toolName: string;
  status: string;
  observations?: string;
  photos?: string[];
  reportedDamage?: boolean;
}) => {
  if (!db || !isFirebaseConfigured) {
    return 'demo-return-id';
  }

  const ref = await addDoc(collection(db, 'toolReturns'), {
    ...payload,
    createdAt: new Date().toISOString(),
  });

  const nextToolStatus = payload.reportedDamage ? 'maintenance' : 'available';

  await updateDoc(doc(db, 'tools', payload.toolId), {
    status: nextToolStatus,
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);

  await createNotification({
    recipientUid: payload.requesterUid,
    title: 'Devolución registrada',
    body: `La herramienta ${payload.toolName} fue devuelta con estado ${payload.status ?? 'Good'}.`,
    type: 'return_registered',
    requestId: payload.requestId,
    toolId: payload.toolId,
  });

  if (payload.reportedDamage) {
    const users = await getUsers();
    const jefeUser = users.find((user) => user.role === 'jefe_obra' && user.active !== false);

    if (jefeUser?.uid) {
      await createNotification({
        recipientUid: jefeUser.uid,
        title: 'Daño reportado en herramienta',
        body: `La herramienta ${payload.toolName} fue devuelta en estado dañado por ${payload.requesterName}.`,
        type: 'damage_reported',
        requestId: payload.requestId,
        toolId: payload.toolId,
      });
    }
  }

  await logAuditEvent({
    action: 'tool_returned',
    entity: 'toolReturns',
    entityId: ref.id,
    userUid: payload.requesterUid,
    userName: payload.requesterName,
    details: { toolId: payload.toolId, toolName: payload.toolName, reportedDamage: payload.reportedDamage ?? false },
  });

  return ref.id;
};
