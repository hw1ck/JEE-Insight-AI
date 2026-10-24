# JEE InsightAI — Expanded PYQ Dataset Coverage Matrix & Quality Audit (2020–2026)

**Last Audit Generated**: Post-Ingestion Verification (Phase 10)  
**Total Questions in Database**: **7,824**  
**Total Authentic JEE Main PYQs**: **7,784**  
**Baseline Questions (Pre-Expansion)**: 2,241 (Years 2020 & 2021)  
**Newly Added Questions (Expansion)**: 5,543 (Years 2022, 2023, 2024 & 2025)  
**Verified Answers**: 7,505 (96.4%)  
**Needs Review / Ambiguous**: 279 (3.6%)  
**Total Distinct Chapters Covered**: 244  
**Full-Length 75-Q Official Mock Papers**: 8 Full Papers  

---

## 1. Multi-Year Examination Coverage Summary

| Examination Year | Official Sessions Covered | Total PYQs | Physics | Chemistry | Mathematics | Single Correct (MCQ) | Numerical | Primary Provenance & License |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **2020** | Jan, Oct, Nov, Dec Series | **1,795** | 609 | 591 | 595 | 1,391 | 404 | `soughed/jee-main-questions` (CC-BY-4.0) |
| **2021** | Jan Official Shifts | **446** | 148 | 140 | 158 | 336 | 110 | `soughed/jee-main-questions` (CC-BY-4.0) |
| **2022** | June & July Sessions (23 Shifts) | **1,723** | 536 | 512 | 675 | 1,223 | 500 | `ruh-ai/grafite-jee-mains-qna-no-img` (Apache-2.0) |
| **2023** | Jan & April Sessions (24 Shifts) | **1,805** | 557 | 517 | 731 | 1,257 | 548 | `ruh-ai/grafite-jee-mains-qna-no-img` (Apache-2.0) |
| **2024** | Jan & April Sessions (20 Shifts) | **1,540** | 517 | 448 | 575 | 1,067 | 473 | `ruh-ai/grafite-jee-mains-qna-no-img` (Apache-2.0) |
| **2025** | Jan & April Official Sets | **475** | 0 | 0 | 475 | 160 | 315 | `PhysicsWallahAI/JEE-Main-2025-Math` (Apache-2.0) |
| **2026** | Jan Session (21-29 Jan 2026) | *Telemetry* | — | — | — | — | — | NTA Official Archive & EduDevCommons (Telemetry) |
| **TOTAL** | **2020–2026 Full Bank** | **7,784** | **2,367** | **2,208** | **3,209** | **5,434** | **2,350** | **Multi-Source Licensed Open Access** |

*Note on 2026 Examination*: NTA conducted JEE Main 2026 Session 1 on January 21–29, 2026. Official response sheets and final keys are candidate-login restricted on `jeemain.nta.nic.in`. Raw shift telemetry and registration analytics are cataloged under `data/question_bank/raw/2026/jee_2026_shift_analysis.csv`.

---

## 2. Official 75-Question Full-Length Mock Papers

The database contains 8 full-length, authentic examination papers configured in `mock_tests` with 25 questions in Physics, 25 in Chemistry, and 25 in Mathematics (20 MCQs + 5 Numerical values per subject):

| Test ID | Paper Title | Year / Shift | Total Questions | Max Marks | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `pyq-jee-2024-jan31-s1` | JEE Main 2024 Official Paper — 31 Jan Morning Shift | 2024 (Jan S1) | 75 | 300 | 180 min |
| `pyq-jee-2023-jan31-s2` | JEE Main 2023 Official Paper — 31 Jan Evening Shift | 2023 (Jan S2) | 75 | 300 | 180 min |
| `pyq-jee-2022-jun24-s2` | JEE Main 2022 Official Paper — 24 June Evening Shift | 2022 (Jun S2) | 75 | 300 | 180 min |
| `pyq-jee-2020-p01` | JEE Main 2020 Official Paper 01 | 2020 (Paper 01) | 75 | 300 | 180 min |
| `pyq-jee-2020-p06` | JEE Main 2020 Official Paper 06 | 2020 (Paper 06) | 75 | 300 | 180 min |
| `pyq-jee-2020-p10` | JEE Main 2020 Official Paper 10 | 2020 (Oct Shift) | 75 | 300 | 180 min |
| `pyq-jee-2020-p11` | JEE Main 2020 Official Paper 11 | 2020 (Nov Shift) | 75 | 300 | 180 min |
| `pyq-jee-2020-p12` | JEE Main 2020 Official Paper 12 | 2020 (Nov Shift) | 75 | 300 | 180 min |

---

## 3. Database Persistence & Regression Verification

- **Total Questions**: 7,824 (7,784 PYQs + 40 benchmark questions)
- **Total Question Options**: 21,884
- **Student Attempts Preserved**: 9/9 attempts (100% data integrity)
- **Student Profile Preserved**: 1 profile (100% data integrity)
- **Study Tasks Preserved**: 32/32 tasks (100% data integrity)
- **Automated Tests**: 35/35 passing (`pytest backend/tests`)
- **Frontend Production Build**: Clean build, 0 errors (`npm run build`)
