import type { FormEvent, RefObject } from 'react';
import { ClipboardIcon, LinkIcon, PlayIcon } from './Icons';

interface UrlIntakeBarProps {
  urlInput: string;
  urlError: string;
  notice: string;
  isPasting: boolean;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onUrlChange: (val: string) => void;
  onPaste: () => void;
  onPlayNow: () => void;
  onAddToQueue: () => void;
}

export function UrlIntakeBar({
  urlInput,
  urlError,
  notice,
  isPasting,
  isLoading,
  inputRef,
  onUrlChange,
  onPaste,
  onPlayNow,
  onAddToQueue,
}: UrlIntakeBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onPlayNow();
  };

  return (
    <section className="intake-bar" aria-label="Add playlist">
      <form className="intake-form" onSubmit={handleSubmit} noValidate>
        <div className="intake-row">
          <div className={`intake-input-wrap ${urlError ? 'has-error' : ''}`}>
            <label htmlFor="playlist-url" className="sr-only">
              SoundCloud or YouTube playlist URL
            </label>
            <span className="intake-icon">
              <LinkIcon />
            </span>
            <input
              ref={inputRef}
              id="playlist-url"
              data-testid="playlist-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="Paste a SoundCloud or YouTube playlist URL"
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
              aria-describedby={urlError ? 'playlist-url-error' : 'playlist-url-help'}
              aria-invalid={Boolean(urlError)}
            />
            <button
              type="button"
              className="paste-btn"
              data-testid="paste-button"
              onClick={onPaste}
              disabled={isPasting}
              aria-label="Paste playlist URL from clipboard"
            >
              <ClipboardIcon />
              <span>{isPasting ? 'Reading…' : 'Paste'}</span>
            </button>
          </div>

          <div className="intake-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              <PlayIcon />
              <span>Play now</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={onAddToQueue}>
              Queue
            </button>
          </div>
        </div>

        <div className="intake-feedback">
          {urlError ? (
            <p id="playlist-url-error" className="feedback-error" role="alert">
              {urlError}
            </p>
          ) : (
            <p id="playlist-url-help" className="feedback-note" role="status" aria-live="polite">
              {notice || 'Supports SoundCloud sets, secret share links, YouTube, and YouTube Music playlists.'}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
