import { describe, expect, it } from "vitest";
import {
  houseIdsForLandlord,
  houseIdsForSource,
  sourceIdsForLandlord,
} from "./deletion";

describe("houseIdsForSource", () => {
  it("そのURLから入った物件だけを返す", () => {
    const ids = houseIdsForSource(
      [
        { id: "jmty-a", sourceId: "src-1" },
        { id: "jmty-b", sourceId: "src-2" },
        { id: "manual-1", sourceId: "" },
        { id: "jmty-hidden", sourceId: "src-1" },
      ],
      "src-1"
    );
    expect(ids).toEqual(["jmty-a", "jmty-hidden"]);
  });
});

describe("大家の削除対象", () => {
  it("その大家のURLと、手動を含む全物件を返す", () => {
    const houses = [
      { id: "jmty-a", landlordId: "mitchy" },
      { id: "manual-1", landlordId: "mitchy" },
      { id: "jmty-hidden", landlordId: "mitchy" },
      { id: "jmty-other", landlordId: "satchy" },
    ];
    const sources = [
      { id: "src-1", landlordId: "mitchy" },
      { id: "src-2", landlordId: "mitchy" },
      { id: "src-3", landlordId: "satchy" },
    ];
    expect(houseIdsForLandlord(houses, "mitchy")).toEqual([
      "jmty-a",
      "manual-1",
      "jmty-hidden",
    ]);
    expect(sourceIdsForLandlord(sources, "mitchy")).toEqual(["src-1", "src-2"]);
  });
});
