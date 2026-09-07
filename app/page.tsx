'use client';
import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CircleHelp,
  Ghost,
  Moon,
  Search,
  ShieldCheck,
  Star,
  Sun,
  Trophy,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  competitions,
  seasons,
  fetchFootball,
  teamForm,
  shortName,
  statusOf,
  formatDate,
  type Season,
} from '@/lib/football';

export default function Home() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <FootballApp />
    </QueryClientProvider>
  );
}
function FootballApp() {
  const [season, setSeason] = useState<Season>('2026-27');
  const [league, setLeague] = useState('Tous');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('matchs');
  const [status, setStatus] = useState('results');
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const feed = useQuery({
    queryKey: ['football', season],
    queryFn: ({ signal }) => fetchFootball(season, signal),
    staleTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const matches = useMemo(() => feed.data?.matches ?? [], [feed.data]);
  const today = new Date().toISOString().slice(0, 10);
  const leagues = ['Tous', ...competitions.map((c) => c.name)];
  // Device preferences are hydrated only after the first matching server/client render.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem('ghostbet-favorites') || '[]',
      );
      if (Array.isArray(saved))
        setFavorites(
          saved
            .filter(
              (id): id is string => typeof id === 'string' && id.length < 500,
            )
            .slice(0, 500),
        );
      setDark(localStorage.getItem('ghostbet-theme') === 'dark');
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    if (ready)
      try {
        localStorage.setItem('ghostbet-theme', dark ? 'dark' : 'light');
        localStorage.setItem('ghostbet-favorites', JSON.stringify(favorites));
      } catch {
        setStorageError(true);
      }
  }, [dark, favorites, ready]);
  /* oxlint-enable react/react-compiler */
  useEffect(() => {
    type Context = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'show_football_league',
            description:
              'Afficher un championnat dans GHOSTBET. Efface les filtres de recherche et de statut ; ne déclenche aucun pari.',
            inputSchema: {
              type: 'object',
              properties: {
                league: {
                  type: 'string',
                  enum: ['Tous', ...competitions.map((c) => c.name)],
                },
              },
              required: ['league'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              if (!input || typeof input !== 'object' || Array.isArray(input))
                throw new Error('Objet league requis.');
              const data = input as Record<string, unknown>;
              if (
                Object.keys(data).length !== 1 ||
                typeof data.league !== 'string' ||
                !['Tous', ...competitions.map((c) => c.name)].includes(
                  data.league,
                )
              )
                throw new Error('Championnat inconnu.');
              const next = data.league;
              flushSync(() => {
                setLeague(next);
                setQuery('');
                setStatus('all');
                setView('matchs');
                setLimit(20);
              });
              return { league: next, view: 'matchs', status: 'all' };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => console.warn('WebMCP indisponible.'));
    } catch {
      console.warn('WebMCP indisponible.');
    }
    return () => lifecycle.abort();
  }, []);
  const filtered = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (league === 'Tous' || m.league === league) &&
            (status === 'all' || statusOf(m, today) === status) &&
            `${m.home} ${m.away} ${shortName(m.home)} ${shortName(m.away)}`
              .toLocaleLowerCase('fr')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .includes(
                query
                  .toLocaleLowerCase('fr')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, ''),
              ) &&
            (view !== 'favoris' || favorites.includes(m.id)),
        )
        .sort((a, b) =>
          status === 'upcoming'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date),
        ),
    [matches, league, status, query, view, favorites, today],
  );
  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0];
  const home = selected
    ? teamForm(
        matches.filter((m) => m.code === selected.code),
        selected.home,
        selected.date,
      )
    : null;
  const away = selected
    ? teamForm(
        matches.filter((m) => m.code === selected.code),
        selected.away,
        selected.date,
      )
    : null;
  const toggleFavorite = (id: string) =>
    setFavorites((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length < 500
          ? [...old, id]
          : old,
    );
  const changeLeague = (next: string) => {
    setLeague(next);
    setLimit(20);
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <Button
          variant="ghost"
          className="brand"
          onClick={() => {
            setView('matchs');
            changeLeague('Tous');
            setQuery('');
          }}
        >
          <Ghost size={29} />
          <span>
            GHOST<b>BET</b>
            <small>FOOTBALL INTELLIGENCE</small>
          </span>
        </Button>
        <div className="nav-label">VOTRE ESPACE</div>
        <nav aria-label="Navigation principale">
          {[
            { id: 'matchs', label: 'Vue d’ensemble', Icon: Activity },
            { id: 'favoris', label: 'Mes favoris', Icon: Star },
            { id: 'sources', label: 'Données & méthode', Icon: ShieldCheck },
          ].map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant="ghost"
              className={`nav-item ${view === id ? 'active' : ''}`}
              onClick={() => {
                setView(id);
                setLimit(20);
              }}
            >
              <Icon size={18} />
              {label}
              {id === 'favoris' && (
                <span className="count">{favorites.length}</span>
              )}
            </Button>
          ))}
        </nav>
        <div className="nav-label">CHAMPIONNATS</div>
        {competitions.map((c) => (
          <Button
            key={c.code}
            variant="ghost"
            className={`league-link ${league === c.name ? 'chosen' : ''}`}
            onClick={() => {
              changeLeague(c.name);
              setView('matchs');
            }}
          >
            <span className="country">{c.country}</span>
            {c.name}
            <ChevronRight size={13} />
          </Button>
        ))}
        <div className="sidebar-bottom">
          <ShieldCheck size={23} />
          <strong>Comprendre le jeu.</strong>
          <p>
            Résultats documentés.
            <br />
            Sources transparentes.
          </p>
          <span>OPEN DATA · CC0</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Football <span className="muted">/ Votre tableau de bord</span>
          </span>
          <div className="top-actions">
            <span className="demo-dot">
              {feed.isFetching
                ? 'Synchronisation…'
                : feed.data
                  ? 'OpenFootball'
                  : 'Hors connexion ou en attente'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                dark ? 'Activer le mode clair' : 'Activer le mode sombre'
              }
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <span className="avatar">GB</span>
          </div>
        </header>
        <main>
          <div className="heading">
            <div>
              <div className="eyebrow">LE FOOTBALL, SOUS UN AUTRE ANGLE</div>
              <h1>
                {view === 'sources'
                  ? 'La transparence avant tout.'
                  : view === 'favoris'
                    ? 'Vos matchs, au même endroit.'
                    : 'Chaque match a son histoire.'}
              </h1>
              <p>
                Calendriers, résultats et forme récente des cinq grands
                championnats.
              </p>
            </div>
            <span className="edition">
              DONNÉES RÉELLES<span>Saison {season.replace('-', ' / ')}</span>
            </span>
          </div>
          <div className="notice">
            <CircleHelp size={17} />
            <span>
              Source communautaire OpenFootball : mises à jour non garanties,
              pas de direct. Dates du calendrier source ; horaires et fuseaux
              non fournis ici.
            </span>
          </div>
          <div className="data-controls">
            <label>
              Saison
              <NativeSelect
                aria-label="Saison"
                value={season}
                onChange={(e) => {
                  setSeason(e.target.value as Season);
                  setSelectedId('');
                  setLimit(20);
                }}
              >
                {seasons.map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {s}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <Button
              variant="outline"
              disabled={feed.isFetching}
              onClick={() => void feed.refetch()}
            >
              <RefreshCw size={15} />
              Actualiser
            </Button>
            <span className="muted">
              {feed.data
                ? `Consulté le ${new Date(feed.data.sources[0].retrievedAt).toLocaleString('fr-FR')}`
                : 'Connexion à la source…'}
            </span>
          </div>
          {storageError && (
            <output>
              Stockage indisponible : les préférences ne seront pas conservées
              après cette session.
            </output>
          )}
          {feed.isError && (
            <div className="notice error" role="alert">
              {feed.error.message}{' '}
              {feed.data &&
                'Les derniers résultats chargés restent affichés ; ils ne sont pas à jour.'}
            </div>
          )}
          {feed.data?.errors.length ? (
            <div className="notice error" role="alert">
              Couverture partielle : {feed.data.errors.join(' · ')}
            </div>
          ) : null}
          {view === 'sources' ? (
            <section className="panel methodology">
              <span className="eyebrow">PROVENANCE & LIMITES</span>
              <h2>Pas de chiffres sans contexte.</h2>
              <p>
                Les rencontres proviennent des fichiers publics{' '}
                <a
                  href="https://github.com/openfootball/football.json"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenFootball / football.json
                </a>
                , sous{' '}
                <a
                  href="https://github.com/openfootball/football.json/blob/master/LICENSE.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  licence CC0
                </a>
                . Il ne s’agit plus d’exemples inventés. Cette source
                communautaire peut être incomplète ou en retard ; elle ne
                fournit aucun engagement de disponibilité.
              </p>
              <h3>Couverture de cette version</h3>
              <p>
                Les cinq championnats nationaux, sur les saisons proposées.
                Coupes nationales et européennes, compositions, blessures,
                possession et scores en direct ne sont pas couverts. Une
                rencontre passée sans score signifie « résultat non renseigné »,
                jamais 0–0.
              </p>
              <h3>Comparaison descriptive</h3>
              <p>
                Les chiffres sont calculés à partir des cinq derniers résultats
                disponibles de chaque équipe dans le même championnat et la même
                saison, strictement avant la date du match sélectionné. Le match
                sélectionné et les résultats ultérieurs sont exclus. Un
                historique partiel est indiqué et n’est pas complété avec des
                valeurs inventées.
              </p>
              <h3>Sources chargées</h3>
              {feed.data?.sources.map((s) => (
                <p key={s.league}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.league} ↗
                  </a>{' '}
                  · {s.count} rencontres · consulté le{' '}
                  {new Date(s.retrievedAt).toLocaleString('fr-FR')}
                  {s.skipped > 0
                    ? ` · ${s.skipped} lignes invalides ou dupliquées ignorées`
                    : ''}
                </p>
              ))}
              <p>
                « Consulté le » désigne la récupération du fichier, pas la
                dernière correction des résultats par ses contributeurs. Les
                fichiers sont mis en cache en mémoire pendant 30 minutes ; le
                bouton Actualiser redemande les données.
              </p>
              <h3>Confidentialité et mobile</h3>
              <p>
                Vos favoris et votre thème sont enregistrés sur cet appareil
                uniquement. Le navigateur contacte GitHub pour récupérer les
                fichiers publics ; GitHub reçoit donc les informations
                techniques usuelles de connexion. Aucun mot de passe bookmaker,
                compte financier ou géolocalisation n’est collecté par GHOSTBET.
                Vous pouvez effacer les favoris ci-dessous.
              </p>
              <Button variant="outline" onClick={() => setFavorites([])}>
                Effacer mes favoris locaux
              </Button>
              <p>
                L’application ne recommande ni pari ni mise. Les projets Android
                et iOS partagent la même interface et chargent ces mêmes données
                publiques ; ils ne dépendent pas de la connexion au site privé.
              </p>
              <Button onClick={() => setView('matchs')}>
                Revenir aux rencontres <ArrowUpRight />
              </Button>
            </section>
          ) : (
            <>
              <div className="summary">
                <div>
                  <Trophy />
                  <span>
                    Sources disponibles
                    <strong>
                      {feed.data?.sources.length ?? '—'}{' '}
                      <small>sur 5 championnats</small>
                    </strong>
                  </span>
                </div>
                <div>
                  <Activity />
                  <span>
                    Rencontres chargées
                    <strong>
                      {feed.data ? matches.length : '—'}{' '}
                      <small>
                        {matches.filter((m) => m.score).length} résultats
                        disponibles
                      </small>
                    </strong>
                  </span>
                </div>
                <div>
                  <Star />
                  <span>
                    Votre sélection locale
                    <strong>
                      {favorites.length} <small>favoris · toutes saisons</small>
                    </strong>
                  </span>
                </div>
              </div>
              <div className="content-grid">
                <section className="matches panel">
                  <div className="section-title">
                    <h2>
                      {view === 'favoris' ? 'Mes favoris' : 'Les rencontres'}
                    </h2>
                    <span className="tag">{filtered.length} MATCHS</span>
                  </div>
                  <div className="search">
                    <Search size={17} />
                    <Input
                      aria-label="Rechercher un club"
                      placeholder="Rechercher une équipe…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setLimit(20);
                      }}
                    />
                  </div>
                  <div className="filters" aria-label="Filtrer par championnat">
                    {leagues.map((l) => (
                      <Button
                        key={l}
                        variant="ghost"
                        aria-pressed={league === l}
                        className={`filter ${league === l ? 'selected' : ''}`}
                        onClick={() => changeLeague(l)}
                      >
                        {l}
                      </Button>
                    ))}
                  </div>
                  <div className="filters" aria-label="Filtrer par état">
                    {[
                      ['results', 'Résultats'],
                      ['upcoming', 'Calendrier à venir'],
                      ['unknown', 'Sans résultat'],
                      ['all', 'Tous'],
                    ].map(([id, label]) => (
                      <Button
                        key={id}
                        variant="ghost"
                        aria-pressed={status === id}
                        className={`filter ${status === id ? 'selected' : ''}`}
                        onClick={() => {
                          setStatus(id);
                          setLimit(20);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {feed.isPending ? (
                <output className="empty" style={{display:'block'}}>
                  Chargement des cinq championnats…
                </output>
                  ) : filtered.length ? (
                    <div className="match-list">
                      {filtered.slice(0, limit).map((m) => (
                        <article
                          key={m.id}
                          className={`match ${selected?.id === m.id ? 'current' : ''}`}
                        >
                          <div className="match-top">
                            <span>
                              {m.league}{' '}
                              <span className="muted">
                                · {formatDate(m.date)}
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${favorites.includes(m.id) ? 'Retirer des' : 'Ajouter aux'} favoris : ${m.home} – ${m.away}`}
                              aria-pressed={favorites.includes(m.id)}
                              onClick={() => toggleFavorite(m.id)}
                            >
                              <Star
                                size={16}
                                fill={
                                  favorites.includes(m.id)
                                    ? 'currentColor'
                                    : 'none'
                                }
                              />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            className="match-main"
                            onClick={() => setSelectedId(m.id)}
                            aria-label={`Comparer ${m.home} et ${m.away}`}
                          >
                            <span className="teams">
                              <span>
                                <i className="club">{shortName(m.home)}</i>
                                {m.home}
                              </span>
                              <span>
                                <i className="club away">{shortName(m.away)}</i>
                                {m.away}
                              </span>
                            </span>
                            <span className="match-time">
                              <strong>
                                {m.score ? m.score.join(' : ') : '—'}
                              </strong>
                              <small>
                                {m.score
                                  ? 'Score final publié'
                                  : m.date < today
                                    ? 'Non renseigné'
                                    : 'Programmé'}
                              </small>
                            </span>
                            <ChevronRight size={18} />
                          </Button>
                        </article>
                      ))}
                      {filtered.length > limit && (
                        <Button
                          className="load-more"
                          variant="outline"
                          onClick={() => setLimit(limit + 20)}
                        >
                          Afficher 20 rencontres de plus
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="empty">
                      <Star />
                      <h3>
                        {feed.isError
                          ? 'Source indisponible'
                          : 'Aucune rencontre dans ce filtre'}
                      </h3>
                      <p>
                        {view === 'favoris'
                          ? 'Vos favoris sont filtrés par saison, championnat et état.'
                          : 'Essayez un autre état, une autre saison ou un autre nom.'}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuery('');
                          changeLeague('Tous');
                          setStatus('all');
                          setView('matchs');
                        }}
                      >
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  )}
                </section>
                <section className="analysis panel" aria-live="polite">
                  <div className="section-title">
                    <h2>
                      <BarChart3 size={19} /> Le face-à-face
                    </h2>
                    <span className="tag">STATISTIQUES</span>
                  </div>
                  {selected && home && away ? (
                    <>
                      <div className="faceoff">
                        <span className="big-club">
                          {shortName(selected.home)}
                        </span>
                        <span className="versus">VS</span>
                        <span className="big-club away">
                          {shortName(selected.away)}
                        </span>
                      </div>
                      <div className="team-names">
                        <strong>{selected.home}</strong>
                        <strong>{selected.away}</strong>
                      </div>
                      <p className="analysis-date">
                        {formatDate(selected.date)} · {selected.league}
                      </p>
                      <div className="comparison-label">
                        FORME AVANT CE MATCH<span>Ancien → récent</span>
                      </div>
                      <div className="forms">
                        {[home, away].map((t, i) => (
                          <div key={i}>
                            {t.count ? (
                              t.form.map((v, j) => (
                                <span className={`form ${v}`} key={j}>
                                  {v}
                                </span>
                              ))
                            ) : (
                              <span className="muted">Historique absent</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="legend">
                        V : victoire · N : nul · D : défaite
                        <br />
                        {home.count} / 5 matchs disponibles à gauche ·{' '}
                        {away.count} / 5 à droite
                      </div>
                      <div className="stat-title">
                        Les chiffres disponibles
                        <span>Avant le {formatDate(selected.date)}</span>
                      </div>
                      {[
                        [home.goalsFor, away.goalsFor, 'Buts marqués'],
                        [
                          home.goalsAgainst,
                          away.goalsAgainst,
                          'Buts encaissés',
                        ],
                        [
                          home.cleanSheets,
                          away.cleanSheets,
                          'Matchs sans encaisser',
                        ],
                      ].map(([a, b, label]) => (
                        <div className="stat-row" key={label as string}>
                          <div>
                            <strong>{home.count ? a : '—'}</strong>
                            <span>{label}</span>
                            <strong>{away.count ? b : '—'}</strong>
                          </div>
                          {home.count && away.count ? (
                            <div className="stat-bars" aria-hidden="true">
                              <span
                                style={{
                                  width: `${Number(a) + Number(b) ? (Number(a) / (Number(a) + Number(b))) * 100 : 50}%`,
                                }}
                              />
                              <span
                                style={{
                                  width: `${Number(a) + Number(b) ? (Number(b) / (Number(a) + Number(b))) * 100 : 50}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                      <div className="insight">
                        <ShieldCheck size={19} />
                        <div>
                          <strong>
                            {home.count < 5 || away.count < 5
                              ? 'Historique partiel, comparaison limitée.'
                              : 'Les chiffres ne font pas le résultat.'}
                          </strong>
                          <p>
                            Totaux calculés sur les matchs disponibles avant
                            cette rencontre, dans ce championnat et cette saison
                            uniquement. Aucune probabilité de victoire n’est
                            produite.
                          </p>
                        </div>
                      </div>
                      <details className="history">
                        <summary>
                          Voir les matchs utilisés pour le calcul
                        </summary>
                        {[
                          [selected.home, home],
                          [selected.away, away],
                        ].map(([name, stats]) => {
                          const t = stats as typeof home;
                          return (
                            <div key={name as string}>
                              <strong>{name as string}</strong>
                              {t.matches.map((m) => (
                                <p key={m.id}>
                                  {formatDate(m.date)} · {m.home}{' '}
                                  {m.score?.join('–')} {m.away}
                                </p>
                              ))}
                              {!t.count && (
                                <p>Aucun résultat antérieur disponible.</p>
                              )}
                            </div>
                          );
                        })}
                      </details>
                      <Button
                        variant="outline"
                        className="method-button"
                        onClick={() => setView('sources')}
                      >
                        Comprendre les données <ArrowUpRight size={16} />
                      </Button>
                    </>
                  ) : (
                    <div className="empty">
                      Sélectionnez une rencontre parmi les données disponibles.
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          <footer>
            <span>
              <Ghost size={16} /> GHOSTBET{' '}
              <span className="muted">/ Observer. Comprendre. Suivre.</span>
            </span>
            <span>OpenFootball · CC0 · Pas de scores en direct</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
