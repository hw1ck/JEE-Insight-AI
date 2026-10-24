# JEE InsightAI — PYQ Dataset Expansion & Ingestion Reproducibility Guide

This document describes the exact pipeline, provenance, and CLI commands to reproduce the dataset expansion (2020–2026), normalization, and database integration for **JEE InsightAI**.

---

## 1. Source Inventory & Provenance

| Source Name | Repository / URL | License | Examination Years |
| :--- | :--- | :---: | :---: |
| **soughed/jee-main-questions** | [Hugging Face Hub](https://huggingface.co/datasets/soughed/jee-main-questions) | CC-BY-4.0 | 2020, 2021 |
| **ruh-ai/grafite-jee-mains-qna-no-img** | [Hugging Face Hub](https://huggingface.co/datasets/ruh-ai/grafite-jee-mains-qna-no-img) | Apache-2.0 | 2022, 2023, 2024 |
| **PhysicsWallahAI/JEE-Main-2025-Math** | [Hugging Face Hub](https://huggingface.co/datasets/PhysicsWallahAI/JEE-Main-2025-Math) | Apache-2.0 / Open Access | 2025 (Jan & Apr) |
| **samyakbayar/JEEMainsDataset** | [Hugging Face Hub](https://huggingface.co/datasets/samyakbayar/JEEMainsDataset) | MIT | 2026 (Shift Telemetry) |

All source manifests and SHA256 checksums are stored in [`data/question_bank/metadata/source_inventory.json`](file:///c:/Users/SRIJESH/OneDrive/Desktop/JEE%20Insight%20AI/data/question_bank/metadata/source_inventory.json).

---

## 2. Step-by-Step Reproduction Procedure

### Step 1: Download & Organize Source Files
Downloads raw CSV and JSONL datasets into year-partitioned directories (`data/question_bank/raw/2022/`, `2023/`, `2024/`, `2025/`, `2026/`):
```bash
python data/question_bank/downloader.py
```

### Step 2: Normalize, Deduplicate & Verify
Processes raw data, standardizes subject/chapter taxonomy, cleans question statements, verifies answer options, and generates `data/question_bank/processed/jee_main_pyqs_normalized.jsonl`:
```bash
python data/question_bank/expansion_normalizer.py
```

### Step 3: Back Up Existing Database
Creates a point-in-time snapshot before running database imports:
```bash
copy jee_insight.db jee_insight_backup.db
```

### Step 4: Ingest into SQLite Database
Idempotently loads all 7,784 authentic questions and options into `jee_insight.db`, creates full mock test headers for 2022, 2023, and 2024, and links 600 questions to official papers:
```bash
python -m backend.app.seed.pyq_importer
```

### Step 5: Execute Automated Verification Tests
Runs pytest to verify unique IDs, subject distributions, option preservation, year filtering, and official full mock tests:
```bash
python -m pytest backend/tests/test_pyq_bank.py
```

---

## 3. Database Schema Reference

The questions are integrated into `QuestionModel` (`questions` table) and `QuestionOptionModel` (`question_options` table) with the following key fields:
- `id`: Stable unique identifier, e.g. `JEE-2024-1l54zeapq`
- `year`: Examination year (2020, 2021, 2022, 2023, 2024, 2025)
- `exam_session`: Examination session, e.g. "January Session", "April Session"
- `shift`: Examination shift, e.g. "Morning Shift", "Evening Shift"
- `subject`: Physics, Chemistry, or Mathematics
- `chapter`: Standardized syllabus chapter
- `question_type`: `single_correct` (MCQ) or `numerical`
- `is_pyq`: 1 for authentic PYQs
- `verification_status`: `VERIFIED` or `NEEDS_REVIEW`

---

## 4. API Endpoints

- **Catalog Statistics**: `GET /api/v1/tests/pyq/catalog/stats`
- **Question Bank Search**: `GET /api/v1/tests/pyq/bank/search?year=2024&subject=Physics&limit=20`
- **Generate Custom Practice Test**: `POST /api/v1/tests/pyq/generate-practice?title=2024%20Sprint&year=2024&questions_count=15`
- **Full Mock Paper Questions**: `GET /api/v1/tests/{paper_id}/questions`
