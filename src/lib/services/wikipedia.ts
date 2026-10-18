import type {
  AlbumEncyclopedia,
  ArtistEncyclopedia,
  Instrument,
  WikiAlbumLink,
  WikiArticle,
  WikiBandMember,
  WikiFact,
  WikiLang,
  WikiSection,
} from '@/types';
import { findAlbum, normalize } from './deezer';

/**
 * L'encyclopedie d'un album ou d'un artiste : Wikidata pour la fiche,
 * Wikipedia pour le texte.
 *
 * Tout part de l'identifiant Deezer, que Wikidata connait (P2722 pour un
 * artiste, P2723 pour un album) : on tombe sur la bonne oeuvre, pas sur
 * l'homonyme. Deezer a une fiche par edition et Wikidata n'en note que
 * quelques-unes : a defaut, on cherche l'album par son titre parmi les
 * oeuvres de l'artiste, et l'artiste par son nom parmi les musiciens.
 *
 * Les API sont publiques et sans cle. Wikimedia demande un User-Agent qui
 * dit qui appelle. Le texte des articles est sous CC BY-SA : l'ecran qui
 * l'affiche cite sa source.
 */

const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
const wikipedia = (lang: WikiLang) => `https://${lang}.wikipedia.org/w/api.php`;

/** Une semaine : un article ne change pas d'un jour a l'autre. */
const WEEK = 604800;

const HEADERS = {
  'User-Agent': 'Ostinara/1.0 (https://ostinara.app; contact@ostinara.app)',
  'Api-User-Agent': 'Ostinara/1.0 (https://ostinara.app; contact@ostinara.app)',
};

const LANGS: WikiLang[] = ['fr', 'en'];
/** La langue demandee d'abord, l'autre en secours. */
const langOrder = (lang: WikiLang) => [lang, ...LANGS.filter((other) => other !== lang)];

async function get<T>(url: string, accept = 'application/json'): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { ...HEADERS, Accept: accept }, next: { revalidate: WEEK } });
    if (!response.ok) {
      console.error(`[wikipedia] ${url} -> HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[wikipedia] ${url} failed:`, error);
    return null;
  }
}

const query = (base: string, params: Record<string, string>) =>
  `${base}?${new URLSearchParams({ format: 'json', ...params })}`;

// ---------------------------------------------------------------------------
// Wikidata : formes brutes (seulement les champs lus)
// ---------------------------------------------------------------------------

type DataValue = { id: string } | { time: string; precision: number } | string;

interface Snak {
  snaktype: string;
  datavalue?: { value: DataValue };
}

interface Claim {
  mainsnak: Snak;
  rank: 'preferred' | 'normal' | 'deprecated';
  qualifiers?: Record<string, Snak[]>;
}

interface Entity {
  id: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string }>;
}

/** Les declarations retenues : les preferees s'il y en a, sans les obsoletes. */
function claimsOf(entity: Entity, property: string): Claim[] {
  const all = (entity.claims?.[property] ?? []).filter((claim) => claim.rank !== 'deprecated');
  const preferred = all.filter((claim) => claim.rank === 'preferred');
  return preferred.length ? preferred : all;
}

function idOf(snak?: Snak): string | null {
  const value = snak?.snaktype === 'value' ? snak.datavalue?.value : undefined;
  return value && typeof value === 'object' && 'id' in value ? value.id : null;
}

function stringOf(snak?: Snak): string | null {
  const value = snak?.snaktype === 'value' ? snak.datavalue?.value : undefined;
  return typeof value === 'string' ? value : null;
}

interface WikiTime {
  year: number;
  month: number;
  day: number;
  precision: number;
}

function timeOf(snak?: Snak): WikiTime | null {
  const value = snak?.snaktype === 'value' ? snak.datavalue?.value : undefined;
  if (!value || typeof value !== 'object' || !('time' in value)) return null;
  const match = value.time.match(/^\+(\d+)-(\d\d)-(\d\d)/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), precision: value.precision };
}

const ids = (entity: Entity, property: string) =>
  claimsOf(entity, property).map((claim) => idOf(claim.mainsnak)).filter((id): id is string => id !== null);

const times = (entity: Entity, property: string) =>
  claimsOf(entity, property).map((claim) => timeOf(claim.mainsnak)).filter((time): time is WikiTime => time !== null);

const earliest = (list: WikiTime[]) =>
  list.reduce<WikiTime | null>((best, time) => {
    if (!best) return time;
    const key = (t: WikiTime) => t.year * 10000 + t.month * 100 + t.day;
    return key(time) < key(best) ? time : best;
  }, null);

/** « 12 mars 2001 », « mars 2001 » ou « 2001 », selon ce que Wikidata sait. */
function formatTime(time: WikiTime, lang: WikiLang): string {
  if (time.precision < 10 || !time.month) return String(time.year);
  const date = new Date(Date.UTC(time.year, time.month - 1, Math.max(time.day, 1)));
  const options: Intl.DateTimeFormatOptions =
    time.precision >= 11 && time.day
      ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { month: 'long', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(lang, options).format(date);
}

/**
 * Le nom d'une entite dans la langue voulue. `mul` est le libelle commun a
 * toutes les langues, que Wikidata donne aux noms propres.
 */
function labelOf(entity: Entity | undefined, lang: WikiLang): string | null {
  if (!entity?.labels) return null;
  for (const key of [lang, 'mul', ...langOrder(lang).slice(1)]) {
    const label = entity.labels[key]?.value;
    if (label) return label;
  }
  return null;
}

async function getEntities(entityIds: string[], props: string, lang: WikiLang): Promise<Map<string, Entity>> {
  const unique = [...new Set(entityIds)];
  const entities = new Map<string, Entity>();
  // wbgetentities prend 50 identifiants au plus.
  for (let i = 0; i < unique.length; i += 50) {
    const data = await get<{ entities?: Record<string, Entity> }>(
      query(WIKIDATA, {
        action: 'wbgetentities',
        ids: unique.slice(i, i + 50).join('|'),
        props,
        languages: [...langOrder(lang), 'mul'].join('|'),
        sitefilter: LANGS.map((code) => `${code}wiki`).join('|'),
      })
    );
    for (const entity of Object.values(data?.entities ?? {})) {
      if (entity.id) entities.set(entity.id, entity);
    }
  }
  return entities;
}

/** Les entites qui repondent a une recherche (`haswbstatement:` compris). */
async function searchEntities(search: string, limit = 5): Promise<string[]> {
  const data = await get<{ query?: { search: { title: string }[] } }>(
    query(WIKIDATA, { action: 'query', list: 'search', srsearch: search, srlimit: String(limit), srnamespace: '0' })
  );
  return (data?.query?.search ?? []).map((result) => result.title);
}

// ---------------------------------------------------------------------------
// Wikipedia : l'article, decoupe en intro et sections
// ---------------------------------------------------------------------------

/**
 * Les sections qu'on ne montre pas : les sources et liens (illisibles
 * sans leurs liens), et ce que la page donne deja (titres, discographie).
 * Les classements sont des tableaux, que l'extrait texte perd.
 */
const SKIPPED_SECTIONS = new Set(
  [
    // fr
    'notes et references', 'notes', 'references', 'sources', 'liens externes', 'voir aussi',
    'articles connexes', 'bibliographie', 'annexes', 'liste des titres', 'liste des pistes',
    'liste des morceaux', 'titres', 'pistes', 'classements', 'classements hebdomadaires',
    'classements annuels', 'classements et certifications', 'charts et certifications',
    'certifications', 'discographie', 'filmographie', 'videographie', 'chronologie',
    // en
    'references', 'notes', 'citations', 'sources', 'external links', 'see also', 'further reading',
    'bibliography', 'track listing', 'charts', 'weekly charts', 'year end charts', 'certifications',
    'charts and certifications', 'discography', 'filmography', 'videography', 'timeline',
  ].map(normalize)
);

/** `explaintext` marque les titres « == Contexte == ». */
function parseExtract(text: string): Pick<WikiArticle, 'intro' | 'sections'> {
  const intro: string[] = [];
  const sections: WikiSection[] = [];
  let section: WikiSection | null = null;
  let subsection: WikiSection['subsections'][number] | null = null;
  let skipSection = false;
  let skipSubsection = false;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2];
      if (level === 2) {
        skipSection = SKIPPED_SECTIONS.has(normalize(title));
        skipSubsection = false;
        section = skipSection ? null : { title, paragraphs: [], subsections: [] };
        if (section) sections.push(section);
        subsection = null;
      } else if (section) {
        skipSubsection = SKIPPED_SECTIONS.has(normalize(title));
        subsection = skipSubsection ? null : { title, paragraphs: [] };
        if (subsection) section.subsections.push(subsection);
      }
      continue;
    }

    // Une section ecartee l'est jusqu'au titre suivant de son niveau.
    if (skipSection || skipSubsection) continue;
    if (subsection) subsection.paragraphs.push(line);
    else if (section) section.paragraphs.push(line);
    else intro.push(line);
  }

  return {
    intro,
    sections: sections
      .map((s) => ({ ...s, subsections: s.subsections.filter((sub) => sub.paragraphs.length > 0) }))
      .filter((s) => s.paragraphs.length > 0 || s.subsections.length > 0),
  };
}

async function getArticle(entity: Entity, lang: WikiLang): Promise<WikiArticle | null> {
  for (const code of langOrder(lang)) {
    const title = entity.sitelinks?.[`${code}wiki`]?.title;
    if (!title) continue;

    const data = await get<{ query?: { pages: { title: string; fullurl?: string; extract?: string; missing?: boolean }[] } }>(
      query(wikipedia(code), {
        action: 'query',
        prop: 'extracts|info',
        inprop: 'url',
        explaintext: '1',
        exsectionformat: 'wiki',
        titles: title,
        redirects: '1',
        formatversion: '2',
      })
    );
    const page = data?.query?.pages[0];
    if (!page || page.missing || !page.extract) continue;

    const { intro, sections } = parseExtract(page.extract);
    if (intro.length === 0 && sections.length === 0) continue;
    return {
      title: page.title,
      url: page.fullurl ?? `https://${code}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      lang: code,
      intro,
      sections,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Retrouver l'entite d'un artiste ou d'un album Deezer
// ---------------------------------------------------------------------------

const FULL = 'labels|claims|sitelinks';

/** Ce qui fait un album (et pas une chanson ou un single du meme nom). */
const ALBUM_TYPES = new Set([
  'Q482994', // album
  'Q208569', // album studio
  'Q209939', // album en direct
  'Q222910', // compilation
  'Q169930', // EP
  'Q24672043', // bande originale
]);

const sameName = (entity: Entity, name: string) =>
  Object.values(entity.labels ?? {}).some((label) => normalize(label.value) === normalize(name));

async function findArtistEntity(deezerId: string, name: string, lang: WikiLang): Promise<Entity | null> {
  const [byDeezer] = await searchEntities(`haswbstatement:P2722=${deezerId}`, 1);
  if (byDeezer) return (await getEntities([byDeezer], FULL, lang)).get(byDeezer) ?? null;

  // P434 (MusicBrainz) : on ne garde que les musiciens et les groupes.
  const candidates = await searchEntities(`${name} haswbstatement:P434`);
  if (candidates.length === 0) return null;
  const entities = await getEntities(candidates, FULL, lang);
  return candidates.map((id) => entities.get(id)).find((entity) => entity && sameName(entity, name)) ?? null;
}

async function findAlbumEntity(
  deezerId: string,
  album: { name: string; artistDeezerId?: string; artistName: string },
  lang: WikiLang
): Promise<Entity | null> {
  const [byDeezer] = await searchEntities(`haswbstatement:P2723=${deezerId}`, 1);
  if (byDeezer) return (await getEntities([byDeezer], FULL, lang)).get(byDeezer) ?? null;

  // Une autre edition : l'album du meme nom parmi les oeuvres de l'artiste.
  const artist = album.artistDeezerId ? await findArtistEntity(album.artistDeezerId, album.artistName, lang) : null;
  if (!artist) return null;
  const title = album.name.replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();
  const candidates = await searchEntities(`${title} haswbstatement:P175=${artist.id}`);
  if (candidates.length === 0) return null;
  const entities = await getEntities(candidates, FULL, lang);
  return (
    candidates
      .map((id) => entities.get(id))
      .find((entity) => entity && sameName(entity, album.name) && ids(entity, 'P31').some((type) => ALBUM_TYPES.has(type))) ??
    null
  );
}

// ---------------------------------------------------------------------------
// La fiche
// ---------------------------------------------------------------------------

/** Les entites citees par une fiche, nommees d'un coup. */
function namer(labels: Map<string, Entity>, lang: WikiLang) {
  return (entityIds: string[], max = 4) =>
    entityIds
      .map((id) => labelOf(labels.get(id), lang))
      .filter((label): label is string => label !== null)
      .slice(0, max)
      .join(', ');
}

function pushFact(facts: WikiFact[], label: string, value: string | null | undefined) {
  if (value) facts.push({ label, value });
}

/** L'album d'avant ou d'apres : P155/P156, sur l'album ou dans sa serie (P179). */
function neighbour(entity: Entity, property: 'P155' | 'P156'): string | null {
  const direct = ids(entity, property)[0];
  if (direct) return direct;
  for (const claim of claimsOf(entity, 'P179')) {
    const id = idOf(claim.qualifiers?.[property]?.[0]);
    if (id) return id;
  }
  return null;
}

async function albumLink(entity: Entity | undefined, artistName: string, lang: WikiLang): Promise<WikiAlbumLink | null> {
  const name = labelOf(entity, lang);
  if (!entity || !name) return null;
  const deezerId = claimsOf(entity, 'P2723').map((claim) => stringOf(claim.mainsnak)).find(Boolean);
  if (deezerId) return { name, deezerId };
  const found = await findAlbum(name, artistName);
  return { name, deezerId: found?.id };
}

export async function getAlbumEncyclopedia(
  deezerId: string,
  album: { name: string; artistDeezerId?: string; artistName: string },
  lang: WikiLang = 'fr'
): Promise<AlbumEncyclopedia | null> {
  if (!/^\d+$/.test(deezerId)) return null;
  const entity = await findAlbumEntity(deezerId, album, lang);
  if (!entity) return null;

  const previousId = neighbour(entity, 'P155');
  const nextId = neighbour(entity, 'P156');
  const cited = ['P483', 'P162', 'P136', 'P264'].flatMap((property) => ids(entity, property));

  const [article, labels, neighbours] = await Promise.all([
    getArticle(entity, lang),
    getEntities(cited, 'labels', lang),
    getEntities([previousId, nextId].filter((id): id is string => id !== null), 'labels|claims', lang),
  ]);
  const names = namer(labels, lang);

  const facts: WikiFact[] = [];
  // La sortie originale : Deezer date les reeditions.
  const released = earliest(times(entity, 'P577'));
  pushFact(facts, 'Sortie', released && formatTime(released, lang));
  const recorded = times(entity, 'P10135');
  pushFact(facts, 'Enregistrement', recorded.length ? [...new Set(recorded.map((t) => String(t.year)))].join('–') : null);
  pushFact(facts, 'Studio', names(ids(entity, 'P483'), 3));
  pushFact(facts, 'Production', names(ids(entity, 'P162')));
  pushFact(facts, 'Genre', names(ids(entity, 'P136')));
  pushFact(facts, 'Label', names(ids(entity, 'P264'), 3));

  const [previous, next] = await Promise.all([
    previousId ? albumLink(neighbours.get(previousId), album.artistName, lang) : null,
    nextId ? albumLink(neighbours.get(nextId), album.artistName, lang) : null,
  ]);

  if (!article && facts.length === 0) return null;
  return { wikidataId: entity.id, article, facts, previous, next };
}

// ---------------------------------------------------------------------------
// Artiste et line-up
// ---------------------------------------------------------------------------

/** Les instruments Wikidata que l'app sait reconnaitre. */
const WIKIDATA_INSTRUMENTS: Record<string, Instrument> = {
  Q6607: 'guitar', // guitare
  Q78987: 'guitar', // guitare electrique
  Q31561: 'guitar', // guitare acoustique
  Q46185: 'bass', // guitare basse
  Q80019: 'bass', // contrebasse
  Q128309: 'drums', // batterie
  Q11404: 'drums', // tambour
  Q133163: 'drums', // percussions
  Q5994: 'keys', // piano
  Q52954: 'keys', // instrument a clavier
  Q163829: 'keys', // synthetiseur
  Q1444: 'keys', // orgue
  Q1343007: 'keys', // clavier electronique
};

const VOICE = 'Q17172850';

/** Les libelles Wikidata, dits comme dans un groupe. */
const INSTRUMENT_NAMES: Record<WikiLang, Record<string, string>> = {
  fr: { [VOICE]: 'chant', Q46185: 'basse', Q11404: 'batterie', Q133163: 'percussions', Q52954: 'claviers', Q1343007: 'claviers' },
  en: { [VOICE]: 'vocals', Q46185: 'bass', Q11404: 'drums', Q133163: 'percussion', Q52954: 'keyboards', Q1343007: 'keyboards' },
};

/** Un role ecrit (« guitare rythmique », « bass guitar ») vu par l'app. La basse avant la guitare. */
const ROLE_POSTS: [RegExp, Instrument][] = [
  [/\b(basse|contrebasse|bass)\b/, 'bass'],
  [/\b(guitare|guitar)/, 'guitar'],
  [/\b(batterie|drums?|percussion)/, 'drums'],
  [/\b(clavier|keyboard|piano|synth|orgue|organ)/, 'keys'],
];

const postOf = (role: string) => ROLE_POSTS.find(([pattern]) => pattern.test(normalize(role)))?.[1];

/** Ce qui se joue d'abord : les instruments de l'app, le chant, le reste. */
const instrumentRank = (id: string) => (WIKIDATA_INSTRUMENTS[id] ? 0 : id === VOICE ? 1 : 2);

interface SparqlBinding {
  [key: string]: { value: string } | undefined;
}

const entityId = (binding?: { value: string }) => binding?.value.split('/').pop() ?? '';
const yearOf = (binding?: { value: string }) => binding?.value.match(/^-?\d{4}/)?.[0];

/**
 * Les membres d'un groupe et leurs instruments. Wikidata les note dans
 * les deux sens : le groupe « comprend » (P527), le musicien « est membre
 * de » (P463). Les dates sont des qualificatifs de ces declarations.
 */
async function getBandMembers(bandId: string, lang: WikiLang): Promise<WikiBandMember[]> {
  const sparql = `SELECT ?member ?memberLabel ?start ?end ?death ?inst ?instLabel WHERE {
    { wd:${bandId} p:P527 ?st . ?st ps:P527 ?member . } UNION { ?member p:P463 ?st . ?st ps:P463 wd:${bandId} . }
    ?member wdt:P31 wd:Q5 .
    OPTIONAL { ?st pq:P580 ?start }
    OPTIONAL { ?st pq:P582 ?end }
    OPTIONAL { ?member wdt:P570 ?death }
    OPTIONAL { ?member wdt:P1303 ?inst }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${[lang, 'mul', ...langOrder(lang).slice(1)].join(',')}". }
  }`;
  const data = await get<{ results: { bindings: SparqlBinding[] } }>(
    `${SPARQL}?${new URLSearchParams({ query: sparql })}`,
    'application/sparql-results+json'
  );
  if (!data) return [];

  type Found = { name: string; instruments: Map<string, string>; spans: { start?: string; end?: string }[] };
  const byMember = new Map<string, Found>();
  for (const row of data.results.bindings) {
    const id = entityId(row.member);
    const name = row.memberLabel?.value;
    // Sans libelle, le service renvoie l'identifiant (« Q123 »).
    if (!id || !name || name === id) continue;
    const member: Found = byMember.get(id) ?? { name, instruments: new Map(), spans: [] };
    // Sans date de fin, un musicien decede a quitte le groupe a sa mort.
    const span = { start: yearOf(row.start), end: yearOf(row.end) ?? yearOf(row.death) };
    if (!member.spans.some((s) => s.start === span.start && s.end === span.end)) member.spans.push(span);
    const inst = entityId(row.inst);
    const instLabel = row.instLabel?.value;
    const label = INSTRUMENT_NAMES[lang][inst] ?? instLabel;
    // Deux entites, un meme mot : basse et basse electrique sont « basse ».
    if (inst && instLabel && instLabel !== inst && ![...member.instruments.values()].includes(label!)) {
      member.instruments.set(inst, label!);
    }
    byMember.set(id, member);
  }

  return [...byMember.values()]
    .map(({ name, instruments, spans }) => {
      const ordered = [...instruments.keys()].sort((a, b) => instrumentRank(a) - instrumentRank(b));
      const starts = spans.map((s) => s.start).filter((y): y is string => !!y).sort();
      const ends = spans.map((s) => s.end).filter((y): y is string => !!y).sort();
      // Membre aujourd'hui si une de ses periodes n'a pas de fin : il est revenu.
      const current = spans.some((s) => !s.end);
      return {
        name,
        instruments: ordered.map((id) => instruments.get(id)!),
        posts: [...new Set(ordered.map((id) => WIKIDATA_INSTRUMENTS[id]).filter((p): p is Instrument => !!p))],
        since: starts[0],
        until: current ? undefined : ends[ends.length - 1],
        current,
      };
    })
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        (a.since ?? '9999').localeCompare(b.since ?? '9999') ||
        a.name.localeCompare(b.name)
    );
}

const CURRENT_MEMBERS = new Set(['membres actuels', 'membre actuel', 'composition actuelle', 'current members'].map(normalize));
const FORMER_MEMBERS = new Set(
  ['anciens membres', 'ancien membre', 'anciens musiciens', 'former members', 'past members'].map(normalize)
);

/** Ce qui decrit un musicien sans dire ce qu'il joue : « compositeur des six premiers albums ». */
const NOT_A_ROLE = /^(compositeur|composer|auteur|parolier|songwriter|producteur|producer|arrangeur|album)/;

/**
 * « Kirk Hammett – guitare solo, chœurs (depuis 1983) » : une ligne des
 * listes de membres d'un article. Les tirets varient (–, —, -).
 */
function parseMemberLine(line: string, current: boolean): WikiBandMember | null {
  const match = line.match(/^(.+?)\s+[–—-]\s+(.+?)\s*(?:\(([^)]*)\))?(?:\s+[-–—].*)?$/);
  if (!match) return null;
  const [, name, rolesText, period = ''] = match;
  if (name.length > 60) return null;

  const roles = rolesText
    .split(/,|\bet\b|\band\b|\//)
    .map((role) => role.trim())
    .filter((role) => role && role.length <= 30 && !/\d/.test(role) && !NOT_A_ROLE.test(normalize(role)));
  const years = period.match(/\d{4}/g) ?? [];
  const ongoing = /depuis|aujourd|present|since/i.test(period);

  return {
    name: name.trim(),
    instruments: roles.slice(0, 4),
    posts: [...new Set(roles.map(postOf).filter((post): post is Instrument => !!post))],
    since: years[0],
    until: current || ongoing ? undefined : years[years.length - 1],
    current,
  };
}

/**
 * Le line-up tel que l'article l'ecrit, s'il a ses listes « Membres
 * actuels » / « Anciens membres » : plus a jour que Wikidata, et il dit le
 * role tenu dans le groupe (guitare rythmique ou solo). Les sections lues
 * sortent de l'article : la page les montre deja.
 */
function lineupFromArticle(article: WikiArticle): { members: WikiBandMember[]; article: WikiArticle } | null {
  const members: WikiBandMember[] = [];
  const used = new Set<string>();

  const read = (title: string, paragraphs: string[]) => {
    const key = normalize(title);
    const current = CURRENT_MEMBERS.has(key);
    if (!current && !FORMER_MEMBERS.has(key)) return;
    const parsed = paragraphs.map((line) => parseMemberLine(line, current)).filter((m): m is WikiBandMember => !!m);
    if (parsed.length === 0) return;
    members.push(...parsed);
    used.add(title);
  };

  for (const section of article.sections) {
    read(section.title, section.paragraphs);
    for (const sub of section.subsections) read(sub.title, sub.paragraphs);
  }
  if (!members.some((member) => member.current)) return null;

  const sections = article.sections
    .filter((section) => !used.has(section.title))
    .map((section) => ({ ...section, subsections: section.subsections.filter((sub) => !used.has(sub.title)) }))
    // « Membres » sans ses listes n'a plus rien a dire.
    .filter((section) => section.subsections.length > 0 || (section.paragraphs.length > 0 && !/^(membres|members)$/i.test(section.title)));

  return { members, article: { ...article, sections } };
}

const HUMAN = 'Q5';

export async function getArtistEncyclopedia(
  deezerId: string,
  name: string,
  lang: WikiLang = 'fr'
): Promise<ArtistEncyclopedia | null> {
  if (!/^\d+$/.test(deezerId)) return null;
  const entity = await findArtistEntity(deezerId, name, lang);
  if (!entity) return null;

  const isPerson = ids(entity, 'P31').includes(HUMAN);
  const cited = ['P19', 'P740', 'P495', 'P1303', 'P136', 'P264'].flatMap((property) => ids(entity, property));

  const [fullArticle, labels, wikidataMembers] = await Promise.all([
    getArticle(entity, lang),
    getEntities(cited, 'labels', lang),
    isPerson ? Promise.resolve([]) : getBandMembers(entity.id, lang),
  ]);
  const names = namer(labels, lang);

  const year = (property: string) => earliest(times(entity, property))?.year;
  // Les annees d'activite (P2031/P2032), ou la formation et la separation.
  const start = year('P2031') ?? (isPerson ? undefined : year('P571'));
  const end = year('P2032') ?? (isPerson ? undefined : year('P576'));

  const fromArticle = !isPerson && fullArticle ? lineupFromArticle(fullArticle) : null;
  const article = fromArticle?.article ?? fullArticle;
  // Un groupe separe n'a plus de membres actuels, quoi qu'en dise Wikidata.
  const members =
    fromArticle?.members ??
    (end
      ? wikidataMembers.map((m) => (m.current ? { ...m, current: false, until: String(end) } : m))
      : wikidataMembers);

  const facts: WikiFact[] = [];

  if (isPerson) {
    const born = earliest(times(entity, 'P569'));
    const place = names(ids(entity, 'P19'), 1);
    pushFact(facts, 'Naissance', [born && formatTime(born, lang), place].filter(Boolean).join(', '));
    pushFact(
      facts,
      'Instruments',
      ids(entity, 'P1303')
        .sort((a, b) => instrumentRank(a) - instrumentRank(b))
        .map((id) => INSTRUMENT_NAMES[lang][id] ?? labelOf(labels.get(id), lang))
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')
    );
  } else {
    pushFact(facts, 'Origine', names(ids(entity, 'P740'), 1) || names(ids(entity, 'P495'), 1));
  }
  pushFact(facts, 'Actif', start ? `${start} – ${end ?? (lang === 'fr' ? "aujourd'hui" : 'present')}` : null);
  pushFact(facts, 'Genre', names(ids(entity, 'P136')));
  pushFact(facts, 'Label', names(ids(entity, 'P264'), 3));

  if (!article && facts.length === 0 && members.length === 0) return null;
  return { wikidataId: entity.id, article, facts, members };
}
