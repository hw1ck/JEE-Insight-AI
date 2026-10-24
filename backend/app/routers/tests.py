from typing import List, Optional, Union, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.test import MockTestModel
from backend.app.models.question import QuestionModel, QuestionOptionModel
from backend.app.schemas.test import MockTestSummarySchema
from backend.app.schemas.question import QuestionSchema, QuestionClientView

router = APIRouter(prefix="/tests", tags=["Mock Tests"])


class EvaluateAnswerInput(BaseModel):
    questionId: str
    selectedOption: Optional[str] = None
    numericalAnswer: Optional[Union[str, float, int]] = None



@router.get("", response_model=List[MockTestSummarySchema])
def list_mock_tests(
    test_type: Optional[str] = Query(None, alias="type"),
    subject: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve catalog of available mock tests with metadata and marking schemes."""
    query = db.query(MockTestModel)
    if test_type and test_type != "All":
        query = query.filter(MockTestModel.test_type == test_type)
    if subject and subject != "All":
        query = query.filter(MockTestModel.subject == subject)
    if difficulty and difficulty != "All":
        query = query.filter(MockTestModel.difficulty == difficulty)

    tests = query.all()
    results = []
    for t in tests:
        results.append(MockTestSummarySchema(
            id=t.id,
            title=t.title,
            type=t.test_type,
            subject=t.subject,
            questionsCount=t.questions_count,
            durationMinutes=t.duration_minutes,
            maxMarks=t.max_marks,
            difficulty=t.difficulty,
            status=t.status,
            description=t.description,
            markingScheme=t.marking_scheme
        ))
    return results


@router.get("/{test_id}", response_model=MockTestSummarySchema)
def get_test_details(test_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific mock test."""
    test = db.query(MockTestModel).filter_by(id=test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Mock test '{test_id}' not found.")

    return MockTestSummarySchema(
        id=test.id,
        title=test.title,
        type=test.test_type,
        subject=test.subject,
        questionsCount=test.questions_count,
        durationMinutes=test.duration_minutes,
        maxMarks=test.max_marks,
        difficulty=test.difficulty,
        status=test.status,
        description=test.description,
        markingScheme=test.marking_scheme
    )


@router.get("/{test_id}/questions", response_model=List[QuestionSchema])
def get_test_questions(test_id: str, db: Session = Depends(get_db)):
    """Retrieve questions belonging to a mock test for examination taking or review."""
    test = db.query(MockTestModel).filter_by(id=test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Mock test '{test_id}' not found.")

    questions = db.query(QuestionModel).filter_by(test_id=test_id).order_by(QuestionModel.question_number).all()
    results = []
    for q in questions:
        results.append(QuestionSchema(
            id=q.id,
            testId=q.test_id,
            questionNumber=q.question_number,
            subject=q.subject,
            topic=q.topic,
            chapter=q.chapter,
            statement=q.statement,
            options=[{"id": o.option_key, "text": o.text} for o in q.options],
            correctOptionId=q.correct_option_id,
            explanation=q.explanation,
            difficulty=q.difficulty,
            positiveMarks=q.positive_marks,
            negativeMarks=q.negative_marks,
            commonMisconception=q.common_misconception,
            rememberRule=q.remember_rule,
            year=q.year,
            examSession=q.exam_session,
            shift=q.shift,
            questionType=q.question_type or "single_correct",
            numericalAnswer=q.numerical_answer,
            sourcePaper=q.source_paper,
            isPyq=bool(q.is_pyq) if q.is_pyq is not None else True,
            verificationStatus=q.verification_status or "VERIFIED",
            diagramData=q.diagram_data
        ))
    return results


@router.get("/pyq/catalog/stats")
def get_pyq_catalog_stats(db: Session = Depends(get_db)):
    """Retrieve statistical summary of the integrated JEE Main Previous Year Question (PYQ) bank."""
    from sqlalchemy import func
    total = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1).count()
    by_subject = dict(db.query(QuestionModel.subject, func.count(QuestionModel.id)).filter(QuestionModel.is_pyq == 1).group_by(QuestionModel.subject).all())
    by_diff = dict(db.query(QuestionModel.difficulty, func.count(QuestionModel.id)).filter(QuestionModel.is_pyq == 1).group_by(QuestionModel.difficulty).all())
    by_type = dict(db.query(QuestionModel.question_type, func.count(QuestionModel.id)).filter(QuestionModel.is_pyq == 1).group_by(QuestionModel.question_type).all())
    by_year = {str(r[0]): r[1] for r in db.query(QuestionModel.year, func.count(QuestionModel.id)).filter(QuestionModel.is_pyq == 1, QuestionModel.year != None).group_by(QuestionModel.year).order_by(QuestionModel.year).all()}
    distinct_chapters = [r[0] for r in db.query(QuestionModel.chapter).filter(QuestionModel.is_pyq == 1).distinct().order_by(QuestionModel.chapter).all() if r[0]]
    verified_cnt = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1, QuestionModel.verification_status == "VERIFIED").count()

    official_mocks = [
        "pyq-jee-2020-p01", "pyq-jee-2020-p06", "pyq-jee-2020-p10", "pyq-jee-2020-p11", "pyq-jee-2020-p12",
        "pyq-jee-2022-jun24-s2", "pyq-jee-2023-jan31-s2", "pyq-jee-2024-jan31-s1"
    ]

    return {
        "dataset_name": "JEE Main Expanded Authentic PYQ Bank (2020-2026)",
        "license": "Apache-2.0 / CC-BY-4.0",
        "sources": [
            "Hugging Face: soughed/jee-main-questions",
            "Hugging Face: ruh-ai/grafite-jee-mains-qna-no-img",
            "Hugging Face: PhysicsWallahAI/JEE-Main-2025-Math",
            "EduDevCommons / NTA Examination Archive"
        ],
        "total_pyq_questions": total,
        "verified_questions": verified_cnt,
        "subject_distribution": by_subject,
        "difficulty_distribution": by_diff,
        "question_type_distribution": by_type,
        "year_distribution": by_year,
        "available_years": sorted([int(y) for y in by_year.keys()]),
        "total_distinct_chapters": len(distinct_chapters),
        "available_chapters_sample": distinct_chapters[:20],
        "official_full_mock_papers": official_mocks
    }


@router.get("/pyq/bank/search")
def search_pyq_bank(
    year: Optional[int] = Query(None, description="Filter by exam year, e.g. 2024, 2023, 2022, 2021, 2020"),
    exam_session: Optional[str] = Query(None, description="Filter by exam session"),
    shift: Optional[str] = Query(None, description="Filter by shift"),
    subject: Optional[str] = None,
    chapter: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search and filter the integrated Question Bank across all 7,784 authentic PYQs."""
    query = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1)

    if year is not None:
        query = query.filter(QuestionModel.year == year)
    if exam_session and exam_session != "All":
        query = query.filter(QuestionModel.exam_session.ilike(f"%{exam_session}%"))
    if shift and shift != "All":
        query = query.filter(QuestionModel.shift.ilike(f"%{shift}%"))
    if subject and subject != "All":
        query = query.filter(QuestionModel.subject == subject)
    if chapter and chapter != "All":
        query = query.filter(QuestionModel.chapter.ilike(f"%{chapter}%"))
    if topic and topic != "All":
        query = query.filter(QuestionModel.topic.ilike(f"%{topic}%"))
    if difficulty and difficulty != "All":
        query = query.filter(QuestionModel.difficulty == difficulty)
    if question_type and question_type != "All":
        query = query.filter(QuestionModel.question_type == question_type)
    if search:
        query = query.filter(QuestionModel.statement.ilike(f"%{search}%"))

    total_count = query.count()
    items = query.order_by(QuestionModel.id).offset(offset).limit(limit).all()

    results = []
    for q in items:
        results.append(QuestionSchema(
            id=q.id,
            testId=q.test_id,
            questionNumber=q.question_number,
            subject=q.subject,
            topic=q.topic,
            chapter=q.chapter,
            statement=q.statement,
            options=[{"id": o.option_key, "text": o.text} for o in q.options],
            correctOptionId=q.correct_option_id,
            explanation=q.explanation,
            difficulty=q.difficulty,
            positiveMarks=q.positive_marks,
            negativeMarks=q.negative_marks,
            commonMisconception=q.common_misconception,
            rememberRule=q.remember_rule,
            year=q.year,
            examSession=q.exam_session,
            shift=q.shift,
            questionType=q.question_type or "single_correct",
            numericalAnswer=q.numerical_answer,
            sourcePaper=q.source_paper,
            isPyq=bool(q.is_pyq) if q.is_pyq is not None else True,
            verificationStatus=q.verification_status or "VERIFIED",
            diagramData=q.diagram_data
        ))

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": results
    }


@router.post("/pyq/generate-practice", response_model=MockTestSummarySchema)
def generate_practice_test(
    title: str = Query(..., description="Custom practice test title"),
    year: Optional[int] = Query(None, description="Filter practice questions by examination year"),
    exam_session: Optional[str] = Query(None, description="Filter by exam session"),
    shift: Optional[str] = Query(None, description="Filter by exam shift"),
    subject: Optional[str] = Query(None, description="Physics, Chemistry, Mathematics, or All"),
    chapter: Optional[str] = Query(None, description="Filter questions by chapter"),
    difficulty: Optional[str] = Query("Mixed", description="Easy, Medium, Hard, or Mixed"),
    question_type: Optional[str] = Query(None, description="single_correct, numerical, or All"),
    questions_count: int = Query(25, ge=5, le=75, description="Number of questions (5-75)"),
    duration_minutes: int = Query(60, ge=15, le=180, description="Test duration in minutes"),
    db: Session = Depends(get_db)
):
    """
    Generate a dynamic practice mock test from the verified PYQ question bank.
    Creates a new test in mock_tests and associates selected PYQs with it.
    """
    import uuid
    from datetime import datetime

    query = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1)

    if year is not None:
        query = query.filter(QuestionModel.year == year)
    if exam_session and exam_session != "All":
        query = query.filter(QuestionModel.exam_session.ilike(f"%{exam_session}%"))
    if shift and shift != "All":
        query = query.filter(QuestionModel.shift.ilike(f"%{shift}%"))
    if subject and subject != "All":
        query = query.filter(QuestionModel.subject == subject)
    if chapter and chapter != "All":
        query = query.filter(QuestionModel.chapter.ilike(f"%{chapter}%"))
    if difficulty and difficulty != "Mixed":
        query = query.filter(QuestionModel.difficulty == difficulty)
    if question_type and question_type != "All":
        query = query.filter(QuestionModel.question_type == question_type)

    available_qs = query.all()
    if len(available_qs) < questions_count:
        # Fall back to broadening difficulty if not enough questions
        if difficulty and difficulty != "Mixed":
            fallback_query = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1)
            if year is not None:
                fallback_query = fallback_query.filter(QuestionModel.year == year)
            if subject and subject != "All":
                fallback_query = fallback_query.filter(QuestionModel.subject == subject)
            available_qs = fallback_query.all()

    if not available_qs:
        raise HTTPException(status_code=400, detail="No matching questions found in question bank for criteria.")

    import random
    selected_qs = random.sample(available_qs, min(questions_count, len(available_qs)))

    test_id = f"test-custom-{uuid.uuid4().hex[:8]}"
    test_type = "Subject" if subject and subject != "All" else ("Chapter" if chapter else "Full-Length")

    new_test = MockTestModel(
        id=test_id,
        title=title,
        test_type=test_type,
        subject=subject if subject != "All" else None,
        questions_count=len(selected_qs),
        duration_minutes=duration_minutes,
        max_marks=len(selected_qs) * 4,
        difficulty=difficulty or "Moderate",
        status="Available",
        description=f"Generated practice test with {len(selected_qs)} authentic JEE Main PYQs.",
        marking_scheme={"correct": 4, "incorrect": -1, "unattempted": 0},
        created_at=datetime.utcnow()
    )
    db.add(new_test)
    db.flush()

    # Link selected questions to this new test
    for q_idx, q in enumerate(selected_qs, start=1):
        # Create a test question instance for this test
        t_qid = f"{test_id}-q{q_idx:02d}"
        test_q = QuestionModel(
            id=t_qid,
            test_id=test_id,
            question_number=q_idx,
            subject=q.subject,
            topic=q.topic,
            concept_id=q.concept_id,
            statement=q.statement,
            correct_option_id=q.correct_option_id,
            explanation=q.explanation,
            difficulty=q.difficulty,
            positive_marks=4.0,
            negative_marks=-1.0 if q.question_type == "single_correct" else 0.0,
            common_misconception=q.common_misconception,
            remember_rule=q.remember_rule,
            year=q.year,
            exam_session=q.exam_session,
            shift=q.shift,
            chapter=q.chapter,
            question_type=q.question_type,
            numerical_answer=q.numerical_answer,
            source_paper=f"Practice Test: {title}",
            is_pyq=0,
            verification_status=q.verification_status,
            diagram_data=q.diagram_data
        )
        db.add(test_q)
        for opt in q.options:
            db.add(QuestionOptionModel(
                id=f"{t_qid}-{opt.option_key}",
                question_id=t_qid,
                option_key=opt.option_key,
                text=opt.text
            ))

    db.commit()

    return MockTestSummarySchema(
        id=new_test.id,
        title=new_test.title,
        type=new_test.test_type,
        subject=new_test.subject,
        questionsCount=new_test.questions_count,
        durationMinutes=new_test.duration_minutes,
        maxMarks=new_test.max_marks,
        difficulty=new_test.difficulty,
        status=new_test.status,
        description=new_test.description,
        markingScheme=new_test.marking_scheme
    )


@router.post("/pyq/evaluate-answer")
def evaluate_question_answer(
    payload: EvaluateAnswerInput,
    db: Session = Depends(get_db)
):
    """
    Authoritative server-side evaluation of an individual practice question response.
    Supports both Single Correct MCQ (+4/-1) and Numerical Value (+4/0) questions.
    """
    question = db.query(QuestionModel).filter_by(id=payload.questionId).first()
    if not question:
        raise HTTPException(status_code=404, detail=f"Question '{payload.questionId}' not found.")

    q_type = question.question_type or "single_correct"
    is_correct = False
    positive_marks = question.positive_marks or 4.0
    negative_marks = question.negative_marks if question.negative_marks is not None else (-1.0 if q_type == "single_correct" else 0.0)

    if q_type == "single_correct":
        user_sel = (payload.selectedOption or "").strip().upper()
        correct_key = (question.correct_option_id or "").strip().upper()
        if user_sel:
            is_correct = (user_sel == correct_key)
            marks_awarded = positive_marks if is_correct else negative_marks
        else:
            marks_awarded = 0.0
    else:
        # Numerical question evaluation
        user_num = payload.numericalAnswer or payload.selectedOption
        if user_num is not None and str(user_num).strip() != "":
            raw_user = str(user_num).strip()
            raw_target = str(question.numerical_answer or "").strip()
            try:
                val_user = float(raw_user)
                val_target = float(raw_target)
                is_correct = abs(val_user - val_target) <= 0.05
            except (ValueError, TypeError):
                is_correct = (raw_user.lower() == raw_target.lower())
            marks_awarded = positive_marks if is_correct else 0.0
        else:
            marks_awarded = 0.0

    return {
        "questionId": question.id,
        "questionType": q_type,
        "isCorrect": is_correct,
        "marksAwarded": marks_awarded,
        "positiveMarks": positive_marks,
        "negativeMarks": negative_marks,
        "correctOptionId": question.correct_option_id,
        "numericalAnswer": question.numerical_answer,
        "explanation": question.explanation or "Worked solution not currently available for this transcription.",
        "rememberRule": question.remember_rule,
        "commonMisconception": question.common_misconception
    }

