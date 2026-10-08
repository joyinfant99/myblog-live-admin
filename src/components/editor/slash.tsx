'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Extension, ReactRenderer, type Editor, type Range } from '@tiptap/react';
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ChevronRight, CheckSquare, Code2, Heading1, Heading2, Heading3, ImageIcon, List, ListOrdered, Lightbulb, Minus, Pilcrow, Quote, Smile, Table2, type LucideIcon } from 'lucide-react';
import { EMOJI } from './emoji';

export type Cmd = { group: string; title: string; hint: string; icon: LucideIcon; keywords: string; run: (e: Editor, r: Range) => void };

/** Set when "Emoji" is chosen from the / menu, so the ":" it inserts opens the picker straight away instead of waiting for a letter. */
let emojiForced = false;

export const commands = (images: boolean, pickImage: () => void): Cmd[] => [
  { group: 'Basic blocks', title: 'Text', hint: 'Plain paragraph', icon: Pilcrow, keywords: 'paragraph plain text p', run: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { group: 'Basic blocks', title: 'Heading 1', hint: 'Big section heading', icon: Heading1, keywords: 'h1 title header large', run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 1 }).run() },
  { group: 'Basic blocks', title: 'Heading 2', hint: 'Medium heading', icon: Heading2, keywords: 'h2 header subtitle', run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run() },
  { group: 'Basic blocks', title: 'Heading 3', hint: 'Small heading', icon: Heading3, keywords: 'h3 header', run: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 3 }).run() },
  { group: 'Basic blocks', title: 'Bulleted list', hint: 'Simple bullets', icon: List, keywords: 'ul unordered bullet', run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { group: 'Basic blocks', title: 'Numbered list', hint: 'Ordered steps', icon: ListOrdered, keywords: 'ol ordered number', run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { group: 'Basic blocks', title: 'To-do list', hint: 'Checkboxes', icon: CheckSquare, keywords: 'task todo checkbox check', run: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { group: 'Basic blocks', title: 'Quote', hint: 'Pull a line out', icon: Quote, keywords: 'blockquote citation', run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { group: 'Basic blocks', title: 'Code', hint: 'Monospaced block', icon: Code2, keywords: 'codeblock snippet pre', run: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { group: 'Basic blocks', title: 'Divider', hint: 'A horizontal rule', icon: Minus, keywords: 'hr line separator rule', run: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  { group: 'Advanced', title: 'Callout', hint: 'Highlight a note', icon: Lightbulb, keywords: 'note info tip alert box', run: (e, r) => e.chain().focus().deleteRange(r).insertContent({ type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph' }] }).run() },
  { group: 'Advanced', title: 'Toggle list', hint: 'Collapsible content', icon: ChevronRight, keywords: 'details collapse accordion dropdown', run: (e, r) => e.chain().focus().deleteRange(r).setDetails().run() },
  { group: 'Advanced', title: 'Table', hint: '3 × 3 grid', icon: Table2, keywords: 'grid rows columns spreadsheet', run: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  ...(images ? [{ group: 'Advanced', title: 'Image', hint: 'Upload from your device', icon: ImageIcon, keywords: 'picture photo upload', run: (e: Editor, r: Range) => { e.chain().focus().deleteRange(r).run(); pickImage(); } }] : []),
  { group: 'Advanced', title: 'Emoji', hint: 'Search emoji (or type :)', icon: Smile, keywords: 'smiley face', run: (e, r) => { emojiForced = true; e.chain().focus().deleteRange(r).insertContent(':').run(); } },
];

type Row = { group?: string; key: string; label: string; hint?: string; icon?: LucideIcon; glyph?: string; run: (e: Editor, r: Range) => void };
type ListHandle = { onKeyDown: (p: SuggestionKeyDownProps) => boolean };

/** The floating menu, shared by "/" and ":" (rows differ, behaviour is identical). */
const Menu = forwardRef<ListHandle, { rows: Row[]; editor: Editor; range: Range; grid?: boolean }>(function Menu({ rows, editor, range, grid }, ref) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [rows]);
  useEffect(() => { document.querySelector('[data-slash-active="true"]')?.scrollIntoView({ block: 'nearest' }); }, [i]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!rows.length) return false;
      const step = grid ? 1 : 1;
      if (event.key === 'ArrowDown' || (grid && event.key === 'ArrowRight')) { setI((x) => (x + step) % rows.length); return true; }
      if (event.key === 'ArrowUp' || (grid && event.key === 'ArrowLeft')) { setI((x) => (x - step + rows.length) % rows.length); return true; }
      if (event.key === 'Enter' || event.key === 'Tab') { rows[i].run(editor, range); return true; }
      return false;
    },
  }), [rows, i, editor, range, grid]);

  if (!rows.length) return <div className="rounded-lg bg-surface px-3 py-2 text-[13px] text-muted shadow-pop">No results</div>;
  return (
    <div className="max-h-[min(340px,45vh)] w-[min(300px,calc(100vw-24px))] overflow-y-auto rounded-lg bg-surface p-1 shadow-pop" role="listbox">
            {rows.map((r, n) => (<div key={r.key}>
        {!grid && r.group && r.group !== rows[n - 1]?.group && <p className="px-2 pb-1 pt-2 text-[11.5px] font-medium text-muted">{r.group}</p>}
        <button type="button" role="option" aria-selected={n === i} data-slash-active={n === i} onMouseEnter={() => setI(n)} onMouseDown={(e) => { e.preventDefault(); r.run(editor, range); }}
          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left ${n === i ? 'bg-surface2' : ''}`}>
          {r.icon ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-bg text-fg"><r.icon size={17} strokeWidth={1.6} /></span>
            : <span className="grid h-9 w-9 shrink-0 place-items-center text-[22px]">{r.glyph}</span>}
          <span className="min-w-0"><span className="block truncate text-[14px] text-fg">{r.label}</span>{r.hint && <span className="block truncate text-[12px] text-muted">{r.hint}</span>}</span>
        </button>
      </div>))}
    </div>
  );
});

/** Pops a ReactRenderer next to the caret and keeps it positioned while the user types. */
const render = (grid = false) => () => {
  let comp: ReactRenderer<ListHandle> | null = null;
  let host: HTMLDivElement | null = null;
  const place = (p: SuggestionProps) => {
    const r = p.clientRect?.(); if (!r || !host) return;
    const h = host.offsetHeight || 320, below = window.innerHeight - r.bottom > Math.min(h, 260) + 12;
    host.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - host.offsetWidth - 8))}px`;
    host.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
  };
  const props = (p: SuggestionProps) => ({ rows: p.items as Row[], editor: p.editor, range: p.range, grid });
  return {
    onStart: (p: SuggestionProps) => {
      // Build on locals: rendering can trigger an editor transaction that exits the suggestion (and nulls the shared refs) mid-way.
      const h = document.createElement('div'); h.style.cssText = 'position:fixed;z-index:80'; document.body.appendChild(h); host = h;
      const c = new ReactRenderer(Menu, { props: props(p), editor: p.editor }); comp = c;
      h.appendChild(c.element); place(p);
      requestAnimationFrame(() => place(p));
    },
    onUpdate: (p: SuggestionProps) => { comp?.updateProps(props(p)); place(p); requestAnimationFrame(() => place(p)); },
    onKeyDown: (p: SuggestionKeyDownProps) => { if (p.event.key === 'Escape') { host?.remove(); return true; } return comp?.ref?.onKeyDown(p) ?? false; },
    onExit: () => { comp?.destroy(); host?.remove(); host = null; comp = null; emojiForced = false; },
  };
};

export const SlashCommand = (items: () => Cmd[]) => Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [Suggestion({
      editor: this.editor, char: '/', pluginKey: new PluginKey('slash'), startOfLine: false, allowedPrefixes: [' ', '\n'] as any,
      items: ({ query }: { query: string }) => {
        const q = query.toLowerCase().trim();
        return items().filter((c) => !q || `${c.title} ${c.keywords}`.toLowerCase().includes(q)).map((c): Row => ({ group: c.group, key: c.title, label: c.title, hint: c.hint, icon: c.icon, run: c.run }));
      },
      command: ({ editor, range, props }: any) => (props as Row).run(editor, range),
      render: render(),
    })];
  },
});

export const EmojiSuggest = Extension.create({
  name: 'emojiSuggest',
  addProseMirrorPlugins() {
    return [Suggestion({
      editor: this.editor, char: ':', pluginKey: new PluginKey('emoji'), allowedPrefixes: [' ', '\n'] as any,
      items: ({ query }: { query: string }) => {
        const q = query.toLowerCase();
        if (!q && !emojiForced) return [];
        return EMOJI.filter(([n]) => n.includes(q)).slice(0, 40).map(([n, g]): Row => ({
          key: n, label: n.replace(/_/g, ' '), glyph: g,
          run: (e, r) => e.chain().focus().deleteRange(r).insertContent(g + ' ').run(),
        }));
      },
      command: ({ editor, range, props }: any) => (props as Row).run(editor, range),
      render: render(true),
    })];
  },
});
