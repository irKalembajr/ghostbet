export const competitions = [
  { name: 'Ligue 1', code: 'fr.1', country: 'FR' },
  { name: 'Premier League', code: 'en.1', country: 'EN' },
  { name: 'LaLiga', code: 'es.1', country: 'ES' },
  { name: 'Serie A', code: 'it.1', country: 'IT' },
  { name: 'Bundesliga', code: 'de.1', country: 'DE' },
] as const;
export const seasons = ['2026-27', '2025-26', '2024-25'] as const;
export type Season = (typeof seasons)[number];
export type FootballMatch = {
  id: string;
  league: string;
  code: string;
  season: string;
  date: string;
  home: string;
  away: string;
  round: string;
  score: [number, number] | null;
};
export type Feed = {
  matches: FootballMatch[];
  sources: {
    league: string;
    url: string;
    retrievedAt: string;
    count: number;
    skipped: number;
  }[];
  errors: string[];
};
const base =
  'https://raw.githubusercontent.com/openfootball/football.json/master';
export function sourceUrl(season: string, code: string) {
  if (
    !seasons.includes(season as Season) ||
    !competitions.some((c) => c.code === code)
  )
    throw new Error('Compétition ou saison non prise en charge.');
  return `${base}/${season}/${code}.json`;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export function normalizeMatches(
  input: unknown,
  season: string,
  code: string,
  today = new Date().toISOString().slice(0, 10),
) {
  sourceUrl(season, code);
  if (!record(input) || !Array.isArray(input.matches))
    throw new Error('Format de données inattendu.');
  const league = competitions.find((c) => c.code === code)!.name;
  const matches: FootballMatch[] = [];
  let skipped = 0;
  const ids = new Set<string>();
  for (const row of input.matches) {
    if (
      !record(row) ||
      typeof row.team1 !== 'string' ||
      typeof row.team2 !== 'string' ||
      !row.team1.trim() ||
      !row.team2.trim() ||
      row.team1 === row.team2 ||
      typeof row.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(Date.parse(row.date)) ||
      new Date(row.date).toISOString().slice(0, 10) !== row.date
    ) {
      skipped++;
      continue;
    }
    const ft = record(row.score) ? row.score.ft : null;
    // Null is never interpreted as 0–0. Future-dated results are not accepted.
    const score: [number, number] | null =
      row.date <= today &&
      Array.isArray(ft) &&
      ft.length === 2 &&
      ft.every((n) => Number.isInteger(n) && n >= 0 && n < 100)
        ? [ft[0], ft[1]]
        : null;
    // Dates can change when a match is postponed; teams + season keep favorites stable.
    const id = `${season}:${code}:${encodeURIComponent(row.team1)}:${encodeURIComponent(row.team2)}`;
    if (ids.has(id)) {
      skipped++;
      continue;
    }
    ids.add(id);
    matches.push({
      id,
      league,
      code,
      season,
      date: row.date,
      home: row.team1,
      away: row.team2,
      round: typeof row.round === 'string' ? row.round : '',
      score,
    });
  }
  if (!matches.length)
    throw new Error('Aucune rencontre valide dans la source.');
  return { matches, skipped };
}
export async function fetchFootball(
  season: Season,
  signal?: AbortSignal,
): Promise<Feed> {
  const results = await Promise.all(
    competitions.map(async (c) => {
      const url = sourceUrl(season, c.code);
      // Compatible with Android WebViews that predate AbortSignal.any/timeout.
      const request = new AbortController();
      const cancel = () => request.abort();
      if (signal?.aborted) request.abort();
      else signal?.addEventListener('abort', cancel, { once: true });
      const timeout = setTimeout(cancel, 20000);
      try {
        const response = await fetch(url, {
          signal: request.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'saison non publiée'
              : `source indisponible (${response.status})`,
          );
        const parsed = normalizeMatches(await response.json(), season, c.code);
        return {
          ...parsed,
          source: {
            league: c.name,
            url,
            retrievedAt: new Date().toISOString(),
            count: parsed.matches.length,
            skipped: parsed.skipped,
          },
        };
      } catch (e) {
        if (signal?.aborted) throw e;
        return {
          error: `${c.name} : ${e instanceof Error ? e.message : 'erreur réseau'}`,
        };
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', cancel);
      }
    }),
  );
  const feed: Feed = { matches: [], sources: [], errors: [] };
  for (const result of results) {
    if ('error' in result) feed.errors.push(result.error!);
    else {
      feed.matches.push(...result.matches);
      feed.sources.push(result.source);
    }
  }
  if (!feed.matches.length)
    throw new Error(
      `Aucune donnée accessible. Vérifiez votre connexion ou réessayez. ${feed.errors.join(' · ')}`,
    );
  return feed;
}
export function teamForm(
  matches: FootballMatch[],
  team: string,
  beforeDate: string,
) {
  const recent = matches
    .filter(
      (m) =>
        m.score !== null &&
        m.date < beforeDate &&
        (m.home === team || m.away === team),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .reverse();
  let goalsFor = 0,
    goalsAgainst = 0,
    cleanSheets = 0;
  const form = recent.map((m) => {
    const home = m.home === team;
    const forTeam = m.score![home ? 0 : 1];
    const against = m.score![home ? 1 : 0];
    goalsFor += forTeam;
    goalsAgainst += against;
    if (against === 0) cleanSheets++;
    return forTeam > against ? 'V' : forTeam === against ? 'N' : 'D';
  });
  return {
    count: recent.length,
    form,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    matches: recent,
  };
}
export function shortName(name: string) {
  if (name.includes('Paris Saint-Germain')) return 'PSG';
  if (name === 'Olympique de Marseille') return 'OM';
  return (
    name
      .replace(/\b(FC|CF|AC|SC|AFC|1901|1899)\b/g, '')
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .slice(0, 3)
      .toUpperCase() || name.slice(0, 3).toUpperCase()
  );
}
export function statusOf(match: FootballMatch, today: string) {
  return match.score ? 'results' : match.date >= today ? 'upcoming' : 'unknown';
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}
