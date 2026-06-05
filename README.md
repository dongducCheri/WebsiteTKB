# HUST TKB — Timetable Planning Tool

A web application that helps Hanoi University of Science and Technology (HUST) students build course schedules from planned timetable Excel files.

[日本語 README](./README.ja.md)

---

## Project Goal

Help students streamline course registration by importing Excel timetables, searching courses, selecting class types (LT/BT/TN, etc.), and visualizing schedules on a weekly grid—with optional AI-assisted scheduling based on natural-language preferences.

---

## Main Features

- **Excel upload** — Parse `.xlsx` / `.xls` files in the browser
- **Course search** — Search by course code or name with autocomplete
- **Course chips** — Manage selected courses (course code only)
- **Timetable grid** — Day × time-slot grid for viewing and picking classes
- **Multiple class types** — Select LT, BT, TN, etc. per course as required
- **Overlap display** — Stacked cards for concurrent slots so users can compare
- **Browser storage** — Persist data in `localStorage` and restore on reload
- **Excel export** — Download selected classes as a formatted `.xlsx` file
- **AI scheduling** — Natural-language requests via Google Gemini API

---

## Tech Stack

| Area | Technology |
|------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Data | SheetJS (`xlsx-js-style`) |
| Storage | `localStorage`, LZ-String (compression) |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| Backend | Vercel Serverless Functions (API proxy) |
| Deploy | Vercel, Git / GitHub |

---

## Project Structure

```
WebsiteTKB/
├── index.html          # Entry point
├── css/style.css
├── api/
│   └── ai-schedule.js  # Gemini API proxy
├── js/
│   ├── app.js          # Init & events
│   ├── core/           # state, storage, utils
│   ├── data/           # Excel parse & upload
│   ├── courses/        # search, chips, results
│   ├── export/         # Excel export
│   ├── timetable/      # grid rendering
│   └── ai/             # AI panel & API client
└── test/               # Sample Excel file
```

---

## Run Locally

### Static only (no AI)

Open `index.html` in a browser or serve via any static file server.

### With AI (recommended)

1. Get `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)
2. Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_api_key_here
```

3. Start with Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel dev
```

4. Open `http://localhost:3000`

---

## Deploy on Vercel

```bash
vercel
```

Set `GEMINI_API_KEY` under **Settings → Environment Variables** in the Vercel dashboard, then redeploy.

---

## Usage (Brief)

1. Download the planned timetable Excel from EsHUST and upload it
2. Search and add courses you want to register
3. Click **Find classes** to show the timetable grid
4. Click blocks on the grid to select LT / BT / TN classes
5. (Optional) **Sort with AI** → enter preferences → **Send**
6. **Save in browser** or **Export Excel**

---

## Branch Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Production / release |
| `developer` | Integration & QA |
| `fea/*`, `fix/*` | Features & fixes → PR into `developer` |

---

## License & Contact

Academic / coursework project.  
For questions, use GitHub Issues or contact the project maintainers.
