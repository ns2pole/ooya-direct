export type BoardLandlord = {
  id: string;
  name: string;
};

export type BoardSource = {
  id: string;
  landlordId: string;
  portal: string;
  url: string;
};

export type BoardHouse = {
  id: string;
  title: string;
  landlordId: string;
  sourceId: string;
  fromSync: boolean;
  hidden: boolean;
  meta: string;
  coverPhotoUrl: string | null;
};

export type LandlordPortalGroup = {
  source: BoardSource;
  houses: BoardHouse[];
};

export type LandlordGroup = {
  landlord: BoardLandlord;
  portals: LandlordPortalGroup[];
  manualHouses: BoardHouse[];
};

export function portalLabel(portal: string): string {
  if (portal === 'jimoty') return 'ジモティー';
  return portal;
}

export function groupLandlordBoard(
  landlords: BoardLandlord[],
  sources: BoardSource[],
  houses: BoardHouse[]
): LandlordGroup[] {
  return landlords.map((landlord) => {
    const portals = sources
      .filter((source) => source.landlordId === landlord.id)
      .slice()
      .sort((a, b) => a.url.localeCompare(b.url))
      .map((source) => ({
        source,
        houses: houses.filter(
          (house) => house.landlordId === landlord.id && house.sourceId === source.id
        ),
      }));
    const sourceIds = new Set(portals.map((group) => group.source.id));
    return {
      landlord,
      portals,
      manualHouses: houses.filter(
        (house) => house.landlordId === landlord.id && !sourceIds.has(house.sourceId)
      ),
    };
  });
}
