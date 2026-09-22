# e-LMPC RADAR : Technical Architecture & System Design

**Smart India Hackathon 2026 — Problem Statement 26034**  
*Department of Consumer Affairs (DoCA), Ministry of Consumer Affairs, Food & Public Distribution*

---

## 1. System Topology

```mermaid
flowchart TD
    subgraph UI ["1. Presentation Layer (frontend/ Next.js 14)"]
        A["Mobile / Desktop UI"] --> B["Multi-Angle Camera Capture<br/>(Angle 1: PDP, Angle 2: Reg Panel, Angle 3: Crimp)"]
        B --> C["Review & Statutory Audit Panel<br/>(Bounding boxes & Manual Officer Override)"]
    end

    subgraph API ["2. API & Ingestion Gateway (backend/ FastAPI)"]
        D["POST /api/ocr/extract<br/>(Multi-image payload & cylindrical flag)"]
        E["POST /api/audit<br/>(Statutory evaluation engine)"]
        F["GET /api/reports/panchnama<br/>(Form VIII seizure memo generator)"]
        G["GET /api/gs1/{gtin}<br/>(DataKart registry verification)"]
    end

    subgraph Vision ["3. Computer Vision & Metrology Pipeline"]
        H["OpenCV Dewarping (cylindrical_dewarp.py)<br/>Inverse transform: x = R · arcsin(x'/R)"]
        I["PaddleOCR (PP-OCRv4 ONNX)<br/>Text detection & recognition"]
        J["Multi-Angle Aggregator (ocr_parser.py)<br/>Merges declarations across multiple shots"]
        K["GS1 Optical Scale Fiducial (calibration.py)<br/>37.29mm EAN-13 provides exact mm/px scale"]
    end

    subgraph Engine ["4. Deterministic Statutory Rule Engine (rules.py)"]
        L["Rule 6(1) Declarations (MRP, Taxes, Net Qty, Mfg Date, Address)"]
        M["Rule 7 Table-I Numeral Height (mm vs PDP Area)"]
        N["Rule 6(11) Unit Sale Price Verification (MRP ÷ Net Qty)"]
        O["Section 36(1) Dual Pricing & Sticker Tampering"]
    end

    subgraph Storage ["5. Persistence & Master Data"]
        P[("PostgreSQL 16 Database<br/>(High-throughput AsyncPG pool)")]
        Q["GS1 India DataKart Seed Records<br/>(Authentic brand owner metadata)"]
    end

    UI --> API
    D --> Vision
    Vision --> Engine
    E --> Engine
    Engine --> Storage
    Engine --> F
```

---

## 2. Directory Layout & Module Responsibilities

```
sih/
├── Makefile                      # Team command runner (start, test, lint, clean)
├── start.sh                      # Single unified launcher (PostgreSQL + FastAPI + Next.js)
├── README.md                     # Project overview and setup instructions
├── ARCHITECTURE.md               # System design and pipeline topology
├── TESTING.md                    # Comprehensive test guide and API examples
├── .gitignore                    # Production gitignore (filters out caches and build artifacts)
├── .vscode/                      # Team VS Code settings (Pylance path resolution, Ruff on save)
│   ├── settings.json
│   └── extensions.json
│
├── backend/                      # Python FastAPI Statutory Compliance Service
│   ├── main.py                   # FastAPI entrypoint with async lifespan pool manager
│   ├── pyproject.toml            # Python 3.10+ package metadata and Ruff linting rules
│   ├── requirements.txt          # Python dependencies
│   ├── app/
│   │   ├── config.py             # App settings (database URL, ports, optical constants)
│   │   ├── database.py           # AsyncPG connection pool and PostgreSQL tables
│   │   ├── schemas.py            # Pydantic v2 CamelModel schemas (bidirectional camelCase)
│   │   ├── api/
│   │   │   ├── routes_ocr.py     # Multi-image OCR ingestion endpoint
│   │   │   ├── routes_inspect.py # Statutory rule evaluation and audit endpoints
│   │   │   └── routes_gs1.py     # GS1 DataKart query endpoints
│   │   └── engine/
│   │       ├── calibration.py    # GS1 EAN-13 barcode optical scale fiducial math
│   │       ├── cylindrical_dewarp.py # Inverse cylindrical unrolling via OpenCV remap
│   │       ├── ocr_parser.py     # Statutory lexical parser & multi-angle aggregator
│   │       ├── panchnama.py      # Legal Metrology Form VIII Panchnama Notice compiler
│   │       ├── rules.py          # Deterministic LMPC statutory evaluation engine
│   │       └── sample_data.py    # Curated packaging test cases
│   └── tests/
│       └── test_inspection.py    # End-to-end regression test suite
│
├── frontend/                     # Next.js 14 Frontend Application
│   ├── package.json              # Next.js dependencies and build scripts
│   ├── tailwind.config.js        # Official Government / Legal Metrology palette
│   └── src/
│       ├── app/                  # Next.js App Router (page.tsx, layout.tsx)
│       ├── components/           # UI widgets (CameraUploadModal, InspectionView, etc.)
│       ├── lib/                  # Client-side barcode scanning and sample data
│       └── types/                # Strict TypeScript interfaces (lmpc.ts)
│
└── rescources/                   # SIH Problem Statement, regulatory acts, and test images
    ├── SIH26034.md               # SIH Problem Statement description
    ├── law/                      # Official Government Gazettes and Legal Metrology Acts
    ├── facewash-image.jpeg       # Benchmark squeeze tube test specimen
    ├── test-sample-box.jpg       # Carton package test specimen
    ├── test-sample-curved-bottle.jpg # Cylindrical curved bottle test specimen
    └── test-sample-tube.jpg      # Squeeze tube test specimen
```

---

## 3. Key Technical Decisions

1. **Pure PaddleOCR (Zero Tesseract)**:
   - RapidOCR ONNX runtime running PP-OCRv4 achieves sub-second inference on standard CPU hardware without GPU requirements.
2. **Deterministic Mathematical Compliance vs LLMs**:
   - Court admissibility requires 100% reproducible evidence. The statutory rule engine calculates font heights ($S \times \text{px}$), Unit Sale Price ($\text{MRP} / \text{Qty}$), and standard SI symbols with exact mathematical formulas rather than probabilistic LLMs.
3. **GS1 Barcode as Optical Fiducial**:
   - Solves the physical scale problem without requiring inspectors to carry physical calibration rulers. Standard GS1 EAN-13 barcodes are manufactured to nominal $37.29\text{ mm}$ width.
4. **Multi-Angle Ingestion**:
   - Solves reflections and cylindrical packaging by aggregating OCR tokens across multiple photos taken by the inspector.
