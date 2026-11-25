import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildShareUrl,
  buildShuffleOrder,
  buildYouTubeThumbnailUrl,
  clampVolume,
  extractPlaylistMetadata,
  formatCountdownClock,
  formatDuration,
  parseShareParams,
  parseStoredFavorites,
  parseStoredQueue,
  parseStoredSettings,
  upgradeSoundCloudArtwork,
  validateInterval,
  validatePlaylistUrl,
  validateTrackUrl,
} from '../src/lib/media.ts';

test('validatePlaylistUrl normalizes SoundCloud public, mobile, secret, and short links', () => {
  const pub = validatePlaylistUrl('www.soundcloud.com/artist-name/sets/late-night-mix/?utm_source=x&si=123');
  assert.deepEqual(pub, {
    url: 'https://soundcloud.com/artist-name/sets/late-night-mix',
    provider: 'soundcloud',
  });

  const secret = validatePlaylistUrl('https://m.soundcloud.com/dj/sets/promo-pack/s-AbC123_-');
  assert.deepEqual(secret, {
    url: 'https://soundcloud.com/dj/sets/promo-pack/s-AbC123_-',
    provider: 'soundcloud',
  });

  const short = validatePlaylistUrl('on.soundcloud.com/AbCd1234/');
  assert.deepEqual(short, {
    url: 'https://on.soundcloud.com/AbCd1234',
    provider: 'soundcloud',
  });
});

test('validatePlaylistUrl normalizes YouTube and YouTube Music playlists', () => {
  const ytPlaylist = validatePlaylistUrl('https://www.youtube.com/playlist?list=PL1234567890abcdef&si=abc');
  assert.deepEqual(ytPlaylist, {
    url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
    provider: 'youtube',
    playlistId: 'PL1234567890abcdef',
  });

  const ytMusic = validatePlaylistUrl('music.youtube.com/playlist?list=OLAK5uy_nTestPlaylist12345');
  assert.deepEqual(ytMusic, {
    url: 'https://www.youtube.com/playlist?list=OLAK5uy_nTestPlaylist12345',
    provider: 'youtube',
    playlistId: 'OLAK5uy_nTestPlaylist12345',
  });

  const ytWatchWithList = validatePlaylistUrl(
    'https://youtu.be/dQw4w9WgXcQ?list=PL1234567890abcdef&index=3'
  );
  assert.deepEqual(ytWatchWithList, {
    url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
    provider: 'youtube',
    playlistId: 'PL1234567890abcdef',
  });
});

test('validatePlaylistUrl rejects non-playlists and unsupported services', () => {
  assert.ok('error' in validatePlaylistUrl(''));
  assert.ok('error' in validatePlaylistUrl('https://spotify.com/playlist/123'));
  assert.ok('error' in validatePlaylistUrl('https://soundcloud.com/artist/single-track'));
  assert.ok('error' in validatePlaylistUrl('https://soundcloud.com/artist/sets/mix/bad-token'));
  assert.ok('error' in validatePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
  assert.ok('error' in validatePlaylistUrl('https://www.youtube.com/playlist?list=WL'));
});

test('validateTrackUrl accepts SoundCloud and YouTube tracks and rejects reserved paths', () => {
  assert.deepEqual(validateTrackUrl('https://www.soundcloud.com/artist/my-track?ref=clipboard'), {
    url: 'https://soundcloud.com/artist/my-track',
    provider: 'soundcloud',
  });
  assert.deepEqual(validateTrackUrl('https://youtu.be/dQw4w9WgXcQ?si=xyz'), {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    provider: 'youtube',
  });
  assert.deepEqual(validateTrackUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890'), {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    provider: 'youtube',
  });
  assert.equal(validateTrackUrl('https://soundcloud.com/artist/sets'), null);
  assert.equal(validateTrackUrl('https://soundcloud.com/artist/likes'), null);
});

test('extractPlaylistMetadata builds readable titles for SoundCloud and YouTube', () => {
  assert.deepEqual(extractPlaylistMetadata('https://soundcloud.com/mr-louisiana/sets/house_grooves-01'), {
    owner: 'Mr Louisiana',
    title: 'House Grooves 01',
    provider: 'soundcloud',
  });
  const ytMeta = extractPlaylistMetadata('https://www.youtube.com/playlist?list=PL1234567890abcdef');
  assert.equal(ytMeta.provider, 'youtube');
  assert.equal(ytMeta.owner, 'YouTube');
  assert.equal(ytMeta.playlistId, 'PL1234567890abcdef');
});

test('artwork helpers upgrade SoundCloud images and build YouTube thumbnails', () => {
  assert.equal(
    upgradeSoundCloudArtwork('http://i1.sndcdn.com/artworks-abc-large.jpg'),
    'https://i1.sndcdn.com/artworks-abc-t300x300.jpg'
  );
  assert.equal(upgradeSoundCloudArtwork(null), undefined);
  assert.equal(
    buildYouTubeThumbnailUrl('dQw4w9WgXcQ'),
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  );
  assert.equal(buildYouTubeThumbnailUrl('bad'), undefined);
});

test('share URL builder and parser round-trip session config cleanly', () => {
  const href = buildShareUrl('https://timedrop.vercel.app/?old=1#hash', {
    url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
    intervalSeconds: 30,
    startMode: 'drop',
    shufflePlaylist: true,
    loopPlaylist: true,
    softFade: false,
  });

  const parsed = parseShareParams(new URL(href).search);
  assert.deepEqual(parsed, {
    url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
    intervalSeconds: 30,
    startMode: 'drop',
    shufflePlaylist: true,
    loopPlaylist: true,
    softFade: false,
  });

  // Legacy ?split=1 support
  assert.deepEqual(parseShareParams('?split=1&sec=45'), {
    intervalSeconds: 45,
    startMode: 'split',
  });
});

test('validateInterval and clampVolume enforce safe bounds', () => {
  assert.deepEqual(validateInterval('20'), { valid: true, seconds: 20 });
  assert.deepEqual(validateInterval(900), { valid: true, seconds: 900 });
  assert.equal(validateInterval('0').valid, false);
  assert.equal(validateInterval('901').valid, false);
  assert.equal(validateInterval('12.5').valid, false);

  assert.equal(clampVolume(150), 100);
  assert.equal(clampVolume(-10), 0);
  assert.equal(clampVolume(72.6), 73);
  assert.equal(clampVolume(NaN, 80), 80);
});

test('formatDuration and formatCountdownClock format time cleanly including >1h videos', () => {
  assert.equal(formatDuration(215_000), '3:35');
  assert.equal(formatDuration(3_725_000), '1:02:05');
  assert.equal(formatDuration(undefined), '--:--');
  assert.deepEqual(formatCountdownClock(20_000), { main: '20', unit: 'SECONDS' });
  assert.deepEqual(formatCountdownClock(1_000), { main: '01', unit: 'SECOND' });
  assert.deepEqual(formatCountdownClock(75_000), { main: '01:15', unit: 'MIN:SEC' });
});

test('buildShuffleOrder keeps anchor track first and visits every index once', () => {
  const order = buildShuffleOrder(6, 3, () => 0.42);
  assert.equal(order.length, 6);
  assert.equal(order[0], 3);
  assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test('storage parsers migrate legacy v1 settings and mixed SoundCloud + YouTube entries', () => {
  const queue = parseStoredQueue(
    JSON.stringify([
      { url: 'https://soundcloud.com/dj/sets/valid-set', title: '  My Set\u0000  ' },
      { url: 'https://soundcloud.com/dj/sets/valid-set' },
      { url: 'https://music.youtube.com/playlist?list=PL1234567890abcdef' },
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef' },
      { url: 'https://evil.example.com/sets/bad' },
    ])
  );
  assert.equal(queue.length, 2);
  assert.equal(queue[0].provider, 'soundcloud');
  assert.equal(queue[0].title, 'My Set');
  assert.equal(queue[1].provider, 'youtube');
  assert.equal(queue[1].playlistId, 'PL1234567890abcdef');

  const favs = parseStoredFavorites(
    JSON.stringify([
      { id: 't1', url: 'https://soundcloud.com/dj/track-one', title: 'Track 1', artist: 'DJ' },
      { id: 'yt:dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ', title: 'YT Track', artist: 'Channel' },
      { id: 't2', url: 'https://evil.example.com/track', title: 'Bad' },
    ])
  );
  assert.equal(favs.length, 2);
  assert.equal(favs[0].provider, 'soundcloud');
  assert.equal(favs[1].provider, 'youtube');
  assert.equal(favs[1].url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // Legacy splitPreview: true migrates to startMode: 'split'
  const legacySettings = parseStoredSettings(
    JSON.stringify({ intervalSeconds: 45, loopPlaylist: true, shuffle: true, splitPreview: true })
  );
  assert.deepEqual(legacySettings, {
    intervalSeconds: 45,
    loopPlaylist: true,
    shufflePlaylist: true,
    startMode: 'split',
    softFade: true,
    volume: 100,
  });

  // v2 settings preserve startMode, softFade, and volume
  const v2Settings = parseStoredSettings(
    JSON.stringify({
      intervalSeconds: 25,
      loopPlaylist: false,
      shufflePlaylist: false,
      startMode: 'drop',
      softFade: false,
      volume: 65,
    })
  );
  assert.deepEqual(v2Settings, {
    intervalSeconds: 25,
    loopPlaylist: false,
    shufflePlaylist: false,
    startMode: 'drop',
    softFade: false,
    volume: 65,
  });
});
