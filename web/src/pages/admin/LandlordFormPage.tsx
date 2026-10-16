import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LandlordEditor } from '../../components/LandlordEditor';
import { portalLabel } from '../../lib/landlordBoard';
import {
  addPortalSource,
  createLandlord,
  removeLandlord,
  removePortalSource,
  renameLandlord,
  useAdminCatalog,
} from './useAdminCatalog';

export function LandlordFormPage() {
  const { landlordId } = useParams();
  const isNew = landlordId === undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { landlords, sources, loading, reload } = useAdminCatalog();
  const landlord = landlords.find((item) => item.id === landlordId);

  async function onSaveName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('名前を入力してください。');
    if (isNew) {
      if (!user) return;
      const id = await createLandlord(user.uid, trimmed);
      showToast('大家を登録しました。', 'success');
      navigate(`/landlord/landlords/${id}`);
      return;
    }
    if (!landlordId) return;
    await renameLandlord(landlordId, trimmed);
    showToast('名前を保存しました。', 'success');
    reload();
  }

  async function onAddUrl(url: string) {
    if (!landlordId) return;
    await addPortalSource(landlordId, url);
    showToast('URLを追加しました。', 'success');
    reload();
  }

  async function onDeleteUrl(sourceId: string) {
    await removePortalSource(sourceId);
    showToast('URLを削除しました。', 'success');
    reload();
  }

  async function onDeleteLandlord() {
    if (!landlordId) return;
    await removeLandlord(landlordId);
    showToast('大家を削除しました。', 'success');
    navigate('/landlord/landlords');
  }

  if (!isNew && loading) {
    return (
      <section className="panel">
        <p>読み込み中…</p>
      </section>
    );
  }

  if (!isNew && !landlord) {
    return (
      <section className="panel">
        <p className="text-error">大家が見つかりません。</p>
      </section>
    );
  }

  return (
    <LandlordEditor
      key={landlord?.id ?? 'new'}
      name={landlord?.name ?? ''}
      sources={sources
        .filter((source) => source.landlordId === landlordId)
        .map((source) => ({
          id: source.id,
          url: source.url,
          portalLabel: portalLabel(source.portal),
        }))}
      onSaveName={onSaveName}
      onAddUrl={isNew ? undefined : onAddUrl}
      onDeleteUrl={isNew ? undefined : onDeleteUrl}
      onDeleteLandlord={isNew ? undefined : onDeleteLandlord}
    />
  );
}
