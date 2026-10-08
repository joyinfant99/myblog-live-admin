import { mergeAttributes, Node } from '@tiptap/core';

export const CALLOUT_EMOJI = ['💡', '⚠️', '✅', '❗', '📌', '🔥', '💬', '📝'];

/** Notion-style callout: a tinted box with a click-to-change emoji. Saved as plain HTML (emoji stays in the markup), so the public site shows it even unstyled. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return { emoji: { default: '💡', parseHTML: (el) => el.getAttribute('data-emoji') || el.querySelector('.callout-emoji')?.textContent || '💡', renderHTML: (a) => ({ 'data-emoji': a.emoji }) } };
  },
  parseHTML() { return [{ tag: 'div[data-callout]', contentElement: '.callout-body' }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'callout' }), ['span', { class: 'callout-emoji', contenteditable: 'false' }, node.attrs.emoji], ['div', { class: 'callout-body' }, 0]];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div'); dom.className = 'callout'; dom.setAttribute('data-callout', '');
      const icon = document.createElement('button'); icon.type = 'button'; icon.className = 'callout-emoji'; icon.contentEditable = 'false'; icon.title = 'Change icon'; icon.textContent = node.attrs.emoji;
      const body = document.createElement('div'); body.className = 'callout-body';
      icon.addEventListener('mousedown', (e) => e.preventDefault());
      icon.addEventListener('click', () => {
        const pos = typeof getPos === 'function' ? getPos() : undefined; if (pos == null) return;
        const next = CALLOUT_EMOJI[(CALLOUT_EMOJI.indexOf(node.attrs.emoji) + 1) % CALLOUT_EMOJI.length];
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, emoji: next }));
      });
      dom.append(icon, body);
      return { dom, contentDOM: body, update: (n) => { if (n.type.name !== 'callout') return false; icon.textContent = n.attrs.emoji; return true; } };
    };
  },
});
