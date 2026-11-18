"""דוח שבועי: סורק את כל הסקטורים ומחזיר את החברות המעניינות ביותר.

הרצה ידנית:  python weekly_report.py
פלט: reports/weekly_YYYY-MM-DD.md  (+ שליחה במייל/טלגרם אם הוגדרו משתני סביבה)

משתני סביבה אופציונליים:
  SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL_TO, [SMTP_HOST=smtp.gmail.com, SMTP_PORT=465]
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
"""
from __future__ import annotations

import datetime as dt
import os
import smtplib
import sys
from email.mime.text import MIMEText
from pathlib import Path

import markdown_it
import requests

from analyzer.config import BUYER_WIN_WINDOW, SECTORS, SMA_WINDOW, SOURCES_NOTE
from analyzer.michastocks import get_opinion, latest_videos, resolve_channel_id
from analyzer.scoring import analyze_ticker

TOP_PER_SECTOR = 4


def events(hist) -> list[str]:
    """אירועים טכניים מהשבוע האחרון."""
    out = []
    sma, bw = hist[f"SMA{SMA_WINDOW}"], hist[f"BuyerWin{BUYER_WIN_WINDOW}"]
    c = hist["Close"]
    if len(hist) > 6 and sma.notna().iloc[-6]:
        if c.iloc[-6] < sma.iloc[-6] and c.iloc[-1] > sma.iloc[-1]:
            out.append(f"📈 חצתה השבוע כלפי מעלה את הממוצע ל-{SMA_WINDOW} יום")
        if c.iloc[-6] > sma.iloc[-6] and c.iloc[-1] < sma.iloc[-1]:
            out.append(f"📉 נשברה השבוע מתחת לממוצע ל-{SMA_WINDOW} יום")
    if len(hist) > 6 and bw.notna().iloc[-6]:
        if bw.iloc[-6] < 50 <= bw.iloc[-1]:
            out.append(f"🟢 מדד ניצחון הקונים ({BUYER_WIN_WINDOW} יום) עבר את 50%")
        if bw.iloc[-6] >= 50 > bw.iloc[-1]:
            out.append(f"🔴 מדד ניצחון הקונים ({BUYER_WIN_WINDOW} יום) ירד מתחת ל-50%")
    if len(hist) > 6:
        wk = (c.iloc[-1] / c.iloc[-6] - 1) * 100
        if abs(wk) >= 8:
            out.append(f"⚡ תנועה חדה השבוע: {wk:+.1f}%")
    return out


def build_report() -> tuple[str, str]:
    today = dt.date.today()
    videos, channel_id = None, None
    try:
        channel_id = resolve_channel_id()
        videos = latest_videos(channel_id) if channel_id else None
    except Exception as e:
        print("youtube:", e, file=sys.stderr)

    lines = [f"# 📈 דוח מניות שבועי – {today:%d/%m/%Y}", "",
             "החברות שכדאי להסתכל עליהן השבוע, לפי שקלול ניתוח טכני (ממוצע 90 יום, "
             f"ניצחון קונים {BUYER_WIN_WINDOW} יום), ניתוח הדוחות הכספיים וקונצנזוס האנליסטים.", ""]
    sells = []
    for sector, tickers in SECTORS.items():
        results = []
        for t, name in tickers.items():
            try:
                r = analyze_ticker(t)
                results.append((t, name, r, events(r["hist"])))
            except Exception as e:
                print(f"{t}: {e}", file=sys.stderr)
        results.sort(key=lambda x: x[2]["final"]["score"], reverse=True)
        picks = [x for x in results if x[2]["final"]["score"] >= 58][:TOP_PER_SECTOR]
        # גם מניות עם אירוע טכני משמעותי, גם אם הציון בינוני
        picks += [x for x in results if x[3] and x not in picks and x[2]["final"]["score"] >= 45][:2]
        sells += [x for x in results if x[2]["final"]["score"] < 30]

        lines += [f"## {sector}", ""]
        if not picks:
            lines += ["אין השבוע חברות שעומדות בסף.", ""]
        for t, name, r, ev in picks:
            f, tech, an, fund = r["final"], r["tech"], r["analysts"], r["fund"]
            lines.append(f"### {name} ({t}) – **{f['label']}** · ציון {f['score']}/100")
            lines.append(f"- מחיר {tech['close']:,.2f} · ממוצע {SMA_WINDOW}: "
                         f"{tech['sma']:,.2f} · ניצחון קונים {BUYER_WIN_WINDOW}: {tech['buyer_win']:.1f}%"
                         if tech["sma"] and tech["buyer_win"] else f"- מחיר {tech['close']:,.2f}")
            if an["mean"]:
                up = f", יעד {an['upside']:+.1f}%" if an["upside"] is not None else ""
                lines.append(f"- אנליסטים: {an['key']}{up}")
            for x in ev:
                lines.append(f"- {x}")
            for x in fund["pros"][:2]:
                lines.append(f"- ✅ {x}")
            for x in fund["cons"][:2]:
                lines.append(f"- ⚠️ {x}")
            if videos is not None:
                op = get_opinion(t, name, videos=videos, with_transcripts=True)
                if op["manual"]:
                    lines.append(f"- 🎥 מיכה סטוקס: {op['manual'].get('opinion', '')}")
                for v in op["videos"][:1]:
                    tone = f" (טון משוער: {v['tone']})" if v.get("tone") else ""
                    lines.append(f"- 🎥 מיכה סטוקס דיבר עליה: [{v['title']}]({v['url']}){tone}")
            lines.append(f"- [Yahoo Finance](https://finance.yahoo.com/quote/{t}) · "
                         f"[TradingView](https://www.tradingview.com/chart/?symbol={t.split('.')[0]})")
            lines.append("")
    if sells:
        lines += ["## ⚠️ חולשה – שווה לשקול מכירה/הימנעות", ""]
        for t, name, r, _ in sells:
            lines.append(f"- {name} ({t}) – {r['final']['label']}, ציון {r['final']['score']}")
        lines.append("")
    lines += ["---", SOURCES_NOTE, "", "*אין לראות בדוח זה ייעוץ השקעות.*"]
    md = "\n".join(lines)
    return f"דוח מניות שבועי – {today:%d/%m/%Y}", md


def send_email(subject: str, md: str):
    user, pwd, to = os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"), os.getenv("ALERT_EMAIL_TO")
    if not (user and pwd and to):
        return
    html = f'<div dir="rtl" style="font-family:Arial">{markdown_it.MarkdownIt().render(md)}</div>'
    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"], msg["From"], msg["To"] = subject, user, to
    with smtplib.SMTP_SSL(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", 465))) as s:
        s.login(user, pwd)
        s.sendmail(user, [x.strip() for x in to.split(",")], msg.as_string())
    print("email sent")


def send_telegram(md: str):
    token, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return
    for i in range(0, len(md), 3900):  # מגבלת אורך הודעה
        requests.post(f"https://api.telegram.org/bot{token}/sendMessage", timeout=20,
                      data={"chat_id": chat, "text": md[i:i + 3900], "disable_web_page_preview": True})
    print("telegram sent")


if __name__ == "__main__":
    subject, md = build_report()
    out = Path(__file__).parent / "reports"
    out.mkdir(exist_ok=True)
    path = out / f"weekly_{dt.date.today():%Y-%m-%d}.md"
    path.write_text(md, encoding="utf-8")
    (out / "latest.md").write_text(md, encoding="utf-8")
    print(f"report written: {path}")
    send_email(subject, md)
    send_telegram(md)
