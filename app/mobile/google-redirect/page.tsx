'use client';

import { useEffect } from 'react';

/**
 * Google OAuth (implicit flow) only allows http(s) redirect URIs for "Web"
 * client types, so it can't redirect straight to the clearslot:// scheme the
 * mobile app listens for. Google sends the user here instead; this page
 * immediately forwards the result to the app via clearslot://auth.
 *
 * The token is returned by Google as a URL fragment (#access_token=...),
 * which browsers never send to a server — so this has to be a client-rendered
 * page that reads window.location.hash, not an API route. Nothing here is
 * logged or persisted; it's a pure client-side redirect.
 */
export default function GoogleRedirectPage() {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    window.location.replace(`clearslot://auth?${hash}`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-gray-500">Returning to ClearSlot…</p>
    </div>
  );
}
