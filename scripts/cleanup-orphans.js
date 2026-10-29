const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const { GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_PROJECT_ID } = process.env;

if (!GOOGLE_APPLICATION_CREDENTIALS && !FIREBASE_PROJECT_ID) {
  console.error('Falta la configuración de Firebase Admin para limpiar registros huérfanos.');
  console.error('Usa:');
  console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/ruta/al/serviceAccount.json"');
  console.error('o');
  console.error('  export FIREBASE_PROJECT_ID="control-herramientas-obra"');
  process.exit(1);
}

initializeApp({
  projectId: FIREBASE_PROJECT_ID || undefined,
  credential: GOOGLE_APPLICATION_CREDENTIALS ? applicationDefault() : undefined,
});

const db = getFirestore();

async function cleanupOrphanCollections() {
  const toolsSnapshot = await db.collection('tools').get();
  const validToolIds = new Set(toolsSnapshot.docs.map((doc) => doc.id));

  let deleted = 0;

  for (const collectionName of ['toolDeliveries', 'toolReturns']) {
    const collectionSnapshot = await db.collection(collectionName).get();
    const invalidDocs = collectionSnapshot.docs.filter((doc) => {
      const toolId = doc.get('toolId');
      return !!toolId && !validToolIds.has(toolId);
    });

    console.log(`Colección ${collectionName}: ${invalidDocs.length} registros huérfanos.`);

    for (const doc of invalidDocs) {
      await doc.ref.delete();
      deleted += 1;
    }
  }

  console.log(`Limpieza completada. Registros eliminados: ${deleted}`);
}

cleanupOrphanCollections().catch((error) => {
  console.error('Error al limpiar registros huérfanos:', error);
  process.exit(1);
});
