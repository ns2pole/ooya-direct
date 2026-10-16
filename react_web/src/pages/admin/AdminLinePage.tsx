import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFns, isFirebaseConfigured } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { formatDateOnly } from '../../format';
import { lineAddFriendUrl } from '../../lib/lineConfig';
import { LineLinkPanel } from '../../components/LineLinkPanel';
import type { LandlordProfile } from '../../types';

function mapLandlordProfile(data: Record<string, unknown>): LandlordProfile {
  const lineUserId = data.lineUserId;
  return {
    lineUserId: typeof lineUserId === 'string' && lineUserId ? lineUserId : null,
    linkedAt: (data.linkedAt as LandlordProfile['linkedAt']) ?? null,
  };
}

function messageForCallableError(err: unknown): string {
  if (err instanceof FirebaseError) return err.message;
  return '処理に失敗しました。';
}

export function AdminLinePage() {
  const { user } = useAuth();
  const [lineProfile, setLineProfile] = useState<LandlordProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [unlinkSubmitting, setUnlinkSubmitting] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setLineProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(getDb(), 'landlordProfiles', user.uid),
      (snap) => {
        setLineProfile(
          snap.exists()
            ? mapLandlordProfile(snap.data() as Record<string, unknown>)
            : { lineUserId: null, linkedAt: null }
        );
        setLoading(false);
      },
      () => {
        setLineProfile({ lineUserId: null, linkedAt: null });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  async function onStartLink() {
    setLinkSubmitting(true);
    setLinkError(null);
    try {
      const fn = httpsCallable<Record<string, never>, { code: string }>(getFns(), 'startLineLink');
      const result = await fn({});
      setLinkCode(result.data.code);
    } catch (err) {
      setLinkError(messageForCallableError(err));
    } finally {
      setLinkSubmitting(false);
    }
  }

  async function onUnlink() {
    if (!window.confirm('LINE 通知の連携を解除しますか？')) return;
    setUnlinkSubmitting(true);
    setLinkError(null);
    try {
      const fn = httpsCallable(getFns(), 'unlinkLine');
      await fn({});
      setLinkCode(null);
    } catch (err) {
      setLinkError(messageForCallableError(err));
    } finally {
      setUnlinkSubmitting(false);
    }
  }

  return (
    <LineLinkPanel
      loading={loading}
      linked={Boolean(lineProfile?.lineUserId)}
      linkedAtLabel={lineProfile?.linkedAt ? formatDateOnly(lineProfile.linkedAt) : null}
      linkCode={linkCode}
      linkError={linkError}
      linkSubmitting={linkSubmitting}
      unlinkSubmitting={unlinkSubmitting}
      addFriendUrl={lineAddFriendUrl()}
      onStartLink={() => void onStartLink()}
      onUnlink={() => void onUnlink()}
    />
  );
}
