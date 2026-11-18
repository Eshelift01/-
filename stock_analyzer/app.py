"""אפליקציית ניתוח מניות – הרצה: streamlit run app.py"""
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components

from analyzer.charts import price_chart, tradingview_widget
from analyzer.config import BUYER_WIN_WINDOW, SECTORS, SMA_WINDOW, SOURCES_NOTE, all_tickers
from analyzer.data import tradingview_symbol
from analyzer.fundamentals import statements_table
from analyzer.michastocks import get_opinion
from analyzer.scoring import analyze_ticker

st.set_page_config(page_title="מנתח מניות", page_icon="📈", layout="wide")
st.markdown("""
<style>
  .stApp, .stMarkdown, .stTabs, section[data-testid="stSidebar"] { direction: rtl; text-align: right; }
  .js-plotly-plot, iframe { direction: ltr; }
  .verdict { padding: 18px; border-radius: 12px; color: white; text-align: center; }
  .verdict h2 { color: white; margin: 0; }
</style>""", unsafe_allow_html=True)


@st.cache_data(ttl=3600, show_spinner=False)
def cached_analysis(ticker: str, period: str):
    r = analyze_ticker(ticker, period)
    return r


@st.cache_data(ttl=6 * 3600, show_spinner=False)
def cached_opinion(ticker: str, company: str):
    return get_opinion(ticker, company)


TICKERS = all_tickers()

# ---------------- סרגל צד ----------------
st.sidebar.title("📈 מנתח מניות")
mode = st.sidebar.radio("מצב", ["ניתוח חברה", "סורק סקטורים"])
period = st.sidebar.selectbox("טווח היסטוריה", ["1y", "2y", "5y"], index=1)
st.sidebar.caption(SOURCES_NOTE)
st.sidebar.warning("המידע באפליקציה הוא לצורכי מחקר בלבד ואינו מהווה ייעוץ השקעות.")


def render_company(ticker: str):
    company, sector = TICKERS.get(ticker, (ticker, "—"))
    with st.spinner(f"מושך נתונים עבור {ticker} מ-Yahoo Finance..."):
        try:
            r = cached_analysis(ticker, period)
        except Exception as e:
            st.error(f"שגיאה בשליפת נתונים: {e}")
            return
    info = r["bundle"]["info"]
    company = info.get("longName") or company
    fin, tech, fund, an = r["final"], r["tech"], r["fund"], r["analysts"]

    st.header(f"{company} ({ticker})")
    st.caption(f"סקטור: {sector} · {info.get('industry', '')} · "
               f"[Yahoo Finance](https://finance.yahoo.com/quote/{ticker}) · "
               f"[TradingView](https://www.tradingview.com/symbols/{tradingview_symbol(ticker, info).replace(':', '-')}/)")

    c1, c2, c3, c4, c5 = st.columns(5)
    with c1:
        st.markdown(f"<div class='verdict' style='background:{fin['color']}'><div>המלצה</div>"
                    f"<h2>{fin['label']}</h2><div>ציון {fin['score']}/100</div></div>",
                    unsafe_allow_html=True)
    c2.metric("מחיר אחרון", f"{tech['close']:,.2f} {info.get('currency', '')}")
    c3.metric(f"ממוצע {SMA_WINDOW} יום", f"{tech['sma']:,.2f}" if tech["sma"] else "—",
              f"{(tech['close'] / tech['sma'] - 1) * 100:+.1f}%" if tech["sma"] else None)
    c4.metric(f"ניצחון קונים ({BUYER_WIN_WINDOW} יום)",
              f"{tech['buyer_win']:.1f}%" if tech["buyer_win"] else "—",
              f"{tech['buyer_win'] - 50:+.1f} מול 50%" if tech["buyer_win"] else None)
    c5.metric("קונצנזוס אנליסטים", an["key"],
              f"יעד {an['upside']:+.1f}%" if an["upside"] is not None else None)

    tabs = st.tabs(["📊 גרפים", "🧮 ניתוח והמלצה", "📑 דוחות כספיים", "🎥 מיכה סטוקס"])

    with tabs[0]:
        st.plotly_chart(price_chart(r["hist"], ticker), width="stretch")
        st.caption(f"**ניצחון הקונים על המוכרים**: אחוז ימי המסחר ב-{BUYER_WIN_WINDOW} הימים האחרונים "
                   "שבהם מחיר הסגירה היה גבוה ממחיר הפתיחה (נר ירוק). מעל 50% – הקונים שולטים. "
                   "הקו המקווקו הוא אותו מדד משוקלל לפי נפח המסחר.")
        with st.expander("גרף TradingView אינטראקטיבי"):
            components.html(tradingview_widget(tradingview_symbol(ticker, info)), height=620)

    with tabs[1]:
        p = fin["parts"]
        cols = st.columns(3)
        cols[0].metric("ציון טכני", f"{p['technical']:.0f}/100")
        cols[1].metric("ציון דוחות כספיים", f"{p['fundamental']:.0f}/100")
        cols[2].metric("ציון אנליסטים", f"{p['analysts']:.0f}/100" if p["analysts"] is not None else "—")
        st.subheader("ניתוח טכני")
        for n in tech["notes"]:
            st.markdown(f"- {n}")
        st.subheader("אנליסטים (Yahoo Finance)")
        if an["mean"]:
            st.markdown(f"- המלצה ממוצעת: **{an['key']}** ({an['mean']:.2f} בסולם 1=קנייה חזקה עד 5=מכירה), "
                        f"{an['n'] or '?'} אנליסטים")
        if an["target"]:
            st.markdown(f"- מחיר יעד ממוצע: **{an['target']:,.2f}** ({an['upside']:+.1f}% מהמחיר הנוכחי)")
        rec = r["bundle"]["recommendations"]
        if isinstance(rec, pd.DataFrame) and not rec.empty:
            st.dataframe(rec.rename(columns={"period": "תקופה", "strongBuy": "קנייה חזקה", "buy": "קנייה",
                                             "hold": "החזק", "sell": "מכירה", "strongSell": "מכירה חזקה"}),
                         hide_index=True)

    with tabs[2]:
        st.subheader("ניתוח הדוחות הכספיים שפורסמו")
        a, b = st.columns(2)
        with a:
            st.markdown("**נקודות חוזק**")
            for x in fund["pros"] or ["—"]:
                st.markdown(f"- ✅ {x}")
        with b:
            st.markdown("**נקודות חולשה**")
            for x in fund["cons"] or ["—"]:
                st.markdown(f"- ⚠️ {x}")
        st.markdown("**נתוני מפתח**")
        for x in fund["facts"]:
            st.markdown(f"- {x}")
        q = st.radio("תצוגה", ["רבעוני", "שנתי"], horizontal=True)
        tbl = statements_table(r["bundle"], quarterly=(q == "רבעוני"))
        if tbl.empty:
            st.info("אין נתוני דוחות זמינים")
        else:
            st.dataframe(tbl, width="stretch")

    with tabs[3]:
        st.subheader("חוות הדעת של מיכה סטוקס")
        with st.spinner("מחפש בערוץ היוטיוב של מיכה סטוקס..."):
            op = cached_opinion(ticker, company)
        if op["manual"]:
            m = op["manual"]
            st.success(f"**חוות דעת ({m.get('date', '')})**: {m.get('opinion', '')}")
            if m.get("video"):
                st.markdown(f"[לסרטון]({m['video']})")
        if op["videos"]:
            for v in op["videos"]:
                tone = f" · טון משוער: **{v['tone']}**" if v.get("tone") else ""
                st.markdown(f"#### [{v['title']}]({v['url']})")
                st.caption(f"פורסם {v['published']}{tone}")
                for s in v["snippets"]:
                    st.markdown(f"> {s}")
            st.caption("הציטוטים נלקחים אוטומטית מהכתוביות של הסרטון, והטון מוערך לפי מילות מפתח – "
                       "מומלץ לצפות בסרטון עצמו לפני קבלת החלטה.")
        elif not op["manual"]:
            st.info("לא נמצא סרטון עדכני של מיכה סטוקס שעוסק בחברה הזו.")
        if op["error"]:
            st.warning(op["error"])


def render_scanner():
    st.header("🔎 סורק סקטורים")
    sectors = st.multiselect("סקטורים", list(SECTORS), default=list(SECTORS))
    if not st.button("הרץ סריקה", type="primary"):
        st.info("הסריקה מושכת נתונים לכל המניות ברשימה ועשויה להימשך מספר דקות.")
        return
    rows = []
    todo = [(t, s) for s in sectors for t in SECTORS[s]]
    bar = st.progress(0.0)
    for i, (t, s) in enumerate(todo):
        try:
            r = cached_analysis(t, period)
            rows.append({"טיקר": t, "חברה": SECTORS[s][t], "סקטור": s, "המלצה": r["final"]["label"],
                         "ציון": r["final"]["score"], "טכני": round(r["tech"]["score"]),
                         "דוחות": round(r["fund"]["score"]),
                         f"ניצחון קונים {BUYER_WIN_WINDOW}": r["tech"]["buyer_win"],
                         f"מרחק מממוצע {SMA_WINDOW}%": (r["tech"]["close"] / r["tech"]["sma"] - 1) * 100
                         if r["tech"]["sma"] else None,
                         "אנליסטים": r["analysts"]["key"]})
        except Exception as e:
            rows.append({"טיקר": t, "חברה": SECTORS[s][t], "סקטור": s, "המלצה": f"שגיאה: {e}"})
        bar.progress((i + 1) / len(todo))
    df = pd.DataFrame(rows).sort_values("ציון", ascending=False)
    st.dataframe(df, hide_index=True, width="stretch",
                 column_config={"ציון": st.column_config.ProgressColumn(min_value=0, max_value=100),
                                f"ניצחון קונים {BUYER_WIN_WINDOW}": st.column_config.NumberColumn(format="%.1f%%"),
                                f"מרחק מממוצע {SMA_WINDOW}%": st.column_config.NumberColumn(format="%+.1f%%")})


if mode == "ניתוח חברה":
    sector = st.sidebar.selectbox("סקטור", list(SECTORS))
    options = [f"{t} – {n}" for t, n in SECTORS[sector].items()]
    choice = st.sidebar.selectbox("חברה", options)
    custom = st.sidebar.text_input("או הקלד טיקר אחר (לפי Yahoo Finance)", "").strip().upper()
    render_company(custom or choice.split(" – ")[0])
else:
    render_scanner()
