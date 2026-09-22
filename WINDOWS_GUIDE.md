# 🪟 Windows Setup & Execution Guide: e-LMPC RADAR

Welcome! This guide is written so anyone on Windows can set up, run, and test **e-LMPC RADAR** with zero friction.

---

## ⚡ Quick Summary for Busy Teammates

| If you have... | Do this: |
| :--- | :--- |
| **Docker Desktop installed (Best & Easiest)** | Double-click `run-windows.bat` ➔ type `1` ➔ Done! |
| **WSL2 / Ubuntu** | Open Ubuntu terminal ➔ run `make dev` or `bash start.sh` |
| **No Docker (Python 3.10-3.12 & Node.js 18+)** | Double-click `run-windows.bat` ➔ type `2` |

---

## 📥 Step 0: Clone the Repository on Windows

Open Command Prompt, PowerShell, or Git Bash:

```cmd
git clone <YOUR_GIT_REPO_URL>
cd sih
```

*(Optional: If Git throws a "filename too long" error on Windows, run `git config --system core.longpaths true` once in Command Prompt as Administrator).*

---

## 🚀 3 Ways to Run (Pick Any ONE)

### 🥇 Method 1: The 1-Click Docker Way (RECOMMENDED — 100% Reliable)

This is the fastest, cleanest method. Docker runs PostgreSQL, FastAPI (PaddleOCR + OpenCV), and Next.js in Linux containers on your Windows machine, completely preventing Python C++ compiler issues or Windows PATH errors.

#### Prerequisites:
1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (select the **Use WSL 2 instead of Hyper-V** option during install).
2. Ensure Docker Desktop is open and running in your system tray.

#### How to Start:
- **Option A (Double-Click)**: Double-click **`run-windows.bat`** in File Explorer. When prompted, select `1` (or press Enter).
- **Option B (Terminal)**: In CMD or PowerShell, run:
  ```cmd
  docker compose up --build
  ```

#### Access the Application:
- 🌐 **Web Console**: [http://localhost:3000](http://localhost:3000)
- ⚡ **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🗄️ **PostgreSQL**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `lmpc_db`)

#### How to Stop:
Press `Ctrl + C` in the terminal, or run:
```cmd
docker compose down
```

---

### 🥈 Method 2: WSL2 (Windows Subsystem for Linux)

If you love the Linux terminal or already have WSL2 installed:

1. Open PowerShell as Administrator and ensure WSL is installed:
   ```powershell
   wsl --install
   ```
2. Open the **Ubuntu** app from your Windows Start menu.
3. Clone and navigate to the project:
   ```bash
   git clone <YOUR_GIT_REPO_URL>
   cd sih
   ```
4. Start all services using the Makefile or bash script:
   ```bash
   make dev
   # or
   bash start.sh
   ```
Everything launches automatically on `http://localhost:3000`.

---

### 🥉 Method 3: Native Windows (Without Docker)

If you do not have Docker installed and want to run Python and Node.js directly on Windows:

#### Prerequisites:
1. **Python (3.10, 3.11, or 3.12 64-bit)**:
   - Download from [python.org](https://www.python.org/downloads/).
   - ⚠️ **CRITICAL**: Check the checkbox **"Add python.exe to PATH"** at the bottom of the first setup window.
2. **Node.js (18 or 20 LTS)**:
   - Download and install from [nodejs.org](https://nodejs.org/).
3. **PostgreSQL**:
   - Install [PostgreSQL for Windows](https://www.postgresql.org/download/windows/) (set password to `postgres` and port to `5432`), **OR** use a free cloud PostgreSQL database (Neon, Supabase, etc.) and update `DATABASE_URL` in `.env`.

#### 1-Click Launch:
Double-click **`run-windows.bat`** (or select `2` if prompted).

The script automatically:
1. Verifies your Python and Node.js installations.
2. Creates `backend\venv` and installs all dependencies (`pip install -r requirements.txt`).
3. Installs frontend dependencies (`npm install`).
4. Spawns two dedicated terminal windows:
   - Window 1: FastAPI Backend (`http://localhost:8000`)
   - Window 2: Next.js Frontend (`http://localhost:3000`)

#### Manual Commands (Alternative to the script):
If you prefer running manual commands in separate terminals:

**Terminal 1 (Backend):**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```cmd
cd frontend
npm install
npm run dev
```

---

## 🔑 Pre-Seeded Test Accounts & Logins

You don't need to manually create accounts. The database is pre-seeded with 3 test personas (or use the **1-Click Test Persona Switcher** on the login popup):

| Role | Email | Password | What to Test |
| :--- | :--- | :--- | :--- |
| **Citizen Consumer** | `consumer@smartconsumer.gov.in` | `Consumer@123` | USP (Unit Sale Price) check, MRP tax inclusion, Consumer Care Helpline |
| **Enforcement Officer** | `officer.delhi@lmpc.gov.in` | `Officer@123` | Seizure notice generation (Form VIII Panchnama), Statutory rule violations, Batch audit |
| **Ministry Admin** | `admin@doca.gov.in` | `Admin@123` | Compliance metrics, GS1 DataKart master audit records, system configuration |

---

## 📸 How to Test Package Scanning Right Away

Sample packaging test images are already included in the repo under the `rescources/` folder:

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Click **"Scan Package"** or **"Upload Image"**.
3. Pick one of the sample images:
   - `rescources/facewash-image.jpeg` — Tests crimp seal manufacturing date detection and net quantity compliance.
   - `rescources/bottle-details.jpeg` — Tests cylindrical label dewarping and MRP tax verification.
   - `rescources/black-panel-details.jpeg` — Tests Unit Sale Price (USP) and manufacturer address parsing.
4. Observe real-time compliance results:
   - Green = Statutory Pass
   - Amber = Warning (e.g. missing pin code)
   - Red = Mandatory Failure (e.g. missing Unit Sale Price)
   - Rule references under the Legal Metrology Act, 2009 and LMPC Rules, 2011.

---

## 🛠️ Windows Gotchas & Troubleshooting

### 1. PowerShell: "Execution of scripts is disabled on this system"
If running `run-windows.ps1` gives an execution policy error:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\run-windows.ps1
```
*(This allows scripts only in the active PowerShell window without lowering system-wide security).*

### 2. Port 5432 or 8000 Already in Use
If port 5432 is occupied by an existing local PostgreSQL:
- **Option A**: Stop local PostgreSQL via Windows Services (`Win + R` ➔ type `services.msc` ➔ find *postgresql-x64* ➔ click Stop).
- **Option B**: Change the host port mapping in `docker-compose.yml` to `"5433:5432"`.

### 3. First OCR Scan Takes a Few Extra Seconds
On the first scan, RapidOCR automatically downloads the lightweight PP-OCRv4 ONNX model weights into `~/.rapidocr/`. Keep your internet connection active during the first test scan. Subsequent scans execute offline in < 1.5 seconds.

### 4. Git Long Paths Error
If you see checkout errors regarding long file names:
```cmd
git config --system core.longpaths true
```

---

## 💬 Need Help?
If any step behaves unexpectedly, please ping your team chat or check the Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs) to verify backend health.
