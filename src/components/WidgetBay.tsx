import type { RefObject } from 'react';
import type { MediaProvider, PlayerStatus } from '../lib/media';

interface WidgetBayProps {
  activeProvider: MediaProvider | null;
  soundCloudEmbedUrl: string;
  retryCounter: number;
  status: PlayerStatus;
  statusMessage: string;
  scIframeRef: RefObject<HTMLIFrameElement | null>;
  ytHostRef: RefObject<HTMLDivElement | null>;
}

export function WidgetBay({
  activeProvider,
  soundCloudEmbedUrl,
  retryCounter,
  status,
  statusMessage,
  scIframeRef,
  ytHostRef,
}: WidgetBayProps) {
  const bayTitle =
    activeProvider === 'youtube'
      ? 'YouTube Embed'
      : activeProvider === 'soundcloud'
        ? 'SoundCloud Embed'
        : 'Player Bay';

  const baySpec =
    activeProvider === 'youtube'
      ? 'Official IFrame Player'
      : activeProvider === 'soundcloud'
        ? 'Official HTML5 Widget'
        : 'SoundCloud · YouTube';

  return (
    <aside className="widget-bay" aria-label="Embedded media player">
      <div className="bay-header">
        <span className="bay-title">{bayTitle}</span>
        <span className="bay-spec">{baySpec}</span>
      </div>

      <div className="bay-stage">
        {activeProvider === 'soundcloud' && soundCloudEmbedUrl ? (
          <iframe
            key={`${soundCloudEmbedUrl}-${retryCounter}`}
            ref={scIframeRef}
            data-testid="soundcloud-widget"
            title="SoundCloud playlist player"
            width="100%"
            height="300"
            scrolling="no"
            frameBorder={0}
            allow="autoplay"
            referrerPolicy="strict-origin-when-cross-origin"
            src={soundCloudEmbedUrl}
          />
        ) : activeProvider === 'youtube' ? (
          <div className="yt-player-frame" data-testid="youtube-widget">
            <div ref={ytHostRef} className="yt-host" />
          </div>
        ) : (
          <div className="bay-empty">
            <div className="bay-empty-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <strong>Player bay ready</strong>
            <p>Paste a SoundCloud or YouTube playlist URL above to mount the player and start pacing.</p>
          </div>
        )}
      </div>

      <div className="bay-telemetry">
        <div className="telemetry-line" role="status" aria-live="polite" aria-atomic="true">
          <span className={`status-dot status-${status}`} aria-hidden="true" />
          <p data-testid="status-message">{statusMessage}</p>
        </div>

        <div className="shortcut-strip" aria-label="Keyboard shortcuts">
          <span>
            <kbd>Space</kbd>/<kbd>K</kbd> Play
          </span>
          <span>
            <kbd>←</kbd>
            <kbd>→</kbd> Track
          </span>
          <span>
            <kbd>H</kbd> Hold
          </span>
          <span>
            <kbd>+</kbd> +15s
          </span>
          <span>
            <kbd>M</kbd> Mute
          </span>
          <span>
            <kbd>F</kbd> Save
          </span>
          <span>
            <kbd>S</kbd> Stop
          </span>
          <span>
            <kbd>R</kbd> Restart
          </span>
          <span>
            <kbd>L</kbd> Loop
          </span>
        </div>
      </div>
    </aside>
  );
}
