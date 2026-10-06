# HNX26 Financial Fraud Intelligence Platform

**Hackathon Problem Statement:** HNX26PSI04 — REAL-TIME FINANCIAL FRAUD INTELLIGENCE

---

## 1. Problem Statement
Financial institutions face increasingly sophisticated fraud schemes, including synthetic identity theft, rapid automated card testing, account takeovers, and organized multi-account fraud rings sharing hardware devices and botnets. Traditional static rule sets fail against adaptive fraud vectors and high-velocity attacks, while black-box machine learning models fail compliance audits due to lack of explainability.

**The Goal:** Build an AI-powered financial fraud intelligence platform that analyzes transaction data, detects suspicious transactions and accounts, identifies coordinated fraud patterns, assigns risk scores, deterministically explains the reasons behind those scores, and visualizes suspicious relationships.

---

## 2. What the System Does
1. **Transaction Ingestion & Validation:** Ingests transaction records via CSV upload or synthetic demo data generation. Validates required schema and data types.
2. **Deterministic & ML Anomaly Detection:** Calculates multi-dimensional features (amount z-scores, velocity bursts, card-testing patterns, off-hours execution, geographic switching) and evaluates anomaly depth using Isolation Forest and multivariate statistical profiling.
3. **Calibrated Risk Scoring (0–100):**
   - `0–29`: **Low Risk** (Normal baseline behavior)
   - `30–59`: **Medium Risk** (Unusual activity requiring observation)
   - `60–79`: **High Risk** (Suspicious transaction detected)
   - `80–100`: **Critical Risk** (Potential coordinated fraud or velocity attack)
4. **Deterministic Evidence Generation:** Every flagged transaction returns exact evidence explaining why it was flagged (e.g., *"Amount is 115.3x higher than account average"*, *"Device shared across 5 distinct accounts"*).
5. **Fraud Ring Detection & Graph Visualization:** Detects multi-account clusters sharing devices, target merchants, and burst timing, rendering an interactive relationship graph connecting Accounts, Devices, Merchants, and Locations.
6. **Account Investigation Dossier:** Deep-dive view showing transaction count, total value, average ticket, risk score, devices used, merchants used, locations, and linked accounts.
7. **Evidence-Grounded AI Explanation:** Optional Gemini 3.8 Flash integration converts verified engine findings into natural-language briefs for investigators without ever hallucinating financial facts or overriding deterministic scores.
8. **Plaid Sandbox Service Layer:** Prepared architecture in `services/plaid/plaidService.ts` for connecting bank sandbox feeds without making the initial app dependent on Plaid.
9. **Authentication:** Supabase Auth integration with local fallback session support so the app runs immediately without external configuration blockers.

---

## 3. Architecture
```
                         +-----------------------------------+
                         |         React 19 Frontend         |
                         |  (Vite + Tailwind CSS + Lucide)   |
                         +-----------------+-----------------+
                                           | REST APIs
                                           v
                         +-----------------------------------+
                         |          Node.js Express          |
                         |            (server.ts)            |
                         +--------+--------+--------+--------+
                                  |        |        |
            +---------------------+        |        +--------------------+
            v                              v                             v
+-----------------------+      +-----------------------+     +-----------------------+
|   Python Engine CLI   |      |  Native TS Twin Engine|     |  Gemini AI Explainer  |
| (fraud_engine.py /    |      | (nativeFraudEngine.ts |     |   (gemini-3.8-flash)  |
| feature_engineering)  |      |   Automatic Fallback) |     | (Server-Side Grounded)|
+-----------------------+      +-----------------------+     +-----------------------+
            |                              |                             |
            +------------------------------+-----------------------------+
                                           v
                         +-----------------------------------+
                         |   Plaid Sandbox Layer (Service)   |
                         |   Supabase Auth & PostgreSQL      |
                         +-----------------------------------+
```

---

## 4. Technologies
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, TypeScript (`tsx`), dotenv
- **Fraud Detection Engine:** Python 3, `feature_engineering.py`, `fraud_engine.py` (scikit-learn Isolation Forest, pandas, numpy) + Native TypeScript twin pipeline fallback
- **Authentication:** Supabase Auth (`@supabase/supabase-js`) + Zero-config Local Demo Auth fallback
- **Database:** Supabase PostgreSQL ready
- **AI Explanation:** Google GenAI SDK (`@google/genai`) using `gemini-3.8-flash`
- **Banking Sandbox:** Plaid Service Layer (`services/plaid/plaidService.ts`)

---

## 5. Project Structure
```
├── backend/
│   ├── demoGenerator.ts          # Realistic synthetic transaction generator
│   └── nativeFraudEngine.ts      # Native TypeScript twin fraud engine
├── python/
│   ├── feature_engineering.py    # Statistical, velocity & network features
│   ├── fraud_engine.py           # Isolation Forest ML & scoring CLI
│   └── requirements.txt          # Python ML dependencies
├── sample-data/
│   └── transactions_sample.csv   # Sample CSV test dataset
├── services/
│   └── plaid/
│       └── plaidService.ts       # Plaid sandbox integration layer
├── src/
│   ├── api/
│   │   └── client.ts             # Frontend API client
│   ├── components/
│   │   ├── AuthModal.tsx         # Sign in, Sign up & Demo quick login
│   │   ├── CsvUploadModal.tsx    # Drag-and-drop CSV validation modal
│   │   ├── Navbar.tsx            # Navigation, tabs & action buttons
│   │   ├── RiskBadge.tsx         # Calibrated status indicator badge
│   │   └── TransactionDetailDrawer.tsx # Slide-over investigation drawer
│   ├── context/
│   │   └── AuthContext.tsx       # Supabase & Local Auth state provider
│   ├── lib/
│   │   └── supabase.ts           # Supabase client initializer
│   ├── types/
│   │   └── fraud.ts              # Core TypeScript interfaces
│   ├── views/
│   │   ├── AccountsView.tsx      # Account investigation dossiers
│   │   ├── AiExplanationView.tsx # Grounded Gemini explanation console
│   │   ├── AlertsView.tsx        # High-urgency fraud alerts
│   │   ├── NetworkView.tsx       # Relationship graph & fraud rings
│   │   ├── OverviewView.tsx      # Metrics & distribution charts
│   │   ├── SettingsView.tsx      # Architecture & diagnostics
│   │   └── TransactionsView.tsx  # Filterable transaction table
│   ├── App.tsx                   # Main React entry point
│   └── main.tsx
├── .env.example                  # Environment variable template
├── .gitignore                    # Secrets & artifact protection
├── metadata.json                 # AI Studio app metadata
├── package.json                  # Dependencies & scripts
├── README.md                     # Documentation
├── server.ts                     # Full-stack Express & Vite dev server
└── tsconfig.json
```

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (optional, native engine runs as seamless backup)

### Setup Steps
1. Clone the repository and install Node.js dependencies:
   ```bash
   npm install
   ```

2. (Optional) Install Python ML libraries:
   ```bash
   pip install -r python/requirements.txt
   ```

3. Configure Environment Variables:
   ```bash
   cp .env.example .env
   ```

4. Start the Full-Stack Application:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 7. Environment Variables (`.env`)

| Variable | Description | Required? |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for natural language explanations | Optional (Deterministic fallback active) |
| `VITE_SUPABASE_URL` | Supabase project URL | Optional (Local Demo Auth active if unset) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase public API key | Optional (Local Demo Auth active if unset) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | Not used by the current application |
| `PLAID_CLIENT_ID` | Plaid API Client ID | Optional (Sandbox simulation active) |
| `PLAID_SECRET` | Plaid API Secret | Optional |
| `PLAID_ENV` | Plaid environment (`sandbox`) | Optional |
| `PORT` | Dev server port (`3000`) | Optional |

---

## 8. Supabase Setup
1. Create a free Supabase project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings > API** and copy:
   - Project URL -> `VITE_SUPABASE_URL`
   - Anon / Public key -> `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Add these to your `.env` file.
4. When configured, user sign-ups and logins will authenticate against your live Supabase project.

---

## 9. CSV Format Specification
Uploaded files must contain a header line with the following **9 required columns**:

| Column Name | Type | Example | Description |
|---|---|---|---|
| `transaction_id` | string | `TXN_1001` | Unique transaction identifier |
| `account_id` | string | `ACC_201` | Account or customer ID |
| `amount` | float | `4850.00` | Monetary transaction value |
| `timestamp` | ISO string | `2026-10-04T03:15:00Z` | Date and time (UTC) |
| `merchant` | string | `Luxury Gems Direct` | Merchant name |
| `merchant_category` | string | `Jewelry` | Category (Groceries, Jewelry, Crypto, etc.) |
| `device_id` | string | `DEV_RING_888` | Client device/hardware footprint |
| `location` | string | `Miami FL` | Geographic origin |
| `payment_channel` | string | `web_portal` | Channel (`in_store`, `mobile_app`, `web_portal`) |

A validated sample CSV is provided in `sample-data/transactions_sample.csv` and can be downloaded via the **"Sample CSV"** button in the UI.

---

## 10. Fraud Detection Methodology
The detection engine employs an explainable, multi-stage hybrid approach:

1. **Behavioral Baselines:** Computes rolling mean and standard deviation for each account's transaction history.
2. **Amount Anomaly Scoring:**
   - Detects extreme spikes: `amount / account_avg >= 8.0` with `amount > $500` (+35 points)
   - Detects moderate surges: `amount / account_avg >= 3.5` with `amount > $250` (+22 points)
3. **Hardware Reuse & Fraud Rings:**
   - Detects device sharing: If `device_id` is used across ≥ 3 distinct accounts (+38-40 points)
   - Detects account pairs sharing devices (+20 points)
4. **Velocity Attacks & Bursts:**
   - Detects transaction bursts: ≥ 4 transactions within 5 minutes (+30 points)
   - Detects rapid succession: subsequent transaction < 90 seconds (+18 points)
5. **Card Testing Pattern:**
   - Detects repeated micro-charges (< $30) occurring within seconds (+25 points)
6. **Off-Hours High-Risk Transfers:**
   - Transactions in high-risk categories (Cryptocurrency, Wire Transfer, Gambling, Gift Cards) between 01:00 and 05:00 UTC (+22-24 points)
7. **Isolation Forest ML Model:**
   - Ingests normalized numerical feature vectors into an Isolation Forest ensemble (`n_estimators=100, contamination=0.15`).
   - Normalizes decision function into continuous anomaly depths (0.0 to 1.0).
8. **Final Calibrated Score:**
   - Blends ML anomaly depth with rule penalties into a 0–100 score.
   - Low (0–29), Medium (30–59), High (60–79), Critical (80–100).
   - Generates bulleted, human-readable evidence for all anomalies.

---

## 11. Coordinated Fraud Ring Detection
Fraud syndicates frequently rotate stolen accounts through shared emulators or automated proxy devices. The platform builds a graph linking:
- `Account <-> Device` (USES_DEVICE)
- `Account <-> Merchant` (TRANSACTED_AT)
- `Account <-> Location` (LOCATED_IN)

When multiple accounts converge on the same device and merchant within a narrow time window, the system creates a **Detected Ring** (e.g., `RING_1: 7 accounts share device DEV_RING_888 targeting Luxury Gems Direct`).

---

## 12. Gemini AI Integration (Strictly Grounded)
- The Gemini API is called **only server-side** via `POST /api/ai/explain`.
- Gemini receives the transaction metadata and the **pre-computed, verified deterministic evidence**.
- System instructions strictly restrict the model to the provided evidence:
  > *"Base your answers strictly and exclusively on the provided transaction details and verified anomaly reasons. Do not invent amounts, identities, dates, or non-existent facts."*
- If `GEMINI_API_KEY` is not provided or the network call fails, the platform automatically returns the deterministic explanation.

---

## 13. Plaid Sandbox Preparation
- Located in `services/plaid/plaidService.ts`.
- Defines methods for `createLinkToken`, `exchangePublicToken`, and `fetchAndNormalizeTransactions`.
- Normalizes Plaid transaction payloads into the HNX26 fraud schema.
- Includes an interactive sandbox simulation test button in **Settings**.

---

## 14. Testing the Platform Locally
1. Start the server with `npm run dev`.
2. Click **"Generate Demo Data"** in the top navigation bar.
3. Observe the dashboard populate with 28 transactions, 2 fraud rings, and 4 critical alerts.
4. Go to **Fraud Alerts** and click on any critical incident to review recommended actions.
5. Click **"Ask AI Explanation"** to interrogate the findings.
6. Go to **Fraud Network** to inspect the multi-account device cluster.
7. Click **"Upload CSV"**, upload `sample-data/transactions_sample.csv`, and verify the re-analysis.

---

## 15. Deployment on Render (Single Web Service)

The included `render.yaml` creates one Node.js Web Service. It installs the
Python fraud-engine dependencies into a virtual environment, builds the React
frontend, and serves both the frontend and API from the Express server. No
separate static-site, API, or Python service is needed.

Render build command:

```bash
npm ci --include=dev && python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt && npm run build
```

Render start command:

```bash
npm start
```

The Blueprint sets `PYTHON_PATH=.venv/bin/python`. Render supplies `PORT`, and
the Express server listens on `0.0.0.0` at that port. When configuring the
service manually, use the same build and start commands and set
`PYTHON_PATH=.venv/bin/python`.

No user-provided environment variable is required for demo data, CSV analysis,
fraud scoring, or network features. Optional integrations use:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Server-side key for Gemini explanations; deterministic evidence is returned when unset or unavailable. |
| `VITE_SUPABASE_URL` | Supabase project URL, consumed at frontend build time. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase public/publishable key, consumed at frontend build time. Leave both Supabase values unset to use local demo authentication. |
| `PLAID_CLIENT_ID` | Plaid Sandbox client ID. |
| `PLAID_SECRET` | Plaid Sandbox secret; keep server-side and never use a `VITE_` prefix. |
| `PLAID_ENV` | Plaid environment; defaults to `sandbox`. |

Do not add secrets to the repository or to frontend `VITE_` variables. The
Supabase service-role key is not needed by the current application.

---

## 16. Current Limitations & Future Improvements
- **Current Limitations:**
  - Graph visualization uses an in-memory 2D clustered SVG rather than a full 3D WebGL renderer.
  - Python engine runs via subprocess; for high-throughput enterprise scale (>100k TPS), an asynchronous queue (RabbitMQ/Celery) would be preferred.
- **Future Improvements:**
  - Streaming real-time Kafka / WebSocket transaction ingest.
  - Graph Neural Networks (GNNs) for automated complex community detection.
  - Direct Plaid Production webhook ingestion.

---

## 17. External APIs & Models Used
- **Isolation Forest:** Scikit-learn unsupervised anomaly detection model.
- **Gemini 3.8 Flash:** `@google/genai` for natural language explanation synthesis.
- **Supabase Auth:** `@supabase/supabase-js` for token-based authentication.
- **Plaid API:** Sandbox banking data interchange standard.
#   h n x 2 6 - f i n a n c i a l - f r a u d - i n t e l l i g e n c e  
 