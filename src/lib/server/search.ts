// A small evaluator for the subset of Gmail search syntax the app generates. Used by the offline demo mailbox.

export interface SearchDoc {
  labels: string[];
  labelNames: string[];
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  date: number;
  hasAttachment: boolean;
  hasIcs: boolean;
}

type Node =
  | { t: 'and'; c: Node[] }
  | { t: 'or'; c: Node[] }
  | { t: 'not'; c: Node }
  | { t: 'term'; v: string };

function tokenize(q: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < q.length) {
    const ch = q[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if ('(){}'.includes(ch)) { out.push(ch); i++; continue; }
    let tok = '';
    while (i < q.length && !/\s/.test(q[i]!) && !'(){}'.includes(q[i]!)) {
      if (q[i] === '"') {
        const end = q.indexOf('"', i + 1);
        const stop = end === -1 ? q.length : end;
        tok += q.slice(i + 1, stop);
        i = stop + 1;
      } else tok += q[i++];
    }
    if (tok) out.push(tok);
  }
  return out;
}

function parse(tokens: string[]): Node {
  let pos = 0;
  const parseSeq = (close?: string): Node[] => {
    const items: Node[] = [];
    let pendingOr = false;
    while (pos < tokens.length && tokens[pos] !== close) {
      const tok = tokens[pos]!;
      if (tok === 'OR') { pendingOr = true; pos++; continue; }
      let node: Node;
      if (tok === '(') { pos++; node = { t: 'and', c: parseSeq(')') }; pos++; }
      else if (tok === '{') { pos++; node = { t: 'or', c: parseSeq('}') }; pos++; }
      else if (tok === '-' && (tokens[pos + 1] === '(' || tokens[pos + 1] === '{')) {
        pos++;
        const open = tokens[pos]!; pos++;
        const inner = parseSeq(open === '(' ? ')' : '}'); pos++;
        node = { t: 'not', c: open === '(' ? { t: 'and', c: inner } : { t: 'or', c: inner } };
      } else if (tok.startsWith('-') && tok.length > 1) { pos++; node = { t: 'not', c: { t: 'term', v: tok.slice(1) } }; }
      else { pos++; node = { t: 'term', v: tok }; }
      if (pendingOr && items.length) {
        const prev = items.pop()!;
        items.push(prev.t === 'or' ? { t: 'or', c: [...prev.c, node] } : { t: 'or', c: [prev, node] });
        pendingOr = false;
      } else items.push(node);
    }
    return items;
  };
  return { t: 'and', c: parseSeq() };
}

const DAY = 86_400_000;

function relative(v: string): number | null {
  const m = /^(\d+)([dmy])$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  return n * (m[2] === 'd' ? DAY : m[2] === 'm' ? 30 * DAY : 365 * DAY);
}

function absolute(v: string): number | null {
  if (/^\d{9,}$/.test(v)) return Number(v) * 1000;
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s/]+/g, '-');

function evalTerm(v: string, d: SearchDoc, now: number): boolean {
  const idx = v.indexOf(':');
  if (idx > 0) {
    const op = v.slice(0, idx).toLowerCase();
    const arg = v.slice(idx + 1).toLowerCase();
    switch (op) {
      case 'in':
        if (arg === 'anywhere') return true;
        return d.labels.includes(arg === 'drafts' ? 'DRAFT' : arg.toUpperCase());
      case 'is':
        if (arg === 'unread') return d.labels.includes('UNREAD');
        if (arg === 'read') return !d.labels.includes('UNREAD');
        if (arg === 'starred') return d.labels.includes('STARRED');
        if (arg === 'important') return d.labels.includes('IMPORTANT');
        return false;
      case 'has':
        if (arg === 'attachment') return d.hasAttachment;
        if (arg === 'userlabels') return d.labelNames.length > 0;
        return false;
      case 'filename': return arg === 'ics' ? d.hasIcs : d.hasAttachment;
      case 'label': return d.labelNames.some((n) => norm(n) === arg || norm(n).startsWith(`${arg}-`));
      case 'category': return d.labels.includes(`CATEGORY_${arg.toUpperCase()}`);
      case 'from': case 'to': case 'cc': case 'bcc': case 'subject': return d[op].toLowerCase().includes(arg);
      case 'newer_than': { const r = relative(arg); return r === null || d.date >= now - r; }
      case 'older_than': { const r = relative(arg); return r === null || d.date < now - r; }
      case 'after': { const a = absolute(arg); return a === null || d.date > a; }
      case 'before': { const a = absolute(arg); return a === null || d.date < a; }
      default: break;
    }
  }
  const needle = v.toLowerCase();
  return `${d.subject} ${d.body} ${d.from} ${d.to}`.toLowerCase().includes(needle);
}

function evalNode(n: Node, d: SearchDoc, now: number): boolean {
  switch (n.t) {
    case 'and': return n.c.every((c) => evalNode(c, d, now));
    case 'or': return n.c.some((c) => evalNode(c, d, now));
    case 'not': return !evalNode(n.c, d, now);
    case 'term': return evalTerm(n.v, d, now);
  }
}

/** Gmail hides spam and trash unless the query asks for them. */
export function matches(q: string, d: SearchDoc, now = Date.now()): boolean {
  const lower = q.toLowerCase();
  const wantsHidden = /\bin:(spam|trash|anywhere)\b/.test(lower);
  if (!wantsHidden && (d.labels.includes('SPAM') || d.labels.includes('TRASH'))) return false;
  return evalNode(parse(tokenize(q)), d, now);
}
