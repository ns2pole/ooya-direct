export function houseIdsForSource(
  houses: { id: string; sourceId: string }[],
  sourceId: string
): string[] {
  return houses.filter((house) => house.sourceId === sourceId).map((house) => house.id);
}

export function houseIdsForLandlord(
  houses: { id: string; landlordId: string }[],
  landlordId: string
): string[] {
  return houses
    .filter((house) => house.landlordId === landlordId)
    .map((house) => house.id);
}

export function sourceIdsForLandlord(
  sources: { id: string; landlordId: string }[],
  landlordId: string
): string[] {
  return sources
    .filter((source) => source.landlordId === landlordId)
    .map((source) => source.id);
}
