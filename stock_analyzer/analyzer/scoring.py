"""שקלול הניתוחים להמלצה סופית."""
from __future__ import annotations

from .data import get_company_bundle, get_history
from .fundamentals import analyst_view, analyze_fundamentals
from .indicators import add_indicators, technical_summary

WEIGHTS = {"technical": 0.40, "fundamental": 0.40, "analysts": 0.20}


def verdict(score: float) -> tuple[str, str]:
    if score >= 70:
        return "קנייה חזקה", "#0a8f3c"
    if score >= 58:
        return "קנייה", "#43a047"
    if score >= 43:
        return "החזק / המתן", "#f9a825"
    if score >= 30:
        return "מכירה", "#e53935"
    return "מכירה חזקה", "#b71c1c"


def combine(tech: dict, fund: dict, analysts: dict) -> dict:
    parts = {"technical": tech["score"], "fundamental": fund["score"], "analysts": analysts.get("score")}
    total_w = sum(WEIGHTS[k] for k, v in parts.items() if v is not None)
    score = sum(WEIGHTS[k] * v for k, v in parts.items() if v is not None) / total_w
    label, color = verdict(score)
    return {"score": round(score, 1), "label": label, "color": color, "parts": parts}


def analyze_ticker(ticker: str, period: str = "2y") -> dict:
    hist = add_indicators(get_history(ticker, period))
    bundle = get_company_bundle(ticker)
    tech = technical_summary(hist)
    fund = analyze_fundamentals(bundle)
    analysts = analyst_view(bundle["info"])
    return {"ticker": ticker, "hist": hist, "bundle": bundle, "tech": tech,
            "fund": fund, "analysts": analysts, "final": combine(tech, fund, analysts)}
