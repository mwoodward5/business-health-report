# Business Health Report Tool

A digital health audit tool that analyzes any business's online presence — website performance, SEO, Google Business Profile, online reputation, and social media — then generates a sales call script and downloadable PDF report.

## Features

- **Dual Mode**: Works with real Google APIs (live data) or falls back to intelligent demo mode
- **PageSpeed Analysis**: Real Lighthouse scores via Google PageSpeed Insights API (free, no key needed)
- **Business Lookup**: Google Places API integration for real business data, reviews, and competitors
- **Call Script Generator**: Auto-generates a complete cold-call script with objection handlers
- **PDF Report**: 6-page professional PDF report downloadable in-browser (jsPDF)
- **Email Tracking**: SQLite-backed email send tracking
- **Settings Panel**: In-app API key configuration with test/verify

## Architecture

```
├── index.html          # Single-page app (3 views: input → loading → results)
├── style.css           # Dark navy + gold theme (1320 lines)
├── app.js              # Main app logic, API flow, UI rendering
├── scoring.js          # Scoring engine with seeded PRNG for deterministic demo data
├── pdf-generator.js    # 6-page jsPDF report generator
└── cgi-bin/
    ├── api.py          # Python backend: PageSpeed, Places, Competitors, Config
    └── send_email.py   # Email tracking via SQLite
```

## Setup

### Quick Start (Demo Mode)
Serve the files with any web server. Demo mode works without any API keys — it generates realistic simulated data using a seeded random number generator.

### Live Mode (Google APIs)
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Places API** and **PageSpeed Insights API**
3. Create an API key under Credentials
4. Click the ⚙️ gear icon in the app and enter your key
5. Google gives $200/month free credit — more than enough for typical usage

### Self-Hosting
This app requires a Python backend (CGI scripts). Options:

- **VPS (DigitalOcean, Linode, etc.)**: Run with Apache/Nginx + Python CGI. Most flexible.
- **Railway / Render**: Wrap the CGI scripts in a small Flask/FastAPI server.
- **PythonAnywhere**: Free tier supports Python web apps.

> **Note**: Static-only hosts (GitHub Pages, basic Netlify) won't work without adapting the backend to serverless functions.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `api.py?action=pagespeed&url=...` | GET | Run PageSpeed Insights (free, no key needed) |
| `api.py?action=lookup&input=...&type=phone/url` | GET | Google Places business lookup (needs key) |
| `api.py?action=competitors&lat=...&lng=...&type=...` | GET | Nearby competitor search (needs key) |
| `api.py?action=config` | GET | Check if API key is configured |
| `api.py?action=config` | POST | Save API key `{"google_api_key": "..."}` |
| `api.py?action=test_key&key=...` | GET | Validate an API key |
| `send_email.py` | POST | Log an email send `{"email": "...", "businessName": "..."}` |
| `send_email.py` | GET | List recent email sends |

## Frontend Placeholder

The JavaScript uses `__CGI_BIN__` as a placeholder for the backend URL. Replace it with your actual backend URL when deploying:

```js
// In app.js, line 6:
const CGI_BIN = '__CGI_BIN__';  // Replace with your backend URL
```

## License

Private — all rights reserved.
