export type MediaProvider = 'soundcloud' | 'youtube';

export type StartMode = 'start' | 'drop' | 'middle' | 'split';

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'blocked'
  | 'error';

export type PreviewPhase = 'start' | 'middle';

export interface TimedropSettings {
  intervalSeconds: number;
  loopPlaylist: boolean;
  shufflePlaylist: boolean;
  startMode: StartMode;
  softFade: boolean;
  volume: number;
}

export interface QueuedPlaylist {
  id: string;
  url: string;
  title: string;
  owner: string;
  provider: MediaProvider;
  playlistId?: string;
}

export interface SavedTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  provider: MediaProvider;
  savedAt: number;
}

export interface NormalizedTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  artworkUrl?: string;
  durationMs?: number;
  provider: MediaProvider;
}

export interface SoundCloudSound {
  id?: number | string;
  urn?: string;
  title?: string;
  permalink_url?: string;
  duration?: number;
  artwork_url?: string | null;
  user?: {
    username?: string;
    full_name?: string;
    avatar_url?: string | null;
  };
}

export interface SoundCloudWidgetInstance {
  bind: (event: string, listener: (...args: unknown[]) => void) => void;
  unbind: (event: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  skip: (soundIndex: number) => void;
  setVolume: (volume: number) => void;
  getDuration: (cb: (durationMs: number) => void) => void;
  getSounds: (cb: (sounds: SoundCloudSound[]) => void) => void;
  getCurrentSound: (cb: (sound: SoundCloudSound | null) => void) => void;
  getCurrentSoundIndex: (cb: (index: number) => void) => void;
  isPaused: (cb: (paused: boolean) => void) => void;
}

export interface SoundCloudWidgetConstructor {
  (iframe: HTMLIFrameElement): SoundCloudWidgetInstance;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    ERROR: string;
    PLAY_PROGRESS: string;
  };
}

export interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideoAt: (index: number) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  loadPlaylist: (
    playlist:
      | string[]
      | {
          listType: 'playlist';
          list: string;
          index?: number;
          startSeconds?: number;
        }
  ) => void;
  getPlaylist: () => string[] | null;
  getPlaylistIndex: () => number;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getVideoData: () => { video_id?: string; title?: string; author?: string } | undefined;
  destroy: () => void;
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string,
    options: {
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayerInstance }) => void;
        onStateChange?: (event: { target: YouTubePlayerInstance; data: number }) => void;
        onError?: (event: { target: YouTubePlayerInstance; data: number }) => void;
      };
    }
  ) => YouTubePlayerInstance;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    SC?: {
      Widget?: SoundCloudWidgetConstructor;
    };
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const DEFAULT_SETTINGS: Readonly<TimedropSettings> = Object.freeze({
  intervalSeconds: 20,
  loopPlaylist: false,
  shufflePlaylist: false,
  startMode: 'start',
  softFade: true,
  volume: 100,
});

export const INTERVAL_PRESETS = [10, 15, 20, 30, 45, 60] as const;

export const START_MODE_OPTIONS: ReadonlyArray<{
  value: StartMode;
  label: string;
  hint: string;
}> = [
  { value: 'start', label: 'Start', hint: '0%' },
  { value: 'drop', label: 'Drop-in', hint: '25%' },
  { value: 'middle', label: 'Middle', hint: '50%' },
  { value: 'split', label: 'Split', hint: '0% + 50%' },
];

export const STORAGE_KEYS = {
  legacyInterval: 'soundcloud-setlist-interval',
  settings: 'timedrop-settings-v1',
  queue: 'timedrop-playlist-queue',
  favorites: 'timedrop-favorite-tracks',
  theme: 'timedrop-theme-v1',
} as const;

export const STATUS_LABELS: Record<PlayerStatus, string> = {
  idle: 'Standby',
  loading: 'Loading',
  ready: 'Ready',
  playing: 'Playing',
  paused: 'Paused',
  stopped: 'Stopped',
  ended: 'Finished',
  blocked: 'Click to play',
  error: 'Error',
};

const SC_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com']);
const SC_SHORT_HOST = 'on.soundcloud.com';
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const YT_SHORT_HOST = 'youtu.be';
const VALID_START_MODES = new Set<StartMode>(['start', 'drop', 'middle', 'split']);

const TRACKING_PARAMS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'ref',
  'referrer',
  'si',
]);
const SECRET_TOKEN_RE = /^s-[A-Za-z0-9_-]+$/;
const SHORT_CODE_RE = /^[A-Za-z0-9_-]+$/;
const YT_LIST_ID_RE = /^[A-Za-z0-9_-]{10,128}$/;
const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const INVALID_RAW_CHARS_RE = /[\u0000-\u0020\u007f\\]/;
const INVALID_SEGMENT_CHARS_RE = /[\u0000-\u0020\u007f/?#\\\u202a-\u202e\u2066-\u2069]/u;
const CONTROL_CHARS_RE = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/gu;
const RESERVED_TRACK_SEGMENTS = new Set([
  'albums',
  'likes',
  'popular-tracks',
  'reposts',
  'sets',
  'tracks',
]);

const MAX_OWNER_LEN = 80;
const MAX_TITLE_LEN = 160;
const MAX_ID_LEN = 240;
const MAX_URL_LEN = 4096;
const MAX_JSON_LEN = 1_000_000;
const MAX_SHUFFLE_TRACKS = 10_000;

function decodeSafeSegment(segment: string): string | null {
  if (!segment || /%2f|%5c/i.test(segment)) return null;
  try {
    const decoded = decodeURIComponent(segment);
    if (!decoded || decoded === '.' || decoded === '..' || INVALID_SEGMENT_CHARS_RE.test(decoded)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function parseRawUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LEN || trimmed.startsWith('//') || INVALID_RAW_CHARS_RE.test(trimmed)) {
    return null;
  }
  const withScheme = /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeSoundCloudUrl(raw: unknown): URL | null {
  const parsed = parseRawUrl(raw);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();
  if (!SC_HOSTS.has(host) && host !== SC_SHORT_HOST) return null;

  parsed.protocol = 'https:';
  parsed.hostname = SC_HOSTS.has(host) ? 'soundcloud.com' : SC_SHORT_HOST;
  parsed.hash = '';
  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed;
}

function isValidSoundCloudShortLink(url: URL): boolean {
  const match = /^\/([^/]+)\/?$/.exec(url.pathname);
  if (!match) return false;
  const segment = decodeSafeSegment(match[1]);
  return segment !== null && SHORT_CODE_RE.test(segment);
}

export type ValidatedPlaylist =
  | { url: string; provider: 'soundcloud' }
  | { url: string; provider: 'youtube'; playlistId: string };

export function validatePlaylistUrl(raw: unknown): ValidatedPlaylist | { error: string } {
  if (typeof raw === 'string' && !raw.trim()) {
    return { error: 'Paste a SoundCloud or YouTube playlist URL first.' };
  }

  const parsed = parseRawUrl(raw);
  if (!parsed) {
    return { error: 'Enter a valid SoundCloud or YouTube playlist URL.' };
  }

  const host = parsed.hostname.toLowerCase();

  if (YT_HOSTS.has(host) || host === YT_SHORT_HOST) {
    const listParam = parsed.searchParams.get('list')?.trim() ?? '';
    if (!listParam) {
      return {
        error: 'That looks like a single YouTube video. Paste a playlist URL with a list= parameter.',
      };
    }
    if (!YT_LIST_ID_RE.test(listParam)) {
      return {
        error: 'That YouTube playlist ID is not valid (private Watch Later/Liked lists are not supported).',
      };
    }
    return {
      url: `https://www.youtube.com/playlist?list=${encodeURIComponent(listParam)}`,
      provider: 'youtube',
      playlistId: listParam,
    };
  }

  if (SC_HOSTS.has(host) || host === SC_SHORT_HOST) {
    const normalized = normalizeSoundCloudUrl(raw);
    if (!normalized) {
      return { error: 'Enter a valid SoundCloud playlist URL.' };
    }
    if (normalized.hostname === SC_SHORT_HOST) {
      if (!isValidSoundCloudShortLink(normalized)) {
        return { error: 'Use a complete SoundCloud share link.' };
      }
      normalized.pathname = normalized.pathname.replace(/\/$/, '');
      return { url: normalized.toString(), provider: 'soundcloud' };
    }

    const match = /^\/([^/]+)\/sets\/([^/]+)(?:\/([^/]+))?\/?$/.exec(normalized.pathname);
    if (!match) {
      return { error: 'Use a SoundCloud playlist link containing /sets/ followed by the playlist name.' };
    }

    const owner = decodeSafeSegment(match[1]);
    const slug = decodeSafeSegment(match[2]);
    const secret = match[3] ? decodeSafeSegment(match[3]) : undefined;

    if (!owner || !slug || (match[3] && (!secret || !SECRET_TOKEN_RE.test(secret)))) {
      return { error: 'That SoundCloud playlist path is not valid.' };
    }

    normalized.pathname = normalized.pathname.replace(/\/$/, '');
    return { url: normalized.toString(), provider: 'soundcloud' };
  }

  return {
    error: 'Paste a SoundCloud (soundcloud.com) or YouTube (youtube.com / music.youtube.com) playlist URL.',
  };
}

export function validateTrackUrl(raw: unknown): { url: string; provider: MediaProvider } | null {
  const parsed = parseRawUrl(raw);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase();

  if (YT_HOSTS.has(host)) {
    const vParam = parsed.searchParams.get('v')?.trim() ?? '';
    if (YT_VIDEO_ID_RE.test(vParam)) {
      return { url: `https://www.youtube.com/watch?v=${vParam}`, provider: 'youtube' };
    }
    const shortsMatch = /^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/.exec(parsed.pathname);
    if (shortsMatch) {
      return { url: `https://www.youtube.com/watch?v=${shortsMatch[1]}`, provider: 'youtube' };
    }
    return null;
  }

  if (host === YT_SHORT_HOST) {
    const shortMatch = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(parsed.pathname);
    if (shortMatch) {
      return { url: `https://www.youtube.com/watch?v=${shortMatch[1]}`, provider: 'youtube' };
    }
    return null;
  }

  const sc = normalizeSoundCloudUrl(raw);
  if (!sc) return null;

  if (sc.hostname === SC_SHORT_HOST) {
    if (!isValidSoundCloudShortLink(sc)) return null;
    sc.pathname = sc.pathname.replace(/\/$/, '');
    return { url: sc.toString(), provider: 'soundcloud' };
  }

  const match = /^\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/.exec(sc.pathname);
  if (!match) return null;

  const owner = decodeSafeSegment(match[1]);
  const slug = decodeSafeSegment(match[2]);
  const secret = match[3] ? decodeSafeSegment(match[3]) : undefined;

  if (
    !owner ||
    !slug ||
    RESERVED_TRACK_SEGMENTS.has(slug.toLowerCase()) ||
    (match[3] && (!secret || !SECRET_TOKEN_RE.test(secret)))
  ) {
    return null;
  }

  sc.pathname = sc.pathname.replace(/\/$/, '');
  return { url: sc.toString(), provider: 'soundcloud' };
}

export function upgradeSoundCloudArtwork(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed.replace(/^http:\/\//i, 'https://').replace(/-large(\.[a-z]+)$/i, '-t300x300$1');
}

export function buildYouTubeThumbnailUrl(videoId: string): string | undefined {
  if (!YT_VIDEO_ID_RE.test(videoId)) return undefined;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function truncateChars(value: string, maxLen: number): string {
  return [...value].slice(0, maxLen).join('');
}

export function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return truncateChars(
    value.normalize('NFKC').replace(CONTROL_CHARS_RE, '').replace(/\s+/gu, ' ').trim(),
    maxLen
  );
}

function humanizeSlug(segment: string): string {
  const decoded = decodeSafeSegment(segment);
  if (!decoded) return '';
  const words = decoded
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .split(' ')
    .map((word) => (word ? `${word[0].toLocaleUpperCase()}${word.slice(1)}` : ''))
    .join(' ');
  return truncateChars(words, MAX_TITLE_LEN);
}

export function extractPlaylistMetadata(url: string): {
  owner: string;
  title: string;
  provider: MediaProvider;
  playlistId?: string;
} {
  const validated = validatePlaylistUrl(url);
  if ('error' in validated) {
    return { owner: 'SoundCloud', title: 'Shared playlist', provider: 'soundcloud' };
  }

  if (validated.provider === 'youtube') {
    const shortId =
      validated.playlistId.length > 14
        ? `${validated.playlistId.slice(0, 6)}…${validated.playlistId.slice(-4)}`
        : validated.playlistId;
    return {
      owner: 'YouTube',
      title: `YouTube Playlist (${shortId})`,
      provider: 'youtube',
      playlistId: validated.playlistId,
    };
  }

  const parsed = new URL(validated.url);
  if (parsed.hostname === SC_SHORT_HOST) {
    return { owner: 'SoundCloud', title: 'Shared playlist', provider: 'soundcloud' };
  }
  const match = /^\/([^/]+)\/sets\/([^/]+)/.exec(parsed.pathname);
  const owner = match ? humanizeSlug(match[1]) : '';
  const title = match ? humanizeSlug(match[2]) : '';
  return {
    owner: owner || 'SoundCloud',
    title: title || 'Shared playlist',
    provider: 'soundcloud',
  };
}

export function formatDuration(ms?: number): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) {
    return '--:--';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCountdownClock(ms: number): { main: string; unit: string } {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  if (secs >= 60) {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return {
      main: `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`,
      unit: 'MIN:SEC',
    };
  }
  return {
    main: String(secs).padStart(2, '0'),
    unit: secs === 1 ? 'SECOND' : 'SECONDS',
  };
}

export function validateInterval(
  raw: unknown
): { valid: true; seconds: number } | { valid: false; error: string } {
  let num: number;
  if (typeof raw === 'number') {
    num = raw;
  } else if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    num = Number(raw.trim());
  } else {
    return { valid: false, error: 'Use a whole number of seconds.' };
  }

  if (!Number.isSafeInteger(num)) {
    return { valid: false, error: 'Use a whole number of seconds.' };
  }
  if (num < 1 || num > 900) {
    return { valid: false, error: 'Choose between 1 and 900 seconds.' };
  }
  return { valid: true, seconds: num };
}

export function clampVolume(raw: unknown, fallback = DEFAULT_SETTINGS.volume): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function parseStartMode(raw: unknown): StartMode | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase() as StartMode;
  return VALID_START_MODES.has(lower) ? lower : null;
}

export interface ShareSessionConfig {
  url?: string;
  intervalSeconds?: number;
  startMode?: StartMode;
  shufflePlaylist?: boolean;
  loopPlaylist?: boolean;
  softFade?: boolean;
}

export function buildShareUrl(baseHref: string, config: ShareSessionConfig): string {
  const target = new URL(baseHref);
  target.search = '';
  target.hash = '';

  if (config.url) {
    const valid = validatePlaylistUrl(config.url);
    if (!('error' in valid)) {
      target.searchParams.set('url', valid.url);
    }
  }
  if (config.intervalSeconds && config.intervalSeconds !== DEFAULT_SETTINGS.intervalSeconds) {
    target.searchParams.set('sec', String(config.intervalSeconds));
  }
  if (config.startMode && config.startMode !== DEFAULT_SETTINGS.startMode) {
    target.searchParams.set('cue', config.startMode);
  }
  if (config.shufflePlaylist) {
    target.searchParams.set('shuffle', '1');
  }
  if (config.loopPlaylist) {
    target.searchParams.set('loop', '1');
  }
  if (config.softFade === false) {
    target.searchParams.set('fade', '0');
  }
  return target.toString();
}

export function parseShareParams(search: string): ShareSessionConfig {
  const params = new URLSearchParams(search);
  const out: ShareSessionConfig = {};

  const rawUrl = params.get('url');
  if (rawUrl) {
    const valid = validatePlaylistUrl(rawUrl);
    if (!('error' in valid)) out.url = valid.url;
  }

  const rawSec = params.get('sec');
  if (rawSec) {
    const valid = validateInterval(rawSec);
    if (valid.valid) out.intervalSeconds = valid.seconds;
  }

  const rawCue = parseStartMode(params.get('cue'));
  if (rawCue) {
    out.startMode = rawCue;
  } else if (params.get('split') === '1' || params.get('split') === 'true') {
    out.startMode = 'split';
  }

  if (params.has('shuffle')) {
    out.shufflePlaylist = params.get('shuffle') === '1' || params.get('shuffle') === 'true';
  }
  if (params.has('loop')) {
    out.loopPlaylist = params.get('loop') === '1' || params.get('loop') === 'true';
  }
  if (params.has('fade')) {
    out.softFade = params.get('fade') !== '0' && params.get('fade') !== 'false';
  }

  return out;
}

function safeParseJson(raw: string | null): unknown {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > MAX_JSON_LEN) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStoredQueue(raw: string | null): QueuedPlaylist[] {
  const parsed = safeParseJson(raw);
  if (!Array.isArray(parsed)) return [];
  const items: QueuedPlaylist[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    if (items.length >= 50) break;
    if (!isPlainRecord(entry) || typeof entry.url !== 'string') continue;
    const validated = validatePlaylistUrl(entry.url);
    if ('error' in validated || seen.has(validated.url)) continue;
    const fallback = extractPlaylistMetadata(validated.url);
    const owner = sanitizeText(entry.owner, MAX_OWNER_LEN) || fallback.owner;
    const title = sanitizeText(entry.title, MAX_TITLE_LEN) || fallback.title;
    seen.add(validated.url);
    items.push({
      id: validated.url,
      url: validated.url,
      owner,
      title,
      provider: validated.provider,
      ...(validated.provider === 'youtube' ? { playlistId: validated.playlistId } : {}),
    });
  }
  return items;
}

export function parseStoredFavorites(raw: string | null): SavedTrack[] {
  const parsed = safeParseJson(raw);
  if (!Array.isArray(parsed)) return [];
  const items: SavedTrack[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const entry of parsed) {
    if (items.length >= 200) break;
    if (!isPlainRecord(entry)) continue;
    const validated = validateTrackUrl(entry.url);
    if (!validated) continue;
    const id = sanitizeText(entry.id, MAX_ID_LEN) || validated.url;
    if (seenIds.has(id) || seenUrls.has(validated.url)) continue;
    const savedAt =
      typeof entry.savedAt === 'number' && Number.isFinite(entry.savedAt) && entry.savedAt >= 0
        ? Math.min(Math.floor(entry.savedAt), Number.MAX_SAFE_INTEGER)
        : 0;
    seenIds.add(id);
    seenUrls.add(validated.url);
    items.push({
      id,
      url: validated.url,
      provider: validated.provider,
      artist:
        sanitizeText(entry.artist, MAX_OWNER_LEN) ||
        (validated.provider === 'youtube' ? 'YouTube channel' : 'SoundCloud creator'),
      title: sanitizeText(entry.title, MAX_TITLE_LEN) || 'Untitled track',
      savedAt,
    });
  }
  return items;
}

export function parseStoredSettings(raw: string | null): TimedropSettings {
  const parsed = safeParseJson(raw);
  if (!isPlainRecord(parsed)) return { ...DEFAULT_SETTINGS };

  const interval = validateInterval(parsed.intervalSeconds);
  const pickBool = (key: 'loopPlaylist' | 'softFade'): boolean =>
    typeof parsed[key] === 'boolean' ? (parsed[key] as boolean) : DEFAULT_SETTINGS[key];

  const shufflePlaylist =
    typeof parsed.shufflePlaylist === 'boolean'
      ? parsed.shufflePlaylist
      : typeof parsed.shuffle === 'boolean'
        ? parsed.shuffle
        : DEFAULT_SETTINGS.shufflePlaylist;

  const startMode =
    parseStartMode(parsed.startMode) ??
    (parsed.splitPreview === true ? 'split' : DEFAULT_SETTINGS.startMode);

  return {
    intervalSeconds: interval.valid ? interval.seconds : DEFAULT_SETTINGS.intervalSeconds,
    loopPlaylist: pickBool('loopPlaylist'),
    shufflePlaylist,
    startMode,
    softFade: pickBool('softFade'),
    volume: clampVolume(parsed.volume, DEFAULT_SETTINGS.volume),
  };
}

function randomIndex(randomFn: () => number, maxInclusive: number): number {
  const sample = randomFn();
  const clamped = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 1 - 2 ** -52) : 0;
  return Math.floor(clamped * (maxInclusive + 1));
}

export function buildShuffleOrder(
  length: number,
  startIndex: number,
  randomFn: () => number = Math.random
): number[] {
  if (!Number.isSafeInteger(length) || length <= 0 || length > MAX_SHUFFLE_TRACKS) {
    return [];
  }
  const safeStart = Number.isSafeInteger(startIndex) && startIndex >= 0 && startIndex < length ? startIndex : 0;
  const rest = Array.from({ length }, (_, idx) => idx).filter((idx) => idx !== safeStart);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = randomIndex(randomFn, i);
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [safeStart, ...rest];
}

export function buildSoundCloudEmbedUrl(playlistUrl: string): string {
  if (!playlistUrl) return '';
  const params = new URLSearchParams({
    url: playlistUrl,
    color: '#ff5500',
    auto_play: 'true',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'false',
    visual: 'false',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}

/* ==========================================================================
   External API Script Loaders (SoundCloud Widget API + YouTube IFrame API)
   ========================================================================== */

const SC_API_SRC = 'https://w.soundcloud.com/player/api.js';
const SC_API_SELECTOR = 'script[data-soundcloud-widget-api]';
const API_TIMEOUT_MS = 12_000;

let scApiPromise: Promise<void> | null = null;

export function loadSoundCloudWidgetApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve();
  if (scApiPromise) return scApiPromise;

  scApiPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    let script = document.querySelector<HTMLScriptElement>(SC_API_SELECTOR);
    if (script?.dataset.status === 'failed') {
      script.remove();
      script = null;
    }

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      script?.removeEventListener('load', onLoad);
      script?.removeEventListener('error', onError);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (window.SC?.Widget) {
        if (script) script.dataset.status = 'loaded';
        resolve();
        return;
      }
      fail('SoundCloud Widget API did not initialize.');
    };

    const fail = (message: string) => {
      if (settled && window.SC?.Widget) return;
      settled = true;
      cleanup();
      if (script) {
        script.dataset.status = 'failed';
        script.remove();
      }
      scApiPromise = null;
      reject(new Error(message));
    };

    const onLoad = () => succeed();
    const onError = () => fail('SoundCloud Widget API could not be loaded.');

    if (!script) {
      script = document.createElement('script');
      script.src = SC_API_SRC;
      script.async = true;
      script.dataset.soundcloudWidgetApi = 'true';
      script.dataset.status = 'loading';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
    }

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    const timeoutId = window.setTimeout(() => {
      fail('SoundCloud took too long to respond.');
    }, API_TIMEOUT_MS);

    if (window.SC?.Widget) {
      succeed();
    }
  });

  return scApiPromise;
}

const YT_API_SRC = 'https://www.youtube.com/iframe_api';
const YT_API_SELECTOR = 'script[data-youtube-iframe-api]';

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    let script = document.querySelector<HTMLScriptElement>(YT_API_SELECTOR);
    if (script?.dataset.status === 'failed') {
      script.remove();
      script = null;
    }

    const prevReady = window.onYouTubeIframeAPIReady;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      script?.removeEventListener('error', onError);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (window.YT?.Player) {
        if (script) script.dataset.status = 'loaded';
        resolve();
        return;
      }
      fail('YouTube IFrame API did not initialize.');
    };

    const fail = (message: string) => {
      if (settled && window.YT?.Player) return;
      settled = true;
      cleanup();
      if (script) {
        script.dataset.status = 'failed';
        script.remove();
      }
      ytApiPromise = null;
      reject(new Error(message));
    };

    const onError = () => fail('YouTube IFrame API could not be loaded.');

    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      succeed();
    };

    if (!script) {
      script = document.createElement('script');
      script.src = YT_API_SRC;
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      script.dataset.status = 'loading';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      document.head.appendChild(script);
    }

    script.addEventListener('error', onError, { once: true });

    const timeoutId = window.setTimeout(() => {
      fail('YouTube took too long to respond.');
    }, API_TIMEOUT_MS);

    if (window.YT?.Player) {
      succeed();
    }
  });

  return ytApiPromise;
}
