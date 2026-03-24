import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SystemConfig } from '@/lib/types';

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'System', 'config');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as SystemConfig);
      } else {
        setConfig(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching System config:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { config, loading };
}
