import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFns } from '../../firebase';
import { deleteAllHousePhotos } from '../../lib/housePhotos';
import { useAdminRefresh } from '../../context/AdminRefreshContext';
import { useAuth } from '../../context/AuthContext';
import type { House } from '../../types';
import { mapHouse } from '../../lib/mapHouse';
import { portalLabel, type BoardLandlord, type BoardSource } from '../../lib/landlordBoard';

export type JimotyStatus = {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
  lastSyncedAt: Timestamp | null;
};

export function useAdminCatalog() {
  const { user } = useAuth();
  const { version } = useAdminRefresh();
  const [houses, setHouses] = useState<House[]>([]);
  const [landlords, setLandlords] = useState<BoardLandlord[]>([]);
  const [sources, setSources] = useState<BoardSource[]>([]);
  const [status, setStatus] = useState<JimotyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localVersion, setLocalVersion] = useState(0);

  function reload() {
    setLocalVersion((current) => current + 1);
  }

  useEffect(() => {
    if (!user) {
      setHouses([]);
      setLandlords([]);
      setSources([]);
      setStatus(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const db = getDb();
        const [houseSnap, landlordSnap, sourceSnap, settingsSnap] = await Promise.all([
          getDocs(
            query(collection(db, 'houses'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'))
          ),
          getDocs(query(collection(db, 'landlords'), where('ownerId', '==', user.uid))),
          getDocs(query(collection(db, 'portalSources'), where('ownerId', '==', user.uid))),
          getDoc(doc(db, 'settings', 'jimoty')),
        ]);
        const nextHouses: House[] = [];
        houseSnap.forEach((item) => {
          nextHouses.push(mapHouse(item.id, item.data() as Record<string, unknown>));
        });
        const nextLandlords: BoardLandlord[] = [];
        landlordSnap.forEach((item) => {
          const data = item.data() as Record<string, unknown>;
          nextLandlords.push({ id: item.id, name: String(data.name ?? '') });
        });
        nextLandlords.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        const nextSources: BoardSource[] = [];
        sourceSnap.forEach((item) => {
          const data = item.data() as Record<string, unknown>;
          nextSources.push({
            id: item.id,
            landlordId: String(data.landlordId ?? ''),
            portal: String(data.portal ?? ''),
            url: String(data.url ?? ''),
          });
        });
        const settings = settingsSnap.exists() ? settingsSnap.data() : null;
        if (!cancelled) {
          setHouses(nextHouses);
          setLandlords(nextLandlords);
          setSources(nextSources);
          setStatus(
            settings?.lastSyncedAt
              ? {
                  lastSyncedAt: settings.lastSyncedAt as Timestamp,
                  created: Number(settings.lastCreated ?? 0),
                  updated: Number(settings.lastUpdated ?? 0),
                  removed: Number(settings.lastRemoved ?? 0),
                  unchanged: Number(settings.lastUnchanged ?? 0),
                }
              : null
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '一覧の取得に失敗しました。');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, version, localVersion]);

  return { houses, landlords, sources, status, loading, error, reload, setHouses };
}

export async function createLandlord(ownerId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'landlords'), {
    name: name.trim(),
    ownerId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameLandlord(landlordId: string, name: string): Promise<void> {
  await updateDoc(doc(getDb(), 'landlords', landlordId), {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function addPortalSource(landlordId: string, url: string): Promise<void> {
  const fn = httpsCallable<{ landlordId: string; portal: string; url: string }, { id: string }>(
    getFns(),
    'registerPortalSource'
  );
  await fn({ landlordId, portal: 'jimoty', url });
}

export async function removePortalSource(sourceId: string): Promise<void> {
  const fn = httpsCallable<{ sourceId: string }, { removed: number }>(getFns(), 'deletePortalSource');
  await fn({ sourceId });
}

export async function removeLandlord(landlordId: string): Promise<void> {
  const fn = httpsCallable<{ landlordId: string }, { removedHouses: number }>(
    getFns(),
    'deleteLandlord'
  );
  await fn({ landlordId });
}

export async function setHouseHidden(houseId: string, hidden: boolean): Promise<void> {
  await updateDoc(doc(getDb(), 'houses', houseId), {
    hidden,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteManualHouse(houseId: string): Promise<void> {
  await deleteAllHousePhotos(houseId);
  await deleteDoc(doc(getDb(), 'houses', houseId));
}

export function portalLabelForHouse(
  house: Pick<House, 'fromSync' | 'sourceId'>,
  sources: BoardSource[]
): string {
  if (!house.fromSync) return 'ポータルなし';
  const source = sources.find((item) => item.id === house.sourceId);
  return source ? portalLabel(source.portal) : 'ポータルなし';
}
