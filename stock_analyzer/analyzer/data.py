"""שליפת נתונים מ-Yahoo Finance (דרך הספרייה yfinance)."""
from __future__ import annotations

import pandas as pd
import yfinance as yf


def get_history(ticker: str, period: str = "2y") -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=period, auto_adjust=True)
    if df is None or df.empty:
        raise ValueError(f"לא נמצאו נתוני מחיר עבור {ticker} ב-Yahoo Finance")
    df.index = pd.to_datetime(df.index).tz_localize(None)
    return df[["Open", "High", "Low", "Close", "Volume"]].dropna(subset=["Close"])


def _safe(fn, default=None):
    try:
        v = fn()
        return default if v is None else v
    except Exception:
        return default


def get_company_bundle(ticker: str) -> dict:
    """כל הנתונים הפונדמנטליים הנדרשים לניתוח, ממקור אחד (Yahoo Finance)."""
    t = yf.Ticker(ticker)
    empty = pd.DataFrame()
    return {
        "info": _safe(lambda: t.info, {}),
        "income_a": _safe(lambda: t.income_stmt, empty),
        "income_q": _safe(lambda: t.quarterly_income_stmt, empty),
        "balance_a": _safe(lambda: t.balance_sheet, empty),
        "balance_q": _safe(lambda: t.quarterly_balance_sheet, empty),
        "cash_a": _safe(lambda: t.cashflow, empty),
        "cash_q": _safe(lambda: t.quarterly_cashflow, empty),
        "earnings_dates": _safe(lambda: t.get_earnings_dates(limit=8), empty),
        "recommendations": _safe(lambda: t.recommendations_summary, empty),
    }


def tradingview_symbol(ticker: str, info: dict | None = None) -> str:
    """ממיר סימול של Yahoo לסימול של TradingView (EXCHANGE:SYMBOL)."""
    if ticker.endswith(".TA"):
        return "TASE:" + ticker[:-3].replace("-", ".")
    if ticker.endswith(".DE"):
        return "XETR:" + ticker[:-3]
    if ticker.endswith(".L"):
        return "LSE:" + ticker[:-2].replace(".", "")
    exch = (info or {}).get("exchange", "")
    mapping = {"NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ", "NYQ": "NYSE",
               "ASE": "AMEX", "PCX": "AMEX"}
    if exch in mapping:
        return f"{mapping[exch]}:{ticker}"
    return ticker
