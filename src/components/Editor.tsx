'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DragHandle from '@tiptap/extension-drag-handle-react';
import Details from '@tiptap/extension-details';
import DetailsSummary from '@tiptap/extension-details-summary';
import DetailsContent from '@tiptap/extension-details-content';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import { BubbleMenu, EditorContent, useEditor, type Editor as TipTap } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { AlignCenter, AlignLeft, AlignRight, ChevronDown, Copy, GripVertical, Palette as PaletteIcon, Trash2, Type as TypeIcon, Bold, Check, CheckSquare, Code, Heading1, Heading2, Italic, Link2, List, ListOrdered, Plus, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2, Unlink, type LucideIcon } from 'lucide-react';
import { PALETTE } from '@/lib/palette';
import { Callout } from './editor/callout';
import { commands, EmojiSuggest, SlashCommand } from './editor/slash';

const COMPACT = '(pointer: coarse), (max-width: 1023px)';
/** True on phones, tablets and any narrow window: they get the bottom toolbar instead of the floating one. */
function useCompact() {
  const [v, setV] = useState(false);
  useEffect(() => { const m = window.matchMedia(COMPACT); const f = () => setV(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return v;
}

type Props = { value: string; onChange: (v: string, source: string) => void; images?: boolean; placeholder?: string };

const Btn = ({ icon: Icon, label, on, onClick, disabled }: { icon: LucideIcon; label: string; on?: boolean; onClick: () => void; disabled?: boolean }) => (
  <button type="button" aria-label={label} title={label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
    className={`grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-30 ${on ? 'bg-surface2 text-accent' : 'text-muted hover:bg-surface2 hover:text-fg'}`}><Icon size={16} strokeWidth={1.8} /></button>
);


const BLOCKS: { label: string; icon: LucideIcon; on: (e: TipTap) => boolean; run: (e: TipTap) => void }[] = [
  { label: 'Text', icon: TypeIcon, on: (e) => e.isActive('paragraph'), run: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Heading 1', icon: Heading1, on: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().setNode('heading', { level: 1 }).run() },
  { label: 'Heading 2', icon: Heading2, on: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().setNode('heading', { level: 2 }).run() },
  { label: 'Heading 3', icon: Heading2, on: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().setNode('heading', { level: 3 }).run() },
  { label: 'Bulleted list', icon: List, on: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered list', icon: ListOrdered, on: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'To-do list', icon: CheckSquare, on: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Quote', icon: Quote, on: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code', icon: Code, on: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
];

/** "Turn into" dropdown at the left of the selection toolbar, like Notion's block-type button. */
function TurnInto({ editor }: { editor: TipTap }) {
  const [open, setOpen] = useState(false);
  const cur = BLOCKS.find((b) => b.on(editor)) || BLOCKS[0];
  return (
    <div className="relative">
      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-fg hover:bg-surface2">{cur.label}<ChevronDown size={13} className="text-muted" /></button>
      {open && (
        <div className="absolute left-0 top-9 z-10 w-48 rounded-lg bg-surface p-1 shadow-pop">
          <p className="px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-muted">Turn into</p>
          {BLOCKS.map((b) => (
            <button key={b.label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { b.run(editor); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] text-fg hover:bg-surface2"><b.icon size={15} className="text-muted" />{b.label}{b.on(editor) && <Check size={14} className="ml-auto text-accent" />}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Notion-style colour menu: text colour, background colour and alignment in one popover. */
function ColorMenu({ editor }: { editor: TipTap }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Btn icon={PaletteIcon} label="Color & align" on={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 top-9 z-10 w-56 rounded-lg bg-surface p-2 shadow-pop">
          <p className="px-1 pb-1 text-[11.5px] font-medium text-muted">Text colour</p>
          <div className="grid grid-cols-5 gap-1 pb-2">
            <button type="button" aria-label="Default" title="Default" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetColor().run()} className="grid h-8 place-items-center rounded-md border border-line text-[13px] font-semibold text-fg">A</button>
            {PALETTE.slice(1).map((p) => <button key={p.name} type="button" aria-label={p.name} title={p.name} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setColor(p.fg).run()} className="grid h-8 place-items-center rounded-md border border-line text-[13px] font-semibold" style={{ color: p.fg }}>A</button>)}
          </div>
          <p className="px-1 pb-1 text-[11.5px] font-medium text-muted">Background</p>
          <div className="grid grid-cols-5 gap-1 pb-2">
            <button type="button" aria-label="None" title="None" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().unsetHighlight().run()} className="grid h-8 place-items-center rounded-md border border-line text-[13px] text-muted">∅</button>
            {PALETTE.slice(1).map((p) => <button key={p.name} type="button" aria-label={p.name} title={p.name} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().setHighlight({ color: p.bg }).run()} className="h-8 rounded-md border border-line" style={{ background: p.bg }} />)}
          </div>
          <div className="flex gap-0.5 border-t border-line pt-2">
            <Btn icon={AlignLeft} label="Align left" on={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
            <Btn icon={AlignCenter} label="Align centre" on={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
            <Btn icon={AlignRight} label="Align right" on={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Shows while the cursor is in a table: add/remove rows and columns, delete the table. */
function TableBar({ editor }: { editor: TipTap }) {
  const t = (label: string, run: () => void) => <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={run} className="h-8 whitespace-nowrap rounded-md px-2 text-[12.5px] text-muted hover:bg-surface2 hover:text-fg">{label}</button>;
  return (
    <BubbleMenu editor={editor} pluginKey="tableBar" tippyOptions={{ duration: 120, placement: 'bottom-start', maxWidth: 'none' }} shouldShow={({ editor: e, from, to }) => e.isEditable && e.isActive('table') && from === to}>
      <div className="flex items-center gap-0.5 rounded-lg bg-surface p-1 shadow-pop">
        {t('+ Row', () => editor.chain().focus().addRowAfter().run())}{t('+ Column', () => editor.chain().focus().addColumnAfter().run())}
        {t('− Row', () => editor.chain().focus().deleteRow().run())}{t('− Column', () => editor.chain().focus().deleteColumn().run())}
        <span className="mx-1 h-5 w-px bg-line" />{t('Header', () => editor.chain().focus().toggleHeaderRow().run())}
        <Btn icon={Trash2} label="Delete table" onClick={() => editor.chain().focus().deleteTable().run()} />
      </div>
    </BubbleMenu>
  );
}

/** Block handle: "+" adds a block below, the grip drags to reorder or clicks open a small menu (duplicate / delete). */
function Handle({ editor }: { editor: TipTap }) {
  const [menu, setMenu] = useState(false);
  const pos = useRef<number>(-1);
  const node = () => (pos.current >= 0 ? editor.state.doc.nodeAt(pos.current) : null);
  const addBelow = () => {
    const n = node(); if (!n) return;
    const at = pos.current + n.nodeSize;
    editor.chain().focus().insertContentAt(at, { type: 'paragraph' }).setTextSelection(at + 1).insertContent('/').run();
  };
  const dup = () => { const n = node(); if (n) editor.chain().focus().insertContentAt(pos.current + n.nodeSize, n.toJSON()).run(); setMenu(false); };
  const del = () => { const n = node(); if (n) editor.chain().focus().deleteRange({ from: pos.current, to: pos.current + n.nodeSize }).run(); setMenu(false); };
  // Must be stable: DragHandle re-registers its ProseMirror plugin whenever this changes, which would tear down the open "/" menu on every keystroke.
  const onNodeChange = useCallback(({ pos: p }: { pos: number }) => { pos.current = p; setMenu(false); }, []);
  return (
    <DragHandle editor={editor} onNodeChange={onNodeChange} className="hidden lg:block">
      <div className="relative flex items-center gap-0.5 pr-1">
        <button type="button" aria-label="Add block below" title="Add block below" onClick={addBelow} className="grid h-6 w-6 place-items-center rounded text-muted/70 hover:bg-surface2 hover:text-fg"><Plus size={15} /></button>
        <button type="button" aria-label="Drag to move, click for options" title="Drag to move · click for options" onClick={() => setMenu((o) => !o)} className="grid h-6 w-5 cursor-grab place-items-center rounded text-muted/70 hover:bg-surface2 hover:text-fg"><GripVertical size={15} /></button>
        {menu && (
          <div className="absolute left-0 top-7 z-20 w-40 rounded-lg bg-surface p-1 shadow-pop">
            <button type="button" onClick={dup} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] text-fg hover:bg-surface2"><Copy size={14} className="text-muted" />Duplicate</button>
            <button type="button" onClick={del} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13.5px] text-danger hover:bg-danger/10"><Trash2 size={14} />Delete</button>
          </div>
        )}
      </div>
    </DragHandle>
  );
}

type Prefs = { font: 'sans' | 'serif' | 'mono'; small: boolean };
const PREFS_KEY = 'admin.editor.prefs';

/** Notion's page options: font, small text, and a live word count. Remembered per browser. */
function PageOptions({ prefs, set, words }: { prefs: Prefs; set: (p: Prefs) => void; words: number }) {
  const [open, setOpen] = useState(false);
  const fonts: [Prefs['font'], string, string][] = [['sans', 'Default', 'font-sans'], ['serif', 'Serif', 'font-read'], ['mono', 'Mono', 'font-mono']];
  return (
    <div className="relative mb-2 flex justify-end">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-muted hover:bg-surface2 hover:text-fg"><TypeIcon size={14} /> Aa <span className="text-muted/60">· {words} words</span></button>
      {open && (<>
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
        <div className="absolute right-0 top-9 z-40 w-64 rounded-lg bg-surface p-2 shadow-pop">
          <p className="px-1 pb-1.5 text-[11.5px] font-medium text-muted">Style</p>
          <div className="grid grid-cols-3 gap-1">
            {fonts.map(([k, label, cls]) => (
              <button key={k} type="button" onClick={() => set({ ...prefs, font: k })} className={`rounded-lg border px-2 py-2 text-center ${prefs.font === k ? 'border-accent bg-surface2' : 'border-line hover:bg-surface2'}`}>
                <span className={`block text-[22px] leading-none text-fg ${cls}`}>Ag</span><span className="mt-1 block text-[12px] text-muted">{label}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-between rounded-md px-1 py-1.5 text-[13.5px] text-fg">Small text
            <input type="checkbox" checked={prefs.small} onChange={(e) => set({ ...prefs, small: e.target.checked })} />
          </label>
        </div>
      </>)}
    </div>
  );
}

/** Floating toolbar over a text selection (desktop). Link editing happens inline, no browser prompt. */
function Bubble({ editor }: { editor: TipTap }) {
  const [linking, setLinking] = useState(false);
  const [url, setUrl] = useState('');
  const startLink = () => { setUrl(editor.getAttributes('link').href || ''); setLinking(true); };
  const applyLink = () => {
    const u = url.trim();
    if (!u) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: /^(https?:|mailto:|\/|#)/i.test(u) ? u : `https://${u}` }).run();
    setLinking(false);
  };
  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 120, placement: 'top', maxWidth: 'none', onHidden: () => setLinking(false) }}
      shouldShow={({ editor: e, from, to }) => from !== to && e.isEditable && !e.isActive('image') && !e.isActive('codeBlock') && !window.matchMedia(COMPACT).matches}>
      <div className="flex items-center gap-0.5 rounded-lg bg-surface p-1 shadow-pop">
        {linking ? (
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); applyLink(); }}>
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (setLinking(false), editor.commands.focus())} placeholder="Paste a link…" className="h-8 w-60 rounded-md bg-bg px-2 text-[13.5px] text-fg outline-none" />
            <Btn icon={Check} label="Apply link" onClick={applyLink} />
          </form>
        ) : (<>
          <TurnInto editor={editor} />
          <span className="mx-1 h-5 w-px bg-line" />
          <Btn icon={Bold} label="Bold" on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <Btn icon={Italic} label="Italic" on={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <Btn icon={UnderlineIcon} label="Underline" on={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <Btn icon={Strikethrough} label="Strikethrough" on={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <Btn icon={Code} label="Inline code" on={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />
          <Btn icon={editor.isActive('link') ? Unlink : Link2} label={editor.isActive('link') ? 'Edit link' : 'Add link'} on={editor.isActive('link')} onClick={startLink} />
          <span className="mx-1 h-5 w-px bg-line" />
          <ColorMenu editor={editor} />
        </>)}
      </div>
    </BubbleMenu>
  );
}

/** Phone toolbar: one scrollable row that rides above the keyboard while the editor has focus. */
function MobileBar({ editor, onSlash }: { editor: TipTap; onSlash: () => void }) {
  const compact = useCompact();
  const [focused, setFocused] = useState(false);
  const [bottom, setBottom] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => setFocused(editor.isFocused), re = () => tick((n) => n + 1);
    editor.on('focus', on); editor.on('blur', () => setTimeout(() => setFocused(editor.isFocused), 120)); editor.on('transaction', re);
    const vv = window.visualViewport;
    const fit = () => vv && setBottom(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    fit(); vv?.addEventListener('resize', fit); vv?.addEventListener('scroll', fit);
    return () => { editor.off('focus', on); editor.off('transaction', re); vv?.removeEventListener('resize', fit); vv?.removeEventListener('scroll', fit); };
  }, [editor]);
  if (!focused || !compact) return null;
  const c = () => editor.chain().focus();
  return (
    <div className="fixed inset-x-0 z-[60] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]" style={{ bottom }}>
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
        <button type="button" aria-label="Insert block" onMouseDown={(e) => e.preventDefault()} onClick={onSlash} className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-md bg-fg text-bg"><Plus size={18} /></button>
        {[
          [Bold, 'Bold', 'bold', () => c().toggleBold().run()], [Italic, 'Italic', 'italic', () => c().toggleItalic().run()],
          [Heading1, 'Heading 1', 'heading1', () => c().toggleHeading({ level: 1 }).run()], [Heading2, 'Heading 2', 'heading2', () => c().toggleHeading({ level: 2 }).run()],
          [List, 'Bulleted list', 'bulletList', () => c().toggleBulletList().run()], [ListOrdered, 'Numbered list', 'orderedList', () => c().toggleOrderedList().run()],
          [CheckSquare, 'To-do list', 'taskList', () => c().toggleTaskList().run()], [Quote, 'Quote', 'blockquote', () => c().toggleBlockquote().run()],
          [Code, 'Code', 'code', () => c().toggleCode().run()],
        ].map(([Icon, label, name, run]: any) => (
          <button key={label} type="button" aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={run}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${(name === 'heading1' ? editor.isActive('heading', { level: 1 }) : name === 'heading2' ? editor.isActive('heading', { level: 2 }) : editor.isActive(name)) ? 'bg-surface2 text-accent' : 'text-muted'}`}><Icon size={19} strokeWidth={1.8} /></button>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-line" />
        <Btn icon={Undo2} label="Undo" disabled={!editor.can().undo()} onClick={() => c().undo().run()} />
        <Btn icon={Redo2} label="Redo" disabled={!editor.can().redo()} onClick={() => c().redo().run()} />
      </div>
    </div>
  );
}

/**
 * Notion-style block editor (TipTap). Type "/" for blocks, ":" for emoji, select text for formatting, Markdown shortcuts work (## , - , 1. , [] , > , ```).
 * onChange also reports the source ('user' for real edits); loading content from outside never fires it, so it won't mark a page dirty.
 */
export default function Editor({ value, onChange, images = true, placeholder = 'Write, or type “/” for blocks, “:” for emoji' }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<Prefs>({ font: 'sans', small: false });
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); if (p) setPrefs((x) => ({ ...x, ...p })); } catch {} }, []);
  const savePrefs = (p: Prefs) => { setPrefs(p); try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} };
  const cb = useRef(onChange); cb.current = onChange;
  const items = useMemo(() => commands(images, () => fileInput.current?.click()), [images]);
  const itemsRef = useRef(items); itemsRef.current = items;

  const editor = useEditor({
    immediatelyRender: false,
    content: value || '',
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline, TextStyle, Color, Highlight.configure({ multicolor: true }), Subscript, Superscript,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow' } }),
      Image.configure({ allowBase64: true }),
      TaskList, TaskItem.configure({ nested: true }),
      Details.configure({ persist: true }), DetailsSummary, DetailsContent, Callout,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }), CharacterCount,
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === 'heading' ? `Heading ${node.attrs.level}` : node.type.name === 'detailsSummary' ? 'Toggle title' : placeholder), includeChildren: true }),
      SlashCommand(() => itemsRef.current), EmojiSuggest,
    ],
    editorProps: { attributes: { class: 'tt-editor', spellcheck: 'true' } },
    onUpdate: ({ editor: e }) => cb.current(e.isEmpty ? '' : e.getHTML(), 'user'),
  });

  // Content arriving from outside (a saved post finishing its fetch) replaces the document without counting as an edit.
  useEffect(() => {
    if (!editor) return;
    const cur = editor.isEmpty ? '' : editor.getHTML();
    if ((value || '') !== cur) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  const addImage = (file?: File) => {
    if (!file || !editor) return;
    const r = new FileReader();
    r.onload = () => editor.chain().focus().setImage({ src: String(r.result) }).run();
    r.readAsDataURL(file);
  };
  const openSlash = () => editor?.chain().focus().insertContent('/').run();

  if (!editor) return <div className="card h-[420px] animate-pulse" />;
  return (
    <div className="relative pb-16 lg:pb-0" data-font={prefs.font} data-small={prefs.small}>
      <PageOptions prefs={prefs} set={savePrefs} words={editor.storage.characterCount.words()} />
      <Bubble editor={editor} />
      <TableBar editor={editor} />
      <Handle editor={editor} />
      <EditorContent editor={editor} />
      <MobileBar editor={editor} onSlash={openSlash} />
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
