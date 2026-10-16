import { describe, expect, it } from "vitest";
import {
  planSourceSync,
  type SyncHouseSnapshot,
  type SyncListing,
} from "./syncPlan";

const SOURCE = "src-mitchy";
const OWNER = "admin";
const LANDLORD = "landlord-mitchy";

function fields(title: string): SyncListing["fields"] {
  return {
    title,
    description: "説明",
    prefecture: "三重県",
    city: "名張市",
    town: "さつき台",
    rent: "50000",
    managementFee: "",
    genre: "一戸建て",
    depositKeyMoney: "なし",
    areaSize: "4DK",
    floorArea: "",
    floors: "",
    buildingAge: "",
    referenceUrl: "https://jmty.jp/mie/sale-est/article-aaa",
  };
}

function listing(docId: string, title: string, photoUrl: string | null = null): SyncListing {
  return { docId, photoUrl, fields: fields(title) };
}

function house(overrides: Partial<SyncHouseSnapshot> = {}): SyncHouseSnapshot {
  return {
    id: "jmty-aaa",
    ownerId: OWNER,
    sourceId: SOURCE,
    landlordId: LANDLORD,
    fromSync: true,
    hidden: false,
    coverPhotoUrl: "",
    fields: fields("さつき台"),
    ...overrides,
  };
}

function planFor(
  listings: SyncListing[],
  houses: SyncHouseSnapshot[]
) {
  return planSourceSync({
    sourceId: SOURCE,
    ownerId: OWNER,
    landlordId: LANDLORD,
    listings,
    houses,
  });
}

describe("planSourceSync", () => {
  it("未掲載の未成約は新規作成する", () => {
    const plan = planFor([listing("jmty-new", "つつじが丘", "https://cdn.jmty.jp/a.jpg")], []);
    expect(plan.create).toEqual([
      expect.objectContaining({
        id: "jmty-new",
        ownerId: OWNER,
        landlordId: LANDLORD,
        sourceId: SOURCE,
        fromSync: true,
        hidden: false,
        coverPhotoUrl: "https://cdn.jmty.jp/a.jpg",
      }),
    ]);
    expect(plan.create[0].fields.title).toBe("つつじが丘");
    expect(plan.removeIds).toEqual([]);
  });

  it("変わった項目だけ上書きする", () => {
    const plan = planFor(
      [listing("jmty-aaa", "さつき台 値下げ", "https://cdn.jmty.jp/new.jpg")],
      [house({ coverPhotoUrl: "https://cdn.jmty.jp/old.jpg" })]
    );
    expect(plan.update).toEqual([
      {
        id: "jmty-aaa",
        patch: {
          title: "さつき台 値下げ",
          coverPhotoUrl: "https://cdn.jmty.jp/new.jpg",
        },
      },
    ]);
    expect(plan.update[0].patch.hidden).toBeUndefined();
  });

  it("大家が差し替えた画像はジモティーの画像で上書きしない", () => {
    const plan = planFor(
      [listing("jmty-aaa", "さつき台", "https://cdn.jmty.jp/new.jpg")],
      [house({ coverPhotoUrl: "https://firebasestorage.googleapis.com/cover.jpg" })]
    );
    expect(plan.update).toEqual([]);
    expect(plan.unchanged).toBe(1);
  });

  it("非表示の物件は上書きせず、フラグも戻さない", () => {
    const plan = planFor(
      [listing("jmty-aaa", "さつき台 値下げ")],
      [house({ hidden: true })]
    );
    expect(plan.update).toEqual([]);
    expect(plan.removeIds).toEqual([]);
    expect(plan.unchanged).toBe(1);
  });

  it("そのURLに無くなった物件は、非表示でも削除する", () => {
    const plan = planFor(
      [],
      [
        house({ id: "jmty-sold", hidden: true }),
        house({ id: "jmty-open" }),
      ]
    );
    const withOpen = planFor(
      [listing("jmty-open", "さつき台")],
      [
        house({ id: "jmty-sold", hidden: true }),
        house({ id: "jmty-open" }),
      ]
    );
    expect(plan.removeIds).toEqual(["jmty-sold", "jmty-open"]);
    expect(withOpen.removeIds).toEqual(["jmty-sold"]);
  });

  it("他のURLの物件と手動物件は削除しない", () => {
    const plan = planFor(
      [listing("jmty-aaa", "さつき台")],
      [
        house(),
        house({ id: "jmty-other", sourceId: "src-other" }),
        house({ id: "manual-1", sourceId: "", fromSync: false, landlordId: LANDLORD }),
      ]
    );
    expect(plan.removeIds).toEqual([]);
  });

  it("別のURLの物件は取り込んで上書きしない", () => {
    const plan = planFor(
      [listing("jmty-other", "別タイトル")],
      [house({ id: "jmty-other", sourceId: "src-other", fields: fields("元タイトル") })]
    );
    expect(plan.update).toEqual([]);
    expect(plan.create).toEqual([]);
    expect(plan.unchanged).toBe(1);
  });

  it("別の管理者の物件は触らない", () => {
    const plan = planFor(
      [],
      [house({ id: "jmty-sold", ownerId: "someone-else" })]
    );
    expect(plan.removeIds).toEqual([]);
    expect(plan.unchanged).toBe(0);
  });
});
