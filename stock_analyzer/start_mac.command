#!/bin/bash
# לחיצה כפולה על הקובץ הזה מפעילה את מנתח המניות ופותחת אותו בדפדפן.
cd "$(dirname "$0")" || exit 1
if ! python3 -c "import streamlit, yfinance, plotly" 2>/dev/null; then
  echo "מתקין רכיבים בפעם הראשונה... (כמה דקות)"
  python3 -m pip install -r requirements.txt
fi
echo "האפליקציה עולה... כדי לסגור אותה, סגור את החלון הזה."
python3 -m streamlit run app.py --server.headless false --browser.gatherUsageStats false
