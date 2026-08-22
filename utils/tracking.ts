function getTrackUserUrl(): string {
  const base = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL?.trim()) || '';
  const normalizedBase = base.replace(/\/+$/, '');
  return normalizedBase ? `${normalizedBase}/api/track-user` : '/api/track-user';
}

export function trackUser(username: string) {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
  if (!username) return;
  let payload: string;

  try {
    payload = JSON.stringify({ username });
  } catch (error) {
    console.error('Failed to format tracking payload', error);
    return;
  }

  const url = getTrackUserUrl();
  const beaconQueued = navigator.sendBeacon
    ? navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
    : false;

  if (!beaconQueued) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(console.error);
  }
}
