function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function isConnected(): boolean {
  if (typeof window === 'undefined') return false;
  return getCookie('aligned_auth') === '1';
}
