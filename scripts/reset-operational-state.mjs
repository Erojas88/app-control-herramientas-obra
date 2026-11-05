#!/usr/bin/env node

import admin from 'firebase-admin';

const parseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido.');
  }
};

const main = async () => {
  const serviceAccount = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!serviceAccount && !projectId) {
    throw new Error('Falta configuración. Define FIREBASE_SERVICE_ACCOUNT o FIREBASE_PROJECT_ID.');
  }

  if (!admin.apps.length) {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      admin.initializeApp({ projectId });
    }
  }

  const db = admin.firestore();
  const collections = ['toolRequests', 'toolDeliveries', 'toolReturns', 'notifications', 'auditLogs'];

  const [toolsSnapshot, ...collectionSnapshots] = await Promise.all([
    db.collection('tools').get(),
    ...collections.map((name) => db.collection(name).get()),
  ]);

  const resetTools = toolsSnapshot.docs.map((docSnap) =>
    db.collection('tools').doc(docSnap.id).update({
      status: 'available',
      updatedAt: new Date().toISOString(),
    }),
  );

  const deleteOperations = collectionSnapshots.flatMap((snapshot, index) =>
    snapshot.docs.map((docSnap) => db.collection(collections[index]).doc(docSnap.id).delete()),
  );

  await Promise.all([...resetTools, ...deleteOperations]);

  const result = {
    resetTools: toolsSnapshot.size,
    deletedRequests: collectionSnapshots[0]?.size ?? 0,
    deletedDeliveries: collectionSnapshots[1]?.size ?? 0,
    deletedReturns: collectionSnapshots[2]?.size ?? 0,
    deletedNotifications: collectionSnapshots[3]?.size ?? 0,
    deletedAuditLogs: collectionSnapshots[4]?.size ?? 0,
  };

  console.log(JSON.stringify({ ok: true, message: 'Estado operativo reiniciado a cero.', ...result }, null, 2));
};

main().catch((error) => {
  console.error('reset-operational-state failed:', error.message || error);
  process.exit(1);
});
