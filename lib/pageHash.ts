/**
 * Allowed URL hashes: album ids, about, contact. Nothing else (#top / #image gone).
 */
export function setPageHash(id: string | null) {
  if (typeof window === "undefined") return;

  if (id) {
    const next = `#${id}`;
    if (window.location.hash === next) return;
    history.replaceState(null, "", next);
    return;
  }

  if (!window.location.hash) return;
  history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}
