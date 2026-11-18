"""חוות הדעת של היוטיובר מיכה סטוקס (michastocks) על כל חברה.

המידע נלקח רק מהערוץ הרשמי שלו ביוטיוב, בשלוש שכבות:
1. חוות דעת שהזנת ידנית בקובץ data/michastocks_opinions.json (הכי אמין – אתה צפית).
2. סרטונים מהערוץ שבהם החברה מוזכרת בכותרת/בתיאור (פיד RSS הרשמי של יוטיוב,
   ואם הוגדר YOUTUBE_API_KEY – גם חיפוש בכל היסטוריית הערוץ).
3. ציטוטים מתוך הכתוביות של הסרטונים שבהם החברה מוזכרת + הערכת טון אוטומטית.

שימו לב: הערכת הטון האוטומטית היא אינדיקציה בלבד. תמיד כדאי לצפות בסרטון עצמו.
"""
from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

from .config import MICHA_CHANNEL_HANDLE, MICHA_CHANNEL_ID

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OPINIONS_FILE = DATA_DIR / "michastocks_opinions.json"
CACHE_DIR = DATA_DIR / "cache"
HEADERS = {"User-Agent": "Mozilla/5.0 (stock-analyzer)", "Accept-Language": "he,en"}

# שמות בעברית כפי שנאמרים בסרטונים – לשיפור הזיהוי בכתוביות. אפשר להוסיף.
HEBREW_ALIASES = {
    "NVDA": ["אנבידיה", "נבידיה", "אנווידיה"], "AAPL": ["אפל"], "MSFT": ["מיקרוסופט"],
    "GOOGL": ["גוגל", "אלפבית"], "META": ["מטא", "פייסבוק"], "AMZN": ["אמזון"],
    "AMD": ["איי אם די", "אי אם די"], "AVGO": ["ברודקום"], "TSM": ["טייוואן סמי", "TSMC"],
    "MU": ["מיקרון"], "ORCL": ["אורקל"], "CRM": ["סיילספורס"], "ADBE": ["אדובי"],
    "PLTR": ["פלנטיר", "פאלנטיר"], "PANW": ["פאלו אלטו", "פלו אלטו"], "CRWD": ["קראודסטרייק"],
    "CHKP": ["צ'ק פוינט", "צק פוינט"], "NICE": ["נייס"], "MNDY": ["מאנדיי", "מנדיי"],
    "WIX": ["וויקס", "ויקס"], "NVMI": ["נובה"], "LMT": ["לוקהיד"], "RTX": ["רייתאון"],
    "NOC": ["נורת'רופ", "נורתרופ"], "GD": ["ג'נרל דיינמיקס"], "ESLT": ["אלביט"],
    "RHM.DE": ["ריינמטאל"], "KTOS": ["קרטוס"], "XOM": ["אקסון"], "CVX": ["שברון"],
    "OXY": ["אוקסידנטל"], "SHEL": ["של "], "CCJ": ["קמקו"], "NEM": ["ניומונט"],
    "FCX": ["פריפורט"],
}

POSITIVE = ["קונה", "קניתי", "הוספתי", "מחזיק", "אוהב", "שורי", "מעולה", "הזדמנות", "זולה",
            "חזקה", "צמיחה", "ממליץ", "מעניינת", "פוטנציאל", "bullish", "buy", "undervalued"]
NEGATIVE = ["מכרתי", "מוכר", "יצאתי", "דובי", "יקרה", "מסוכן", "סיכון", "נזהר", "חלשה",
            "ירידה", "לא אוהב", "מתרחק", "בועה", "bearish", "sell", "overvalued"]


def load_manual_opinions() -> dict:
    try:
        return json.loads(OPINIONS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def resolve_channel_id() -> str | None:
    if MICHA_CHANNEL_ID or os.getenv("MICHA_CHANNEL_ID"):
        return MICHA_CHANNEL_ID or os.getenv("MICHA_CHANNEL_ID")
    cache = CACHE_DIR / "channel_id.txt"
    if cache.exists():
        return cache.read_text().strip() or None
    try:
        html = requests.get(f"https://www.youtube.com/{MICHA_CHANNEL_HANDLE}",
                            headers=HEADERS, timeout=15).text
        m = (re.search(r'"externalId":"(UC[\w-]{22})"', html)
             or re.search(r'channel/(UC[\w-]{22})', html)
             or re.search(r'"channelId":"(UC[\w-]{22})"', html))
        if m:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            cache.write_text(m.group(1))
            return m.group(1)
    except Exception:
        pass
    return None


def latest_videos(channel_id: str) -> list[dict]:
    """15 הסרטונים האחרונים מהפיד הרשמי של הערוץ."""
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    ns = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
          "media": "http://search.yahoo.com/mrss/"}
    root = ET.fromstring(r.content)
    out = []
    for e in root.findall("a:entry", ns):
        desc = e.find("media:group/media:description", ns)
        out.append({
            "id": e.findtext("yt:videoId", default="", namespaces=ns),
            "title": e.findtext("a:title", default="", namespaces=ns),
            "published": e.findtext("a:published", default="", namespaces=ns)[:10],
            "description": desc.text if desc is not None and desc.text else "",
        })
    return out


def _search_api(channel_id: str, query: str) -> list[dict]:
    key = os.getenv("YOUTUBE_API_KEY")
    if not key:
        return []
    r = requests.get("https://www.googleapis.com/youtube/v3/search", timeout=15, params={
        "key": key, "channelId": channel_id, "q": query, "part": "snippet",
        "type": "video", "order": "date", "maxResults": 5})
    if r.status_code != 200:
        return []
    return [{"id": i["id"]["videoId"], "title": i["snippet"]["title"],
             "published": i["snippet"]["publishedAt"][:10],
             "description": i["snippet"].get("description", "")}
            for i in r.json().get("items", [])]


def _transcript(video_id: str) -> str:
    cache = CACHE_DIR / f"tr_{video_id}.txt"
    if cache.exists():
        return cache.read_text(encoding="utf-8")
    text = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        fetched = YouTubeTranscriptApi().fetch(video_id, languages=["iw", "he", "en"])
        text = " ".join(s.text for s in fetched)
    except Exception:
        text = ""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(text, encoding="utf-8")
    return text


def _terms(ticker: str, company: str) -> list[str]:
    base = ticker.split(".")[0]
    terms = [base, company.split(" (")[0].split()[0]] + HEBREW_ALIASES.get(ticker, [])
    return [t for t in terms if len(t.strip()) >= 2]


def _mentions(text: str, terms: list[str]) -> bool:
    for t in terms:
        if re.fullmatch(r"[A-Za-z.]+", t):
            if re.search(rf"(?<![A-Za-z]){re.escape(t)}(?![A-Za-z])", text, re.I):
                return True
        elif t in text:
            return True
    return False


def _snippets(text: str, terms: list[str], width: int = 160, limit: int = 3) -> list[str]:
    out = []
    for t in terms:
        for m in re.finditer(re.escape(t), text, re.I):
            s = text[max(0, m.start() - width): m.end() + width].strip()
            if not any(s[:40] in o for o in out):
                out.append("…" + s + "…")
            if len(out) >= limit:
                return out
    return out


def _tone(snips: list[str]) -> str | None:
    if not snips:
        return None
    joined = " ".join(snips).lower()
    pos = sum(joined.count(w) for w in POSITIVE)
    neg = sum(joined.count(w) for w in NEGATIVE)
    if pos > neg + 1:
        return "חיובי"
    if neg > pos + 1:
        return "שלילי"
    return "מעורב/נייטרלי"


def get_opinion(ticker: str, company: str, videos: list[dict] | None = None,
                with_transcripts: bool = True) -> dict:
    result = {"manual": load_manual_opinions().get(ticker), "videos": [], "error": None}
    channel_id = resolve_channel_id()
    if not channel_id:
        result["error"] = "לא הצלחתי לאתר את ערוץ היוטיוב של מיכה סטוקס"
        return result
    terms = _terms(ticker, company)
    try:
        if videos is None:
            videos = latest_videos(channel_id)
        found = {v["id"]: v for v in videos if _mentions(v["title"] + " " + v["description"], terms)}
        for v in _search_api(channel_id, f"{ticker.split('.')[0]} | {company}"):
            if _mentions(v["title"] + " " + v["description"], terms):
                found.setdefault(v["id"], v)
        # גם סרטונים כלליים (סקירת שוק וכו') – בודקים בכתוביות
        if with_transcripts:
            for v in videos[:8]:
                if v["id"] not in found and _mentions(_transcript(v["id"]), terms):
                    found[v["id"]] = v
        for v in sorted(found.values(), key=lambda x: x["published"], reverse=True)[:5]:
            snips = _snippets(_transcript(v["id"]), terms) if with_transcripts else []
            result["videos"].append({**v, "url": f"https://www.youtube.com/watch?v={v['id']}",
                                     "snippets": snips, "tone": _tone(snips)})
    except Exception as e:  # רשת/יוטיוב לא זמינים
        result["error"] = f"שגיאה בשליפה מיוטיוב: {e}"
    return result
