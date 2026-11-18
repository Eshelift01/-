"""אינדיקטורים טכניים."""
import numpy as np
import pandas as pd

from .config import BUYER_WIN_WINDOW, SMA_WINDOW


def add_indicators(df: pd.DataFrame,
                   buyer_window: int = BUYER_WIN_WINDOW,
                   sma_window: int = SMA_WINDOW) -> pd.DataFrame:
    """מוסיף לטבלת מחירים (Open/High/Low/Close/Volume) את העמודות:

    - SMA90: מחיר סגירה ממוצע ב-90 הימים האחרונים.
    - BuyerWin150: אחוז הימים ב-150 הימים האחרונים שבהם הקונים ניצחו את
      המוכרים, כלומר נר ירוק (מחיר הסגירה גבוה ממחיר הפתיחה).
    - BuyerVol150: חלק מנפח המסחר ב-150 הימים האחרונים שנסחר בימים
      שבהם הקונים ניצחו (גרסה משוקללת-נפח של אותו מדד).
    - RSI14: מדד עוצמה יחסית.
    """
    df = df.copy()
    close, open_, vol = df["Close"], df["Open"], df["Volume"].fillna(0)

    df[f"SMA{sma_window}"] = close.rolling(sma_window, min_periods=sma_window).mean()

    buyer_day = (close > open_).astype(float)
    df["BuyerDay"] = buyer_day
    df[f"BuyerWin{buyer_window}"] = (
        buyer_day.rolling(buyer_window, min_periods=buyer_window).mean() * 100
    )
    up_vol = (vol * buyer_day).rolling(buyer_window, min_periods=buyer_window).sum()
    tot_vol = vol.rolling(buyer_window, min_periods=buyer_window).sum()
    df[f"BuyerVol{buyer_window}"] = (up_vol / tot_vol.replace(0, np.nan)) * 100

    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / 14, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    df["RSI14"] = 100 - 100 / (1 + rs)
    return df


def technical_summary(df: pd.DataFrame,
                      buyer_window: int = BUYER_WIN_WINDOW,
                      sma_window: int = SMA_WINDOW) -> dict:
    """מחזיר ציון טכני 0-100 ונקודות הסבר בעברית."""
    last = df.iloc[-1]
    close = float(last["Close"])
    sma = last.get(f"SMA{sma_window}")
    bw = last.get(f"BuyerWin{buyer_window}")
    bv = last.get(f"BuyerVol{buyer_window}")
    rsi = last.get("RSI14")

    score, notes = 50.0, []

    if pd.notna(sma):
        dist = (close / sma - 1) * 100
        sma_prev = df[f"SMA{sma_window}"].iloc[-21] if len(df) > 21 else np.nan
        slope_up = pd.notna(sma_prev) and sma > sma_prev
        if close > sma:
            score += 12
            notes.append(f"✅ המחיר מעל הממוצע ל-{sma_window} יום ({dist:+.1f}%)")
        else:
            score -= 12
            notes.append(f"⚠️ המחיר מתחת לממוצע ל-{sma_window} יום ({dist:+.1f}%)")
        if slope_up:
            score += 6
            notes.append(f"✅ הממוצע ל-{sma_window} יום במגמת עלייה")
        elif pd.notna(sma_prev):
            score -= 6
            notes.append(f"⚠️ הממוצע ל-{sma_window} יום במגמת ירידה")
        if dist > 25:
            score -= 5
            notes.append("⚠️ המחיר מתוח מאוד מעל הממוצע – סיכון לתיקון")

    if pd.notna(bw):
        # 50% = שוויון. כל אחוז מעל/מתחת משפיע.
        score += max(-15, min(15, (bw - 50) * 1.5))
        side = "קונים" if bw >= 50 else "מוכרים"
        notes.append(f"{'✅' if bw >= 50 else '⚠️'} ב-{buyer_window} הימים האחרונים "
                     f"{bw:.1f}% מהימים נסגרו בניצחון קונים – יתרון ל{side}")
    if pd.notna(bv):
        score += max(-8, min(8, (bv - 50) * 0.8))
        notes.append(f"ℹ️ {bv:.1f}% מנפח המסחר היה בימי ניצחון קונים")

    if pd.notna(rsi):
        if rsi > 70:
            score -= 6
            notes.append(f"⚠️ RSI={rsi:.0f} – קניית יתר")
        elif rsi < 30:
            score += 4
            notes.append(f"ℹ️ RSI={rsi:.0f} – מכירת יתר (הזדמנות אפשרית לאיסוף)")
        else:
            notes.append(f"ℹ️ RSI={rsi:.0f} – טווח נייטרלי")

    for label, days in (("חודש", 21), ("3 חודשים", 63), ("שנה", 252)):
        if len(df) > days:
            ret = (close / df["Close"].iloc[-days - 1] - 1) * 100
            notes.append(f"ℹ️ תשואה ב{label}: {ret:+.1f}%")
    if len(df) > 63:
        ret3 = close / df["Close"].iloc[-64] - 1
        score += max(-8, min(8, ret3 * 40))

    return {
        "score": float(max(0, min(100, score))),
        "notes": notes,
        "close": close,
        "sma": None if pd.isna(sma) else float(sma),
        "buyer_win": None if pd.isna(bw) else float(bw),
        "buyer_vol": None if pd.isna(bv) else float(bv),
        "rsi": None if pd.isna(rsi) else float(rsi),
    }
