//  NOTE: This module uses the Firebase client SDK and must run in the browser (authenticated context).

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadImage(file: File, path: string): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('No file provided for upload.');
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name.replace(/\s+/g, '-')}`;
  const storageRef = ref(storage, `${path}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}
