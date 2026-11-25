import { useEffect, useState } from 'react';
import { ExternalIcon } from './components/Icons';
import { LibraryDock } from './components/LibraryDock';
import { PacerDeck } from './components/PacerDeck';
import { TopBar } from './components/TopBar';
import { UrlIntakeBar } from './components/UrlIntakeBar';
import { WidgetBay } from './components/WidgetBay';
import { useTimedrop } from './hooks/useTimedrop';
import { STORAGE_KEYS } from './lib/media';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const td = useTimedrop();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // Ignore storage errors
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#111110' : '#f3f2ee');
    }
  }, [theme]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="studio-shell">
        <TopBar
          status={td.status}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
          onShareSession={td.copyShareLink}
        />

        <main id="main-content" className="studio-main">
          <UrlIntakeBar
            urlInput={td.urlInput}
            urlError={td.urlError}
            notice={td.notice}
            isPasting={td.isPasting}
            isLoading={td.status === 'loading'}
            inputRef={td.urlInputRef}
            onUrlChange={td.setUrlInput}
            onPaste={td.pasteFromClipboard}
            onPlayNow={() => td.submitPlaylist(td.urlInput, true)}
            onAddToQueue={() => td.submitPlaylist(td.urlInput, false)}
          />

          <section className="console-frame" aria-label="Playlist pacer console">
            <PacerDeck
              status={td.status}
              trackTitle={td.trackTitle}
              trackArtist={td.trackArtist}
              trackArtworkUrl={td.trackArtworkUrl}
              trackId={td.trackId}
              trackDurationMs={td.trackDurationMs}
              trackIndex={td.trackIndex}
              trackCount={td.trackCount}
              srAnnouncement={td.srAnnouncement}
              remainingMs={td.remainingMs}
              activeWindowMs={td.activeWindowMs}
              intervalSeconds={td.intervalSeconds}
              elapsedFraction={td.elapsedFraction}
              intervalInput={td.intervalInput}
              intervalError={td.intervalError}
              intervalInputRef={td.intervalInputRef}
              startMode={td.startMode}
              shufflePlaylist={td.shufflePlaylist}
              loopPlaylist={td.loopPlaylist}
              softFade={td.softFade}
              volume={td.volume}
              isMuted={td.isMuted}
              isHolding={td.isHolding}
              previewPhase={td.previewPhase}
              canTransport={td.canTransport}
              hasPlayableInput={Boolean(td.activePlaylistUrl || td.urlInput.trim())}
              isTrackSaved={td.isTrackSaved}
              onIntervalChange={td.setIntervalInput}
              onIntervalCommit={(val) => td.applyInterval(val)}
              onChangeStartMode={td.changeStartMode}
              onToggleShuffle={td.toggleShuffle}
              onToggleLoop={td.toggleLoop}
              onToggleSoftFade={td.toggleSoftFade}
              onVolumeChange={td.setVolume}
              onToggleMute={td.toggleMute}
              onToggleHold={td.toggleHold}
              onExtendWindow={() => td.extendWindow()}
              onToggleSave={td.toggleSaveTrack}
              onPrevious={td.previousTrack}
              onPrimaryPlay={() =>
                td.activePlaylistUrl ? td.loadAndPlay(td.activePlaylistUrl, true, false) : td.submitPlaylist(td.urlInput, true)
              }
              onPause={td.pause}
              onStop={td.stop}
              onNext={td.nextTrack}
            />

            <WidgetBay
              activeProvider={td.activeProvider}
              soundCloudEmbedUrl={td.soundCloudEmbedUrl}
              retryCounter={td.retryCounter}
              status={td.status}
              statusMessage={td.statusMessage}
              scIframeRef={td.scIframeRef}
              ytHostRef={td.ytHostRef}
            />
          </section>

          <LibraryDock
            queue={td.queue}
            activePlaylistId={td.activePlaylistId}
            clearedQueueBackup={td.clearedQueueBackup}
            favorites={td.favorites}
            queueHeadingRef={td.queueHeadingRef}
            favoritesHeadingRef={td.favoritesHeadingRef}
            onPlayQueued={td.playQueuedItem}
            onMoveQueue={td.moveQueueItem}
            onRenameQueue={td.renameQueueItem}
            onRemoveQueue={td.removeQueueItem}
            onClearQueue={td.clearQueueAndStop}
            onUndoClear={td.undoClearQueue}
            onRemoveFavorite={td.removeFavorite}
            onCopyFavorites={td.copySavedTracks}
          />
        </main>

        <footer className="studio-footer">
          <span>Settings, queue, and saved tracks stay locally in this browser.</span>
          <div className="footer-links">
            <a
              href="https://developers.soundcloud.com/docs/api/html5-widget"
              target="_blank"
              rel="noreferrer"
            >
              <span>SoundCloud API</span>
              <ExternalIcon />
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://developers.google.com/youtube/iframe_api_reference"
              target="_blank"
              rel="noreferrer"
            >
              <span>YouTube IFrame API</span>
              <ExternalIcon />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
