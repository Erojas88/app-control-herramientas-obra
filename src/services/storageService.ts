import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../config/firebase';

export const uploadToolEvidence = async (userId: string, toolId: string, file: Blob | Uint8Array | ArrayBuffer) => {
  if (!storage || !isFirebaseConfigured) {
    return `https://example.com/mock/${userId}/${toolId}.jpg`;
  }

  const fileName = `${userId}_${toolId}_${Date.now()}.jpg`;
  const storageRef = ref(storage, `tool-evidence/${fileName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
