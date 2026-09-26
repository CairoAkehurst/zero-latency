'use client';
// Small helpers for the contenteditable composer. document.execCommand is deprecated but remains the only
// cross-browser way to make undo-able edits inside contenteditable, and every current browser supports it.

const BLOCKS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE']);

export function currentBlock(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  let n: Node | null = sel.anchorNode;
  while (n && n !== root) {
    if (n instanceof HTMLElement && BLOCKS.has(n.tagName)) return n;
    n = n.parentNode;
  }
  return n === root ? root : null;
}

/** Text of the current block up to the caret. */
export function textBeforeCaret(root: HTMLElement): string {
  const sel = window.getSelection();
  const block = currentBlock(root);
  if (!sel || !sel.rangeCount || !block) return '';
  const r = sel.getRangeAt(0).cloneRange();
  r.setStart(block, 0);
  return r.toString();
}

/** Delete `count` characters before the caret (used to remove typed markdown / slash triggers). */
export function deleteBeforeCaret(count: number) {
  for (let i = 0; i < count; i++) document.execCommand('delete');
}

export function caretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.collapse(true);
  const rects = r.getClientRects();
  if (rects.length) return rects[0]!;
  const el = (sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement) ?? null;
  return el?.getBoundingClientRect() ?? null;
}

export function saveRange(): Range | null {
  const sel = window.getSelection();
  return sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
}

export function restoreRange(root: HTMLElement, range: Range | null) {
  root.focus();
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  if (range && root.contains(range.startContainer)) sel.addRange(range);
  else {
    const r = document.createRange();
    r.selectNodeContents(root);
    r.collapse(false);
    sel.addRange(r);
  }
}

export function insertHtml(root: HTMLElement, html: string, range: Range | null) {
  restoreRange(root, range);
  document.execCommand('insertHTML', false, html);
}

export type BlockCommand = 'h2' | 'ul' | 'ol' | 'quote' | 'code' | 'hr';

export function applyBlock(cmd: BlockCommand) {
  switch (cmd) {
    case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'ol': document.execCommand('insertOrderedList'); break;
    case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'code': document.execCommand('formatBlock', false, 'pre'); break;
    case 'hr': document.execCommand('insertHorizontalRule'); break;
  }
}

/** Markdown-style shortcuts typed at the start of a block, triggered by the space after the marker. */
export const MARKDOWN: { marker: string; cmd: BlockCommand }[] = [
  { marker: '#', cmd: 'h2' }, { marker: '##', cmd: 'h2' }, { marker: '-', cmd: 'ul' }, { marker: '*', cmd: 'ul' },
  { marker: '1.', cmd: 'ol' }, { marker: '>', cmd: 'quote' }, { marker: '```', cmd: 'code' },
];

/** Strip editor-only attributes and keep the HTML email-safe. */
export function editorHtml(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[contenteditable], [data-placeholder]').forEach((el) => { el.removeAttribute('contenteditable'); el.removeAttribute('data-placeholder'); });
  clone.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove());
  clone.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) if (/^on/i.test(a.name) || (a.name === 'href' && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
  });
  clone.querySelectorAll('blockquote').forEach((b) => b.setAttribute('style', 'margin:0 0 0 .8ex;border-left:2px solid #ccc;padding-left:1ex;color:#555'));
  clone.querySelectorAll('pre').forEach((p) => p.setAttribute('style', 'background:#f6f6f5;border-radius:6px;padding:8px 12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap'));
  return clone.innerHTML;
}

export function editorText(root: HTMLElement): string {
  return root.innerText.replace(/\n{3,}/g, '\n\n').trim();
}

export async function fileToBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
