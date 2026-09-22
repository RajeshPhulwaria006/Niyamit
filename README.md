# e-LMPC RADAR: Automated Packaged Commodities Statutory Compliance System

**Smart India Hackathon 2026 — Problem Statement ID 26034**  
*Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution, Government of India*

---

## 1. Executive Summary & Engineering Philosophy

**e-LMPC RADAR** provides an automated, deterministic, and legally admissible software platform to verify compliance of packaged commodities under the **Legal Metrology (Packaged Commodities) Rules, 2011** and the **Legal Metrology Act, 2009**.

### The Core Engineering Innovation
Unlike naive approaches that pass noisy camera photos directly to expensive cloud LLMs (causing hallucinations, legal inadmissibility, and high recurring API costs), **e-LMPC RADAR** implements a deterministic, edge-first architecture:
1. **Perception Engine (PP-OCRv4 via ONNX):** Lightweight, high-accuracy text extraction on commodity CPU hardware with zero cloud API dependency.
2. **Barcode Optical Fiducial Calibration:** Converts 2D image pixels into physical millimeters without a physical ruler using the standardized **GS1 EAN-13 barcode ($37.29\text{ mm} \times 25.93\text{ mm}$)**.
3. **Cylindrical Surface De-warping:** Mathematically unrolls curved label text on bottles, cans, and tubes ($x = R \cdot \arcsin(x' / R)$) via OpenCV.
4. **Multi-Angle Ingestion:** Aggregates tokens across multiple photos (Front PDP, Back Panel, Crimp/Cap) to defeat glare and specular reflections.
5. **Deterministic Statutory Rule Engine:** Executes exact legal checks under Rules 6, 7, 11, 12, and Section 36.
6. **GS1 India DataKart Master Verification:** Cross-verifies physical package claims against manufacturer-registered master records.
7. **Court-Admissible Form VIII Panchnama:** Automatically generates legal seizure and compounding notice memos under Section 15 of the Legal Metrology Act.

---

## 2. Statutory Rule Coverage

| Section / Rule | Legal Mandate | Verification Mechanism |
| :--- | :--- | :--- |
| **Rule 6(1)(e)** | Maximum Retail Price (MRP) & Tax Inclusion | Entity extraction verifying price in INR and statutory clause *"inclusive of all taxes"*. |
| **Rule 6(11)** | Unit Sale Price (USP) Mandate | Mathematical consistency: checks if declared USP matches $\frac{\text{MRP}}{\text{Net Qty}}$ within round-off tolerance. |
| **Rule 6(1)(c) & Rule 12** | Net Quantity & Standard SI Units | Verifies legal SI symbols (`g`, `kg`, `ml`, `l`, `N`, `U`). Flags illegal colloquial variants (`gms`, `kilos`, `ltr`). |
| **Rule 7, Table-I** | Minimum Numeral Height in Millimeters | Measures numeral height in mm via Optical Barcode Fiducial ($S = 37.29\text{ mm} / \text{barcode\_px}$) against Principal Display Panel (PDP) area. |
| **Rule 6(1)(a)** | Manufacturer / Packer / Importer Identity | Validates complete entity name and registered physical location. |
| **Rule 6(1)(b) & 2026 Mandate** | Country of Origin | Prominently enforces origin declaration for imported and domestic commodities. |
| **Rule 6(1)(d)** | Date of Manufacture / Packing | Extracts Month & Year, or recognizes statutory embossed crimp seal notice under Rule 6(1)(d) proviso. |
| **Rule 6(1)(f)** | Consumer Care Grievance Redressal | Detects telephone helpline and consumer grievance email address. |
| **Section 36(1) & 36(2)** | Dual MRP & Sticker Tampering | Anomaly detector flagging secondary price stickers pasted over original printed prices. |
| **Section 15 & 48** | Legal Evidence Dossier & Panchnama | Compiles formal Form VIII Panchnama Seizure Memo with statutory notice clauses. |

---

## 3. Quick Start Guide

### Prerequisites
* **Python**: 3.10+ (tested on Python 3.12 / 3.14)
* **Node.js**: 18+ (tested on Node v20 & v24)
* **Docker**: for PostgreSQL container (`lmpc-postgres`)

### One-Command Unified Startup
```bash
# Starts PostgreSQL container, FastAPI backend (:8000), and Next.js UI (:3000)
./start.sh
# or:
make start
```
* **Web UI**: [http://localhost:3000](http://localhost:3000)
* **FastAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 4. Useful Make Commands

| Command | Action |
| :--- | :--- |
| `make start` | Starts entire stack (PostgreSQL + FastAPI + Next.js) |
| `make test-all` | Runs both Python (PaddleOCR + DB) and TypeScript test suites |
| `make test` | Runs end-to-end Python pipeline regression tests |
| `make test-ts` | Runs TypeScript statutory compliance test suite |
| `make lint` | Checks Python backend using Ruff with zero-cache mode |
| `make format` | Formats Python backend using Ruff |
| `make clean` | Gracefully stops dev servers on ports 3000 and 8000 |

---

## 5. Documentation Links

* [**Windows Setup Guide**](WINDOWS_GUIDE.md) : Detailed instructions for running on Windows via Docker, WSL2, or native PowerShell.
* [**Architecture & System Design**](ARCHITECTURE.md) : Detailed pipeline layout and module responsibilities.
* [**Testing Guide**](TESTING.md) : Step-by-step verification commands, curl examples, and test images.

---

## 6. Running on Windows 🪟

Teammates on Windows can run the project effortlessly:

- **1-Click Launch (Batch)**: Double-click `run-windows.bat` in File Explorer.
- **PowerShell**: Run `.\run-windows.ps1` in PowerShell.
- **Docker Compose**: Run `docker compose up --build` in Command Prompt.
- **WSL2 (Ubuntu)**: Run `make start` or `./start.sh` inside WSL.

👉 See [**WINDOWS_GUIDE.md**](WINDOWS_GUIDE.md) for full step-by-step instructions, troubleshooting, and screenshots.

