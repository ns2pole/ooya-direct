import { AdminLandlordTable } from '../../components/AdminLandlordTable';
import { useAdminCatalog } from './useAdminCatalog';

export function AdminLandlordsPage() {
  const { landlords, sources, loading, error } = useAdminCatalog();

  if (loading) {
    return (
      <section className="panel">
        <p>読み込み中…</p>
      </section>
    );
  }

  return (
    <>
      {error ? <p className="text-error">{error}</p> : null}
      <AdminLandlordTable
        rows={landlords.map((landlord) => ({
          id: landlord.id,
          name: landlord.name,
          urls: sources.filter((source) => source.landlordId === landlord.id).map((source) => source.url),
        }))}
      />
    </>
  );
}
