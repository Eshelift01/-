"""ניתוח הדוחות הכספיים שפורסמו (רווח והפסד, מאזן, תזרים מזומנים)."""
from __future__ import annotations

import math

import pandas as pd


def _row(df: pd.DataFrame, *names: str) -> pd.Series | None:
    if df is None or df.empty:
        return None
    for n in names:
        if n in df.index:
            s = pd.to_numeric(df.loc[n], errors="coerce")
            s = s[~s.index.duplicated()].sort_index(ascending=False).dropna()
            if not s.empty:
                return s
    return None


def _pct(a, b):
    if a is None or b is None or b == 0 or any(map(lambda x: isinstance(x, float) and math.isnan(x), (a, b))):
        return None
    return (a / abs(b) - 1) * 100


def _fmt_money(v) -> str:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "—"
    a = abs(v)
    for div, suf in ((1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")):
        if a >= div:
            return f"{v / div:,.2f}{suf}"
    return f"{v:,.0f}"


def statements_table(bundle: dict, quarterly: bool = True) -> pd.DataFrame:
    """טבלת סיכום של שורות מפתח מהדוחות לתצוגה."""
    inc = bundle["income_q" if quarterly else "income_a"]
    bal = bundle["balance_q" if quarterly else "balance_a"]
    cf = bundle["cash_q" if quarterly else "cash_a"]
    rows = {
        "הכנסות": _row(inc, "Total Revenue", "Operating Revenue"),
        "רווח גולמי": _row(inc, "Gross Profit"),
        "רווח תפעולי": _row(inc, "Operating Income"),
        "רווח נקי": _row(inc, "Net Income", "Net Income Common Stockholders"),
        "רווח למניה (מדולל)": _row(inc, "Diluted EPS"),
        "תזרים מפעילות שוטפת": _row(cf, "Operating Cash Flow"),
        "תזרים חופשי (FCF)": _row(cf, "Free Cash Flow"),
        "מזומנים": _row(bal, "Cash And Cash Equivalents",
                        "Cash Cash Equivalents And Short Term Investments"),
        "חוב כולל": _row(bal, "Total Debt"),
        "הון עצמי": _row(bal, "Stockholders Equity", "Common Stock Equity"),
    }
    data = {k: v for k, v in rows.items() if v is not None}
    if not data:
        return pd.DataFrame()
    table = pd.DataFrame(data).T
    table = table[sorted(table.columns, reverse=True)[:5]]
    table.columns = [c.strftime("%Y-%m") if hasattr(c, "strftime") else str(c) for c in table.columns]
    return table.map(lambda v: (f"{v:.2f}" if abs(v) < 100 else _fmt_money(v)) if pd.notna(v) else "—")


def analyze_fundamentals(bundle: dict) -> dict:
    """מחזיר ציון פונדמנטלי 0-100 + נקודות חוזק/חולשה בעברית."""
    info = bundle.get("info") or {}
    inc_q, inc_a = bundle["income_q"], bundle["income_a"]
    bal_q, cf_a, cf_q = bundle["balance_q"], bundle["cash_a"], bundle["cash_q"]

    score, pros, cons, facts = 50.0, [], [], []

    # --- צמיחה בהכנסות ---
    rev_q = _row(inc_q, "Total Revenue", "Operating Revenue")
    rev_a = _row(inc_a, "Total Revenue", "Operating Revenue")
    if rev_q is not None and len(rev_q) >= 5:
        yoy = _pct(rev_q.iloc[0], rev_q.iloc[4])
    else:
        yoy = (info.get("revenueGrowth") or 0) * 100 if info.get("revenueGrowth") is not None else None
    if yoy is not None:
        facts.append(f"צמיחת הכנסות ברבעון האחרון לעומת אשתקד: {yoy:+.1f}%")
        if yoy > 15:
            score += 12; pros.append(f"צמיחה חזקה בהכנסות ({yoy:+.1f}% שנה על שנה)")
        elif yoy > 3:
            score += 5; pros.append(f"צמיחה מתונה בהכנסות ({yoy:+.1f}%)")
        elif yoy < -3:
            score -= 10; cons.append(f"ירידה בהכנסות ({yoy:+.1f}% שנה על שנה)")
    if rev_a is not None and len(rev_a) >= 3:
        cagr = ((rev_a.iloc[0] / rev_a.iloc[2]) ** 0.5 - 1) * 100 if rev_a.iloc[2] > 0 else None
        if cagr is not None:
            facts.append(f"צמיחה שנתית ממוצעת בהכנסות (2 שנים): {cagr:+.1f}%")

    # --- רווחיות ---
    ni_q = _row(inc_q, "Net Income", "Net Income Common Stockholders")
    if ni_q is not None and len(ni_q) >= 5:
        g = _pct(ni_q.iloc[0], ni_q.iloc[4])
        if g is not None:
            facts.append(f"שינוי ברווח הנקי ברבעון האחרון לעומת אשתקד: {g:+.1f}%")
            if g > 15:
                score += 8; pros.append("הרווח הנקי צומח בקצב גבוה")
            elif g < -15:
                score -= 8; cons.append("הרווח הנקי נשחק משמעותית")
    if ni_q is not None and len(ni_q) >= 1 and ni_q.iloc[0] < 0:
        score -= 8; cons.append("החברה מדווחת על הפסד ברבעון האחרון")

    gross = _row(inc_q, "Gross Profit")
    op = _row(inc_q, "Operating Income")
    if rev_q is not None and op is not None:
        common = rev_q.index.intersection(op.index).sort_values(ascending=False)
        if len(common) >= 1:
            m_now = op[common[0]] / rev_q[common[0]] * 100
            facts.append(f"שולי רווח תפעולי: {m_now:.1f}%")
            if m_now > 20:
                score += 6; pros.append(f"שולי רווח תפעולי גבוהים ({m_now:.1f}%)")
            elif m_now < 0:
                score -= 6; cons.append("הפסד תפעולי")
            if len(common) >= 5:
                m_prev = op[common[4]] / rev_q[common[4]] * 100
                if m_now - m_prev > 2:
                    score += 4; pros.append(f"שיפור בשולי הרווח התפעולי ({m_prev:.1f}% ← {m_now:.1f}%)")
                elif m_prev - m_now > 2:
                    score -= 4; cons.append(f"שחיקה בשולי הרווח התפעולי ({m_prev:.1f}% ← {m_now:.1f}%)")
    if rev_q is not None and gross is not None and gross.index[0] in rev_q.index:
        facts.append(f"שולי רווח גולמי: {gross.iloc[0] / rev_q[gross.index[0]] * 100:.1f}%")

    # --- מאזן ---
    debt = _row(bal_q, "Total Debt")
    eq = _row(bal_q, "Stockholders Equity", "Common Stock Equity")
    cash = _row(bal_q, "Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments")
    if debt is not None and eq is not None and eq.iloc[0] > 0:
        de = debt.iloc[0] / eq.iloc[0]
        facts.append(f"יחס חוב להון: {de:.2f}")
        if de < 0.5:
            score += 5; pros.append("מינוף נמוך (חוב נמוך ביחס להון)")
        elif de > 2:
            score -= 6; cons.append(f"מינוף גבוה (חוב/הון {de:.1f})")
    elif eq is not None and eq.iloc[0] <= 0:
        cons.append("הון עצמי שלילי"); score -= 4
    if cash is not None and debt is not None:
        net = cash.iloc[0] - debt.iloc[0]
        facts.append(f"מזומן נטו (מזומן פחות חוב): {_fmt_money(net)}")
        if net > 0:
            score += 3; pros.append("מחזיקה יותר מזומן מחוב")
    ca, cl = _row(bal_q, "Current Assets"), _row(bal_q, "Current Liabilities")
    if ca is not None and cl is not None and cl.iloc[0]:
        cr = ca.iloc[0] / cl.iloc[0]
        facts.append(f"יחס שוטף: {cr:.2f}")
        if cr < 1:
            score -= 3; cons.append(f"יחס שוטף נמוך מ-1 ({cr:.2f}) – לחץ נזילות אפשרי")

    # --- תזרים מזומנים ---
    fcf_q = _row(cf_q, "Free Cash Flow")
    fcf_a = _row(cf_a, "Free Cash Flow")
    fcf_ttm = fcf_q.iloc[:4].sum() if fcf_q is not None and len(fcf_q) >= 4 else (
        fcf_a.iloc[0] if fcf_a is not None else None)
    if fcf_ttm is not None:
        facts.append(f"תזרים מזומנים חופשי (12 חודשים): {_fmt_money(fcf_ttm)}")
        if fcf_ttm > 0:
            score += 6; pros.append("מייצרת תזרים מזומנים חופשי חיובי")
        else:
            score -= 6; cons.append("שורפת מזומנים (FCF שלילי)")
        mcap = info.get("marketCap")
        if mcap and fcf_ttm > 0:
            fy = fcf_ttm / mcap * 100
            facts.append(f"תשואת תזרים חופשי (FCF Yield): {fy:.1f}%")
            if fy > 5:
                score += 4; pros.append(f"תשואת FCF אטרקטיבית ({fy:.1f}%)")

    # --- תמחור ---
    pe, fpe, peg = info.get("trailingPE"), info.get("forwardPE"), info.get("pegRatio") or info.get("trailingPegRatio")
    if pe:
        facts.append(f"מכפיל רווח (P/E): {pe:.1f}")
    if fpe:
        facts.append(f"מכפיל רווח עתידי (Forward P/E): {fpe:.1f}")
        if pe and fpe < pe * 0.85:
            score += 3; pros.append("האנליסטים צופים צמיחה ברווחים (מכפיל עתידי נמוך מהנוכחי)")
    if peg:
        facts.append(f"PEG: {peg:.2f}")
        if 0 < peg < 1.2:
            score += 4; pros.append(f"תמחור סביר ביחס לצמיחה (PEG {peg:.2f})")
        elif peg > 3:
            score -= 4; cons.append(f"תמחור יקר ביחס לצמיחה (PEG {peg:.2f})")
    if info.get("dividendYield"):
        dy = info["dividendYield"]
        dy = dy if dy > 1 else dy * 100  # yfinance שינה פורמט בין גרסאות
        facts.append(f"תשואת דיבידנד: {dy:.2f}%")

    # --- הפתעות בדוחות האחרונים ---
    ed = bundle.get("earnings_dates")
    if isinstance(ed, pd.DataFrame) and not ed.empty and "Surprise(%)" in ed.columns:
        past = ed.dropna(subset=["Reported EPS"]).head(4)
        if not past.empty:
            beats = int((past["Surprise(%)"] > 0).sum())
            facts.append(f"עקפה את תחזית הרווח ב-{beats} מתוך {len(past)} הדוחות האחרונים")
            last = past.iloc[0]
            facts.append(f"דוח אחרון ({past.index[0]:%d/%m/%Y}): רווח למניה {last['Reported EPS']:.2f} "
                         f"מול צפי {last['EPS Estimate']:.2f} (הפתעה {last['Surprise(%)']:+.1f}%)")
            score += (beats - len(past) / 2) * 2
        future = ed[ed["Reported EPS"].isna()]
        if not future.empty:
            facts.append(f"הדוח הבא צפוי בתאריך: {future.index[-1]:%d/%m/%Y}")

    if not facts:
        facts.append("לא נמצאו נתוני דוחות כספיים ב-Yahoo Finance עבור נייר זה")

    return {"score": float(max(0, min(100, score))), "pros": pros, "cons": cons, "facts": facts}


def analyst_view(info: dict) -> dict:
    """קונצנזוס האנליסטים כפי שמפורסם ב-Yahoo Finance."""
    key = info.get("recommendationKey")
    mean = info.get("recommendationMean")  # 1=קנייה חזקה ... 5=מכירה
    n = info.get("numberOfAnalystOpinions")
    target = info.get("targetMeanPrice")
    price = info.get("currentPrice") or info.get("regularMarketPrice")
    upside = (target / price - 1) * 100 if target and price else None
    heb = {"strong_buy": "קנייה חזקה", "buy": "קנייה", "hold": "החזק",
           "underperform": "תשואת חסר", "sell": "מכירה", "strong_sell": "מכירה חזקה"}
    score = None
    if mean:
        score = max(0.0, min(100.0, (5 - mean) / 4 * 100))
        if upside is not None:
            score = max(0.0, min(100.0, score + max(-10, min(10, upside / 2))))
    return {"key": heb.get(key, key or "—"), "mean": mean, "n": n,
            "target": target, "upside": upside, "score": score}
