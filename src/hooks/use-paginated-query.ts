"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    collection, 
    query, 
    getDocs, 
    limit, 
    startAfter, 
    endBefore,
    limitToLast,
    QueryConstraint,
    DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePaginatedQuery<T>(path: string, constraints: QueryConstraint[] = [], pageSize: number = 20) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Keep track of cursor snapshots for cursor pagination
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  
  // Navigation state pointers to know pages history limits
  const [pageTokens, setPageTokens] = useState<(DocumentSnapshot | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    setLoading(true);
    try {
      let q = query(collection(db, path), ...constraints, limit(pageSize));
      
      if (direction === 'next' && lastVisible) {
        q = query(collection(db, path), ...constraints, startAfter(lastVisible), limit(pageSize));
      } else if (direction === 'prev' && currentPage > 0) {
        // Obtenemos el snapshot anterior desde nuestro historial
        const prevToken = pageTokens[currentPage - 1];
        if (prevToken) {
            q = query(collection(db, path), ...constraints, startAfter(prevToken), limit(pageSize));
        } else {
            // Si es la página 0 (inicio), simplemente ejecutamos el query base
             q = query(collection(db, path), ...constraints, limit(pageSize));
        }
      }

      const documentSnapshots = await getDocs(q);
      
      const documents = documentSnapshots.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as T[];
      
      setData(documents);
      
      if (!documentSnapshots.empty) {
        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        
        if (direction === 'next') {
            const nextTokens = [...pageTokens.slice(0, currentPage + 1), lastVisible];
            setPageTokens(nextTokens);
            setCurrentPage(prev => prev + 1);
        } else if (direction === 'prev') {
            setCurrentPage(prev => Math.max(0, prev - 1));
        } else if (direction === 'initial') {
            setPageTokens([null, documentSnapshots.docs[documentSnapshots.docs.length - 1]]);
            setCurrentPage(0);
        }
        
        // Verifica si hay más buscando 1 doc adicional (esta es una forma de no pagar la lectura extra)
        // Pero usamos la lógica simple basado en docs cargados:
        setHasMore(documentSnapshots.docs.length === pageSize);
      } else {
         if (direction === 'next') {
             setHasMore(false);
         }
      }
    } catch(err: any) {
        console.error(`Error paginating collection ${path}:`, err);
        setError(err);
    } finally {
        setLoading(false);
    }
  }, [path, JSON.stringify(constraints), pageSize, currentPage, lastVisible, pageTokens]);

  useEffect(() => {
    fetchPage('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(constraints), pageSize]); // Only run on initial mount or when base constraints change

  const nextPage = () => {
      if (hasMore && !loading) fetchPage('next');
  };

  const prevPage = () => {
      if (currentPage > 0 && !loading) fetchPage('prev');
  };
  
  const refetch = () => {
      fetchPage('initial');
  }

  return { data, loading, error, nextPage, prevPage, hasMore, currentPage, refetch };
}
