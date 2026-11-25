import { useState } from 'react';
import type { PlayerStatus } from '../lib/media';
import { STATUS_LABELS } from '../lib/media';
import { BrandMark, CheckIcon, MoonIcon, ShareIcon, SunIcon } from './Icons';

interface TopBarProps {
  status: PlayerStatus;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onShareSession: () => Promise<boolean>;
}

export function TopBar({ status, theme, onToggleTheme, onShareSession }: TopBarProps) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const ok = await onShareSession();
    if (ok) {
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <a className="brand-link" href="#main-content" aria-label="Timedrop home">
          <BrandMark className="brand-icon" />
          <span className="brand-name">Timedrop</span>
        </a>
        <span className="brand-divider" aria-hidden="true">
          /
        </span>
        <span className="brand-subtitle">SoundCloud &amp; YouTube Pacer</span>
      </div>

      <div className="topbar-right">
        <div className={`session-pill status-${status}`} aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{STATUS_LABELS[status]}</span>
        </div>

        <button
          type="button"
          className={`topbar-btn ${shared ? 'is-copied' : ''}`}
          onClick={handleShare}
          aria-label="Copy shareable session link"
          title="Copy link with current playlist and pacing settings"
        >
          {shared ? <CheckIcon /> : <ShareIcon />}
          <span>{shared ? 'Copied' : 'Share'}</span>
        </button>

        <button
          type="button"
          className="topbar-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} studio theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
