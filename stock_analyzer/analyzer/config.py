"""הגדרות: סקטורים ורשימות מניות למעקב.

אפשר להוסיף/להסיר טיקרים בחופשיות. הסימולים הם כפי שמופיעים ב-Yahoo Finance
(למשל מניות בבורסת ת"א מסתיימות ב-.TA, גרמניה ב-.DE, לונדון ב-.L).
"""

SECTORS: dict[str, dict[str, str]] = {
    "הייטק": {
        "AAPL": "Apple",
        "MSFT": "Microsoft",
        "NVDA": "NVIDIA",
        "GOOGL": "Alphabet",
        "META": "Meta Platforms",
        "AMZN": "Amazon",
        "AMD": "AMD",
        "AVGO": "Broadcom",
        "TSM": "Taiwan Semiconductor",
        "MU": "Micron",
        "ORCL": "Oracle",
        "CRM": "Salesforce",
        "ADBE": "Adobe",
        "NOW": "ServiceNow",
        "PLTR": "Palantir",
        "PANW": "Palo Alto Networks",
        "CRWD": "CrowdStrike",
        "CHKP": "Check Point",
        "NICE": "NICE",
        "MNDY": "monday.com",
        "WIX": "Wix",
        "NVMI": "Nova",
    },
    "תעשיות ביטחוניות": {
        "LMT": "Lockheed Martin",
        "RTX": "RTX (Raytheon)",
        "NOC": "Northrop Grumman",
        "GD": "General Dynamics",
        "LHX": "L3Harris",
        "HII": "Huntington Ingalls",
        "LDOS": "Leidos",
        "BWXT": "BWX Technologies",
        "KTOS": "Kratos Defense",
        "AVAV": "AeroVironment",
        "ESLT": "Elbit Systems",
        "RHM.DE": "Rheinmetall",
        "BA.L": "BAE Systems",
    },
    "אנרגיה ודלק / משאבים": {
        "XOM": "Exxon Mobil",
        "CVX": "Chevron",
        "COP": "ConocoPhillips",
        "OXY": "Occidental",
        "EOG": "EOG Resources",
        "SLB": "SLB (Schlumberger)",
        "SHEL": "Shell",
        "BP": "BP",
        "TTE": "TotalEnergies",
        "LNG": "Cheniere Energy",
        "CCJ": "Cameco (אורניום)",
        "FCX": "Freeport-McMoRan (נחושת)",
        "NEM": "Newmont (זהב)",
        "BHP": "BHP",
        "RIO": "Rio Tinto",
        "VALE": "Vale",
    },
}

# פרמטרים של האינדיקטורים
BUYER_WIN_WINDOW = 150  # ימים – ממוצע ניצחון הקונים על המוכרים
SMA_WINDOW = 90         # ימים – מחיר ממוצע

# ערוץ היוטיוב של מיכה סטוקס
MICHA_CHANNEL_HANDLE = "@michastocks"
# אם ידוע מזהה הערוץ (מתחיל ב-UC...), אפשר לשים אותו כאן כדי לחסוך חיפוש.
MICHA_CHANNEL_ID: str | None = None

SOURCES_NOTE = (
    "מקורות: נתוני מחיר, דוחות כספיים והמלצות אנליסטים – Yahoo Finance; "
    "גרף אינטראקטיבי – TradingView; דעת מיכה סטוקס – ערוץ היוטיוב הרשמי שלו."
)


def all_tickers() -> dict[str, tuple[str, str]]:
    """ticker -> (company name, sector)"""
    out = {}
    for sector, tickers in SECTORS.items():
        for t, name in tickers.items():
            out[t] = (name, sector)
    return out
