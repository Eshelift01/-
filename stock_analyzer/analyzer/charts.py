"""גרפים (Plotly)."""
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from .config import BUYER_WIN_WINDOW, SMA_WINDOW


def price_chart(df, ticker: str, show_volume_weighted: bool = True):
    bw, sma = f"BuyerWin{BUYER_WIN_WINDOW}", f"SMA{SMA_WINDOW}"
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.04,
                        row_heights=[0.58, 0.14, 0.28],
                        subplot_titles=(f"{ticker} – מחיר וממוצע {SMA_WINDOW} יום", "נפח מסחר",
                                        f"ניצחון הקונים על המוכרים – ממוצע {BUYER_WIN_WINDOW} יום (%)"))
    fig.add_trace(go.Candlestick(x=df.index, open=df["Open"], high=df["High"], low=df["Low"],
                                 close=df["Close"], name="מחיר",
                                 increasing_line_color="#26a69a", decreasing_line_color="#ef5350"),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df[sma], name=f"ממוצע {SMA_WINDOW} יום",
                             line=dict(color="#ff9800", width=2)), row=1, col=1)
    colors = ["#26a69a" if c > o else "#ef5350" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], marker_color=colors, name="נפח",
                         showlegend=False), row=2, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df[bw], name=f"% ימי ניצחון קונים ({BUYER_WIN_WINDOW})",
                             line=dict(color="#2962ff", width=2)), row=3, col=1)
    if show_volume_weighted:
        fig.add_trace(go.Scatter(x=df.index, y=df[f"BuyerVol{BUYER_WIN_WINDOW}"],
                                 name="% נפח בימי ניצחון קונים",
                                 line=dict(color="#9c27b0", width=1.5, dash="dot")), row=3, col=1)
    fig.add_hline(y=50, line_dash="dash", line_color="gray", row=3, col=1,
                  annotation_text="50% – שוויון", annotation_position="top left")
    fig.update_layout(height=820, xaxis_rangeslider_visible=False, hovermode="x unified",
                      legend=dict(orientation="h", y=1.06, x=0), margin=dict(l=10, r=10, t=60, b=10))
    fig.update_xaxes(rangebreaks=[dict(bounds=["sat", "mon"])])
    return fig


def tradingview_widget(symbol: str, height: int = 600) -> str:
    """ווידג'ט הגרף הרשמי של TradingView (כולל ממוצע נע 90)."""
    return f"""
<div class="tradingview-widget-container" style="height:{height}px">
  <div id="tv_chart" style="height:{height}px"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
  new TradingView.widget({{
    "autosize": true, "symbol": "{symbol}", "interval": "D", "timezone": "Asia/Jerusalem",
    "theme": "light", "style": "1", "locale": "he_IL", "allow_symbol_change": true,
    "studies": [{{"id": "MASimple@tv-basicstudies", "inputs": {{"length": {SMA_WINDOW}}}}}],
    "container_id": "tv_chart"
  }});
  </script>
</div>"""
