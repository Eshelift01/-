/*
 * „המבחן האמיתי” – שאלות מתוך סקירת המבחן המסכם.
 * סוגים: single (תשובה אחת), multi (כמה תשובות), order (סידור במספרים), match (התאמה)
 * correct: אינדקס (single) / מערך אינדקסים (multi) / לכל פריט – המיקום הנכון (order) / לכל פריט – אינדקס בתוך choices (match)
 */
const REAL_EXAM = [
  { n: 1, topic: 'independence', type: 'single', reconstructed: true,
    q: 'באיזה תאריך חתם דוד בן גוריון על ״פקודת צבא הגנה לישראל״ (הקמת צה״ל)?',
    options: ['14.05.1948', '29.11.1947', '26.05.1948', '15.05.1948'], correct: 2,
    e: 'צה״ל הוקם כשבועיים לאחר קום המדינה – ב-26 במאי 1948. (השאלה שוחזרה – בתמונה נראתה רק התשובה)' },
  { n: 2, topic: 'yiud', type: 'single',
    q: 'מה ההבדל בין רוח צה״ל למגילת צה״ל?',
    options: ['מגילת צה״ל מהווה קוד אתי וערכי, רוח צה״ל מהווה את ייחודו של צה״ל בקרב צבאות שונים', 'אין הבדל – זה אותו המסמך', 'שניהם נכתבו בעקבות אירועים שונים במדינה', 'רוח צה״ל הוא קוד אתי, ומגילת צה״ל הינה תיאור דמותו, ייעודו וייחודו של צה״ל'],
    correct: 3 },
  { n: 3, topic: 'ruach', type: 'single',
    q: 'במהלך סיור שגרתי של כוח חי״ר בגבול לבנון, נצפה ריכוז של אזרחים הנראים ככוח חיזבאללה, אשר הגיעו לגדר ופתחו בקריאות ״אללה אכבר״. לאחר זמן מה החלו לזרוק אבנים על הכוח, ואחד הפעילים צילם כל העת את החיילים. כוח צה״ל נשאר מול הפעילים, בתחילה ללא תגובה. לאחר רבע שעה ללא שינוי במצב, אחד החיילים מכוון את נשקו לכיוון הפעילים ומאיים לירות. מפקד הכוח מורה לו להוריד את הנשק, אך החייל לא נשמע לו. בתגובה, אחד הפעילים ירה לעבר הכוח והתפתח קרב יריות, עד להגעת כוח של צבא לבנון שהתקרב לשני הכוחות עד שפסקה האש. כתוצאה מהירי אחד החיילים נפגע קל מרסיסים ופונה לבית החולים. לאחר שעה קלה פורסם ברשתות סרטון ערוך בו חיזבאללה מציג כי צה״ל פוגע באזרחים חפים מפשע.\n\nבחר אילו ערכים מתוך רוח צה״ל נפגעו באירוע?',
    options: ['כבוד האדם, אחריות, דבקות במשימה וחתירה לניצחון', 'טוהר הנשק, מקצועיות ומשמעת', 'חיי אדם, משמעת ושליחות', 'אמינות, רעות וטוהר הנשק'],
    correct: 1,
    e: 'החייל איים בנשקו שלא לצורך (טוהר הנשק), לא פעל באופן מקצועי, ולא ציית להוראת המפקד (משמעת).' },
  { n: 4, topic: 'peoplearmy', type: 'single',
    q: 'מגפת הקורונה פרצה בשנת 2020. יחידות רבות נדרשו לביצוע משימות מגוונות. מחלקתך קיבלה משימה לחלק מארזי מזון לתושבי בני ברק בעת הסגר. חלק מחיילי היחידה מחו נגד המשימה ולא הבינו מדוע הם נשלחים לבצעה ולא עמותות אזרחיות, מכיוון שהדבר נראה להם חורג לגמרי ממשימתם הצבאית.\n\nבחר את העיקרון של צבא העם אשר בשמו נשלחה מחלקתך למשימה זו (שים לב – חלק מהתשובות אינן לקוחות מעקרונות צבא העם).',
    options: ['עקרון שיקול הדעת', 'עקרון ביצוע משימות חברתיות לאומיות', 'עקרון הממלכתיות', 'עקרון האחידות ושוויון ההזדמנויות'],
    correct: 1 },
  { n: 5, topic: 'mamlachtiut', type: 'single',
    q: 'מה אומר עקרון האחריות בהקשר לממלכתיות צבאית?',
    options: ['החייל יהיה אחראי לציודו האישי במרחב הציבורי', 'החייל יראה עצמו אחראי על הצגת דעותיו הפוליטיות במרחב הצבאי', 'החייל יראה עצמו בעל אחריות משותפת ואישית לביצוע משימת יחידתו', 'המפקד יראה עצמו אחראי לחייליו גם כאשר הם בחופשה בבית'],
    correct: 2, e: 'עקרון האחריות – אחריות אישית ואחריות משותפת לצבא.' },
  { n: 6, topic: 'leader', type: 'single',
    q: 'מדוע על המפקד להיות מודע לחוזקותיו וחולשותיו?',
    options: ['כדי לעזור לפקודיו לעבוד על נקודות החולשה שלהם בהתאם לאירועים שחווה', 'כדי לעורר מוטיבציה בפקודיו', 'כדי לדעת אילו משימות יוכל לבצע ואילו לא', 'כדי לנצל את יכולותיו בצורה הטובה ביותר לטובת ביצוע משימתו'],
    correct: 3 },
  { n: 7, topic: 'war', type: 'single',
    q: 'איזה מונח מתאר את הגורמים השותפים במלחמה באומה?',
    options: ['משולש קלאוזביץ׳', 'מרובע השריון', 'מעגל הפו״ש', 'מקביליות הכוחות'], correct: 0 },
  { n: 8, topic: 'war', type: 'single',
    q: 'מהם שלושת מרכיבי ״משולש קלאוזביץ׳״?',
    options: ['הדרג המדיני, העם ולוחמיו והדרג הצבאי', 'הדרג המדיני, הקונצנזוס והעם והפוליטיקה', 'הדרג הצבאי, החוסן החברתי והדרג המדיני'], correct: 0 },
  { n: 9, topic: 'officer', type: 'single',
    q: 'מהן החובות הנגזרות מהגדרת הקצין?',
    options: ['ליזום, לפקד, לתרום, לייצג, להוביל ולבצע', 'ללמד, לחנך, ליזום, לבקר, להחליט ולמדוד', 'לפקד, להחליט, ליזום, להנהיג, לבצע ולבקר', 'ליזום, ללמוד, להכין, להחליט, להוביל ולבצע'],
    correct: 3 },
  { n: 10, topic: 'mentoring', type: 'match',
    q: 'התאם בין סוג החניכה להגדרתו',
    items: ['חניכה לתפקיד', 'חניכה לביצוע'],
    choices: ['בחינת ״הפאזל השלם״: תכלול עבודה של מיומנויות, תפיסות, נורמות והתנהגויות של הנחנך', 'על מיומנויות בודדות, מוטוריות או חשיבתיות, פשוטות או מורכבות', 'על מיומנות להעברת שיעור, הקשבה ותנועות גוף'],
    correct: [0, 1] },
  { n: 11, topic: 'tahkir', type: 'single',
    q: 'מהי מטרת הבדיקה לרוחב בתחקיר?',
    options: ['לקבוע אם הכשל נקודתי או מערכתי', 'אין מטרה', 'לקבוע עד כמה המפקדים יודעים על הנעשה ביחידותיהם', 'לקבוע את הגורם הישיר לתאונה'], correct: 0 },
  { n: 12, topic: 'tahkir', type: 'single',
    q: 'בעת שעושים תחקיר ערכי, בעזרת איזה מסמך תיעשה הגדרת הסעיף ״מה היה צריך להיות?״',
    options: ['מגילת העצמאות', 'רוח צה״ל', 'ייעוד וייחוד', 'כרכי בטיחות'], correct: 1 },
  { n: 13, topic: 'driving', type: 'single',
    q: 'הינך קצין לוגיסטיקה בבסיס במרכז הארץ. במהלך היום ניגש אליך נהג ומבקש שתתדרך אותו לצורך נסיעה לבסיס קרוב. מה עליך לעשות?',
    options: ['רק מפקד ישיר יכול לתדרך משימה', 'אסור בשום אופן לתדרך את הנהג ללא הכרת המשימה, על כל מרכיביה', 'אין בעיה לתדרך את הנהג, אך רק מכרטיס העבודה, ולוודא ערנות של הנהג ותקינות הרכב', 'עליך לברר את משך הנסיעה – אם הוא פחות משעה ניתן לתדרך על פי כרטיס העבודה'],
    correct: 1 },
  { n: 14, topic: 'risk', type: 'single',
    q: 'מהי הגדרת הבטיחות?',
    options: ['עיסוק יום-יומי בתחקור תאונות', 'מכלול הפעולות שתכליתן קיום רמת סיכונים סבירה לאור המטרה', 'אף תשובה אינה נכונה', 'פעילות יזומה וקיום בקרה לאיתור והסרת גורמי סיכון'], correct: 1 },
  { n: 15, topic: 'pashcycle', type: 'single',
    q: 'ניהול קרב הינו:',
    options: ['שלב הערכת המצב ושלב מתן הפקודה', 'מכלול הפעולות שהמפקד והמטה נוקטים בלחימה מראשיתה ועד סופה', 'נוהל תכנון והכנות של מבצע לחימה', 'המפקד בשטח אשר מחלק פקודות לפקודיו'], correct: 1 },
  { n: 16, topic: 'pashcycle', type: 'multi',
    q: 'במצב בו לא ניתן לקיים נוה״ק סדור, נקיים נוה״ק חפוז. על אילו שלבים לא נוותר בנוה״ק חפוז? סמן ארבע תשובות נכונות',
    options: ['קבלת פקודה ולימודה', 'קביעת התוכנית והפיכתה לפקודה', 'מסירת הפקודה', 'מסדרים', 'הערכת מצב'], correct: [0, 1, 2, 4] },
  { n: 17, topic: 'pashcycle', type: 'single',
    q: 'השלם: בשלב ______ המפקד מקבל את ______, וכך מאפשר לו ______',
    options: ['תמונת המצב | הפקודה ממפקדו | לבצעה באופן הטוב ביותר', 'תמונת המצב | המידע אודות הנעשה בשטח | לקבל החלטות באופן מושכל', 'היישום והבקרה | הפקודה ממפקדו | להורידה לחייליו'], correct: 1 },
  { n: 18, topic: 'defattack', type: 'single',
    q: 'מה תפקידו של הכוח שמבצע את המשימה העיקרית?',
    options: ['מודיעין עדכני ורצוף, גורל המערכה בידיו, פיזור המאמץ', 'סיוע אש ומבצעי אש, דבקות במשימה לאור המטרה, צק״ח', 'הפתעה, שמירת התנופה – רציפות והמשכיות, בחירת יעדים וצירים', 'כל התשובות נכונות'], correct: 2 },
  { n: 19, topic: 'defattack', type: 'multi',
    q: 'מהן הנחות היסוד (או מרכיביהן) לצורת קרב הגנה? בחר 3 תשובות נכונות',
    options: ['המגן יופתע בעיתוי ובמיקום התקיפה', 'למגן יתרון במרחב ההשהייה והתמרון', 'חזקה על קו המגע שייפרץ', 'ההגנה היא צורת הקרב החזקה, והיא לבדה אינה יכולה להכריע', 'ההיערכות להגנה ניידת היא כשהשטח לא מאפשר תמרון'],
    correct: [0, 2, 3], e: '״המגן יופתע בעיתוי ובמיקום״ – נובע מכך שאפשרויות הפעולה של התוקף רבות (היוזמה בידיו).' },
  { n: 20, topic: 'defattack', type: 'multi',
    q: 'בחר את כל עקרונות ההגנה',
    options: ['תחבולה', 'עומק ועתודה', 'בחירת שטחים להגנה', 'חתירה למגע', 'היקפיות והדדיות'], correct: [1, 2, 4] },
  { n: 21, topic: 'defattack', type: 'single',
    q: 'סמן את התשובה המכילה עקרונות התקפה בלבד',
    options: ['הפתעה, שמירת התנופה – רציפות והמשכיות, בחירת יעדים וצירים', 'כל התשובות נכונות', 'מודיעין עדכני ורצוף, גורל המערכה בידיו, פיזור המאמץ', 'סיוע אש ומבצעי אש, דבקות במשימה לאור המטרה, צק״ח'], correct: 0 },
  { n: 22, topic: 'defattack', type: 'single',
    q: 'מה ייעוד העתודה בהתקפה?',
    options: ['עיבוי מערך הגנתי', 'שמירת תנופת ההתקפה ורציפות הלחימה', 'ניצול הצלחה והזדמנויות', 'תשובות ב + ג נכונות'], correct: 3 },
  { n: 23, topic: 'defattack', type: 'single',
    q: 'ניתן להכריע את הקרב בעזרת פעולת הגנה בלבד',
    options: ['לא נכון', 'נכון'], correct: 0 },
  { n: 24, topic: 'warprinciples', type: 'single',
    q: 'מדוע יש צורך בעקרונות המלחמה?',
    options: ['כדי לתת כלים למפקדים כיצד להשיג ניצחון', 'כדי שיהיה בסיס זהה לחשיבה ולעשייה צבאית', 'כדי לצמצם את מערכת קבלת ההחלטות בשטח', 'כדי לתרגל לחימות מסוגים שונים'], correct: 1 },
  { n: 25, topic: 'warprinciples', type: 'single',
    q: 'אלו מאפיינים מביאים לידי ביטוי את עקרון המלחמה ״עומק ועתודה״?',
    options: ['שינוי גובה בתנאי הקרקע', 'שטח, כוח ומוטיבציה', 'שטח, כוח, זמן ומרחב', 'תחבולה, שטח וזמן'], correct: 2 },
  { n: 26, topic: 'warprinciples', type: 'single',
    q: 'כאשר אנו במהלך התקפה ומצליחים לפגוע בצורה יעילה באויב, על סמך אילו עקרונות נבסס את המשך הפעולה שלנו?',
    options: ['ריכוז המאמץ ופשטות', 'יוזמה והתקפיות, רציפות והמשכיות', 'מיצוי הכוח ואבטחה', 'רוח הלחימה ודבקות במשימה לאור המטרה'], correct: 1 },
  { n: 27, topic: 'risk', type: 'order',
    q: 'סדר לפי הסדר הכרונולוגי את שלבי תהליך ניהול הסיכונים',
    items: ['פיקוח', 'הפקת לקחים', 'תחקיר', 'יישום', 'הערכה', 'החלטה', 'איתור'],
    correct: [5, 7, 6, 4, 2, 3, 1] },
  { n: 28, topic: 'risk', type: 'single',
    q: 'לפי החומר הנלמד בשיעור ניהו״ס – מה נגזר ממה?',
    options: ['הסכנה נגזרת מהסיכון', 'הסכנה והסיכון אינם נגזרים אחד מהשני', 'הסיכון נגזר מהסכנה', 'הסיכון והסכנה זהים'], correct: 2,
    e: 'סכנה = בור; סיכון = האפשרות ליפול לבור. הסיכון נגזר מהסכנה.' },
  { n: 29, topic: 'fivefactors', type: 'multi',
    q: 'לפי החומר הנלמד בשיעור חמשת הגורמים – למה משמשים חמשת הגורמים בבטיחות? בחר 2 תשובות נכונות',
    options: ['לניתוח סיכונים לפני פעילות', 'לביצוע תחקיר בסיום פעילות', 'לכתיבת תיק תרגיל', 'לבחינת הרמה המקצועית של החיילים'], correct: [0, 1] },
  { n: '29ב', topic: 'fivefactors', type: 'single',
    q: 'במהלך פעילות ODT חייל טיפס על עמוד חשמל בניסיון לכוון את הקבוצה ולעמוד במשימה. המפקד לא הגדיר נהלי בטיחות לפני הפעילות ולא נכח בעת המעשה. איזה מבין חמשת הגורמים גרם לאירוע?',
    options: ['פיקוד ושליטה (management)', 'אדם (man)', 'אמל״ח (machine)', 'משימה (mission)'], correct: 0 },
  { n: 30, topic: 'gold', type: 'single',
    q: 'מהו הדגש החשוב ביותר בהתמודדות עם פגיעת אקלים?',
    options: ['מדידת חום רקטלי בהקדם', 'הפשטה מלאה', 'מניעה – ניהול סיכונים', 'חבירה לחובש'], correct: 2,
    e: 'הדרך החכמה והקלה ביותר להתמודד עם אירוע רפואי היא למנוע אותו מלכתחילה.' },
];

const HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'];

function runExam() {
  setHeader('📝 המבחן האמיתי');
  const best = store.get('examBest', null);
  app().innerHTML = `<div class="summary"><div class="big">📝</div><h2>המבחן האמיתי</h2>
    <p>${REAL_EXAM.length} שאלות מתוך המבחן המסכם, בדיוק כמו שהופיעו – בחירה יחידה, בחירה מרובה, התאמה וסידור.<br>
    ניקוד חלקי כמו במבחן. אין לבבות – אפשר לחזור כמה שרוצים.</p>
    ${best != null ? `<p>הציון הכי גבוה שלך: <b>${best}</b></p>` : ''}
    <div class="row gap center"><button class="btn primary" id="ordered">לפי סדר המבחן</button><button class="btn ghost" id="mixed">בסדר מעורבב</button></div></div>`;
  $('#ordered').onclick = () => examSession(REAL_EXAM.slice());
  $('#mixed').onclick = () => examSession(shuffle(REAL_EXAM));
}

function examSession(list) {
  setHeader('📝 המבחן האמיתי');
  let i = 0; const results = [];
  const show = () => {
    if (i >= list.length) return finish();
    const q = list[i];
    const hint = { single: 'בחר תשובה אחת', multi: `בחר ${q.correct?.length} תשובות`, order: 'קבע לכל שלב את מיקומו', match: 'בחר הגדרה לכל פריט' }[q.type];
    let body = '';
    if (q.type === 'single') body = `<div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="k">${HEB[k]}</span>${esc(o)}</button>`).join('')}</div>`;
    if (q.type === 'multi') body = `<div class="opts">${q.options.map((o, k) => `<label class="opt chk" data-k="${k}"><input type="checkbox" value="${k}"><span class="k">${HEB[k]}</span>${esc(o)}</label>`).join('')}</div><button class="btn primary block" id="chk">בדוק</button>`;
    if (q.type === 'order') body = `<div class="opts">${q.items.map((it, k) => `<div class="opt sel-row" data-k="${k}"><span class="grow">${esc(it)}</span><select data-k="${k}"><option value="">–</option>${q.items.map((_, p) => `<option>${p + 1}</option>`).join('')}</select></div>`).join('')}</div><button class="btn primary block" id="chk">בדוק</button>`;
    if (q.type === 'match') body = `<div class="opts">${q.items.map((it, k) => `<div class="opt sel-row col" data-k="${k}"><b>${esc(it)}</b><select data-k="${k}"><option value="">בחר...</option>${q.choices.map((c, p) => `<option value="${p}">${esc(c)}</option>`).join('')}</select></div>`).join('')}</div><button class="btn primary block" id="chk">בדוק</button>`;
    const got = results.reduce((a, r) => a + r, 0);
    app().innerHTML = `
      <div class="scorebar"><span>שאלה ${i + 1} / ${list.length}</span><span>ניקוד: ${got.toFixed(2).replace(/\.00$/, '')}</span></div>
      <div class="progress"><div style="width:${100 * i / list.length}%"></div></div>
      <div class="qcard"><span class="tag">שאלה ${q.n} במבחן • ${TOPIC[q.topic].icon} ${TOPIC[q.topic].name}${q.reconstructed ? ' • שוחזרה' : ''}</span>
        <div class="qtext">${esc(q.q).replace(/\n/g, '<br>')}</div><p class="muted small">${hint}</p>${body}<div id="fb"></div></div>`;
    if (q.type === 'single') app().querySelectorAll('.opt').forEach(b => b.onclick = () => grade(q, +b.dataset.k));
    else $('#chk').onclick = () => {
      if (q.type === 'multi') grade(q, [...app().querySelectorAll('input:checked')].map(x => +x.value));
      else grade(q, [...app().querySelectorAll('select')].map(s => s.value === '' ? null : +s.value));
    };
  };
  const grade = (q, ans) => {
    let score = 0;
    const rows = [...app().querySelectorAll('.opt')];
    if (q.type === 'single') {
      score = ans === q.correct ? 1 : 0;
      rows.forEach((r, k) => { r.disabled = true; if (k === q.correct) r.classList.add('right'); else if (k === ans) r.classList.add('wrong'); });
    } else if (q.type === 'multi') {
      const good = ans.filter(k => q.correct.includes(k)).length, bad = ans.length - good;
      score = Math.max(0, (good - bad) / q.correct.length);
      rows.forEach((r, k) => {
        r.querySelector('input').disabled = true;
        if (q.correct.includes(k)) r.classList.add(ans.includes(k) ? 'right' : 'missed');
        else if (ans.includes(k)) r.classList.add('wrong');
      });
    } else {
      let ok = 0;
      rows.forEach((r, k) => {
        const s = r.querySelector('select'); s.disabled = true;
        const right = ans[k] === q.correct[k]; if (right) ok++;
        r.classList.add(right ? 'right' : 'wrong');
        if (!right) r.insertAdjacentHTML('beforeend', `<div class="small fixline">✔ ${q.type === 'order' ? 'מיקום ' + q.correct[k] : esc(q.choices[q.correct[k]])}</div>`);
      });
      score = ok / q.items.length;
    }
    $('#chk')?.remove();
    results[i] = score;
    const full = score === 1;
    $('#fb').innerHTML = `<div class="fb ${full ? 'ok' : 'bad'}"><div class="fb-title">${full ? 'נכון! ✅' : score > 0 ? `נכון באופן חלקי (${score.toFixed(2)})` : 'לא נכון ❌'}</div>
      ${!full && q.type === 'single' ? `<div>התשובה הנכונה: <b>${HEB[q.correct]}. ${esc(q.options[q.correct])}</b></div>` : ''}
      ${!full && q.type === 'multi' ? `<div>התשובות הנכונות: <b>${q.correct.map(k => esc(q.options[k])).join(' • ')}</b></div>` : ''}
      ${q.e ? `<div class="explain">💡 ${esc(q.e)}</div>` : ''}</div>
      <button class="btn primary block" id="nx">${i + 1 < list.length ? 'לשאלה הבאה ⬅' : 'לציון ⬅'}</button>`;
    $('#nx').onclick = () => { i++; show(); };
    $('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const finish = () => {
    const tot = results.reduce((a, r) => a + r, 0);
    const grade100 = Math.round(100 * tot / list.length);
    const full = list.length === REAL_EXAM.length;
    if (full && grade100 > (store.get('examBest', -1))) store.set('examBest', grade100);
    const wrong = list.filter((q, k) => results[k] < 1);
    app().innerHTML = `<div class="summary"><div class="big">${grade100 >= 90 ? '🏆' : grade100 >= 70 ? '💪' : '📚'}</div>
      <h2>ציון: ${grade100}</h2><p>${tot.toFixed(2).replace(/\.00$/, '')} נקודות מתוך ${list.length}</p>
      ${wrong.length ? `<p class="muted">טעית/חלקי בשאלות: ${wrong.map(q => q.n).join(', ')}</p>` : '<p>מושלם! 🎉</p>'}
      <div class="row gap center">
        ${wrong.length ? `<button class="btn primary" id="w">תרגל רק את הטעויות (${wrong.length})</button>` : ''}
        <button class="btn ghost" id="r">מבחן מחדש</button><button class="btn ghost" onclick="go('home')">לתפריט</button></div></div>`;
    if (wrong.length) $('#w').onclick = () => examSession(wrong);
    $('#r').onclick = runExam;
  };
  show();
}
