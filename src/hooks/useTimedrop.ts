import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildShareUrl,
  buildShuffleOrder,
  buildSoundCloudEmbedUrl,
  buildYouTubeThumbnailUrl,
  clampVolume,
  DEFAULT_SETTINGS,
  extractPlaylistMetadata,
  loadSoundCloudWidgetApi,
  loadYouTubeIframeApi,
  parseShareParams,
  parseStoredFavorites,
  parseStoredQueue,
  parseStoredSettings,
  sanitizeText,
  STORAGE_KEYS,
  upgradeSoundCloudArtwork,
  validateInterval,
  validatePlaylistUrl,
  validateTrackUrl,
  type MediaProvider,
  type NormalizedTrack,
  type PlayerStatus,
  type PreviewPhase,
  type QueuedPlaylist,
  type SavedTrack,
  type SoundCloudSound,
  type SoundCloudWidgetInstance,
  type StartMode,
  type YouTubePlayerInstance,
} from '../lib/media';

const TIMER_TICK_MS = 60;
const AUTOPLAY_CHECK_MS = 3500;
const READY_TIMEOUT_MS = 12_000;
const PLAYLIST_DETAILS_TIMEOUT_MS = 10_000;
const ERROR_SKIP_DELAY_MS = 450;
const SOFT_FADE_MS = 1500;
const EXTEND_STEP_MS = 15_000;
const MAX_WINDOW_MS = 900_000;

interface ActivePlaylist {
  url: string;
  provider: MediaProvider;
  playlistId?: string;
}

interface PlayerAdapter {
  provider: MediaProvider;
  play: () => void;
  pause: () => void;
  seekToMs: (ms: number) => void;
  skipToIndex: (index: number) => void;
  setVolume: (volume: number) => void;
  getDurationMs: (cb: (durationMs: number) => void) => void;
  getCurrentIndex: (cb: (index: number) => void) => void;
  getCurrentTrack: (cb: (track: NormalizedTrack | null) => void) => void;
  isPaused: (cb: (paused: boolean) => void) => void;
}

function normalizeSoundCloudTrack(sound: SoundCloudSound | null): NormalizedTrack | null {
  if (!sound) return null;
  const id = sound.urn || `${sound.id || ''}` || sound.permalink_url || '';
  const url = sound.permalink_url || '';
  return {
    id,
    title: sound.title || 'Untitled track',
    artist: sound.user?.username || sound.user?.full_name || 'SoundCloud creator',
    url,
    artworkUrl: upgradeSoundCloudArtwork(sound.artwork_url || sound.user?.avatar_url),
    durationMs: sound.duration,
    provider: 'soundcloud',
  };
}

function normalizeYouTubeTrack(player: YouTubePlayerInstance): NormalizedTrack | null {
  const data = player.getVideoData?.();
  const videoId = data?.video_id?.trim() || '';
  if (!videoId) return null;
  const durationSecs = player.getDuration?.();
  return {
    id: `yt:${videoId}`,
    title: data?.title?.trim() || 'Untitled video',
    artist: data?.author?.trim() || 'YouTube channel',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    artworkUrl: buildYouTubeThumbnailUrl(videoId),
    durationMs: Number.isFinite(durationSecs) && durationSecs > 0 ? durationSecs * 1000 : undefined,
    provider: 'youtube',
  };
}

export function useTimedrop() {
  const [urlInput, setUrlInput] = useState('');
  const [activePlaylist, setActivePlaylist] = useState<ActivePlaylist | null>(null);
  const [intervalInput, setIntervalInput] = useState(String(DEFAULT_SETTINGS.intervalSeconds));
  const [loopPlaylist, setLoopPlaylist] = useState(DEFAULT_SETTINGS.loopPlaylist);
  const [startMode, setStartMode] = useState<StartMode>(DEFAULT_SETTINGS.startMode);
  const [shufflePlaylist, setShufflePlaylist] = useState(DEFAULT_SETTINGS.shufflePlaylist);
  const [softFade, setSoftFade] = useState(DEFAULT_SETTINGS.softFade);
  const [volume, setVolumeState] = useState(DEFAULT_SETTINGS.volume);
  const [isMuted, setIsMuted] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const [previewPhase, setPreviewPhase] = useState<PreviewPhase>('start');
  const [isPasting, setIsPasting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [queue, setQueue] = useState<QueuedPlaylist[]>([]);
  const [clearedQueueBackup, setClearedQueueBackup] = useState<QueuedPlaylist[] | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState('');
  const [favorites, setFavorites] = useState<SavedTrack[]>([]);

  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Paste a SoundCloud or YouTube playlist URL to begin.');
  const [urlError, setUrlError] = useState('');
  const [intervalError, setIntervalError] = useState('');
  const [notice, setNotice] = useState('');

  const [trackTitle, setTrackTitle] = useState('No playlist loaded');
  const [trackArtist, setTrackArtist] = useState('Ready for a SoundCloud or YouTube playlist');
  const [trackArtworkUrl, setTrackArtworkUrl] = useState<string | undefined>(undefined);
  const [trackId, setTrackId] = useState('');
  const [trackDurationMs, setTrackDurationMs] = useState<number | undefined>(undefined);
  const [trackIndex, setTrackIndex] = useState(-1);
  const [trackCount, setTrackCount] = useState(0);
  const [srAnnouncement, setSrAnnouncement] = useState('');

  const [remainingMs, setRemainingMs] = useState(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const [intervalMs, setIntervalMs] = useState(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const [activeWindowMs, setActiveWindowMs] = useState(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const [widgetReady, setWidgetReady] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const intervalInputRef = useRef<HTMLInputElement | null>(null);
  const queueHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const favoritesHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const scIframeRef = useRef<HTMLIFrameElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);

  const adapterRef = useRef<PlayerAdapter | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const autoplayTimerRef = useRef<number | null>(null);
  const errorSkipTimerRef = useRef<number | null>(null);
  const ytMetaTimerRef = useRef<number | null>(null);

  const lastTickRef = useRef(0);
  const remainingRef = useRef(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const intervalMsRef = useRef(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const activeWindowMsRef = useRef(DEFAULT_SETTINGS.intervalSeconds * 1000);
  const currentIndexRef = useRef(-1);
  const totalTracksRef = useRef(0);
  const statusRef = useRef<PlayerStatus>('idle');
  const desiredStateRef = useRef<PlayerStatus>('idle');

  const loopRef = useRef(DEFAULT_SETTINGS.loopPlaylist);
  const startModeRef = useRef<StartMode>(DEFAULT_SETTINGS.startMode);
  const shuffleRef = useRef(DEFAULT_SETTINGS.shufflePlaylist);
  const softFadeRef = useRef(DEFAULT_SETTINGS.softFade);
  const volumeRef = useRef(DEFAULT_SETTINGS.volume);
  const mutedRef = useRef(false);
  const holdRef = useRef(false);
  const lastAppliedVolumeRef = useRef<number | null>(null);

  const phaseRef = useRef<PreviewPhase>('start');
  const initialSeekDoneRef = useRef(false);
  const middleSeekDoneRef = useRef(false);

  const autoplayIntentRef = useRef(false);
  const pendingSkipRef = useRef<number | null>(null);
  const failedIndicesRef = useRef<Set<number>>(new Set());
  const suppressPlayRef = useRef(false);

  const sessionGenRef = useRef(0);
  const trackChangeRef = useRef(0);
  const timerGenRef = useRef(0);
  const soundQueryRef = useRef(0);

  const shuffleOrderRef = useRef<number[]>([]);
  const shufflePosRef = useRef(0);

  const advanceTrackRef = useRef<() => void>(() => undefined);
  const currentTrackRef = useRef<NormalizedTrack | null>(null);
  const queueRef = useRef<QueuedPlaylist[]>([]);
  const activePlaylistIdRef = useRef('');
  const loadAndPlayRef = useRef<(url?: string, preserveInterval?: boolean, updateInput?: boolean) => boolean>(
    () => false
  );

  const shortcutsRef = useRef({
    togglePlayback: () => undefined as void,
    previous: () => undefined as void,
    next: () => undefined as void,
    stop: () => undefined as void,
    restart: () => undefined as void,
    toggleLoop: () => undefined as void,
    toggleFavorite: () => undefined as void,
    toggleHold: () => undefined as void,
    extendWindow: () => undefined as void,
    toggleMute: () => undefined as void,
  });

  const getEffectiveVolume = useCallback(() => (mutedRef.current ? 0 : volumeRef.current), []);

  const syncAdapterVolume = useCallback((vol: number, force = false) => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    const clamped = clampVolume(vol, 100);
    if (!force && lastAppliedVolumeRef.current === clamped) return;
    lastAppliedVolumeRef.current = clamped;
    try {
      adapter.setVolume(clamped);
    } catch {
      // Ignore transient widget volume errors
    }
  }, []);

  const updateStatus = useCallback((next: PlayerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const updatePhase = useCallback((next: PreviewPhase) => {
    phaseRef.current = next;
    setPreviewPhase(next);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const stopAutoplayCheck = useCallback(() => {
    if (autoplayTimerRef.current !== null) {
      window.clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(
    (ms = intervalMsRef.current) => {
      timerGenRef.current += 1;
      remainingRef.current = ms;
      activeWindowMsRef.current = ms;
      initialSeekDoneRef.current = false;
      middleSeekDoneRef.current = false;
      holdRef.current = false;
      setIsHolding(false);
      updatePhase('start');
      setRemainingMs(ms);
      setActiveWindowMs(ms);
      lastTickRef.current = performance.now();
      syncAdapterVolume(getEffectiveVolume());
    },
    [updatePhase, syncAdapterVolume, getEffectiveVolume]
  );

  const triggerInitialCueSeek = useCallback(() => {
    const mode = startModeRef.current;
    if (mode !== 'drop' && mode !== 'middle') return;
    const adapter = adapterRef.current;
    if (!adapter || initialSeekDoneRef.current) return;

    const changeToken = trackChangeRef.current;
    const sessionToken = sessionGenRef.current;
    const timerToken = timerGenRef.current;

    adapter.getDurationMs((durationMs) => {
      if (
        adapterRef.current !== adapter ||
        trackChangeRef.current !== changeToken ||
        sessionGenRef.current !== sessionToken ||
        timerGenRef.current !== timerToken ||
        initialSeekDoneRef.current
      ) {
        return;
      }
      const windowMs = activeWindowMsRef.current;
      if (!Number.isFinite(durationMs) || durationMs <= windowMs || statusRef.current !== 'playing') {
        return;
      }
      initialSeekDoneRef.current = true;
      const fraction = mode === 'drop' ? 0.25 : 0.5;
      const seekTarget = Math.max(0, Math.min(durationMs * fraction, durationMs - windowMs));
      adapter.seekToMs(seekTarget);
      setStatusMessage(mode === 'drop' ? 'Drop-in (25%) — pacer active.' : 'Mid-track cue (50%) — pacer active.');
    });
  }, []);

  const triggerMiddlePreview = useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter || middleSeekDoneRef.current) return;
    const changeToken = trackChangeRef.current;
    const sessionToken = sessionGenRef.current;
    const timerToken = timerGenRef.current;

    adapter.getDurationMs((durationMs) => {
      if (
        adapterRef.current !== adapter ||
        trackChangeRef.current !== changeToken ||
        sessionGenRef.current !== sessionToken ||
        timerGenRef.current !== timerToken ||
        middleSeekDoneRef.current
      ) {
        return;
      }
      const windowMs = activeWindowMsRef.current;
      if (!Number.isFinite(durationMs) || durationMs <= windowMs || statusRef.current !== 'playing') {
        return;
      }
      middleSeekDoneRef.current = true;
      const halfWindow = windowMs / 2;
      const seekTarget = Math.max(0, Math.min(durationMs / 2, durationMs - halfWindow));
      adapter.seekToMs(seekTarget);
      updatePhase('middle');
      setStatusMessage('Mid-track sample — timer running.');
    });
  }, [updatePhase]);

  const startTimer = useCallback(() => {
    stopTimer();
    if (holdRef.current) {
      syncAdapterVolume(getEffectiveVolume());
      return;
    }

    lastTickRef.current = performance.now();
    if (
      startModeRef.current === 'split' &&
      !middleSeekDoneRef.current &&
      remainingRef.current <= activeWindowMsRef.current / 2
    ) {
      triggerMiddlePreview();
    }

    timerIdRef.current = window.setInterval(() => {
      if (holdRef.current) {
        stopTimer();
        syncAdapterVolume(getEffectiveVolume());
        return;
      }

      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      const prev = remainingRef.current;
      const next = Math.max(0, prev - delta);
      remainingRef.current = next;
      setRemainingMs(next);

      const halfway = activeWindowMsRef.current / 2;
      if (
        startModeRef.current === 'split' &&
        !middleSeekDoneRef.current &&
        prev > halfway &&
        next <= halfway
      ) {
        triggerMiddlePreview();
      }

      // Soft 1.5s fade-out before auto-advance
      const baseVol = getEffectiveVolume();
      if (
        softFadeRef.current &&
        activeWindowMsRef.current >= 4000 &&
        next <= SOFT_FADE_MS &&
        next > 0 &&
        baseVol > 0
      ) {
        const ratio = Math.max(0.06, next / SOFT_FADE_MS);
        syncAdapterVolume(Math.round(baseVol * ratio));
      } else {
        syncAdapterVolume(baseVol);
      }

      if (next <= 0) {
        stopTimer();
        advanceTrackRef.current();
      }
    }, TIMER_TICK_MS);
  }, [stopTimer, triggerMiddlePreview, syncAdapterVolume, getEffectiveVolume]);

  const scheduleAutoplayCheck = useCallback(() => {
    stopAutoplayCheck();
    const sessionToken = sessionGenRef.current;
    autoplayTimerRef.current = window.setTimeout(() => {
      const adapter = adapterRef.current;
      if (!adapter || statusRef.current === 'playing') return;
      adapter.isPaused((paused) => {
        if (
          adapterRef.current !== adapter ||
          sessionGenRef.current !== sessionToken ||
          desiredStateRef.current !== 'playing'
        ) {
          return;
        }
        if (paused) {
          stopTimer();
          updateStatus('blocked');
          const providerLabel = adapter.provider === 'youtube' ? 'YouTube' : 'SoundCloud';
          setStatusMessage(`Browser paused autoplay. Press Continue or Play in the ${providerLabel} player.`);
          return;
        }
        autoplayIntentRef.current = false;
        updateStatus('playing');
        setStatusMessage('Playing — pacer active.');
        startTimer();
      });
    }, AUTOPLAY_CHECK_MS);
  }, [stopTimer, stopAutoplayCheck, updateStatus, startTimer]);

  const applyTrackMetadata = useCallback((track: NormalizedTrack | null, changeToken?: number) => {
    if (!track) return;
    if (changeToken !== undefined && trackChangeRef.current !== changeToken) return;

    const prevTrack = currentTrackRef.current;
    const isNewTrack = Boolean(track.id) && track.id !== (prevTrack?.id || '');

    currentTrackRef.current = track;
    setTrackId(track.id);
    setTrackTitle(track.title);
    setTrackArtist(track.artist);
    setTrackArtworkUrl(track.artworkUrl);
    setTrackDurationMs(track.durationMs);

    if (isNewTrack) {
      const posLabel =
        currentIndexRef.current >= 0
          ? `Track ${currentIndexRef.current + 1}${totalTracksRef.current > 0 ? ` of ${totalTracksRef.current}` : ''}`
          : 'Selected track';
      setSrAnnouncement(`${posLabel}: ${track.title} by ${track.artist}.`);
    }
  }, []);

  const resetShuffleOrder = useCallback((count = totalTracksRef.current, anchor = currentIndexRef.current) => {
    if (count <= 0) {
      shuffleOrderRef.current = [];
      shufflePosRef.current = 0;
      return;
    }
    const safeAnchor = anchor >= 0 && anchor < count ? anchor : 0;
    shuffleOrderRef.current = buildShuffleOrder(count, safeAnchor);
    shufflePosRef.current = 0;
  }, []);

  const resolveStepIndex = useCallback((delta: number): number | null => {
    const count = totalTracksRef.current;
    if (count <= 0) return null;

    if (!shuffleRef.current) {
      let nextIdx = currentIndexRef.current + delta;
      while (nextIdx >= 0 && nextIdx < count && failedIndicesRef.current.has(nextIdx)) {
        nextIdx += delta;
      }
      return nextIdx >= 0 && nextIdx < count ? nextIdx : null;
    }

    let order = shuffleOrderRef.current;
    if (order.length !== count || !order.includes(currentIndexRef.current)) {
      order = buildShuffleOrder(count, currentIndexRef.current >= 0 ? currentIndexRef.current : 0);
      shuffleOrderRef.current = order;
      shufflePosRef.current = 0;
    }

    let pos = shufflePosRef.current + delta;
    while (pos >= 0 && pos < order.length && failedIndicesRef.current.has(order[pos])) {
      pos += delta;
    }
    if (pos < 0 || pos >= order.length) return null;
    shufflePosRef.current = pos;
    return order[pos];
  }, []);

  const advanceQueuePlaylist = useCallback((): boolean => {
    const list = queueRef.current;
    if (list.length === 0) return false;
    const idx = list.findIndex((item) => item.id === activePlaylistIdRef.current);
    if (idx < 0) return false;

    let nextIdx = idx + 1;
    if (nextIdx >= list.length) {
      if (!loopRef.current) return false;
      nextIdx = 0;
    }

    const nextItem = list[nextIdx];
    if (nextItem.id === activePlaylistIdRef.current) {
      statusRef.current = 'ended';
    }
    activePlaylistIdRef.current = nextItem.id;
    setActivePlaylistId(nextItem.id);
    setUrlInput(nextItem.url);
    loadAndPlayRef.current(nextItem.url, true, true);
    return true;
  }, []);

  const finishPlayback = useCallback(() => {
    stopTimer();
    stopAutoplayCheck();
    trackChangeRef.current += 1;
    soundQueryRef.current += 1;
    pendingSkipRef.current = null;
    syncAdapterVolume(getEffectiveVolume());

    if (!advanceQueuePlaylist()) {
      autoplayIntentRef.current = false;
      desiredStateRef.current = 'ended';
      adapterRef.current?.pause();
      remainingRef.current = 0;
      setRemainingMs(0);
      holdRef.current = false;
      setIsHolding(false);
      updateStatus('ended');
      setStatusMessage('Queue finished. Play another playlist or enable Loop.');
    }
  }, [advanceQueuePlaylist, stopTimer, stopAutoplayCheck, updateStatus, syncAdapterVolume, getEffectiveVolume]);

  const jumpToTrack = useCallback(
    (index: number, targetState: 'playing' | 'paused' | 'stopped', message: string): boolean => {
      const adapter = adapterRef.current;
      if (!adapter || !Number.isInteger(index) || index < 0 || index >= totalTracksRef.current) {
        return false;
      }

      trackChangeRef.current += 1;
      soundQueryRef.current += 1;
      const changeToken = trackChangeRef.current;
      const sessionToken = sessionGenRef.current;

      pendingSkipRef.current = index;
      autoplayIntentRef.current = targetState === 'playing';
      suppressPlayRef.current = targetState !== 'playing';
      desiredStateRef.current = targetState;
      resetTimer();
      syncAdapterVolume(getEffectiveVolume(), true);
      setStatusMessage(message);

      adapter.skipToIndex(index);
      if (targetState === 'playing') {
        adapter.play();
        scheduleAutoplayCheck();
      } else {
        adapter.pause();
        stopTimer();
        updateStatus(targetState);
        window.setTimeout(() => {
          if (
            adapterRef.current !== adapter ||
            sessionGenRef.current !== sessionToken ||
            trackChangeRef.current !== changeToken
          ) {
            return;
          }
          const queryToken = soundQueryRef.current + 1;
          soundQueryRef.current = queryToken;
          adapter.getCurrentIndex((idx) => {
            if (
              adapterRef.current !== adapter ||
              trackChangeRef.current !== changeToken ||
              soundQueryRef.current !== queryToken ||
              !Number.isFinite(idx)
            ) {
              return;
            }
            currentIndexRef.current = idx;
            setTrackIndex(idx);
            adapter.getCurrentTrack((track) => {
              applyTrackMetadata(track, changeToken);
            });
          });
        }, 220);
      }
      return true;
    },
    [
      scheduleAutoplayCheck,
      stopTimer,
      resetTimer,
      updateStatus,
      applyTrackMetadata,
      syncAdapterVolume,
      getEffectiveVolume,
    ]
  );

  const advanceTrack = useCallback(() => {
    const nextIdx = resolveStepIndex(1);
    if (nextIdx === null) {
      finishPlayback();
      return;
    }
    jumpToTrack(nextIdx, 'playing', 'Advancing to next track…');
  }, [finishPlayback, resolveStepIndex, jumpToTrack]);

  useEffect(() => {
    advanceTrackRef.current = advanceTrack;
  }, [advanceTrack]);

  // Hydrate persisted state + optional share URL params
  useEffect(() => {
    let cancelled = false;
    const readStorage = (key: string): string | null => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    };

    const rawSettings = readStorage(STORAGE_KEYS.settings);
    const settings = parseStoredSettings(rawSettings);
    if (!rawSettings) {
      const legacy = validateInterval(readStorage(STORAGE_KEYS.legacyInterval) ?? '');
      if (legacy.valid) settings.intervalSeconds = legacy.seconds;
    }

    const shared = parseShareParams(window.location.search);
    if (shared.intervalSeconds !== undefined) settings.intervalSeconds = shared.intervalSeconds;
    if (shared.startMode !== undefined) settings.startMode = shared.startMode;
    if (shared.shufflePlaylist !== undefined) settings.shufflePlaylist = shared.shufflePlaylist;
    if (shared.loopPlaylist !== undefined) settings.loopPlaylist = shared.loopPlaylist;
    if (shared.softFade !== undefined) settings.softFade = shared.softFade;

    const ms = settings.intervalSeconds * 1000;
    let savedQueue = parseStoredQueue(readStorage(STORAGE_KEYS.queue));
    const savedFavorites = parseStoredFavorites(readStorage(STORAGE_KEYS.favorites));

    let sharedPlaylist: ActivePlaylist | null = null;
    let sharedItemId = '';

    if (shared.url) {
      const valid = validatePlaylistUrl(shared.url);
      if (!('error' in valid)) {
        const existing = savedQueue.find((item) => item.id === valid.url);
        const item: QueuedPlaylist = existing ?? {
          id: valid.url,
          url: valid.url,
          ...extractPlaylistMetadata(valid.url),
        };
        if (!existing && savedQueue.length < 50) {
          savedQueue = [item, ...savedQueue];
          try {
            window.localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(savedQueue));
          } catch {
            // Ignore storage errors
          }
        }
        sharedItemId = item.id;
        sharedPlaylist =
          valid.provider === 'youtube'
            ? { url: valid.url, provider: 'youtube', playlistId: valid.playlistId }
            : { url: valid.url, provider: 'soundcloud' };
      }
    }

    if (!cancelled) {
      intervalMsRef.current = ms;
      activeWindowMsRef.current = ms;
      loopRef.current = settings.loopPlaylist;
      startModeRef.current = settings.startMode;
      shuffleRef.current = settings.shufflePlaylist;
      softFadeRef.current = settings.softFade;
      volumeRef.current = settings.volume;
      queueRef.current = savedQueue;

      setIntervalInput(String(settings.intervalSeconds));
      setIntervalMs(ms);
      setActiveWindowMs(ms);
      setLoopPlaylist(settings.loopPlaylist);
      setStartMode(settings.startMode);
      setShufflePlaylist(settings.shufflePlaylist);
      setSoftFade(settings.softFade);
      setVolumeState(settings.volume);
      setQueue(savedQueue);
      setFavorites(savedFavorites);
      resetTimer(ms);

      if (sharedPlaylist) {
        activePlaylistIdRef.current = sharedItemId;
        setActivePlaylistId(sharedItemId);
        setUrlInput(sharedPlaylist.url);
        setActivePlaylist(sharedPlaylist);
        setTrackTitle('Loading shared playlist…');
        setTrackArtist(sharedPlaylist.provider === 'youtube' ? 'Connecting to YouTube' : 'Connecting to SoundCloud');
        updateStatus('loading');
        setStatusMessage('Shared session loaded — press Play when ready.');
        setNotice('Loaded shared session settings.');
      }

      setHydrated(true);
    }

    return () => {
      cancelled = true;
    };
  }, [resetTimer, updateStatus]);

  useEffect(() => {
    loopRef.current = loopPlaylist;
  }, [loopPlaylist]);

  useEffect(() => {
    startModeRef.current = startMode;
  }, [startMode]);

  useEffect(() => {
    softFadeRef.current = softFade;
  }, [softFade]);

  useEffect(() => {
    volumeRef.current = volume;
    syncAdapterVolume(mutedRef.current ? 0 : volume);
  }, [volume, syncAdapterVolume]);

  useEffect(() => {
    mutedRef.current = isMuted;
    syncAdapterVolume(isMuted ? 0 : volumeRef.current, true);
  }, [isMuted, syncAdapterVolume]);

  useEffect(() => {
    shuffleRef.current = shufflePlaylist;
    resetShuffleOrder();
  }, [shufflePlaylist, resetShuffleOrder]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({
          version: 2,
          intervalSeconds: intervalMsRef.current / 1000,
          loopPlaylist,
          startMode,
          splitPreview: startMode === 'split',
          shufflePlaylist,
          softFade,
          volume,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [hydrated, intervalMs, loopPlaylist, startMode, shufflePlaylist, softFade, volume]);

  // Live Browser Tab Countdown Title
  const tabSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  useEffect(() => {
    if (status === 'playing' && trackTitle && trackTitle !== 'No playlist loaded') {
      document.title = isHolding
        ? `HOLD · ${trackTitle} — Timedrop`
        : `${tabSeconds}s · ${trackTitle} — Timedrop`;
    } else if (status === 'paused' && trackTitle && trackTitle !== 'No playlist loaded') {
      document.title = `Paused · ${trackTitle} — Timedrop`;
    } else {
      document.title = 'Timedrop — SoundCloud & YouTube Pacer';
    }
  }, [status, isHolding, tabSeconds, trackTitle]);

  const handleTrackErrorSkip = useCallback(
    (sessionToken: number, isDisposed: () => boolean, markFailed: () => void, fallbackErrorMsg: string) => {
      stopTimer();
      stopAutoplayCheck();
      soundQueryRef.current += 1;

      const count = totalTracksRef.current;
      const badIdx = pendingSkipRef.current ?? (currentIndexRef.current >= 0 ? currentIndexRef.current : 0);
      const nextState =
        desiredStateRef.current === 'playing' || autoplayIntentRef.current
          ? 'playing'
          : desiredStateRef.current === 'paused'
            ? 'paused'
            : desiredStateRef.current === 'stopped'
              ? 'stopped'
              : null;

      if (badIdx >= 0) failedIndicesRef.current.add(badIdx);

      if (count > 1 && nextState) {
        if (errorSkipTimerRef.current !== null) return;
        let fallbackIdx: number | null = null;
        if (shuffleRef.current) {
          const order = shuffleOrderRef.current;
          let pos = shufflePosRef.current + 1;
          while (pos < order.length && failedIndicesRef.current.has(order[pos])) pos += 1;
          if (pos < order.length) {
            shufflePosRef.current = pos;
            fallbackIdx = order[pos];
          }
        } else {
          let idx = Math.max(0, badIdx + 1);
          while (idx < count && failedIndicesRef.current.has(idx)) idx += 1;
          if (idx < count) fallbackIdx = idx;
        }

        if (fallbackIdx === null) {
          if (nextState === 'playing') {
            finishPlayback();
            return;
          }
        } else {
          setStatusMessage('Track unavailable or restricted — skipping automatically.');
          resetTimer();
          const target = fallbackIdx;
          errorSkipTimerRef.current = window.setTimeout(() => {
            errorSkipTimerRef.current = null;
            if (!isDisposed() && sessionGenRef.current === sessionToken) {
              jumpToTrack(target, nextState, 'Skipping unavailable track…');
            }
          }, ERROR_SKIP_DELAY_MS);
          return;
        }
      }

      autoplayIntentRef.current = false;
      desiredStateRef.current = 'error';
      markFailed();
      soundQueryRef.current += 1;
      setWidgetReady(false);
      updateStatus('error');
      setStatusMessage(fallbackErrorMsg);
    },
    [stopTimer, stopAutoplayCheck, finishPlayback, resetTimer, jumpToTrack, updateStatus]
  );

  // Unified Player Lifecycle (SoundCloud OR YouTube)
  useEffect(() => {
    if (!activePlaylist) return;

    let disposed = false;
    let failed = false;
    let becameReady = false;
    let readyTimeoutId: number | null = null;
    let detailsTimeoutId: number | null = null;

    let scWidget: SoundCloudWidgetInstance | null = null;
    let scIframe: HTMLIFrameElement | null = null;
    const scBoundEvents: string[] = [];

    let ytPlayer: YouTubePlayerInstance | null = null;
    let mountedAdapter: PlayerAdapter | null = null;

    const sessionToken = sessionGenRef.current + 1;
    sessionGenRef.current = sessionToken;
    failedIndicesRef.current = new Set();
    pendingSkipRef.current = null;
    lastAppliedVolumeRef.current = null;
    soundQueryRef.current += 1;
    resetShuffleOrder(0, -1);

    const clearDetailsTimeout = () => {
      if (detailsTimeoutId !== null) {
        window.clearTimeout(detailsTimeoutId);
        detailsTimeoutId = null;
      }
    };

    const playingStatusCopy = () => {
      if (holdRef.current) return 'Holding track — auto-advance paused.';
      const mode = startModeRef.current;
      if (mode === 'split') {
        return phaseRef.current === 'middle' ? 'Mid-track sample — timer running.' : 'Intro sample — timer running.';
      }
      if (mode === 'drop') return 'Drop-in (25%) — pacer active.';
      if (mode === 'middle') return 'Mid-track cue (50%) — pacer active.';
      return 'Playing — pacer active.';
    };

    if (activePlaylist.provider === 'soundcloud') {
      (async () => {
        try {
          await loadSoundCloudWidgetApi();
          if (disposed || sessionGenRef.current !== sessionToken || !scIframeRef.current || !window.SC?.Widget) {
            return;
          }

          const WidgetCtor = window.SC.Widget;
          const Events = WidgetCtor.Events;
          const iframe = scIframeRef.current;
          const widget = WidgetCtor(iframe);
          scIframe = iframe;
          scWidget = widget;

          const adapter: PlayerAdapter = {
            provider: 'soundcloud',
            play: () => widget.play(),
            pause: () => widget.pause(),
            seekToMs: (ms) => widget.seekTo(ms),
            skipToIndex: (index) => widget.skip(index),
            setVolume: (vol) => widget.setVolume(vol),
            getDurationMs: (cb) => widget.getDuration(cb),
            getCurrentIndex: (cb) => widget.getCurrentSoundIndex(cb),
            getCurrentTrack: (cb) => widget.getCurrentSound((s) => cb(normalizeSoundCloudTrack(s))),
            isPaused: (cb) => widget.isPaused(cb),
          };
          mountedAdapter = adapter;
          adapterRef.current = adapter;

          const bind = (event: string, handler: (...args: unknown[]) => void) => {
            scBoundEvents.push(event);
            widget.bind(event, handler);
          };

          bind(Events.READY, () => {
            if (disposed || failed || sessionGenRef.current !== sessionToken) return;
            becameReady = true;
            if (readyTimeoutId !== null) {
              window.clearTimeout(readyTimeoutId);
              readyTimeoutId = null;
            }
            setWidgetReady(true);
            syncAdapterVolume(getEffectiveVolume(), true);

            detailsTimeoutId = window.setTimeout(() => {
              if (disposed || failed || sessionGenRef.current !== sessionToken) return;
              failed = true;
              autoplayIntentRef.current = false;
              desiredStateRef.current = 'error';
              soundQueryRef.current += 1;
              setWidgetReady(false);
              updateStatus('error');
              setStatusMessage('SoundCloud did not return playlist details. Check the link and try again.');
            }, PLAYLIST_DETAILS_TIMEOUT_MS);

            widget.getSounds((sounds) => {
              if (disposed || failed || sessionGenRef.current !== sessionToken) return;
              clearDetailsTimeout();
              const list = Array.isArray(sounds) ? sounds : [];
              totalTracksRef.current = list.length;
              setTrackCount(list.length);

              if (list.length === 0) {
                failed = true;
                autoplayIntentRef.current = false;
                desiredStateRef.current = 'error';
                setWidgetReady(false);
                updateStatus('error');
                setStatusMessage('No playable tracks found. Verify the link or playlist visibility.');
                return;
              }

              const initialIdx =
                currentIndexRef.current >= 0 && currentIndexRef.current < list.length
                  ? currentIndexRef.current
                  : 0;
              currentIndexRef.current = initialIdx;
              setTrackIndex(initialIdx);
              resetShuffleOrder(list.length, initialIdx);
              trackChangeRef.current += 1;
              applyTrackMetadata(normalizeSoundCloudTrack(list[initialIdx]), trackChangeRef.current);

              const queryToken = soundQueryRef.current + 1;
              soundQueryRef.current = queryToken;
              widget.getCurrentSoundIndex((idx) => {
                if (
                  disposed ||
                  failed ||
                  sessionGenRef.current !== sessionToken ||
                  soundQueryRef.current !== queryToken ||
                  !Number.isFinite(idx)
                ) {
                  return;
                }
                trackChangeRef.current += 1;
                const changeToken = trackChangeRef.current;
                currentIndexRef.current = idx;
                setTrackIndex(idx);
                resetShuffleOrder(list.length, idx);
                applyTrackMetadata(normalizeSoundCloudTrack(list[idx] ?? list[0]), changeToken);
              });

              if (autoplayIntentRef.current) {
                desiredStateRef.current = 'playing';
                setStatusMessage('Starting SoundCloud playback…');
                widget.play();
                scheduleAutoplayCheck();
              } else {
                desiredStateRef.current = 'ready';
                updateStatus('ready');
                setStatusMessage(`${list.length} ${list.length === 1 ? 'track' : 'tracks'} loaded.`);
              }
            });
          });

          bind(Events.PLAY, () => {
            if (disposed || failed || sessionGenRef.current !== sessionToken) return;
            if (suppressPlayRef.current) {
              suppressPlayRef.current = false;
              autoplayIntentRef.current = false;
              stopAutoplayCheck();
              widget.pause();
              stopTimer();
              return;
            }

            const queryToken = soundQueryRef.current + 1;
            soundQueryRef.current = queryToken;
            widget.getCurrentSoundIndex((idx) => {
              if (
                disposed ||
                failed ||
                sessionGenRef.current !== sessionToken ||
                soundQueryRef.current !== queryToken ||
                !Number.isFinite(idx)
              ) {
                return;
              }

              const pending = pendingSkipRef.current;
              if (pending !== null && idx !== pending) return;

              stopAutoplayCheck();
              if (errorSkipTimerRef.current !== null) {
                window.clearTimeout(errorSkipTimerRef.current);
                errorSkipTimerRef.current = null;
              }

              autoplayIntentRef.current = false;
              desiredStateRef.current = 'playing';
              updateStatus('playing');
              syncAdapterVolume(getEffectiveVolume(), true);

              const trackChanged = idx !== currentIndexRef.current;
              pendingSkipRef.current = null;
              currentIndexRef.current = idx;
              setTrackIndex(idx);

              if (trackChanged || remainingRef.current <= 0) {
                trackChangeRef.current += 1;
                if (shuffleRef.current && (pending === null || pending !== idx)) {
                  resetShuffleOrder(totalTracksRef.current, idx);
                }
                resetTimer();
              }

              setStatusMessage(playingStatusCopy());
              triggerInitialCueSeek();
              startTimer();

              const changeToken = trackChangeRef.current;
              widget.getCurrentSound((sound) => {
                if (
                  disposed ||
                  failed ||
                  sessionGenRef.current !== sessionToken ||
                  soundQueryRef.current !== queryToken
                ) {
                  return;
                }
                applyTrackMetadata(normalizeSoundCloudTrack(sound), changeToken);
              });
            });
          });

          bind(Events.PAUSE, () => {
            if (disposed || sessionGenRef.current !== sessionToken) return;
            stopTimer();
            syncAdapterVolume(getEffectiveVolume());
            if (desiredStateRef.current === 'playing' && autoplayIntentRef.current) return;
            if (
              desiredStateRef.current === 'stopped' ||
              desiredStateRef.current === 'ended' ||
              desiredStateRef.current === 'error'
            ) {
              return;
            }
            autoplayIntentRef.current = false;
            desiredStateRef.current = 'paused';
            updateStatus('paused');
            setStatusMessage('Paused — timer held.');
          });

          bind(Events.FINISH, () => {
            if (
              disposed ||
              sessionGenRef.current !== sessionToken ||
              desiredStateRef.current !== 'playing' ||
              pendingSkipRef.current !== null
            ) {
              return;
            }
            advanceTrack();
          });

          bind(Events.ERROR, () => {
            if (disposed || failed || sessionGenRef.current !== sessionToken) return;
            handleTrackErrorSkip(
              sessionToken,
              () => disposed,
              () => {
                failed = true;
              },
              'SoundCloud could not play this link. It may be private, removed, or geo-restricted.'
            );
          });

          bind(Events.PLAY_PROGRESS, () => {
            if (
              !disposed &&
              sessionGenRef.current === sessionToken &&
              !failed &&
              statusRef.current === 'blocked'
            ) {
              stopAutoplayCheck();
              autoplayIntentRef.current = false;
              desiredStateRef.current = 'playing';
              updateStatus('playing');
              setStatusMessage(playingStatusCopy());
              triggerInitialCueSeek();
              startTimer();
            }
          });

          if (!becameReady) {
            readyTimeoutId = window.setTimeout(() => {
              if (disposed || sessionGenRef.current !== sessionToken || becameReady) return;
              autoplayIntentRef.current = false;
              desiredStateRef.current = 'error';
              failed = true;
              soundQueryRef.current += 1;
              setWidgetReady(false);
              updateStatus('error');
              setStatusMessage('SoundCloud player timed out. Check your connection and retry.');
            }, READY_TIMEOUT_MS);
          }
        } catch {
          if (disposed) return;
          autoplayIntentRef.current = false;
          desiredStateRef.current = 'error';
          failed = true;
          soundQueryRef.current += 1;
          setWidgetReady(false);
          updateStatus('error');
          setStatusMessage('Could not load the SoundCloud player script. Check your connection.');
        }
      })();
    } else if (activePlaylist.provider === 'youtube' && activePlaylist.playlistId) {
      const playlistId = activePlaylist.playlistId;
      (async () => {
        try {
          await loadYouTubeIframeApi();
          if (disposed || sessionGenRef.current !== sessionToken || !ytHostRef.current || !window.YT?.Player) {
            return;
          }

          const host = ytHostRef.current;
          host.innerHTML = '';
          const mountNode = document.createElement('div');
          host.appendChild(mountNode);

          const syncYouTubePlaylistMeta = (player: YouTubePlayerInstance): number => {
            const list = player.getPlaylist?.();
            if (Array.isArray(list) && list.length > 0) {
              clearDetailsTimeout();
              if (totalTracksRef.current !== list.length) {
                totalTracksRef.current = list.length;
                setTrackCount(list.length);
                const rawIdx = player.getPlaylistIndex?.();
                const safeIdx = Number.isFinite(rawIdx) && rawIdx >= 0 && rawIdx < list.length ? rawIdx : 0;
                resetShuffleOrder(list.length, safeIdx);
              }
              return list.length;
            }
            return totalTracksRef.current;
          };

          const player = new window.YT.Player(mountNode, {
            width: '100%',
            height: '300',
            playerVars: {
              listType: 'playlist',
              list: playlistId,
              autoplay: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: ({ target }) => {
                if (disposed || failed || sessionGenRef.current !== sessionToken) return;
                becameReady = true;
                if (readyTimeoutId !== null) {
                  window.clearTimeout(readyTimeoutId);
                  readyTimeoutId = null;
                }
                setWidgetReady(true);
                syncAdapterVolume(getEffectiveVolume(), true);

                const count = syncYouTubePlaylistMeta(target);
                if (count > 0) {
                  const idx = Math.max(0, target.getPlaylistIndex?.() ?? 0);
                  currentIndexRef.current = idx;
                  setTrackIndex(idx);
                  trackChangeRef.current += 1;
                  applyTrackMetadata(normalizeYouTubeTrack(target), trackChangeRef.current);
                } else {
                  detailsTimeoutId = window.setTimeout(() => {
                    if (disposed || failed || sessionGenRef.current !== sessionToken || totalTracksRef.current > 0) {
                      return;
                    }
                    failed = true;
                    autoplayIntentRef.current = false;
                    desiredStateRef.current = 'error';
                    setWidgetReady(false);
                    updateStatus('error');
                    setStatusMessage(
                      'YouTube did not return playlist tracks. Ensure the playlist is public or unlisted.'
                    );
                  }, PLAYLIST_DETAILS_TIMEOUT_MS);
                }

                if (autoplayIntentRef.current) {
                  desiredStateRef.current = 'playing';
                  setStatusMessage('Starting YouTube playback…');
                  target.playVideo();
                  scheduleAutoplayCheck();
                } else {
                  desiredStateRef.current = 'ready';
                  updateStatus('ready');
                  setStatusMessage(count > 0 ? `${count} videos loaded.` : 'YouTube playlist ready.');
                }
              },

              onStateChange: ({ target, data }) => {
                if (disposed || failed || sessionGenRef.current !== sessionToken) return;

                if (data === 5) {
                  const count = syncYouTubePlaylistMeta(target);
                  if (count > 0 && currentIndexRef.current < 0) {
                    const idx = Math.max(0, target.getPlaylistIndex?.() ?? 0);
                    currentIndexRef.current = idx;
                    setTrackIndex(idx);
                    trackChangeRef.current += 1;
                    applyTrackMetadata(normalizeYouTubeTrack(target), trackChangeRef.current);
                  }
                  return;
                }

                if (data === 1) {
                  if (suppressPlayRef.current) {
                    suppressPlayRef.current = false;
                    autoplayIntentRef.current = false;
                    stopAutoplayCheck();
                    target.pauseVideo();
                    stopTimer();
                    return;
                  }

                  syncYouTubePlaylistMeta(target);
                  const idx = target.getPlaylistIndex?.();
                  const safeIdx = Number.isFinite(idx) && idx >= 0 ? idx : 0;

                  const pending = pendingSkipRef.current;
                  if (pending !== null && safeIdx !== pending) return;

                  stopAutoplayCheck();
                  if (errorSkipTimerRef.current !== null) {
                    window.clearTimeout(errorSkipTimerRef.current);
                    errorSkipTimerRef.current = null;
                  }

                  autoplayIntentRef.current = false;
                  desiredStateRef.current = 'playing';
                  updateStatus('playing');
                  syncAdapterVolume(getEffectiveVolume(), true);

                  const trackChanged = safeIdx !== currentIndexRef.current;
                  pendingSkipRef.current = null;
                  currentIndexRef.current = safeIdx;
                  setTrackIndex(safeIdx);

                  if (trackChanged || remainingRef.current <= 0) {
                    trackChangeRef.current += 1;
                    if (shuffleRef.current && (pending === null || pending !== safeIdx)) {
                      resetShuffleOrder(totalTracksRef.current, safeIdx);
                    }
                    resetTimer();
                  }

                  setStatusMessage(playingStatusCopy());
                  triggerInitialCueSeek();

                  const changeToken = trackChangeRef.current;
                  applyTrackMetadata(normalizeYouTubeTrack(target), changeToken);

                  if (ytMetaTimerRef.current !== null) window.clearTimeout(ytMetaTimerRef.current);
                  ytMetaTimerRef.current = window.setTimeout(() => {
                    if (disposed || sessionGenRef.current !== sessionToken || trackChangeRef.current !== changeToken) {
                      return;
                    }
                    syncYouTubePlaylistMeta(target);
                    applyTrackMetadata(normalizeYouTubeTrack(target), changeToken);
                    triggerInitialCueSeek();
                  }, 300);

                  startTimer();
                  return;
                }

                if (data === 2) {
                  stopTimer();
                  syncAdapterVolume(getEffectiveVolume());
                  if (desiredStateRef.current === 'playing' && autoplayIntentRef.current) return;
                  if (
                    desiredStateRef.current === 'stopped' ||
                    desiredStateRef.current === 'ended' ||
                    desiredStateRef.current === 'error'
                  ) {
                    return;
                  }
                  autoplayIntentRef.current = false;
                  desiredStateRef.current = 'paused';
                  updateStatus('paused');
                  setStatusMessage('Paused — timer held.');
                  return;
                }

                if (data === 0) {
                  if (desiredStateRef.current !== 'playing' || pendingSkipRef.current !== null) return;
                  advanceTrack();
                }
              },

              onError: ({ target }) => {
                if (disposed || failed || sessionGenRef.current !== sessionToken) return;
                syncYouTubePlaylistMeta(target);
                handleTrackErrorSkip(
                  sessionToken,
                  () => disposed,
                  () => {
                    failed = true;
                  },
                  'YouTube could not play this playlist. It may be private, empty, or have embedding disabled.'
                );
              },
            },
          });

          ytPlayer = player;
          const adapter: PlayerAdapter = {
            provider: 'youtube',
            play: () => player.playVideo(),
            pause: () => player.pauseVideo(),
            seekToMs: (ms) => player.seekTo(ms / 1000, true),
            skipToIndex: (index) => player.playVideoAt(index),
            setVolume: (vol) => {
              if (vol <= 0) {
                player.mute?.();
                player.setVolume?.(0);
              } else {
                player.unMute?.();
                player.setVolume?.(vol);
              }
            },
            getDurationMs: (cb) => {
              const s = player.getDuration?.();
              cb(Number.isFinite(s) && s > 0 ? s * 1000 : NaN);
            },
            getCurrentIndex: (cb) => cb(player.getPlaylistIndex?.() ?? -1),
            getCurrentTrack: (cb) => cb(normalizeYouTubeTrack(player)),
            isPaused: (cb) => {
              const st = player.getPlayerState?.();
              cb(st !== 1 && st !== 3);
            },
          };
          mountedAdapter = adapter;
          adapterRef.current = adapter;

          if (!becameReady) {
            readyTimeoutId = window.setTimeout(() => {
              if (disposed || sessionGenRef.current !== sessionToken || becameReady) return;
              autoplayIntentRef.current = false;
              desiredStateRef.current = 'error';
              failed = true;
              soundQueryRef.current += 1;
              setWidgetReady(false);
              updateStatus('error');
              setStatusMessage('YouTube player timed out. Check your connection and retry.');
            }, READY_TIMEOUT_MS);
          }
        } catch {
          if (disposed) return;
          autoplayIntentRef.current = false;
          desiredStateRef.current = 'error';
          failed = true;
          soundQueryRef.current += 1;
          setWidgetReady(false);
          updateStatus('error');
          setStatusMessage('Could not load the YouTube player script. Check your connection.');
        }
      })();
    }

    return () => {
      disposed = true;
      if (sessionGenRef.current === sessionToken) {
        sessionGenRef.current += 1;
      }
      trackChangeRef.current += 1;
      soundQueryRef.current += 1;
      stopTimer();
      stopAutoplayCheck();
      setWidgetReady(false);
      if (readyTimeoutId !== null) window.clearTimeout(readyTimeoutId);
      clearDetailsTimeout();
      if (errorSkipTimerRef.current !== null) {
        window.clearTimeout(errorSkipTimerRef.current);
        errorSkipTimerRef.current = null;
      }
      if (ytMetaTimerRef.current !== null) {
        window.clearTimeout(ytMetaTimerRef.current);
        ytMetaTimerRef.current = null;
      }
      if (scWidget && scIframe?.isConnected && scIframe.contentWindow) {
        scBoundEvents.forEach((ev) => {
          try {
            scWidget?.unbind(ev);
          } catch {
            // Ignore unbind errors
          }
        });
      }
      if (ytPlayer) {
        try {
          ytPlayer.destroy();
        } catch {
          // Ignore destroy errors
        }
      }
      if (ytHostRef.current) {
        ytHostRef.current.innerHTML = '';
      }
      if (adapterRef.current === mountedAdapter) {
        adapterRef.current = null;
      }
    };
  }, [
    activePlaylist,
    retryCounter,
    scheduleAutoplayCheck,
    advanceTrack,
    stopTimer,
    stopAutoplayCheck,
    handleTrackErrorSkip,
    resetTimer,
    resetShuffleOrder,
    updateStatus,
    startTimer,
    applyTrackMetadata,
    triggerInitialCueSeek,
    syncAdapterVolume,
    getEffectiveVolume,
  ]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopAutoplayCheck();
      if (errorSkipTimerRef.current !== null) window.clearTimeout(errorSkipTimerRef.current);
      if (ytMetaTimerRef.current !== null) window.clearTimeout(ytMetaTimerRef.current);
    };
  }, [stopTimer, stopAutoplayCheck]);

  const applyInterval = useCallback(
    (raw: string, focusOnError = false): number | null => {
      const result = validateInterval(raw);
      if (!result.valid) {
        setIntervalError(result.error);
        if (focusOnError) {
          window.setTimeout(() => intervalInputRef.current?.focus(), 0);
        }
        return null;
      }
      const ms = result.seconds * 1000;
      setIntervalInput(String(result.seconds));
      setIntervalError('');
      intervalMsRef.current = ms;
      setIntervalMs(ms);
      resetTimer(ms);
      if (statusRef.current === 'playing') {
        startTimer();
      }
      return result.seconds;
    },
    [resetTimer, startTimer]
  );

  const loadAndPlay = useCallback(
    (rawUrl = urlInput, preserveInterval = false, updateInput = true): boolean => {
      setUrlError('');
      setNotice('');

      const validated = validatePlaylistUrl(rawUrl);
      if ('error' in validated) {
        setUrlError(validated.error);
        window.setTimeout(() => urlInputRef.current?.focus(), 0);
        return false;
      }

      const candidateInterval = preserveInterval ? String(intervalMsRef.current / 1000) : intervalInput;
      const isSamePlaylist = activePlaylist?.url === validated.url;
      const shouldKeepRunningInterval =
        !updateInput &&
        isSamePlaylist &&
        (statusRef.current === 'paused' || statusRef.current === 'blocked');

      const secs = shouldKeepRunningInterval
        ? intervalMsRef.current / 1000
        : applyInterval(candidateInterval, true);

      if (secs === null) return false;
      if (updateInput) setUrlInput(validated.url);

      desiredStateRef.current = 'playing';
      autoplayIntentRef.current = true;
      suppressPlayRef.current = false;

      if (!isSamePlaylist) {
        stopTimer();
        stopAutoplayCheck();
        trackChangeRef.current += 1;
        soundQueryRef.current += 1;
        currentIndexRef.current = -1;
        totalTracksRef.current = 0;
        pendingSkipRef.current = null;
        failedIndicesRef.current = new Set();
        currentTrackRef.current = null;
        resetShuffleOrder(0, -1);

        const providerLabel = validated.provider === 'youtube' ? 'YouTube' : 'SoundCloud';
        setTrackId('');
        setTrackIndex(-1);
        setTrackCount(0);
        setTrackTitle('Loading playlist…');
        setTrackArtist(`Connecting to ${providerLabel}`);
        setTrackArtworkUrl(undefined);
        setTrackDurationMs(undefined);
        setWidgetReady(false);
        resetTimer(secs * 1000);
        updateStatus('loading');
        setStatusMessage(`Loading ${providerLabel} playlist…`);
        setNotice(`Connecting to ${providerLabel}…`);
        setActivePlaylist(
          validated.provider === 'youtube'
            ? { url: validated.url, provider: 'youtube', playlistId: validated.playlistId }
            : { url: validated.url, provider: 'soundcloud' }
        );
        return true;
      }

      const adapter = adapterRef.current;
      if (!adapter || !widgetReady) {
        updateStatus('loading');
        setStatusMessage('Retrying player connection…');
        setRetryCounter((c) => c + 1);
        return true;
      }

      if (statusRef.current === 'playing') {
        autoplayIntentRef.current = false;
        soundQueryRef.current += 1;
        adapter.seekToMs(0);
        resetTimer();
        triggerInitialCueSeek();
        startTimer();
        setStatusMessage('Track window restarted.');
        setNotice('Restarted current track window.');
        return true;
      }

      if (statusRef.current === 'ended') {
        failedIndicesRef.current = new Set();
        resetShuffleOrder(totalTracksRef.current, 0);
        jumpToTrack(0, 'playing', 'Restarting playlist…');
        return true;
      }

      adapter.play();
      updateStatus('loading');
      setStatusMessage('Resuming playback…');
      scheduleAutoplayCheck();
      return true;
    },
    [
      urlInput,
      intervalInput,
      activePlaylist,
      widgetReady,
      applyInterval,
      stopTimer,
      stopAutoplayCheck,
      resetShuffleOrder,
      resetTimer,
      updateStatus,
      startTimer,
      jumpToTrack,
      scheduleAutoplayCheck,
      triggerInitialCueSeek,
    ]
  );

  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  const persistQueue = useCallback((nextQueue: QueuedPlaylist[]) => {
    queueRef.current = nextQueue;
    setQueue(nextQueue);
    try {
      window.localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(nextQueue));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const persistFavorites = useCallback((nextFavorites: SavedTrack[]) => {
    setFavorites(nextFavorites);
    try {
      window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(nextFavorites));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const playQueuedItem = useCallback(
    (item: QueuedPlaylist) => {
      if (loadAndPlay(item.url)) {
        activePlaylistIdRef.current = item.id;
        setActivePlaylistId(item.id);
        setUrlInput(item.url);
      }
    },
    [loadAndPlay]
  );

  const submitPlaylist = useCallback(
    (rawUrl: string, playImmediately: boolean): boolean => {
      const validated = validatePlaylistUrl(rawUrl);
      if ('error' in validated) {
        setUrlError(validated.error);
        setNotice('');
        window.setTimeout(() => urlInputRef.current?.focus(), 0);
        return false;
      }

      setUrlInput(validated.url);
      setUrlError('');
      setNotice('');

      const existing = queueRef.current.find((item) => item.id === validated.url);
      const item: QueuedPlaylist = existing ?? {
        id: validated.url,
        url: validated.url,
        ...extractPlaylistMetadata(validated.url),
      };

      if (!existing) {
        if (queueRef.current.length >= 50) {
          setNotice('Queue limit reached (50 playlists). Remove one first.');
          return false;
        }
        setClearedQueueBackup(null);
        persistQueue([...queueRef.current, item]);
      }

      if (playImmediately) {
        playQueuedItem(item);
        return true;
      }

      setNotice(existing ? `Already in queue: ${item.title}` : `Queued: ${item.title}`);
      return true;
    },
    [persistQueue, playQueuedItem]
  );

  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.readText) {
      setUrlError('Clipboard read unavailable here. Paste directly into the field.');
      return;
    }
    setIsPasting(true);
    setUrlError('');
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setUrlError('Clipboard is empty.');
        return;
      }
      setUrlInput(text);
      setNotice('URL pasted — press Play now or Queue.');
      window.setTimeout(() => urlInputRef.current?.focus(), 0);
    } catch {
      setUrlError('Clipboard access was blocked. Paste manually with Ctrl+V / Cmd+V.');
    } finally {
      setIsPasting(false);
    }
  }, []);

  const changeStartMode = useCallback((mode: StartMode) => {
    setStartMode(mode);
    startModeRef.current = mode;
    const labels: Record<StartMode, string> = {
      start: 'Cue set to Start (0:00).',
      drop: 'Cue set to Drop-in (25% into each track).',
      middle: 'Cue set to Middle (50% into each track).',
      split: 'Split preview enabled: half from start, half from middle.',
    };
    setNotice(labels[mode]);
  }, []);

  const toggleShuffle = useCallback((checked: boolean) => {
    setShufflePlaylist(checked);
    setNotice(checked ? 'Shuffle on for current playlist.' : 'Original playlist order restored.');
  }, []);

  const toggleLoop = useCallback((checked: boolean) => {
    setLoopPlaylist(checked);
    setNotice(checked ? 'Queue looping enabled.' : 'Queue looping disabled.');
  }, []);

  const toggleSoftFade = useCallback((checked: boolean) => {
    setSoftFade(checked);
    softFadeRef.current = checked;
    if (!checked) syncAdapterVolume(getEffectiveVolume());
    setNotice(checked ? 'Soft 1.5s fade-out enabled.' : 'Hard cut transitions enabled.');
  }, [syncAdapterVolume, getEffectiveVolume]);

  const setVolume = useCallback((nextVol: number) => {
    const clamped = clampVolume(nextVol, 100);
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (clamped > 0 && mutedRef.current) {
      mutedRef.current = false;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      setStatusMessage(next ? 'Audio muted.' : `Volume ${volumeRef.current}%.`);
      return next;
    });
  }, []);

  const toggleHold = useCallback(() => {
    if (!adapterRef.current || !widgetReady) return;
    const next = !holdRef.current;
    holdRef.current = next;
    setIsHolding(next);

    if (next) {
      stopTimer();
      syncAdapterVolume(getEffectiveVolume(), true);
      setStatusMessage('Holding current track — auto-advance paused until next track.');
    } else {
      setStatusMessage('Hold released — pacer resumed.');
      if (statusRef.current === 'playing') {
        startTimer();
      }
    }
  }, [widgetReady, stopTimer, syncAdapterVolume, getEffectiveVolume, startTimer]);

  const extendWindow = useCallback(
    (deltaMs = EXTEND_STEP_MS) => {
      if (!adapterRef.current || !widgetReady) return;
      const nextRemaining = Math.min(MAX_WINDOW_MS, remainingRef.current + deltaMs);
      remainingRef.current = nextRemaining;
      setRemainingMs(nextRemaining);
      if (nextRemaining > activeWindowMsRef.current) {
        activeWindowMsRef.current = nextRemaining;
        setActiveWindowMs(nextRemaining);
      }
      syncAdapterVolume(getEffectiveVolume(), true);
      setStatusMessage(`Extended window by +${Math.round(deltaMs / 1000)}s.`);
    },
    [widgetReady, syncAdapterVolume, getEffectiveVolume]
  );

  const pause = useCallback(() => {
    if (!adapterRef.current) return;
    autoplayIntentRef.current = false;
    pendingSkipRef.current = null;
    suppressPlayRef.current = false;
    soundQueryRef.current += 1;
    desiredStateRef.current = 'paused';
    stopTimer();
    stopAutoplayCheck();
    syncAdapterVolume(getEffectiveVolume());
    adapterRef.current.pause();
    updateStatus('paused');
    setStatusMessage('Paused — timer held.');
  }, [stopTimer, stopAutoplayCheck, updateStatus, syncAdapterVolume, getEffectiveVolume]);

  const stop = useCallback(() => {
    if (!adapterRef.current) return;
    autoplayIntentRef.current = false;
    pendingSkipRef.current = null;
    suppressPlayRef.current = false;
    trackChangeRef.current += 1;
    soundQueryRef.current += 1;
    desiredStateRef.current = 'stopped';
    stopTimer();
    stopAutoplayCheck();
    adapterRef.current.pause();
    adapterRef.current.seekToMs(0);
    resetTimer();
    updateStatus('stopped');
    setStatusMessage('Stopped — rewound to track start.');
  }, [stopTimer, stopAutoplayCheck, resetTimer, updateStatus]);

  const previousTrack = useCallback(() => {
    if (!adapterRef.current || !widgetReady) return;
    const prevIdx = resolveStepIndex(-1);
    if (prevIdx === null) {
      adapterRef.current.seekToMs(0);
      resetTimer();
      setStatusMessage('At first track — restarted from 0:00.');
      return;
    }
    const target =
      statusRef.current === 'playing' || statusRef.current === 'loading'
        ? 'playing'
        : statusRef.current === 'paused'
          ? 'paused'
          : 'stopped';
    jumpToTrack(prevIdx, target, 'Previous track…');
  }, [widgetReady, resolveStepIndex, resetTimer, jumpToTrack]);

  const nextTrack = useCallback(() => {
    if (!adapterRef.current || !widgetReady) return;
    const nextIdx = resolveStepIndex(1);
    if (nextIdx === null) {
      if (statusRef.current === 'playing' || statusRef.current === 'loading') {
        finishPlayback();
      } else {
        setStatusMessage('End of playlist reached.');
      }
      return;
    }
    const target =
      statusRef.current === 'playing' || statusRef.current === 'loading'
        ? 'playing'
        : statusRef.current === 'paused'
          ? 'paused'
          : 'stopped';
    if (!jumpToTrack(nextIdx, target, 'Next track…')) {
      finishPlayback();
    }
  }, [widgetReady, resolveStepIndex, finishPlayback, jumpToTrack]);

  const moveQueueItem = useCallback(
    (id: string, delta: number) => {
      const list = queueRef.current;
      const idx = list.findIndex((item) => item.id === id);
      const targetIdx = idx + delta;
      if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;
      const copy = [...list];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      persistQueue(copy);
      setStatusMessage(`Moved "${copy[targetIdx].title}" ${delta < 0 ? 'up' : 'down'}.`);
    },
    [persistQueue]
  );

  const renameQueueItem = useCallback(
    (id: string, rawTitle: string) => {
      const cleaned = sanitizeText(rawTitle, 160);
      if (!cleaned) return;
      const next = queueRef.current.map((item) => (item.id === id ? { ...item, title: cleaned } : item));
      persistQueue(next);
      setStatusMessage(`Renamed playlist to "${cleaned}".`);
    },
    [persistQueue]
  );

  const removeQueueItem = useCallback(
    (id: string) => {
      if (id === activePlaylistIdRef.current) return;
      const target = queueRef.current.find((item) => item.id === id);
      persistQueue(queueRef.current.filter((item) => item.id !== id));
      setStatusMessage(`Removed "${target?.title ?? 'Playlist'}" from queue.`);
      window.setTimeout(() => queueHeadingRef.current?.focus(), 0);
    },
    [persistQueue]
  );

  const clearQueueAndStop = useCallback(() => {
    setClearedQueueBackup([...queueRef.current]);
    autoplayIntentRef.current = false;
    pendingSkipRef.current = null;
    suppressPlayRef.current = false;
    desiredStateRef.current = 'idle';
    trackChangeRef.current += 1;
    soundQueryRef.current += 1;
    stopTimer();
    stopAutoplayCheck();
    adapterRef.current?.pause();

    currentTrackRef.current = null;
    activePlaylistIdRef.current = '';
    setActivePlaylistId('');
    persistQueue([]);
    setActivePlaylist(null);
    setWidgetReady(false);
    setUrlInput('');
    setTrackId('');
    setTrackTitle('No playlist loaded');
    setTrackArtist('Ready for a SoundCloud or YouTube playlist');
    setTrackArtworkUrl(undefined);
    setTrackDurationMs(undefined);
    setTrackIndex(-1);
    setTrackCount(0);
    resetTimer();
    updateStatus('idle');
    setStatusMessage('Queue cleared and playback stopped. Undo available below.');
  }, [stopTimer, stopAutoplayCheck, persistQueue, resetTimer, updateStatus]);

  const undoClearQueue = useCallback(() => {
    if (!clearedQueueBackup?.length) return;
    persistQueue(clearedQueueBackup);
    setClearedQueueBackup(null);
    setStatusMessage('Queue restored. Choose a playlist to resume.');
  }, [clearedQueueBackup, persistQueue]);

  const toggleSaveTrack = useCallback(() => {
    const track = currentTrackRef.current;
    const validated = validateTrackUrl(track?.url);
    if (!track || !validated || !trackId) return;

    const alreadySaved = favorites.some((item) => item.id === trackId);
    if (!alreadySaved && favorites.length >= 200) {
      setStatusMessage('Saved tracks limit reached (200). Remove one first.');
      return;
    }

    const next = alreadySaved
      ? favorites.filter((item) => item.id !== trackId)
      : [
          {
            id: trackId,
            url: validated.url,
            provider: validated.provider,
            title: track.title,
            artist: track.artist,
            savedAt: Date.now(),
          },
          ...favorites,
        ];
    persistFavorites(next);
    setStatusMessage(alreadySaved ? 'Removed track from saved finds.' : 'Saved track locally.');
  }, [favorites, persistFavorites, trackId]);

  const removeFavorite = useCallback(
    (id: string) => {
      const target = favorites.find((item) => item.id === id);
      persistFavorites(favorites.filter((item) => item.id !== id));
      setStatusMessage(`Removed "${target?.title ?? 'Track'}" from saved tracks.`);
      window.setTimeout(() => favoritesHeadingRef.current?.focus(), 0);
    },
    [favorites, persistFavorites]
  );

  const copySavedTracks = useCallback(async (): Promise<boolean> => {
    if (!favorites.length || !navigator.clipboard?.writeText) return false;
    const text = favorites.map((t) => `${t.artist} — ${t.title}\n${t.url}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(
        `Copied ${favorites.length} saved ${favorites.length === 1 ? 'track' : 'tracks'} to clipboard.`
      );
      return true;
    } catch {
      return false;
    }
  }, [favorites]);

  const copyShareLink = useCallback(async (): Promise<boolean> => {
    if (!navigator.clipboard?.writeText) return false;
    const candidateUrl = activePlaylist?.url || urlInput.trim() || undefined;
    const shareHref = buildShareUrl(window.location.href, {
      url: candidateUrl,
      intervalSeconds: intervalMsRef.current / 1000,
      startMode: startModeRef.current,
      shufflePlaylist: shuffleRef.current,
      loopPlaylist: loopRef.current,
      softFade: softFadeRef.current,
    });
    try {
      await navigator.clipboard.writeText(shareHref);
      setStatusMessage('Shareable session link copied to clipboard.');
      setNotice('Session link copied.');
      return true;
    } catch {
      return false;
    }
  }, [activePlaylist, urlInput]);

  // Global keyboard shortcuts
  useEffect(() => {
    shortcutsRef.current = {
      togglePlayback: () => {
        if (statusRef.current === 'playing') {
          pause();
        } else if (activePlaylist) {
          loadAndPlay(activePlaylist.url, true, false);
        } else {
          submitPlaylist(urlInput, true);
        }
      },
      previous: previousTrack,
      next: nextTrack,
      stop,
      restart: () => {
        if (activePlaylist) {
          loadAndPlay(activePlaylist.url, true, false);
        } else {
          submitPlaylist(urlInput, true);
        }
      },
      toggleLoop: () => {
        setLoopPlaylist((prev) => {
          const next = !prev;
          setStatusMessage(next ? 'Queue looping enabled.' : 'Queue looping disabled.');
          return next;
        });
      },
      toggleFavorite: toggleSaveTrack,
      toggleHold,
      extendWindow: () => extendWindow(EXTEND_STEP_MS),
      toggleMute,
    };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName))
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === ' ' || key === 'k') {
        event.preventDefault();
        shortcutsRef.current.togglePlayback();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        shortcutsRef.current.previous();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        shortcutsRef.current.next();
      } else if (key === 's') {
        shortcutsRef.current.stop();
      } else if (key === 'r') {
        shortcutsRef.current.restart();
      } else if (key === 'l') {
        shortcutsRef.current.toggleLoop();
      } else if (key === 'f') {
        shortcutsRef.current.toggleFavorite();
      } else if (key === 'h') {
        shortcutsRef.current.toggleHold();
      } else if (key === '+' || key === '=') {
        shortcutsRef.current.extendWindow();
      } else if (key === 'm') {
        shortcutsRef.current.toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const soundCloudEmbedUrl = useMemo(
    () => (activePlaylist?.provider === 'soundcloud' ? buildSoundCloudEmbedUrl(activePlaylist.url) : ''),
    [activePlaylist]
  );

  const isTrackSaved = Boolean(trackId) && favorites.some((item) => item.id === trackId);
  const canTransport = widgetReady && Boolean(activePlaylist);
  const intervalSeconds = intervalMs / 1000;
  const elapsedFraction =
    activeWindowMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / activeWindowMs)) : 0;

  return {
    // State
    urlInput,
    activePlaylist,
    activePlaylistUrl: activePlaylist?.url ?? '',
    activeProvider: activePlaylist?.provider ?? null,
    soundCloudEmbedUrl,
    intervalInput,
    intervalSeconds,
    intervalMs,
    activeWindowMs,
    remainingMs,
    elapsedFraction,
    loopPlaylist,
    startMode,
    shufflePlaylist,
    softFade,
    volume,
    isMuted,
    isHolding,
    previewPhase,
    isPasting,
    queue,
    clearedQueueBackup,
    activePlaylistId,
    favorites,
    status,
    statusMessage,
    urlError,
    intervalError,
    notice,
    trackTitle,
    trackArtist,
    trackArtworkUrl,
    trackId,
    trackDurationMs,
    trackIndex,
    trackCount,
    srAnnouncement,
    widgetReady,
    retryCounter,
    canTransport,
    isTrackSaved,
    // Refs
    urlInputRef,
    intervalInputRef,
    queueHeadingRef,
    favoritesHeadingRef,
    scIframeRef,
    ytHostRef,
    // Actions
    setUrlInput: (val: string) => {
      setUrlInput(val);
      setUrlError('');
      setNotice('');
    },
    setIntervalInput: (val: string) => {
      setIntervalInput(val);
      setIntervalError('');
    },
    applyInterval,
    loadAndPlay,
    submitPlaylist,
    pasteFromClipboard,
    changeStartMode,
    toggleShuffle,
    toggleLoop,
    toggleSoftFade,
    setVolume,
    toggleMute,
    toggleHold,
    extendWindow,
    pause,
    stop,
    previousTrack,
    nextTrack,
    playQueuedItem,
    moveQueueItem,
    renameQueueItem,
    removeQueueItem,
    clearQueueAndStop,
    undoClearQueue,
    toggleSaveTrack,
    removeFavorite,
    copySavedTracks,
    copyShareLink,
  };
}
