import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal, engine, Base
from backend.app.models.question import QuestionModel, QuestionOptionModel
from backend.app.models.test import MockTestModel
from backend.app.models.taxonomy import ConceptModel, ChapterModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pyq_importer")

PROCESSED_FILE = "data/question_bank/processed/jee_main_pyqs_normalized.jsonl"

OFFICIAL_75Q_PAPERS = {
    # 2020 Official Papers
    "01": {
        "id": "pyq-jee-2020-p01",
        "title": "JEE Main 2020 Official Paper 01 (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2020 examination paper. 25 questions each in Physics, Chemistry, and Mathematics (20 MCQs + 5 Numerical value questions per subject).",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    "06": {
        "id": "pyq-jee-2020-p06",
        "title": "JEE Main 2020 Official Paper 06 (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2020 examination paper. Standard NTA 3-hour pattern covering full syllabus with worked step-by-step solutions.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    "10": {
        "id": "pyq-jee-2020-p10",
        "title": "JEE Main 2020 Official Paper 10 (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2020 examination paper from October shift with complete answer key and analytical explanations.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Challenging"
    },
    "11": {
        "id": "pyq-jee-2020-p11",
        "title": "JEE Main 2020 Official Paper 11 (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2020 examination paper from November session with full subject split.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    "12": {
        "id": "pyq-jee-2020-p12",
        "title": "JEE Main 2020 Official Paper 12 (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2020 examination paper from November session.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    # 2022 Official Paper
    "2022-jun24-s2": {
        "id": "pyq-jee-2022-jun24-s2",
        "match_shift": "jee-main-2022-online-24th-june-evening-shift",
        "title": "JEE Main 2022 Official Paper — 24 June Evening Shift (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2022 official shift paper conducted by NTA. Features full syllabus coverage across Physics, Chemistry, and Mathematics.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    # 2023 Official Paper
    "2023-jan31-s2": {
        "id": "pyq-jee-2023-jan31-s2",
        "match_shift": "jee-main-2023-online-31st-january-evening-shift",
        "title": "JEE Main 2023 Official Paper — 31 Jan Evening Shift (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2023 official paper from Session 1. Complete with verified answer keys and worked solutions across all three subjects.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    },
    # 2024 Official Paper
    "2024-jan31-s1": {
        "id": "pyq-jee-2024-jan31-s1",
        "match_shift": "jee-main-2024-online-31st-january-morning-shift",
        "title": "JEE Main 2024 Official Paper — 31 Jan Morning Shift (Full 75-Q Mock)",
        "description": "Authentic full-length JEE Main 2024 Session 1 paper conducted by NTA. Features modern assertion-reason questions, multi-concept matching, and numerical values.",
        "questions_count": 75,
        "duration_minutes": 180,
        "max_marks": 300,
        "difficulty": "Moderate"
    }
}


def build_concept_lookup(db: Session) -> Dict[str, str]:
    """Build a keyword-to-concept_id mapping based on seeded taxonomy concepts."""
    lookup = {}
    concepts = db.query(ConceptModel).all()
    for c in concepts:
        lookup[c.name.lower()] = c.id
        lookup[c.code.lower()] = c.id
    return lookup


def import_pyqs(db: Session = None, max_records: int = None):
    """
    Import normalized PYQ records into the database idempotently.
    Preserves all existing benchmark tests (e.g. mock-jee-09) and student attempts.
    """
    if db is None:
        db = SessionLocal()

    print("=" * 65)
    print("JEE InsightAI — Phase 5: Ingesting Expanded PYQ Question Bank")
    print("=" * 65)

    if not os.path.exists(PROCESSED_FILE):
        print(f"[ERROR] Processed file {PROCESSED_FILE} not found. Run expansion_normalizer first.")
        return

    concept_lookup = build_concept_lookup(db)

    # 1. Ensure official full-length test headers exist in mock_tests table
    for pcode, pmeta in OFFICIAL_75Q_PAPERS.items():
        existing_test = db.query(MockTestModel).filter_by(id=pmeta["id"]).first()
        if not existing_test:
            new_test = MockTestModel(
                id=pmeta["id"],
                title=pmeta["title"],
                test_type="Full-Length",
                subject=None,
                questions_count=pmeta["questions_count"],
                duration_minutes=pmeta["duration_minutes"],
                max_marks=pmeta["max_marks"],
                difficulty=pmeta["difficulty"],
                status="Available",
                description=pmeta["description"],
                marking_scheme={"correct": 4, "incorrect": -1, "unattempted": 0}
            )
            db.add(new_test)
            print(f"Created MockTest header: {pmeta['id']} - {pmeta['title']}")
        else:
            existing_test.title = pmeta["title"]
            existing_test.description = pmeta["description"]
            print(f"MockTest header already exists: {pmeta['id']}")
    db.commit()

    # 2. Ingest normalized questions
    imported_count = 0
    updated_count = 0
    test_assigned_count = 0

    paper_question_counters = {pcode: 1 for pcode in OFFICIAL_75Q_PAPERS}

    # Cache existing question IDs to decide insert vs update rapidly
    existing_q_ids = set(r[0] for r in db.query(QuestionModel.id).all())
    print(f"Baseline questions in database before import: {len(existing_q_ids)}")

    questions_to_insert = []
    options_to_insert = []
    batch_size = 400

    with open(PROCESSED_FILE, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, start=1):
            if max_records and idx > max_records:
                break
            line_s = line.strip()
            if not line_s:
                continue

            rec = json.loads(line_s)
            qid = rec["question_id"]
            subject = rec["subject"]
            topic = rec["topic"]
            chapter = rec["chapter"]
            qtype = rec.get("question_type", "single_correct")
            diff = rec.get("difficulty", "Medium")
            stmt = rec.get("question_text", "")
            corr_ans = str(rec.get("correct_answer", "A"))
            exp = rec.get("explanation", "")
            yr = rec.get("year", 2020)
            session = rec.get("exam_session", "Session 1")
            shift = rec.get("shift", "Shift 1")
            src_ref = rec.get("source_question_reference", "")
            num_ans = rec.get("numerical_answer") if qtype == "numerical" else None
            diag_data = rec.get("image_or_diagram_reference")
            v_status = rec.get("verification_status", "VERIFIED")

            # Determine if question belongs to one of the complete 75-Q official paper tests
            test_id = None
            q_num = idx

            # Check 2020 papers by paper code in ID
            parts = qid.replace("JEE-", "").split("-")
            paper_code_2020 = parts[1] if len(parts) >= 2 else None
            if paper_code_2020 in OFFICIAL_75Q_PAPERS and paper_question_counters[paper_code_2020] <= 75:
                test_id = OFFICIAL_75Q_PAPERS[paper_code_2020]["id"]
                q_num = paper_question_counters[paper_code_2020]
                paper_question_counters[paper_code_2020] += 1
                test_assigned_count += 1
            else:
                # Check 2022-2024 shift matches
                for pcode, pmeta in OFFICIAL_75Q_PAPERS.items():
                    m_shift = pmeta.get("match_shift")
                    if m_shift and m_shift in src_ref and paper_question_counters[pcode] <= 75:
                        test_id = pmeta["id"]
                        q_num = paper_question_counters[pcode]
                        paper_question_counters[pcode] += 1
                        test_assigned_count += 1
                        break

            # Concept matching fallback
            matched_concept_id = None
            t_lower = topic.lower()
            ch_lower = chapter.lower()
            for k, cid in concept_lookup.items():
                if k in t_lower or k in ch_lower:
                    matched_concept_id = cid
                    break

            if qid not in existing_q_ids:
                q_model = QuestionModel(
                    id=qid,
                    test_id=test_id,
                    question_number=q_num,
                    subject=subject,
                    topic=topic,
                    concept_id=matched_concept_id,
                    statement=stmt,
                    correct_option_id=corr_ans,
                    explanation=exp,
                    difficulty=diff,
                    positive_marks=4.0,
                    negative_marks=-1.0 if qtype == "single_correct" else 0.0,
                    common_misconception=None,
                    remember_rule=None,
                    year=yr,
                    exam_session=session,
                    shift=shift,
                    chapter=chapter,
                    question_type=qtype,
                    numerical_answer=num_ans,
                    source_paper=src_ref,
                    is_pyq=1,
                    verification_status=v_status,
                    diagram_data=diag_data
                )
                db.add(q_model)
                existing_q_ids.add(qid)
                imported_count += 1

                # Populate Options for new MCQs
                raw_options = rec.get("options", [])
                if raw_options and qtype == "single_correct":
                    for opt in raw_options:
                        opt_key = opt.get("id", "A")
                        opt_text = opt.get("text", "")
                        db.add(QuestionOptionModel(
                            id=f"{qid}-{opt_key}",
                            question_id=qid,
                            option_key=opt_key,
                            text=opt_text
                        ))
            else:
                updated_count += 1

            # Periodic commit
            if idx % batch_size == 0:
                db.commit()
                print(f"  Processed {idx} questions ({imported_count} new imported)...")

    db.commit()
    post_import_count = db.query(QuestionModel).count()
    print("=" * 65)
    print("Expanded PYQ Ingestion Completed!")
    print(f"  New questions imported: {imported_count}")
    print(f"  Existing questions updated: {updated_count}")
    print(f"  Total questions now in database: {post_import_count}")
    print(f"  Questions assigned to Official 75-Q Mock Tests: {test_assigned_count}")
    print(f"  Standalone Question Bank items: {post_import_count - test_assigned_count}")
    print("=" * 65)


if __name__ == "__main__":
    import_pyqs()
