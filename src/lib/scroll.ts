/** The main tile scrolls inside the bento frame on desktop; on mobile the window scrolls. */
export function scrollMainTop(smooth = true) {
  const behavior = smooth ? 'smooth' : 'auto';
  const el = typeof document !== 'undefined' ? document.getElementById('main-scroll') : null;
  if (el && el.scrollHeight > el.clientHeight) el.scrollTo({ top: 0, behavior });
  else window.scrollTo({ top: 0, behavior });
}
