/* ═════════════════════ כלים כלליים ═════════════════════ */
const $ = (s, el = document) => el.querySelector(s);
const app = () => $('#app');
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[rnd(a.length)];
const uniq = a => [...new Set(a)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'q' + (h >>> 0).toString(36); };

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('nachshon_' + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nachshon_' + k, JSON.stringify(v)); } catch {} },
};

const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
let selected = store.get('topics', TOPICS.map(t => t.id)).filter(id => TOPIC[id]);
if (!selected.length) selected = TOPICS.map(t => t.id);

/* ═════════════════════ בניית מאגר שאלות ═════════════════════ */
// בוחר עד n מסיחים ייחודיים מתוך מאגרים לפי סדר עדיפות
function distractors(correct, pools, n = 3) {
  const out = [];
  const bad = new Set([correct]);
  for (const pool of pools) {
    for (const x of shuffle(pool)) {
      if (out.length >= n) return out;
      if (!bad.has(x)) { out.push(x); bad.add(x); }
    }
  }
  return out;
}
const numVariants = a => {
  const n = parseInt(a, 10); const suffix = a.replace(/^\d+/, '');
  const c = uniq([n + 1, n - 1, n + 2, n - 2, n * 2, n + 10, n - 10, Math.round(n / 2)].filter(x => x > 0 && x !== n));
  return shuffle(c).map(x => x + suffix);
};

const ALL_LIST_ITEMS = TOPICS.flatMap(t => (t.lists || []).flatMap(l => l.items));
const ALL_DEFS = TOPICS.flatMap(t => (t.pairs || []).flatMap(g => g.items.map(p => p[1])));

function parseFact(f) {
  // מחזיר [{answer, options|null, before, after}] – שאלה אחת לכל חסר
  const parts = []; const re = /\[\[(.+?)\]\]/g; let m;
  const blanks = [];
  while ((m = re.exec(f))) blanks.push({ start: m.index, end: re.lastIndex, raw: m[1] });
  return blanks.map((b, i) => {
    const [answer, ...dist] = b.raw.split('|');
    const fill = s => s.replace(/\[\[(.+?)\]\]/g, (_, r) => r.split('|')[0]);
    return {
      answer, dist,
      before: fill(f.slice(0, b.start)),
      after: fill(f.slice(b.end)),
    };
  });
}

function buildBank() {
  const bank = [];
  const add = q => { q.id = hash(q.kind + '|' + q.q + '|' + q.answer); bank.push(q); };

  for (const t of TOPICS) {
    const topicBlanks = (t.facts || []).flatMap(f => parseFact(f).map(b => b.answer));
    const topicDefs = (t.pairs || []).flatMap(g => g.items.map(p => p[1]));
    const topicTerms = (t.pairs || []).flatMap(g => g.items.map(p => p[0]));
    const topicItems = (t.lists || []).flatMap(l => l.items);

    // שאלות אמריקאיות ידניות
    for (const m of t.mcq || []) add({ kind: 'mc', topic: t.id, q: m.q, answer: m.a, wrong: m.w, explain: m.e });

    // מזוגות מושג-הסבר
    for (const g of t.pairs || []) {
      const terms = g.items.map(p => p[0]), defs = g.items.map(p => p[1]);
      g.items.forEach(([term, def]) => {
        add({ kind: 'mc', topic: t.id, q: `${g.title}: מה מתאר את „${term}”?`, answer: def,
              wrong: distractors(def, [defs, topicDefs, ALL_DEFS]), src: 'pair' });
        add({ kind: 'mc', topic: t.id, q: `${g.title}: למה מתייחס התיאור הבא?\n„${def}”`, answer: term,
              wrong: distractors(term, [terms, topicTerms, topicItems]), src: 'pair' });
        // נכון/לא נכון
        const fake = distractors(def, [defs, topicDefs], 1)[0];
        if (fake) {
          add({ kind: 'tf', topic: t.id, q: `${term} – ${def}`, answer: 'נכון', src: 'pair' });
          add({ kind: 'tf', topic: t.id, q: `${term} – ${fake}`, answer: 'לא נכון', explain: `${term} – ${def}`, src: 'pair' });
        }
      });
    }

    // מרשימות
    for (const l of t.lists || []) {
      const others = topicItems.filter(x => !l.items.includes(x));
      const global = ALL_LIST_ITEMS.filter(x => !l.items.includes(x));
      if (l.items.length >= 2 && l.title.length) {
        // מי שייך
        for (const it of l.items) {
          const w = distractors(it, [others, global]);
          if (w.length === 3) add({ kind: 'mc', topic: t.id, q: `איזה מהבאים שייך ל„${l.title}”?`, answer: it, wrong: w, src: 'list' });
        }
        // מי לא שייך
        if (l.items.length >= 3) {
          const odd = distractors('', [others, global], 1)[0];
          if (odd) for (let k = 0; k < Math.min(3, l.items.length); k++) {
            const three = shuffle(l.items).slice(0, 3);
            add({ kind: 'mc', topic: t.id, q: `איזה מהבאים אינו חלק מ„${l.title}”?`, answer: odd, wrong: three, src: 'list',
                  explain: `${l.title}: ${l.items.join(' • ')}` });
          }
        }
        // כמה
        if (l.items.length >= 3 && l.items.length <= 15) {
          const a = String(l.items.length);
          add({ kind: 'mc', topic: t.id, q: `כמה פריטים יש ב„${l.title}”?`, answer: a, wrong: numVariants(a).slice(0, 3), src: 'count',
                explain: l.items.join(' • ') });
        }
        // נכון/לא נכון
        const it = pick(l.items); const out = distractors('', [others, global], 1)[0];
        add({ kind: 'tf', topic: t.id, q: `„${it}” הוא חלק מ„${l.title}”.`, answer: 'נכון', src: 'list' });
        if (out) add({ kind: 'tf', topic: t.id, q: `„${out}” הוא חלק מ„${l.title}”.`, answer: 'לא נכון', explain: `${l.title}: ${l.items.join(' • ')}`, src: 'list' });
      }
      // רשימות מסודרות – מה בא אחרי
      if (l.ordered && l.items.length >= 3) {
        l.items.forEach((it, i) => {
          if (i < l.items.length - 1) {
            const nxt = l.items[i + 1];
            add({ kind: 'mc', topic: t.id, q: `${l.title}: מה מגיע מיד אחרי „${it}”?`, answer: nxt,
                  wrong: distractors(nxt, [l.items.filter(x => x !== it), others, global]), src: 'order', explain: l.items.join(' ← ') });
          }
        });
        add({ kind: 'mc', topic: t.id, q: `${l.title}: מהו הפריט/השלב הראשון?`, answer: l.items[0],
              wrong: distractors(l.items[0], [l.items, others, global]), src: 'order', explain: l.items.join(' ← ') });
        add({ kind: 'mc', topic: t.id, q: `${l.title}: מהו הפריט/השלב האחרון?`, answer: l.items.at(-1),
              wrong: distractors(l.items.at(-1), [l.items, others, global]), src: 'order', explain: l.items.join(' ← ') });
      }
    }

    // השלמת היגדים
    for (const f of t.facts || []) {
      for (const b of parseFact(f)) {
        let w = b.dist.length ? b.dist.slice(0, 3) : [];
        if (w.length < 3) {
          const pool = /^\d/.test(b.answer) ? numVariants(b.answer) : [];
          w = w.concat(distractors(b.answer, [pool, topicBlanks, topicItems], 3 - w.length));
        }
        add({ kind: 'fill', topic: t.id, before: b.before, after: b.after, answer: b.answer, wrong: w,
              q: `${b.before}_____${b.after}`, full: b.before + b.answer + b.after });
      }
    }

    // נכון/לא נכון ידני
    for (const x of t.tf || []) add({ kind: 'tf', topic: t.id, q: x.s, answer: x.t ? 'נכון' : 'לא נכון', explain: x.e });
  }
  // הסרת כפילויות
  const seen = new Set();
  return bank.filter(q => !seen.has(q.id) && seen.add(q.id));
}
const BANK = buildBank();

/* ═════════════════════ סטטיסטיקה וטעויות ═════════════════════ */
function record(q, ok) {
  const s = store.get('stats', {});
  s[q.topic] = s[q.topic] || { a: 0, c: 0 };
  s[q.topic].a++; if (ok) s[q.topic].c++;
  store.set('stats', s);
  const m = store.get('mistakes', {});
  if (!ok) m[q.id] = (m[q.id] || 0) + 1; else if (m[q.id]) { m[q.id]--; if (m[q.id] <= 0) delete m[q.id]; }
  store.set('mistakes', m);
  const tot = store.get('total', { a: 0, c: 0 }); tot.a++; if (ok) tot.c++; store.set('total', tot);
}
const mistakeIds = () => Object.keys(store.get('mistakes', {}));

/* ═════════════════════ ניווט ═════════════════════ */
const GAMES = [
  { id: 'exam', icon: '📝', name: 'המבחן האמיתי', desc: 'השאלות מהמבחן המסכם עצמו – עם ניקוד וציון בסוף.' },
  { id: 'quiz', icon: '🎯', name: 'שאלון אמריקאי', desc: 'ארבע תשובות, אחת נכונה. שאלות מכל סוג.' },
  { id: 'fill', icon: '✍️', name: 'השלמת היגד', desc: 'השלם את המילה החסרה – בבחירה או בהקלדה חופשית.' },
  { id: 'cards', icon: '🃏', name: 'היגד ותשובה', desc: 'כרטיסיות: קרא, נסה להיזכר, הפוך ובדוק את עצמך.' },
  { id: 'tf', icon: '⚖️', name: 'נכון / לא נכון', desc: 'החלט מהר אם ההיגד נכון. כולל הסבר על טעויות.' },
  { id: 'match', icon: '🔗', name: 'משחק התאמה', desc: 'חבר כל מושג להגדרה שלו.' },
  { id: 'order', icon: '🔢', name: 'סדר נכון', desc: 'סדר שלבים ורשימות לפי הסדר הנכון (מעגל החניכה, מעגל הפו״ש ועוד).' },
  { id: 'belong', icon: '🧺', name: 'מי שייך?', desc: 'סמן את כל הפריטים ששייכים לרשימה – והשאר בחוץ את המתחזים.' },
  { id: 'recall', icon: '🧠', name: 'שליפה מהזיכרון', desc: 'כתוב כמה שיותר פריטים מרשימה – בלי רמזים.' },
  { id: 'blitz', icon: '⚡', name: 'בליץ 60 שניות', desc: 'כמה תשובות נכונות תספיק בדקה? שבור את השיא שלך.' },
  { id: 'mistakes', icon: '🔁', name: 'חזרה על טעויות', desc: 'רק שאלות שטעית בהן. תשובה נכונה מוציאה אותן מהרשימה.' },
];

function setHeader(title, back = true) {
  $('#hdr-title').textContent = title;
  $('#hdr-back').style.visibility = back ? 'visible' : 'hidden';
}
let cleanup = null;
function go(view, arg) {
  if (cleanup) { cleanup(); cleanup = null; }
  window.scrollTo(0, 0);
  ({ home, study, stats, topics: topicPicker, ...RUNNERS })[view](arg);
  try { if (view !== 'home') history.replaceState(null, '', '#' + view); else history.replaceState(null, '', location.pathname); } catch {}
}

/* ═════════════════════ מסך בית ═════════════════════ */
function home() {
  setHeader('נחשון • תרגול למבחן המסכם', false);
  const tot = store.get('total', { a: 0, c: 0 });
  const mist = mistakeIds().length;
  const pct = tot.a ? Math.round(100 * tot.c / tot.a) : 0;
  app().innerHTML = `
    <section class="hero">
      <div class="hero-stats">
        <div><b>${tot.a}</b><span>תשובות</span></div>
        <div><b>${pct}%</b><span>הצלחה</span></div>
        <div><b>${BANK.length}</b><span>שאלות במאגר</span></div>
        <div><b>♾️</b><span>בלי לבבות</span></div>
      </div>
      <button class="chip-btn" id="pickTopics">📚 נושאים: ${selected.length === TOPICS.length ? 'כל ה-20' : selected.length + ' נבחרו'} – שנה</button>
    </section>
    <section class="grid">
      ${GAMES.map(g => `
        <button class="card game" data-g="${g.id}">
          <span class="g-icon">${g.icon}</span>
          <span class="g-name">${g.name}${g.id === 'mistakes' && mist ? ` <em class="badge">${mist}</em>` : ''}</span>
          <span class="g-desc">${g.desc}</span>
        </button>`).join('')}
    </section>
    <section class="grid two">
      <button class="card wide" data-v="study"><span class="g-icon">📖</span><span class="g-name">חומר לימוד</span><span class="g-desc">כל הסיכום, מסודר לפי נושאים</span></button>
      <button class="card wide" data-v="stats"><span class="g-icon">📊</span><span class="g-name">ההתקדמות שלי</span><span class="g-desc">אחוזי הצלחה לפי נושא</span></button>
    </section>`;
  app().querySelectorAll('[data-g]').forEach(b => b.onclick = () => go(b.dataset.g));
  app().querySelectorAll('[data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
  $('#pickTopics').onclick = () => go('topics');
}

function topicPicker() {
  setHeader('בחירת נושאים');
  const cnt = id => BANK.filter(q => q.topic === id).length;
  const render = () => {
    app().innerHTML = `
      <p class="muted">המשחקים ישאלו רק על הנושאים שבחרת.</p>
      <div class="row gap"><button class="btn small" id="all">בחר הכל</button><button class="btn small ghost" id="none">נקה</button></div>
      <div class="topic-list">${TOPICS.map((t, i) => `
        <label class="topic ${selected.includes(t.id) ? 'on' : ''}">
          <input type="checkbox" value="${t.id}" ${selected.includes(t.id) ? 'checked' : ''}>
          <span>${t.icon}</span><span class="tn">${i + 1}. ${t.name}</span><span class="muted small">${cnt(t.id)} שאלות</span>
        </label>`).join('')}</div>
      <button class="btn primary block" id="done">שמור וחזור</button>`;
    app().querySelectorAll('input').forEach(c => c.onchange = () => {
      selected = c.checked ? uniq([...selected, c.value]) : selected.filter(x => x !== c.value); render();
    });
    $('#all').onclick = () => { selected = TOPICS.map(t => t.id); render(); };
    $('#none').onclick = () => { selected = []; render(); };
    $('#done').onclick = () => { if (!selected.length) selected = TOPICS.map(t => t.id); store.set('topics', selected); go('home'); };
  };
  render();
}

/* ═════════════════════ מנוע שאלה-אחר-שאלה ═════════════════════ */
function endless(pool) {
  // תור אינסופי: עובר על כל השאלות בסדר אקראי ומתחיל מחדש
  let q = [];
  return () => { if (!q.length) q = shuffle(pool); return q.pop(); };
}
const poolFor = kinds => BANK.filter(q => selected.includes(q.topic) && kinds.includes(q.kind));

function scoreBar(s) {
  return `<div class="scorebar"><span>✔️ ${s.c}</span><span>✖️ ${s.a - s.c}</span><span>🔥 רצף ${s.streak}</span><span class="muted">${s.a ? Math.round(100 * s.c / s.a) : 0}%</span></div>`;
}
const topicTag = q => `<span class="tag">${TOPIC[q.topic].icon} ${TOPIC[q.topic].name}</span>`;

function renderQuestion(q, opts = {}) {
  // מחזיר HTML לשאלה + פונקציית חיבור אירועים
  if (q.kind === 'tf') {
    return {
      html: `<div class="qtext">${esc(q.q)}</div>
        <div class="tf-row"><button class="opt tf yes" data-a="נכון">✔️ נכון</button><button class="opt tf no" data-a="לא נכון">✖️ לא נכון</button></div>`,
    };
  }
  const options = shuffle([q.answer, ...q.wrong]);
  const qt = q.kind === 'fill'
    ? `<div class="qtext fill">${esc(q.before)}<span class="blank">_____</span>${esc(q.after)}</div>`
    : `<div class="qtext">${esc(q.q).replace(/\n/g, '<br>')}</div>`;
  return {
    html: `${qt}<div class="opts">${options.map((o, i) => `<button class="opt" data-a="${esc(o)}"><span class="k">${i + 1}</span>${esc(o)}</button>`).join('')}</div>`,
  };
}

function runSession({ title, next, emptyMsg, typing = false, onAnswered }) {
  if (cleanup) { cleanup(); cleanup = null; }
  setHeader(title);
  const s = { a: 0, c: 0, streak: 0, best: 0 };
  let cur, answered;
  const show = () => {
    cur = next();
    if (!cur) { app().innerHTML = `<div class="empty">${emptyMsg || 'אין שאלות'}<br><br><button class="btn primary" onclick="go('home')">חזרה</button></div>`; return; }
    answered = false;
    const typeMode = typing && cur.kind === 'fill' && store.get('typeMode', false);
    let body;
    if (typeMode) {
      body = `<div class="qtext fill">${esc(cur.before)}<span class="blank">_____</span>${esc(cur.after)}</div>
        <form class="typeform" id="tf"><input id="ti" autocomplete="off" placeholder="הקלד את ההשלמה..."><button class="btn primary">בדוק</button></form>`;
    } else body = renderQuestion(cur).html;
    app().innerHTML = `
      ${scoreBar(s)}
      ${typing ? `<div class="row gap mode"><span class="muted">מצב:</span>
        <button class="btn small ${typeMode ? 'ghost' : 'primary'}" id="mChoose">בחירה מתשובות</button>
        <button class="btn small ${typeMode ? 'primary' : 'ghost'}" id="mType">הקלדה חופשית</button></div>` : ''}
      <div class="qcard">${topicTag(cur)}${body}<div id="fb"></div></div>
      <div class="row gap end"><button class="btn ghost" id="skip">דלג ⏭</button><button class="btn ghost" id="end">סיים סבב</button></div>`;
    app().querySelectorAll('.opt').forEach(b => b.onclick = () => choose(b.dataset.a, b));
    if (typing) {
      $('#mChoose').onclick = () => { store.set('typeMode', false); rerender(); };
      $('#mType').onclick = () => { store.set('typeMode', true); rerender(); };
    }
    if (typeMode) {
      $('#ti').focus();
      $('#tf').onsubmit = e => { e.preventDefault(); if (answered) return show(); typed($('#ti').value); };
    }
    $('#skip').onclick = show;
    $('#end').onclick = summary;
  };
  const rerender = () => { const q = cur; next.unshift?.(q); show(); };
  const feedback = (ok, extra = '') => {
    answered = true;
    s.a++; if (ok) { s.c++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    record(cur, ok);
    onAnswered?.(cur, ok);
    const full = cur.kind === 'fill' ? `<div class="full">${esc(cur.before)}<b>${esc(cur.answer)}</b>${esc(cur.after)}</div>` : '';
    $('#fb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}">
        <div class="fb-title">${ok ? pick(['מצוין! 💪', 'נכון! 🎯', 'יפה מאוד! ⭐', 'בדיוק! ✅', 'אלוף! 🏅']) : 'לא מדויק 🤏'}</div>
        ${!ok ? `<div>התשובה הנכונה: <b>${esc(cur.answer)}</b></div>` : ''}
        ${full}${cur.explain ? `<div class="explain">💡 ${esc(cur.explain)}</div>` : ''}${extra}
      </div>
      <button class="btn primary block" id="nextBtn">הבא ⬅ <span class="muted small">(Enter)</span></button>`;
    $('.scorebar').outerHTML = scoreBar(s);
    $('#nextBtn').onclick = show;
    $('#nextBtn').focus({ preventScroll: true });
    $('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const choose = (a, btn) => {
    if (answered) return;
    const ok = a === cur.answer;
    app().querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.a === cur.answer) b.classList.add('right'); });
    if (!ok) btn.classList.add('wrong');
    feedback(ok);
  };
  const typed = val => {
    const ok = fuzzyEq(val, cur.answer);
    $('#ti').disabled = true;
    feedback(ok, ok ? '' : `<div class="muted small">כתבת: „${esc(val)}”</div><button class="btn small ghost" id="override">התכוונתי לזה – סמן כנכון</button>`);
    const ov = $('#override');
    if (ov) ov.onclick = () => { s.c++; s.streak++; record(cur, true); ov.remove(); $('.scorebar').outerHTML = scoreBar(s); $('.fb').classList.replace('bad', 'ok'); };
  };
  const summary = () => {
    const pct = s.a ? Math.round(100 * s.c / s.a) : 0;
    app().innerHTML = `<div class="summary">
      <div class="big">${pct >= 85 ? '🏆' : pct >= 65 ? '💪' : '📚'}</div>
      <h2>סיכום סבב</h2>
      <p>${s.c} נכונות מתוך ${s.a} (${pct}%)<br>רצף הכי ארוך: ${s.best}</p>
      <div class="row gap center"><button class="btn primary" id="again">עוד סבב</button><button class="btn ghost" onclick="go('home')">לתפריט</button></div></div>`;
    $('#again').onclick = () => runSession({ title, next, emptyMsg, typing, onAnswered });
  };
  const key = e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter' && answered) { e.preventDefault(); show(); }
    const n = parseInt(e.key, 10);
    if (!answered && n >= 1) { const b = app().querySelectorAll('.opt')[n - 1]; if (b) b.click(); }
  };
  document.addEventListener('keydown', key);
  cleanup = () => document.removeEventListener('keydown', key);
  show();
}

function normalize(s) {
  return s.replace(/[֑-ׇ]/g, '').replace(/[״"׳'`.,:;!?()\-–—\/]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^ה(?=\S{3})/, '').toLowerCase();
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function fuzzyEq(input, answer) {
  const a = normalize(input), b = normalize(answer);
  if (!a) return false;
  if (a === b) return true;
  const tol = b.length <= 4 ? 0 : b.length <= 8 ? 1 : Math.floor(b.length * 0.2);
  if (lev(a, b) <= tol) return true;
  return b.length > 10 && a.length >= b.length * 0.6 && b.includes(a);
}

/* ═════════════════════ המשחקים ═════════════════════ */
const RUNNERS = {
  exam: () => runExam(),
  quiz() {
    const pool = poolFor(['mc', 'fill']);
    runSession({ title: '🎯 שאלון אמריקאי', next: endless(pool) });
  },
  fill() {
    const pool = poolFor(['fill']);
    let q = [];
    const next = () => { if (!q.length) q = shuffle(pool); return q.pop(); };
    next.unshift = x => q.push(x);
    runSession({ title: '✍️ השלמת היגד', next, typing: true, emptyMsg: 'אין היגדים בנושאים שבחרת' });
  },
  tf() {
    runSession({ title: '⚖️ נכון / לא נכון', next: endless(poolFor(['tf'])) });
  },
  mistakes() {
    const ids = new Set(mistakeIds());
    const pool = BANK.filter(q => ids.has(q.id));
    let q = shuffle(pool);
    const next = () => q.pop();
    runSession({ title: '🔁 חזרה על טעויות', next, emptyMsg: 'אין טעויות לחזור עליהן 🎉<br><span class="muted">כל שאלה שתטעה בה במשחקים תופיע כאן.</span>' });
  },

  cards() {
    setHeader('🃏 היגד ותשובה');
    const deck0 = [];
    for (const t of TOPICS.filter(t => selected.includes(t.id))) {
      for (const g of t.pairs || []) for (const [a, b] of g.items) deck0.push({ topic: t.id, front: a, sub: g.title, back: b });
      for (const l of t.lists || []) deck0.push({ topic: t.id, front: l.title, sub: l.ordered ? 'רשימה לפי סדר' : `רשימה (${l.items.length} פריטים)`, back: l.items, ordered: l.ordered });
      for (const f of t.facts || []) for (const b of parseFact(f)) deck0.push({ topic: t.id, front: `${b.before}_____${b.after}`, sub: 'השלם את ההיגד', back: b.answer, full: b.before + '<b>' + esc(b.answer) + '</b>' + b.after });
    }
    let deck = shuffle(deck0), known = 0, again = 0;
    const show = () => {
      if (!deck.length) {
        app().innerHTML = `<div class="summary"><div class="big">🎉</div><h2>סיימת את החפיסה!</h2><p>ידעת ${known} • חזרת על ${again}</p>
          <div class="row gap center"><button class="btn primary" id="re">ערבב מחדש</button><button class="btn ghost" onclick="go('home')">לתפריט</button></div></div>`;
        $('#re').onclick = () => RUNNERS.cards(); return;
      }
      const c = deck[deck.length - 1];
      const back = Array.isArray(c.back)
        ? `<${c.ordered ? 'ol' : 'ul'} class="blist">${c.back.map(x => `<li>${esc(x)}</li>`).join('')}</${c.ordered ? 'ol' : 'ul'}>`
        : c.full ? `<div class="full">${c.full}</div>` : `<div class="bt">${esc(c.back)}</div>`;
      app().innerHTML = `
        <div class="scorebar"><span>🗂️ נשארו ${deck.length}</span><span>✔️ ${known}</span><span>🔁 ${again}</span></div>
        <div class="flip" id="flip"><div class="flip-inner">
          <div class="face front">${topicTag(c)}<div class="sub">${esc(c.sub)}</div><div class="ft">${esc(c.front)}</div><div class="muted small tap">הקש כדי להפוך 🔄</div></div>
          <div class="face back">${topicTag(c)}<div class="sub">${esc(c.front)}</div>${back}</div>
        </div></div>
        <div class="row gap center" id="rate" style="visibility:hidden">
          <button class="btn bad" id="no">🔁 עוד לא</button><button class="btn ok" id="yes">✔️ ידעתי</button></div>`;
      $('#flip').onclick = () => { $('#flip').classList.toggle('flipped'); $('#rate').style.visibility = 'visible'; };
      $('#yes').onclick = () => { deck.pop(); known++; show(); };
      $('#no').onclick = () => { const x = deck.pop(); deck.splice(rnd(Math.max(1, deck.length - 2)), 0, x); again++; show(); };
    };
    const key = e => { if (e.key === ' ') { e.preventDefault(); $('#flip')?.click(); } };
    document.addEventListener('keydown', key); cleanup = () => document.removeEventListener('keydown', key);
    show();
  },

  match() {
    setHeader('🔗 משחק התאמה');
    const groups = TOPICS.filter(t => selected.includes(t.id)).flatMap(t => (t.pairs || []).map(g => ({ ...g, topic: t.id })));
    const big = groups.filter(g => g.items.length >= 3);
    if (!big.length) { app().innerHTML = `<div class="empty">אין זוגות בנושאים שבחרת</div>`; return; }
    let rounds = 0, totalMiss = 0;
    const round = () => {
      const g = pick(big);
      const items = shuffle(g.items).slice(0, 5);
      const L = shuffle(items.map((p, i) => ({ t: p[0], i }))), R = shuffle(items.map((p, i) => ({ t: p[1], i })));
      let sel = null, done = 0, miss = 0;
      app().innerHTML = `
        <div class="qcard">${topicTag(g)}<div class="qtext">${esc(g.title)}</div><p class="muted small">בחר מושג ואז את ההסבר המתאים לו</p></div>
        <div class="match"><div class="col">${L.map(x => `<button class="m-item term" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
        <div class="col">${R.map(x => `<button class="m-item def" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div>
        <div id="mfb"></div>`;
      app().querySelectorAll('.term').forEach(b => b.onclick = () => {
        if (b.classList.contains('done')) return;
        app().querySelectorAll('.term').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b;
      });
      app().querySelectorAll('.def').forEach(b => b.onclick = () => {
        if (!sel || b.classList.contains('done')) return;
        if (b.dataset.i === sel.dataset.i) {
          [b, sel].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); }); sel = null; done++;
          if (done === items.length) {
            rounds++; totalMiss += miss;
            $('#mfb').innerHTML = `<div class="fb ok"><div class="fb-title">${miss === 0 ? 'מושלם! בלי טעויות 🏆' : `הושלם! ${miss} טעויות בדרך`}</div><div class="muted small">סבבים: ${rounds}</div></div>
              <button class="btn primary block" id="nr">סבב הבא ⬅</button>`;
            $('#nr').onclick = round;
          }
        } else { miss++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); }
      });
    };
    round();
  },

  order() {
    setHeader('🔢 סדר נכון');
    const lists = TOPICS.filter(t => selected.includes(t.id)).flatMap(t => (t.lists || []).filter(l => l.ordered && l.items.length >= 3 && l.items.length <= 10).map(l => ({ ...l, topic: t.id })));
    if (!lists.length) { app().innerHTML = `<div class="empty">אין רשימות מסודרות בנושאים שבחרת</div>`; return; }
    let queue = [], score = { a: 0, c: 0, streak: 0 };
    const round = () => {
      if (!queue.length) queue = shuffle(lists);
      const l = queue.pop();
      let pool = shuffle(l.items.map((t, i) => ({ t, i }))); if (pool.every((x, k) => x.i === k)) pool.reverse();
      const placed = [];
      const draw = (checked) => {
        app().innerHTML = `${scoreBar(score)}
          <div class="qcard">${topicTag(l)}<div class="qtext">${esc(l.title)}</div><p class="muted small">הקש על הפריטים לפי הסדר. הקש על פריט שבחרת כדי להחזיר אותו.</p></div>
          <ol class="placed">${placed.map((x, k) => `<li class="o-item ${checked ? (x.i === k ? 'right' : 'wrong') : ''}" data-k="${k}">${esc(x.t)}${checked && x.i !== k ? `<div class="small">✔ ${esc(l.items[k])}</div>` : ''}</li>`).join('')}
            ${placed.length < l.items.length ? `<li class="o-slot">…</li>` : ''}</ol>
          <div class="pool">${pool.map((x, k) => `<button class="o-item" data-p="${k}">${esc(x.t)}</button>`).join('')}</div>
          <div id="ofb"></div>`;
        if (!checked) {
          app().querySelectorAll('[data-p]').forEach(b => b.onclick = () => { placed.push(pool.splice(+b.dataset.p, 1)[0]); draw(); });
          app().querySelectorAll('.placed [data-k]').forEach(b => b.onclick = () => { pool.push(...placed.splice(+b.dataset.k)); draw(); });
          if (!pool.length) {
            $('#ofb').innerHTML = `<button class="btn primary block" id="chk">בדוק ✔</button>`;
            $('#chk').onclick = () => {
              const ok = placed.every((x, k) => x.i === k);
              score.a++; if (ok) { score.c++; score.streak++; } else score.streak = 0;
              draw(true);
              $('#ofb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="fb-title">${ok ? 'סדר מושלם! 🎯' : 'כמעט – ראה את התיקונים בירוק'}</div></div>
                <div class="row gap"><button class="btn ghost" id="retry">נסה שוב</button><button class="btn primary" id="nx">הבא ⬅</button></div>`;
              $('#nx').onclick = round;
              $('#retry').onclick = () => { queue.push(l); round(); };
            };
          }
        }
      };
      draw();
    };
    round();
  },

  belong() {
    setHeader('🧺 מי שייך?');
    const lists = TOPICS.filter(t => selected.includes(t.id)).flatMap(t => (t.lists || []).filter(l => l.items.length >= 3).map(l => ({ ...l, topic: t.id })));
    if (!lists.length) { app().innerHTML = `<div class="empty">אין רשימות בנושאים שבחרת</div>`; return; }
    let score = { a: 0, c: 0, streak: 0 };
    const round = () => {
      const l = pick(lists);
      const t = TOPIC[l.topic];
      const sameTopic = (t.lists || []).flatMap(x => x.items).filter(x => !l.items.includes(x));
      const global = ALL_LIST_ITEMS.filter(x => !l.items.includes(x));
      const ins = shuffle(l.items).slice(0, Math.min(6, l.items.length));
      const outs = distractors('', [sameTopic, global], Math.max(2, Math.min(4, 9 - ins.length)));
      const all = shuffle([...ins.map(x => ({ x, in: true })), ...outs.map(x => ({ x, in: false }))]);
      app().innerHTML = `${scoreBar(score)}
        <div class="qcard">${topicTag(l)}<div class="qtext">סמן את כל מה ששייך ל„${esc(l.title)}”</div><p class="muted small">יש כאן ${ins.length} פריטים נכונים ו-${outs.length} מתחזים.</p></div>
        <div class="pool belong">${all.map((o, k) => `<button class="o-item" data-k="${k}">${esc(o.x)}</button>`).join('')}</div>
        <div id="bfb"><button class="btn primary block" id="chk">בדוק ✔</button></div>`;
      app().querySelectorAll('[data-k]').forEach(b => b.onclick = () => b.classList.toggle('sel'));
      $('#chk').onclick = () => {
        let ok = true;
        app().querySelectorAll('[data-k]').forEach(b => {
          const o = all[+b.dataset.k], s = b.classList.contains('sel');
          b.disabled = true;
          if (o.in && s) b.classList.add('right');
          else if (o.in && !s) { b.classList.add('missed'); ok = false; }
          else if (!o.in && s) { b.classList.add('wrong'); ok = false; }
        });
        score.a++; if (ok) { score.c++; score.streak++; } else score.streak = 0;
        $('#bfb').innerHTML = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="fb-title">${ok ? 'מדויק! 🎯' : 'לא בדיוק'}</div>
          <div class="small">🟩 נכון • 🟨 פספסת • 🟥 לא שייך</div><div class="explain">📋 ${esc(l.title)}: ${l.items.map(esc).join(' • ')}</div></div>
          <button class="btn primary block" id="nx">הבא ⬅</button>`;
        $('#nx').onclick = round;
      };
    };
    round();
  },

  recall() {
    setHeader('🧠 שליפה מהזיכרון');
    const lists = TOPICS.filter(t => selected.includes(t.id)).flatMap(t => (t.lists || []).filter(l => l.items.length >= 3 && l.items.length <= 10).map(l => ({ ...l, topic: t.id })));
    if (!lists.length) { app().innerHTML = `<div class="empty">אין רשימות בנושאים שבחרת</div>`; return; }
    let queue = [];
    const round = () => {
      if (!queue.length) queue = shuffle(lists);
      const l = queue.pop();
      const found = new Set();
      const draw = (reveal) => {
        app().innerHTML = `
          <div class="qcard">${topicTag(l)}<div class="qtext">${esc(l.title)}</div>
            <p class="muted small">כתוב את הפריטים אחד-אחד (${l.items.length} בסה״כ). לא חייב מילה במילה – מספיק המילים המרכזיות.</p></div>
          <div class="progress"><div style="width:${100 * found.size / l.items.length}%"></div></div>
          <ul class="recall">${l.items.map((it, k) => `<li class="${found.has(k) ? 'got' : reveal ? 'miss' : ''}">${found.has(k) || reveal ? esc(it) : '•'.repeat(Math.min(12, it.length / 2 | 0))}</li>`).join('')}</ul>
          ${reveal ? `<div class="fb ${found.size === l.items.length ? 'ok' : 'bad'}"><div class="fb-title">שלפת ${found.size} מתוך ${l.items.length}</div></div>
              <div class="row gap"><button class="btn ghost" id="retry">שוב את זו</button><button class="btn primary" id="nx">רשימה הבאה ⬅</button></div>`
            : `<form class="typeform" id="rf"><input id="ri" autocomplete="off" placeholder="הקלד פריט..."><button class="btn primary">הוסף</button></form>
               <div id="rmsg" class="muted small"></div>
               <button class="btn ghost block" id="give">${found.size === l.items.length ? 'סיום' : 'הצג את מה שחסר'}</button>`}`;
        if (reveal) { $('#nx').onclick = round; $('#retry').onclick = () => { queue.push(l); round(); }; return; }
        $('#ri').focus();
        $('#give').onclick = () => draw(true);
        $('#rf').onsubmit = e => {
          e.preventDefault();
          const v = $('#ri').value; if (!v.trim()) return;
          const k = matchItem(v, l.items, found);
          if (k >= 0) { found.add(k); draw(found.size === l.items.length); if (found.size !== l.items.length) $('#rmsg').textContent = '✔ ' + l.items[k]; }
          else { $('#ri').value = ''; $('#rmsg').textContent = '✖ לא זוהה – נסה ניסוח אחר'; $('#ri').classList.add('shake'); setTimeout(() => $('#ri')?.classList.remove('shake'), 400); }
        };
      };
      draw(false);
    };
    round();
  },

  blitz() {
    setHeader('⚡ בליץ 60 שניות');
    const pool = poolFor(['mc', 'fill', 'tf']).filter(q => (q.answer + q.wrong?.join('')).length < 400);
    const best = store.get('blitzBest', 0);
    app().innerHTML = `<div class="summary"><div class="big">⚡</div><h2>בליץ</h2>
      <p>60 שניות. כמה שיותר תשובות נכונות.<br>טעות לא פוסלת – רק מבזבזת זמן.<br>השיא שלך: <b>${best}</b></p>
      <button class="btn primary" id="go">יאללה! 🚀</button></div>`;
    $('#go').onclick = () => {
      const next = endless(pool);
      let t = 60, sc = 0, wr = 0, cur;
      const timer = setInterval(() => { t--; const el = $('#clock'); if (el) { el.textContent = t; el.parentElement.style.setProperty('--p', t / 60); } if (t <= 0) end(); }, 1000);
      cleanup = () => clearInterval(timer);
      const show = () => {
        cur = next();
        app().innerHTML = `<div class="blitzbar" style="--p:${t / 60}"><span>⏱ <b id="clock">${t}</b></span><span>✔️ ${sc}</span><span>✖️ ${wr}</span></div>
          <div class="qcard">${topicTag(cur)}${renderQuestion(cur).html}</div>`;
        app().querySelectorAll('.opt').forEach(b => b.onclick = () => {
          const ok = b.dataset.a === cur.answer; record(cur, ok);
          b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) app().querySelectorAll('.opt').forEach(x => x.dataset.a === cur.answer && x.classList.add('right'));
          ok ? sc++ : wr++;
          app().querySelectorAll('.opt').forEach(x => x.disabled = true);
          setTimeout(() => t > 0 && show(), ok ? 350 : 1100);
        });
      };
      const end = () => {
        clearInterval(timer);
        const nb = sc > store.get('blitzBest', 0); if (nb) store.set('blitzBest', sc);
        app().innerHTML = `<div class="summary"><div class="big">${nb ? '🏆' : '⏱️'}</div><h2>${nb ? 'שיא חדש!' : 'נגמר הזמן'}</h2>
          <p>${sc} נכונות • ${wr} שגויות<br>השיא: <b>${store.get('blitzBest', 0)}</b></p>
          <div class="row gap center"><button class="btn primary" id="again">שוב</button><button class="btn ghost" onclick="go('home')">לתפריט</button></div></div>`;
        $('#again').onclick = () => RUNNERS.blitz();
      };
      show();
    };
  },
};

function matchItem(input, items, found) {
  const a = normalize(input);
  if (a.length < 2) return -1;
  const stem = w => w.replace(/^[והבלמש]{1,2}(?=\S{3})/, '');
  const words = a.split(' ').filter(w => w.length > 1).map(stem);
  let bestK = -1, bestScore = 0;
  items.forEach((it, k) => {
    if (found.has(k)) return;
    const b = normalize(it);
    if (fuzzyEq(input, it)) { bestK = k; bestScore = 99; return; }
    const bw = b.split(' ').filter(w => w.length > 1).map(stem);
    // אחוז מילים מההקלדה שמופיעות בפריט (בסלחנות לשגיאת כתיב)
    const hit = words.filter(w => bw.some(x => x === w || (w.length > 3 && lev(w, x) <= 1) || (w.length >= 4 && x.startsWith(w)))).length;
    const cover = hit / Math.max(1, Math.min(bw.length, 4));
    const prec = hit / words.length;
    const score = Math.min(cover, 1) * 0.6 + prec * 0.4;
    if (prec >= 0.6 && (cover >= 0.5 || words.join('').length >= 4) && score > bestScore) { bestScore = score; bestK = k; }
  });
  return bestK;
}

/* ═════════════════════ חומר לימוד ═════════════════════ */
function study(id) {
  setHeader('📖 חומר לימוד');
  const open = id || store.get('studyOpen', null);
  app().innerHTML = `<input class="search" id="sq" placeholder="🔎 חיפוש בחומר...">
    <div id="acc">${TOPICS.map((t, i) => `
    <details class="acc" data-id="${t.id}" ${open === t.id ? 'open' : ''}>
      <summary>${t.icon} ${i + 1}. ${t.name}</summary>
      <div class="acc-body">
        ${(t.pairs || []).map(g => `<h4>${esc(g.title)}</h4><dl>${g.items.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`).join('')}
        ${(t.lists || []).map(l => `<h4>${esc(l.title)}</h4><${l.ordered ? 'ol' : 'ul'}>${l.items.map(x => `<li>${esc(x)}</li>`).join('')}</${l.ordered ? 'ol' : 'ul'}>`).join('')}
        ${(t.facts || []).length ? `<h4>היגדים חשובים</h4><ul class="facts">${t.facts.map(f => `<li>${esc(f).replace(/\[\[(.+?)\]\]/g, (_, r) => `<mark>${r.split('|')[0]}</mark>`)}</li>`).join('')}</ul>` : ''}
        ${(t.tf || []).filter(x => x.e).length ? `<h4>שים לב – מלכודות נפוצות</h4><ul>${t.tf.filter(x => x.e).map(x => `<li>${esc(x.e)}</li>`).join('')}</ul>` : ''}
      </div>
    </details>`).join('')}</div>`;
  app().querySelectorAll('details').forEach(d => d.ontoggle = () => d.open && store.set('studyOpen', d.dataset.id));
  $('#sq').oninput = e => {
    const v = e.target.value.trim();
    app().querySelectorAll('details').forEach(d => {
      const hit = !v || d.textContent.includes(v);
      d.style.display = hit ? '' : 'none';
      if (v && hit) d.open = true;
    });
  };
}

/* ═════════════════════ סטטיסטיקה ═════════════════════ */
function stats() {
  setHeader('📊 ההתקדמות שלי');
  const s = store.get('stats', {});
  const m = store.get('mistakes', {});
  const mByT = {}; BANK.forEach(q => { if (m[q.id]) mByT[q.topic] = (mByT[q.topic] || 0) + 1; });
  const rows = TOPICS.map(t => ({ t, a: s[t.id]?.a || 0, c: s[t.id]?.c || 0 }));
  const weak = rows.filter(r => r.a >= 5).sort((x, y) => x.c / x.a - y.c / y.a).slice(0, 3);
  app().innerHTML = `
    ${weak.length ? `<div class="qcard"><b>💡 כדאי לחזור על:</b> ${weak.map(r => `${r.t.icon} ${r.t.name}`).join(' • ')}</div>` : ''}
    <div class="stats">${rows.map(r => {
      const p = r.a ? Math.round(100 * r.c / r.a) : 0;
      return `<div class="st-row"><div class="st-name">${r.t.icon} ${r.t.name}</div>
        <div class="bar"><div style="width:${p}%;background:${p >= 80 ? 'var(--ok)' : p >= 60 ? 'var(--warn)' : 'var(--bad)'}"></div></div>
        <div class="st-num">${r.a ? p + '%' : '—'} <span class="muted small">(${r.c}/${r.a})${mByT[r.t.id] ? ` • 🔁${mByT[r.t.id]}` : ''}</span></div></div>`;
    }).join('')}</div>
    <p class="muted small">שיא בליץ: ${store.get('blitzBest', 0)}</p>
    <button class="btn ghost" id="reset">איפוס כל הנתונים</button>`;
  $('#reset').onclick = e => {
    const b = e.currentTarget;
    if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'בטוח? הקש שוב כדי למחוק הכל'; b.classList.add('bad'); return; }
    try { ['stats', 'mistakes', 'total', 'blitzBest'].forEach(k => localStorage.removeItem('nachshon_' + k)); } catch {}
    stats();
  };
}

/* ═════════════════════ הפעלה ═════════════════════ */
$('#hdr-back').onclick = () => go('home');
const start = location.hash.slice(1);
go(start && (RUNNERS[start] || ['study', 'stats', 'topics'].includes(start)) ? start : 'home');
