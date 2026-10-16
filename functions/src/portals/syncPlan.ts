export const HOUSE_TEXT_FIELDS = [
  "title",
  "description",
  "prefecture",
  "city",
  "town",
  "rent",
  "managementFee",
  "genre",
  "depositKeyMoney",
  "areaSize",
  "floorArea",
  "floors",
  "buildingAge",
  "referenceUrl",
] as const;

export type HouseTextField = (typeof HOUSE_TEXT_FIELDS)[number];
export type HouseTextFields = Record<HouseTextField, string>;

export type SyncHouseSnapshot = {
  id: string;
  ownerId: string;
  sourceId: string;
  landlordId: string;
  fromSync: boolean;
  hidden: boolean;
  coverPhotoUrl: string;
  fields: HouseTextFields;
};

export type SyncListing = {
  docId: string;
  photoUrl: string | null;
  fields: HouseTextFields;
};

export type SyncCreate = {
  id: string;
  ownerId: string;
  landlordId: string;
  sourceId: string;
  fromSync: true;
  hidden: false;
  fields: HouseTextFields;
  coverPhotoUrl?: string;
};

export type SyncUpdate = {
  id: string;
  patch: Record<string, string | boolean>;
};

export type SourceSyncPlan = {
  create: SyncCreate[];
  update: SyncUpdate[];
  removeIds: string[];
  unchanged: number;
};

export function coverPhotoToWrite(
  current: string,
  incoming: string | null
): string | undefined {
  if (!incoming) return undefined;
  const existing = current.trim();
  if (!existing) return incoming;
  if (existing.includes("cdn.jmty.jp") && existing !== incoming) return incoming;
  return undefined;
}

/**
 * 1件の取り込みURLについて、作成・上書き・削除を決める。
 * hidden の物件は上書きしない。成約（今回の未成約に無い）なら削除する。
 */
export function planSourceSync(input: {
  sourceId: string;
  ownerId: string;
  landlordId: string;
  listings: SyncListing[];
  houses: SyncHouseSnapshot[];
}): SourceSyncPlan {
  const { sourceId, ownerId, landlordId, listings, houses } = input;
  const byId = new Map(houses.map((item) => [item.id, item]));
  const openIds = new Set(listings.map((listing) => listing.docId));
  const plan: SourceSyncPlan = {
    create: [],
    update: [],
    removeIds: [],
    unchanged: 0,
  };

  for (const listing of listings) {
    const current = byId.get(listing.docId);
    if (!current) {
      const created: SyncCreate = {
        id: listing.docId,
        ownerId,
        landlordId,
        sourceId,
        fromSync: true,
        hidden: false,
        fields: listing.fields,
      };
      if (listing.photoUrl) created.coverPhotoUrl = listing.photoUrl;
      plan.create.push(created);
      continue;
    }

    if (current.ownerId !== ownerId || (current.sourceId !== "" && current.sourceId !== sourceId)) {
      plan.unchanged += 1;
      continue;
    }

    if (current.hidden) {
      plan.unchanged += 1;
      continue;
    }

    const patch: Record<string, string | boolean> = {};
    for (const key of HOUSE_TEXT_FIELDS) {
      if (current.fields[key] !== listing.fields[key]) patch[key] = listing.fields[key];
    }
    const photo = coverPhotoToWrite(current.coverPhotoUrl, listing.photoUrl);
    if (photo) patch.coverPhotoUrl = photo;
    if (current.sourceId !== sourceId) patch.sourceId = sourceId;
    if (current.landlordId !== landlordId) patch.landlordId = landlordId;
    if (!current.fromSync) patch.fromSync = true;

    if (Object.keys(patch).length === 0) {
      plan.unchanged += 1;
      continue;
    }
    plan.update.push({ id: current.id, patch });
  }

  for (const item of houses) {
    if (item.ownerId !== ownerId) continue;
    if (item.sourceId !== sourceId) continue;
    if (openIds.has(item.id)) continue;
    plan.removeIds.push(item.id);
  }

  return plan;
}
