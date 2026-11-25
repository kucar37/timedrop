import { useEffect, useState, type RefObject } from 'react';
import {
  formatCountdownClock,
  formatDuration,
  INTERVAL_PRESETS,
  START_MODE_OPTIONS,
  type PlayerStatus,
  type PreviewPhase,
  type StartMode,
} from '../lib/media';
import {
  BookmarkIcon,
  DiscIcon,
  FadeIcon,
  HoldIcon,
  LoopIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrevIcon,
  ShuffleIcon,
  StopIcon,
  VolumeIcon,
} from './Icons';

interface PacerDeckProps {
  status: PlayerStatus;
  trackTitle: string;
  trackArtist: string;
  trackArtworkUrl?: string;
  trackId: string;
  trackDurationMs?: number;
  trackIndex: number;
  trackCount: number;
  srAnnouncement: string;
  remainingMs: number;
  activeWindowMs: number;
  intervalSeconds: number;
  elapsedFraction: number;
  intervalInput: string;
  intervalError: string;
  intervalInputRef: RefObject<HTMLInputElement | null>;
  startMode: StartMode;
  shufflePlaylist: boolean;
  loopPlaylist: boolean;
  softFade: boolean;
  volume: number;
  isMuted: boolean;
  isHolding: boolean;
  previewPhase: PreviewPhase;
  canTransport: boolean;
  hasPlayableInput: boolean;
  isTrackSaved: boolean;
  onIntervalChange: (val: string) => void;
  onIntervalCommit: (val: string) => void;
  onChangeStartMode: (mode: StartMode) => void;
  onToggleShuffle: (val: boolean) => void;
  onToggleLoop: (val: boolean) => void;
  onToggleSoftFade: (val: boolean) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleHold: () => void;
  onExtendWindow: () => void;
  onToggleSave: () => void;
  onPrevious: () => void;
  onPrimaryPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
}

export function PacerDeck({
  status,
  trackTitle,
  trackArtist,
  trackArtworkUrl,
  trackId,
  trackDurationMs,
  trackIndex,
  trackCount,
  srAnnouncement,
  remainingMs,
  activeWindowMs,
  intervalSeconds,
  elapsedFraction,
  intervalInput,
  intervalError,
  intervalInputRef,
  startMode,
  shufflePlaylist,
  loopPlaylist,
  softFade,
  volume,
  isMuted,
  isHolding,
  previewPhase,
  canTransport,
  hasPlayableInput,
  isTrackSaved,
  onIntervalChange,
  onIntervalCommit,
  onChangeStartMode,
  onToggleShuffle,
  onToggleLoop,
  onToggleSoftFade,
  onVolumeChange,
  onToggleMute,
  onToggleHold,
  onExtendWindow,
  onToggleSave,
  onPrevious,
  onPrimaryPlay,
  onPause,
  onStop,
  onNext,
}: PacerDeckProps) {
  const [artFailed, setArtFailed] = useState(false);

  useEffect(() => {
    setArtFailed(false);
  }, [trackArtworkUrl]);

  const clock = formatCountdownClock(remainingMs);
  const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
  const activeWindowSecs = Math.round(activeWindowMs / 1000);
  const isSplit = startMode === 'split';

  const primaryLabel =
    status === 'loading'
      ? 'Loading…'
      : status === 'playing'
        ? 'Restart'
        : status === 'paused' || status === 'blocked'
          ? 'Continue'
          : status === 'ended'
            ? 'Play again'
            : 'Play';

  const phaseLabel = isHolding
    ? 'HOLDING TRACK'
    : startMode === 'split'
      ? previewPhase === 'middle'
        ? 'SPLIT · MIDDLE'
        : 'SPLIT · INTRO'
      : startMode === 'drop'
        ? 'DROP-IN · 25%'
        : startMode === 'middle'
          ? 'MID CUE · 50%'
          : 'START · 0%';

  const halfSeconds = Math.round((activeWindowSecs / 2) * 10) / 10;
  const startFill = isSplit ? Math.min(1, elapsedFraction * 2) * 100 : elapsedFraction * 100;
  const midFill = isSplit ? Math.max(0, (elapsedFraction - 0.5) * 2) * 100 : 0;
  const displayedVolume = isMuted ? 0 : volume;

  return (
    <div className="pacer-deck">
      {/* Track header & save action */}
      <div className="deck-track-header">
        <div className="track-meta-strip">
          <span className="mono-tag track-counter">
            {trackIndex >= 0 ? `TRACK ${String(trackIndex + 1).padStart(2, '0')}` : 'TRACK --'}
            <span className="sep">/</span>
            {trackCount > 0 ? String(trackCount).padStart(2, '0') : '--'}
          </span>
          <span className="meta-dot" aria-hidden="true">
            ·
          </span>
          <span className="mono-tag">{formatDuration(trackDurationMs)}</span>
          <span className="meta-dot" aria-hidden="true">
            ·
          </span>
          <span className={`mono-tag phase-tag ${isHolding ? 'is-holding' : ''}`} data-testid="preview-phase">
            {phaseLabel}
          </span>
        </div>

        <button
          type="button"
          className={`save-track-btn ${isTrackSaved ? 'is-saved' : ''}`}
          data-testid="favorite-button"
          onClick={onToggleSave}
          disabled={!trackId}
          aria-pressed={isTrackSaved}
          aria-label={isTrackSaved ? 'Remove track from saved finds' : 'Save track'}
          aria-keyshortcuts="F"
        >
          <BookmarkIcon filled={isTrackSaved} />
          <span>{isTrackSaved ? 'Saved' : 'Save track'}</span>
        </button>
      </div>

      {/* Framed Artwork + Now Playing Typography */}
      <div className="deck-now-playing">
        <div className={`artwork-frame ${trackArtworkUrl && !artFailed ? 'has-image' : ''}`}>
          {trackArtworkUrl && !artFailed ? (
            <img
              src={trackArtworkUrl}
              alt=""
              width={64}
              height={64}
              referrerPolicy="no-referrer"
              onError={() => setArtFailed(true)}
            />
          ) : (
            <DiscIcon className="artwork-placeholder" />
          )}
        </div>

        <div className="now-playing-text">
          <h1 className="track-title">{trackTitle}</h1>
          <p className="track-artist">{trackArtist}</p>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {srAnnouncement}
          </p>
        </div>
      </div>

      {/* Precision Countdown + Segmented Timeline + Quick Hold / +15s */}
      <div
        className={`pacer-meter status-${status} ${isHolding ? 'is-holding' : ''}`}
        role="timer"
        aria-label={isHolding ? 'Timer held on current track' : `${remainingSecs} seconds remaining`}
      >
        <div className="meter-readout">
          <strong className="meter-digits">{isHolding ? 'HOLD' : clock.main}</strong>
          <span className="meter-unit">{isHolding ? 'TIMER PAUSED' : `${clock.unit} LEFT`}</span>
        </div>

        <div className="meter-timeline">
          {isSplit ? (
            <div className="timeline-split">
              <div
                className={`timeline-seg ${previewPhase === 'start' && status === 'playing' && !isHolding ? 'is-active' : ''}`}
              >
                <div className="seg-header">
                  <span>01 START</span>
                  <span>{halfSeconds}s</span>
                </div>
                <div className="seg-track">
                  <div className="seg-fill" style={{ width: `${startFill}%` }} />
                </div>
              </div>
              <div
                className={`timeline-seg ${previewPhase === 'middle' && status === 'playing' && !isHolding ? 'is-active' : ''}`}
              >
                <div className="seg-header">
                  <span>02 MIDDLE</span>
                  <span>{halfSeconds}s</span>
                </div>
                <div className="seg-track">
                  <div className="seg-fill" style={{ width: `${midFill}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="timeline-continuous">
              <div className="seg-header">
                <span>
                  {startMode === 'drop'
                    ? 'DROP-IN (25%)'
                    : startMode === 'middle'
                      ? 'MIDDLE (50%)'
                      : 'WINDOW PROGRESS'}
                </span>
                <span>{activeWindowSecs}s TOTAL</span>
              </div>
              <div className="seg-track">
                <div className="seg-fill" style={{ width: `${startFill}%` }} />
              </div>
              <div className="timeline-ticks" aria-hidden="true">
                <span>0s</span>
                <span>{halfSeconds}s</span>
                <span>{activeWindowSecs}s</span>
              </div>
            </div>
          )}

          <div className="meter-quick-actions">
            <button
              type="button"
              className={`quick-chip ${isHolding ? 'is-active' : ''}`}
              onClick={onToggleHold}
              disabled={!canTransport}
              aria-pressed={isHolding}
              aria-keyshortcuts="H"
              title="Freeze auto-advance on this track (H)"
            >
              <HoldIcon />
              <span>{isHolding ? 'Holding' : 'Hold track'}</span>
            </button>

            <button
              type="button"
              className="quick-chip"
              onClick={onExtendWindow}
              disabled={!canTransport}
              aria-keyshortcuts="+"
              title="Add 15 seconds to current track window (+)"
            >
              <PlusIcon />
              <span>15s</span>
            </button>
          </div>

          <progress className="sr-only" max={activeWindowMs} value={remainingMs} aria-label="Track window remaining" />
        </div>
      </div>

      {/* Transport Controls + Master Volume */}
      <div className="transport-row">
        <div className="transport-bar" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="transport-btn transport-icon"
            onClick={onPrevious}
            disabled={!canTransport}
            aria-label="Previous track"
            aria-keyshortcuts="ArrowLeft"
            title="Previous track (←)"
          >
            <PrevIcon />
          </button>

          <button
            type="button"
            className={`transport-btn transport-primary ${status === 'blocked' ? 'needs-attention' : ''}`}
            data-testid="start-button"
            onClick={onPrimaryPlay}
            disabled={status === 'loading' || !hasPlayableInput}
            aria-label={`${primaryLabel} playlist`}
            aria-keyshortcuts="Space K R"
          >
            <PlayIcon />
            <span>{primaryLabel}</span>
          </button>

          <button
            type="button"
            className="transport-btn transport-secondary"
            onClick={onPause}
            disabled={!canTransport || status !== 'playing'}
            aria-label="Pause playlist"
            aria-keyshortcuts="Space K"
          >
            <PauseIcon />
            <span>Pause</span>
          </button>

          <button
            type="button"
            className="transport-btn transport-secondary"
            onClick={onStop}
            disabled={!canTransport}
            aria-label="Stop playlist"
            aria-keyshortcuts="S"
          >
            <StopIcon />
            <span>Stop</span>
          </button>

          <button
            type="button"
            className="transport-btn transport-icon"
            onClick={onNext}
            disabled={!canTransport}
            aria-label="Next track"
            aria-keyshortcuts="ArrowRight"
            title="Next track (→)"
          >
            <NextIcon />
          </button>
        </div>

        <div className="volume-control" aria-label="Master volume">
          <button
            type="button"
            className={`volume-mute-btn ${displayedVolume === 0 ? 'is-muted' : ''}`}
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={isMuted}
            aria-keyshortcuts="M"
            title="Mute / Unmute (M)"
          >
            {displayedVolume === 0 ? <MuteIcon /> : <VolumeIcon />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={displayedVolume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Master volume percentage"
            className="volume-slider"
          />
          <span className="volume-value">{displayedVolume}%</span>
        </div>
      </div>

      {/* Integrated Pacing & Cue Controls Tray */}
      <div className="deck-controls-tray">
        <div className="tray-top-grid">
          {/* Window duration */}
          <div className="control-block">
            <div className="control-label-row">
              <label htmlFor="interval">Window</label>
              <span className="control-hint">1–900s</span>
            </div>
            <div className="interval-row">
              <div className={`interval-input-box ${intervalError ? 'has-error' : ''}`}>
                <input
                  ref={intervalInputRef}
                  id="interval"
                  data-testid="interval-input"
                  type="number"
                  min={1}
                  max={900}
                  step={1}
                  value={intervalInput}
                  onChange={(e) => onIntervalChange(e.target.value)}
                  onBlur={() => {
                    if (intervalInput) onIntervalCommit(intervalInput);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onIntervalCommit(intervalInput);
                    }
                  }}
                  aria-describedby={intervalError ? 'interval-error' : undefined}
                  aria-invalid={Boolean(intervalError)}
                />
                <span className="input-suffix">SEC</span>
              </div>

              <div className="preset-group" role="group" aria-label="Interval presets">
                {INTERVAL_PRESETS.map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    className={`preset-btn ${intervalSeconds === secs ? 'is-active' : ''}`}
                    onClick={() => onIntervalCommit(String(secs))}
                    aria-pressed={intervalSeconds === secs}
                  >
                    {secs}s
                  </button>
                ))}
              </div>
            </div>
            {intervalError && (
              <p id="interval-error" className="inline-error" role="alert">
                {intervalError}
              </p>
            )}
          </div>

          {/* Cue / Drop-in Start Point */}
          <div className="control-block">
            <div className="control-label-row">
              <span>Cue point</span>
              <span className="control-hint">Start offset</span>
            </div>
            <div className="cue-segmented" role="group" aria-label="Track start cue point">
              {START_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`cue-${opt.value}`}
                  className={`cue-btn ${startMode === opt.value ? 'is-active' : ''}`}
                  onClick={() => onChangeStartMode(opt.value)}
                  aria-pressed={startMode === opt.value}
                >
                  <strong>{opt.label}</strong>
                  <span>{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Playback switches */}
        <div className="mode-switches">
          <label className={`mode-toggle ${softFade ? 'is-on' : ''}`}>
            <input
              data-testid="soft-fade-toggle"
              type="checkbox"
              role="switch"
              checked={softFade}
              onChange={(e) => onToggleSoftFade(e.target.checked)}
            />
            <FadeIcon />
            <span className="mode-text">
              <strong>Soft fade</strong>
              <small>1.5s fade-out</small>
            </span>
            <span className="mode-led" aria-hidden="true" />
          </label>

          <label className={`mode-toggle ${shufflePlaylist ? 'is-on' : ''}`}>
            <input
              data-testid="shuffle-toggle"
              type="checkbox"
              role="switch"
              checked={shufflePlaylist}
              onChange={(e) => onToggleShuffle(e.target.checked)}
            />
            <ShuffleIcon />
            <span className="mode-text">
              <strong>Shuffle</strong>
              <small>No repeats</small>
            </span>
            <span className="mode-led" aria-hidden="true" />
          </label>

          <label className={`mode-toggle ${loopPlaylist ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              role="switch"
              checked={loopPlaylist}
              onChange={(e) => onToggleLoop(e.target.checked)}
            />
            <LoopIcon />
            <span className="mode-text">
              <strong>Loop queue</strong>
              <small>Wrap at end</small>
            </span>
            <span className="mode-led" aria-hidden="true" />
          </label>
        </div>
      </div>
    </div>
  );
}
