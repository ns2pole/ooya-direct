import {
  type PrefectureApi,
  type SinglePrefecture,
  type MachiAzaApi,
  cityName,
  machiAzaName,
} from '@geolonia/japanese-addresses-v2';

const BASE = 'https://japanese-addresses-v2.geoloniamaps.com/api/ja';

let jaJsonCache: Promise<PrefectureApi> | null = null;

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`住所データの取得に失敗しました (${r.status})`);
    return r.json() as Promise<T>;
  });
}

export function getPrefectureApi(): Promise<PrefectureApi> {
  if (!jaJsonCache) {
    jaJsonCache = fetchJson<PrefectureApi>(`${BASE}.json`);
  }
  return jaJsonCache;
}

export function getPrefectureNames(prefs: SinglePrefecture[]): string[] {
  return prefs.map((p) => p.pref);
}

export function findPrefecture(
  prefs: SinglePrefecture[],
  name: string
): SinglePrefecture | undefined {
  return prefs.find((p) => p.pref === name);
}

export function getCityNamesForPrefecture(pref: SinglePrefecture): string[] {
  const set = new Set<string>();
  for (const c of pref.cities) {
    set.add(cityName(c));
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
}

export function getTownNamesForPrefAndCity(
  prefName: string,
  cityNameValue: string
): Promise<string[]> {
  const path = `${BASE}/${encodeURIComponent(prefName)}/${encodeURIComponent(cityNameValue)}.json`;
  return fetchJson<MachiAzaApi>(path).then((res) => {
    const set = new Set<string>();
    for (const m of res.data) {
      const line = machiAzaName(m).trim();
      if (line) set.add(line);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  });
}
