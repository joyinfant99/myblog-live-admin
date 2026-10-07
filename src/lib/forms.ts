// Shared form rules. They mirror the backend's model validation so mistakes are caught (and explained) in the form
// instead of coming back as a generic "Failed to create post".

export const SLUG_MIN = 3;
export const SLUG_MAX = 100;

/** While typing: lowercase, swap illegal characters for hyphens. Never trims, or you could not type "my-song". */
export const slugTyping = (t: string) => t.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, SLUG_MAX);

/** Final form: no leading/trailing hyphens. */
export const slugFinal = (t: string) => slugTyping(t).replace(/^-+|-+$/g, '');

/** Slug made from a title. Returns '' when it would be too short, so the server generates a good one instead. */
export const autoSlug = (title: string) => { const s = slugFinal(title.trim()); return s.length >= SLUG_MIN ? s : ''; };

/** Why a slug is not acceptable, or '' when it is fine (an empty slug is fine: the server makes one). */
export const slugProblem = (slug: string) => (slug && slug.length < SLUG_MIN ? `The URL slug needs at least ${SLUG_MIN} characters.` : '');

/** "ai, writing , ai" -> ["ai", "writing"] */
export const splitKeywords = (text: string) => [...new Set(text.split(',').map((k) => k.trim()).filter(Boolean))].slice(0, 30);

/** Keywords go to the server as seoKeywords[] entries: the backend stores them in an array column. */
export function appendKeywords(fd: FormData, text: string, clearWhenEmpty: boolean) {
  const list = splitKeywords(text);
  list.forEach((k) => fd.append('seoKeywords[]', k));
  if (!list.length && clearWhenEmpty) fd.append('seoKeywords', '');
}

/** Pressing Enter in a single-line field must never submit (publish) the whole form. */
export const blockEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
};

/** Today's date as YYYY-MM-DD in the user's own timezone (toISOString would give the UTC date, a day off late at night). */
export const todayLocal = () => new Date().toLocaleDateString('en-CA');
