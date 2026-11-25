import { useState, type RefObject } from 'react';
import type { QueuedPlaylist, SavedTrack } from '../lib/media';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  EditIcon,
  ExternalIcon,
  PlayIcon,
} from './Icons';

interface LibraryDockProps {
  queue: QueuedPlaylist[];
  activePlaylistId: string;
  clearedQueueBackup: QueuedPlaylist[] | null;
  favorites: SavedTrack[];
  queueHeadingRef: RefObject<HTMLHeadingElement | null>;
  favoritesHeadingRef: RefObject<HTMLHeadingElement | null>;
  onPlayQueued: (item: QueuedPlaylist) => void;
  onMoveQueue: (id: string, delta: number) => void;
  onRenameQueue: (id: string, title: string) => void;
  onRemoveQueue: (id: string) => void;
  onClearQueue: () => void;
  onUndoClear: () => void;
  onRemoveFavorite: (id: string) => void;
  onCopyFavorites: () => Promise<boolean>;
}

export function LibraryDock({
  queue,
  activePlaylistId,
  clearedQueueBackup,
  favorites,
  queueHeadingRef,
  favoritesHeadingRef,
  onPlayQueued,
  onMoveQueue,
  onRenameQueue,
  onRemoveQueue,
  onClearQueue,
  onUndoClear,
  onRemoveFavorite,
  onCopyFavorites,
}: LibraryDockProps) {
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const handleCopy = async () => {
    const ok = await onCopyFavorites();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const beginEdit = (item: QueuedPlaylist) => {
    setEditingId(item.id);
    setEditDraft(item.title);
  };

  const commitEdit = (id: string) => {
    if (editDraft.trim()) {
      onRenameQueue(id, editDraft);
    }
    setEditingId(null);
    setEditDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  return (
    <section className="library-dock" aria-label="Playlist queue and saved tracks">
      {/* Playlist Queue */}
      <article className="dock-panel">
        <div className="dock-header">
          <div className="dock-title-group">
            <h2 ref={queueHeadingRef} tabIndex={-1}>
              Playlist queue
            </h2>
            <span className="count-badge" aria-label={`${queue.length} queued playlists`}>
              {queue.length}
            </span>
          </div>

          <button
            type="button"
            className="text-action-btn"
            onClick={onClearQueue}
            disabled={queue.length === 0}
            aria-label="Clear all playlists and stop playback"
          >
            Clear all &amp; stop
          </button>
        </div>

        {queue.length > 0 ? (
          <ol className="dock-list" data-testid="playlist-queue">
            {queue.map((item, idx) => {
              const isActive = item.id === activePlaylistId;
              const isEditing = editingId === item.id;
              return (
                <li key={item.id} className={`queue-row ${isActive ? 'is-active' : ''}`}>
                  <span className="row-index">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="row-info">
                    {isEditing ? (
                      <form
                        className="inline-rename-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          commitEdit(item.id);
                        }}
                      >
                        <input
                          type="text"
                          className="inline-rename-input"
                          value={editDraft}
                          autoFocus
                          maxLength={160}
                          aria-label={`Rename ${item.title}`}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => commitEdit(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                        />
                        <button
                          type="submit"
                          className="row-icon-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label="Save playlist name"
                          title="Save name"
                        >
                          <CheckIcon />
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="row-title-line" onDoubleClick={() => beginEdit(item)}>
                          <span
                            className={`provider-chip provider-${item.provider}`}
                            title={item.provider === 'youtube' ? 'YouTube' : 'SoundCloud'}
                          >
                            {item.provider === 'youtube' ? 'YT' : 'SC'}
                          </span>
                          <strong title="Double-click to rename">{item.title}</strong>
                        </div>
                        <span>{item.owner}</span>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="row-controls">
                      {isActive ? (
                        <span className="playing-badge">Active</span>
                      ) : (
                        <button
                          type="button"
                          className="row-play-btn"
                          onClick={() => onPlayQueued(item)}
                          aria-label={`Play ${item.title}`}
                        >
                          <PlayIcon />
                          <span>Play</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="row-icon-btn"
                        onClick={() => beginEdit(item)}
                        aria-label={`Rename ${item.title}`}
                        title="Rename playlist"
                      >
                        <EditIcon />
                      </button>

                      <button
                        type="button"
                        className="row-icon-btn"
                        onClick={() => onMoveQueue(item.id, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${item.title} up`}
                        title="Move up"
                      >
                        <ArrowUpIcon />
                      </button>

                      <button
                        type="button"
                        className="row-icon-btn"
                        onClick={() => onMoveQueue(item.id, 1)}
                        disabled={idx === queue.length - 1}
                        aria-label={`Move ${item.title} down`}
                        title="Move down"
                      >
                        <ArrowDownIcon />
                      </button>

                      {!isActive && (
                        <button
                          type="button"
                          className="row-icon-btn row-remove-btn"
                          onClick={() => onRemoveQueue(item.id)}
                          aria-label={`Remove ${item.title} from queue`}
                          title="Remove"
                        >
                          <CloseIcon />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="dock-empty">
            {clearedQueueBackup?.length ? (
              <>
                <strong>Queue cleared</strong>
                <p>Playback stopped and your playlist queue was emptied.</p>
                <button type="button" className="btn btn-secondary undo-btn" onClick={onUndoClear}>
                  Undo clear ({clearedQueueBackup.length})
                </button>
              </>
            ) : (
              <>
                <strong>Queue is empty</strong>
                <p>Mix SoundCloud and YouTube playlists in one queue to chain sets without interruption.</p>
              </>
            )}
          </div>
        )}
      </article>

      {/* Saved Tracks */}
      <article className="dock-panel">
        <div className="dock-header">
          <div className="dock-title-group">
            <h2 ref={favoritesHeadingRef} tabIndex={-1}>
              Saved tracks
            </h2>
            <span className="count-badge" aria-label={`${favorites.length} saved tracks`}>
              {favorites.length}
            </span>
          </div>

          <button
            type="button"
            className="text-action-btn copy-all-btn"
            onClick={handleCopy}
            disabled={favorites.length === 0}
            aria-label="Copy all saved track links"
          >
            <CopyIcon />
            <span>{copied ? 'Copied' : 'Copy list'}</span>
          </button>
        </div>

        {favorites.length > 0 ? (
          <ul className="dock-list" data-testid="saved-tracks">
            {favorites.map((track) => {
              const serviceName = track.provider === 'youtube' ? 'YouTube' : 'SoundCloud';
              return (
                <li key={track.id} className="saved-row">
                  <span className="saved-mark" aria-hidden="true">
                    <BookmarkIcon filled />
                  </span>
                  <div className="row-info">
                    <div className="row-title-line">
                      <span className={`provider-chip provider-${track.provider}`} title={serviceName}>
                        {track.provider === 'youtube' ? 'YT' : 'SC'}
                      </span>
                      <strong>{track.title}</strong>
                    </div>
                    <span>{track.artist}</span>
                  </div>
                  <div className="row-controls">
                    <a
                      href={track.url}
                      target="_blank"
                      rel="noreferrer"
                      className="open-sc-link"
                      aria-label={`Open ${track.title} on ${serviceName} in a new tab`}
                    >
                      <span>Open</span>
                      <ExternalIcon />
                    </a>
                    <button
                      type="button"
                      className="row-icon-btn row-remove-btn"
                      onClick={() => onRemoveFavorite(track.id)}
                      aria-label={`Remove ${track.title} from saved tracks`}
                      title="Remove"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="dock-empty">
            <strong>No saved tracks yet</strong>
            <p>
              Hit <strong>Save track</strong> or press <kbd>F</kbd> while auditioning to bookmark gems for later.
            </p>
          </div>
        )}
      </article>
    </section>
  );
}
