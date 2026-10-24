import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.test import MockTestModel
from backend.app.models.question import QuestionModel
from backend.app.models.attempt import (
    TestAttemptModel, AttemptResponseModel, QuestionTelemetryModel
)
from backend.app.schemas.attempt import (
    StartAttemptInput, SubmitAttemptInput, QuestionResponseInput,
    QuestionTelemetryInput, TestAttemptResponse
)
from backend.app.services.scoring import ScoringEngine

router = APIRouter(prefix="/attempts", tags=["Test Attempts & Telemetry"])


@router.post("/start")
def start_attempt(
    payload: StartAttemptInput,
    test_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Initializes a new attempt session in the database."""
    target_test_id = test_id or payload.testId
    if not target_test_id:
        raise HTTPException(status_code=400, detail="Test ID must be provided in payload or query parameter.")
    test = db.query(MockTestModel).filter_by(id=target_test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail=f"Mock test '{target_test_id}' not found.")

    attempt_id = f"attempt-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}"
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    attempt = TestAttemptModel(
        id=attempt_id,
        student_id=payload.studentId or "student-aarav-01",
        test_id=test.id,
        test_title=test.title,
        date=today_str,
        start_time=datetime.utcnow(),
        submission_time=None,
        time_spent_seconds=0,
        score=0.0,
        total_marks=test.max_marks,
        correct_count=0,
        incorrect_count=0,
        unattempted_count=test.questions_count,
        accuracy=0.0,
        status="in_progress",
        marking_scheme=test.marking_scheme,
        subject_breakdown={},
        topic_breakdown=[],
        observations=[]
    )
    db.add(attempt)
    db.commit()

    return {
        "attemptId": attempt_id,
        "testId": test.id,
        "testTitle": test.title,
        "startTime": attempt.start_time.isoformat(),
        "status": "in_progress"
    }


@router.get("/{attempt_id}/state")
def get_attempt_state(
    attempt_id: str,
    db: Session = Depends(get_db)
):
    """
    Returns authoritative recovery state for an in-progress CBT attempt:
    elapsed seconds, remaining seconds, status, and saved question responses.
    Allows CBT session recovery without losing student answers or duplicating submissions.
    """
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    test = db.query(MockTestModel).filter_by(id=attempt.test_id).first()
    duration_seconds = (test.duration_minutes * 60) if test else 10800

    now = datetime.utcnow()
    elapsed = int((now - attempt.start_time).total_seconds()) if attempt.start_time else 0
    remaining_seconds = max(0, duration_seconds - elapsed)

    responses = db.query(AttemptResponseModel).filter_by(attempt_id=attempt.id).all()
    resp_dict = {}
    for r in responses:
        resp_dict[r.question_id] = {
            "selectedOption": r.selected_option,
            "markedForReview": r.marked_for_review,
            "timeSpentSeconds": r.time_spent_seconds
        }

    return {
        "attemptId": attempt.id,
        "testId": attempt.test_id,
        "testTitle": attempt.test_title,
        "status": attempt.status,
        "startTime": attempt.start_time.isoformat() if attempt.start_time else None,
        "elapsedSeconds": elapsed,
        "remainingSeconds": remaining_seconds,
        "responses": resp_dict
    }


@router.post("/{attempt_id}/response")
def record_question_response(
    attempt_id: str,
    question_id: str,
    payload: QuestionResponseInput,
    db: Session = Depends(get_db)
):
    """Records or updates an individual question selection during active test taking."""
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    if attempt.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot modify a submitted examination attempt.")

    resp = db.query(AttemptResponseModel).filter_by(
        attempt_id=attempt_id, question_id=question_id
    ).first()

    if not resp:
        resp = AttemptResponseModel(
            id=f"resp-{attempt_id}-{question_id}",
            attempt_id=attempt_id,
            question_id=question_id,
            selected_option=payload.selectedOption,
            marked_for_review=payload.markedForReview,
            time_spent_seconds=payload.timeSpentSeconds
        )
        db.add(resp)
    else:
        resp.selected_option = payload.selectedOption
        resp.marked_for_review = payload.markedForReview
        resp.time_spent_seconds = payload.timeSpentSeconds

    db.commit()
    return {"status": "recorded", "questionId": question_id}


@router.post("/{attempt_id}/telemetry")
def record_question_telemetry(
    attempt_id: str,
    question_id: str,
    payload: QuestionTelemetryInput,
    db: Session = Depends(get_db)
):
    """Persists detailed question-level telemetry (visit counts, first-action latency, answer changes)."""
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")

    telem = db.query(QuestionTelemetryModel).filter_by(
        attempt_id=attempt_id, question_id=question_id
    ).first()

    if not telem:
        telem = QuestionTelemetryModel(
            id=f"telem-{attempt_id}-{question_id}",
            attempt_id=attempt_id,
            question_id=question_id,
            visit_count=payload.visitCount,
            time_to_first_action_seconds=payload.timeToFirstActionSeconds,
            answer_change_count=payload.answerChangeCount,
            review_toggle_count=payload.reviewToggleCount,
            initial_option=payload.initialOption,
            final_option=payload.finalOption,
            telemetry_events=payload.telemetryEvents
        )
        db.add(telem)
    else:
        telem.visit_count = payload.visitCount
        telem.time_to_first_action_seconds = payload.timeToFirstActionSeconds
        telem.answer_change_count = payload.answerChangeCount
        telem.review_toggle_count = payload.reviewToggleCount
        telem.initial_option = payload.initialOption
        telem.final_option = payload.finalOption
        telem.telemetry_events = payload.telemetryEvents

    db.commit()
    return {"status": "telemetry_recorded", "questionId": question_id}


@router.post("/{attempt_id}/submit", response_model=TestAttemptResponse)
def submit_attempt(
    attempt_id: str,
    payload: SubmitAttemptInput,
    db: Session = Depends(get_db)
):
    """
    Authoritative test submission endpoint.
    - Prevents accidental duplicate submissions.
    - Calculates score on backend using test's configured marking scheme.
    - Persists graded responses and aggregated diagnostic breakdowns.
    """
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        # If attempt was not pre-started, create it on the fly
        test = db.query(MockTestModel).first()
        if not test:
            raise HTTPException(status_code=404, detail="Mock test not found.")
        attempt = TestAttemptModel(
            id=attempt_id,
            student_id=payload.studentId or "student-aarav-01",
            test_id=test.id,
            test_title=test.title,
            date=datetime.utcnow().strftime("%Y-%m-%d"),
            start_time=datetime.utcnow(),
            marking_scheme=test.marking_scheme,
            status="in_progress"
        )
        db.add(attempt)
        db.flush()

    # Duplicate submission prevention
    if attempt.status == "completed":
        # Return existing authoritative result
        return _format_attempt_response(attempt, db)

    test = db.query(MockTestModel).filter_by(id=attempt.test_id).first()
    questions = db.query(QuestionModel).filter_by(test_id=attempt.test_id).all()
    if not questions:
        questions = db.query(QuestionModel).all()

    # Authoritative backend grading
    grade_result = ScoringEngine.grade_attempt(
        test=test,
        questions=questions,
        responses=payload.responses,
        total_time_spent_seconds=payload.timeSpentSeconds
    )

    attempt.status = "completed"
    attempt.submission_time = datetime.utcnow()
    attempt.time_spent_seconds = payload.timeSpentSeconds
    attempt.score = grade_result["score"]
    attempt.total_marks = grade_result["totalMarks"]
    attempt.correct_count = grade_result["correctCount"]
    attempt.incorrect_count = grade_result["incorrectCount"]
    attempt.unattempted_count = grade_result["unattemptedCount"]
    attempt.accuracy = grade_result["accuracy"]
    attempt.subject_breakdown = grade_result["subjectBreakdown"]
    attempt.topic_breakdown = grade_result["topicBreakdown"]
    attempt.observations = grade_result["observations"]

    # Persist or update responses
    for q_id, q_res in grade_result["gradedResponses"].items():
        existing_r = db.query(AttemptResponseModel).filter_by(
            attempt_id=attempt.id, question_id=q_id
        ).first()

        if existing_r:
            existing_r.selected_option = q_res["selectedOption"]
            existing_r.is_correct = q_res["isCorrect"]
            existing_r.marked_for_review = q_res["markedForReview"]
            existing_r.time_spent_seconds = q_res["timeSpentSeconds"]
            existing_r.marks_awarded = q_res["marksAwarded"]
        else:
            db.add(AttemptResponseModel(
                id=f"resp-{attempt.id}-{q_id}",
                attempt_id=attempt.id,
                question_id=q_id,
                selected_option=q_res["selectedOption"],
                is_correct=q_res["isCorrect"],
                marked_for_review=q_res["markedForReview"],
                time_spent_seconds=q_res["timeSpentSeconds"],
                marks_awarded=q_res["marksAwarded"]
            ))

    # Persist telemetry if provided in payload
    if payload.telemetry:
        for q_id, tel in payload.telemetry.items():
            existing_tel = db.query(QuestionTelemetryModel).filter_by(
                attempt_id=attempt.id, question_id=q_id
            ).first()
            if not existing_tel:
                db.add(QuestionTelemetryModel(
                    id=f"telem-{attempt.id}-{q_id}",
                    attempt_id=attempt.id,
                    question_id=q_id,
                    visit_count=tel.visitCount,
                    time_to_first_action_seconds=tel.timeToFirstActionSeconds,
                    answer_change_count=tel.answerChangeCount,
                    review_toggle_count=tel.reviewToggleCount,
                    initial_option=tel.initialOption,
                    final_option=tel.finalOption,
                    telemetry_events=tel.telemetryEvents
                ))

    db.commit()
    db.refresh(attempt)

    return _format_attempt_response(attempt, db)


@router.get("/{attempt_id}/state")
def get_attempt_state(attempt_id: str, db: Session = Depends(get_db)):
    """
    Authoritative attempt state recovery endpoint for active CBT examinations.
    Recovers in-progress attempts after browser refresh or network interruption without duplicate submissions.
    """
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Attempt '{attempt_id}' not found.")

    if attempt.status == "completed":
        return {
            "status": "completed",
            "attemptId": attempt.id,
            "testId": attempt.test_id,
            "testTitle": attempt.test_title,
            "score": attempt.score,
            "totalMarks": attempt.total_marks,
            "accuracy": attempt.accuracy,
            "submissionTime": attempt.submission_time.isoformat() if attempt.submission_time else None,
            "isCompleted": True
        }

    test = db.query(MockTestModel).filter_by(id=attempt.test_id).first()
    duration_mins = test.duration_minutes if test else 180
    duration_seconds = duration_mins * 60
    elapsed_seconds = int((datetime.utcnow() - attempt.start_time).total_seconds()) if attempt.start_time else 0
    remaining_seconds = max(0, duration_seconds - elapsed_seconds)

    # Fetch recorded responses
    responses = db.query(AttemptResponseModel).filter_by(attempt_id=attempt.id).all()
    resp_map = {
        r.question_id: {
            "selectedOption": r.selected_option,
            "markedForReview": r.marked_for_review,
            "timeSpentSeconds": r.time_spent_seconds or 0
        }
        for r in responses
    }

    return {
        "status": "in_progress",
        "attemptId": attempt.id,
        "testId": attempt.test_id,
        "testTitle": attempt.test_title,
        "startTime": attempt.start_time.isoformat() if attempt.start_time else None,
        "elapsedSeconds": elapsed_seconds,
        "durationMinutes": duration_mins,
        "remainingSeconds": remaining_seconds,
        "isExpired": remaining_seconds == 0 and elapsed_seconds > (duration_seconds + 300),
        "responses": resp_map,
        "answeredCount": sum(1 for r in responses if r.selected_option is not None and str(r.selected_option).strip() != ""),
        "markedForReviewCount": sum(1 for r in responses if r.marked_for_review)
    }


@router.get("/{attempt_id}", response_model=TestAttemptResponse)
def get_attempt_result(attempt_id: str, db: Session = Depends(get_db)):

    """Retrieve full diagnostic breakdown and question review for an attempt."""
    attempt = db.query(TestAttemptModel).filter_by(id=attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail=f"Attempt '{attempt_id}' not found.")

    return _format_attempt_response(attempt, db)


@router.get("", response_model=List[TestAttemptResponse])
def list_attempts(
    student_id: Optional[str] = "student-aarav-01",
    db: Session = Depends(get_db)
):
    """Retrieve all completed test attempts for history and progression tracking."""
    attempts = db.query(TestAttemptModel).filter(
        TestAttemptModel.status == "completed"
    ).order_by(TestAttemptModel.start_time.desc()).all()

    return [_format_attempt_response(a, db) for a in attempts]


def _format_attempt_response(attempt: TestAttemptModel, db: Session) -> TestAttemptResponse:
    # Build responses dictionary
    resp_map = {}
    responses = db.query(AttemptResponseModel).filter_by(attempt_id=attempt.id).all()
    for r in responses:
        resp_map[r.question_id] = {
            "selectedOption": r.selected_option,
            "isCorrect": r.is_correct,
            "markedForReview": r.marked_for_review,
            "timeSpentSeconds": r.time_spent_seconds,
            "marksAwarded": r.marks_awarded
        }

    return TestAttemptResponse(
        id=attempt.id,
        testId=attempt.test_id,
        testTitle=attempt.test_title,
        date=attempt.date,
        timeSpentSeconds=attempt.time_spent_seconds,
        score=attempt.score,
        totalMarks=attempt.total_marks,
        correctCount=attempt.correct_count,
        incorrectCount=attempt.incorrect_count,
        unattemptedCount=attempt.unattempted_count,
        accuracy=attempt.accuracy,
        percentile=attempt.percentile,
        markingScheme=attempt.marking_scheme or {"correct": 4.0, "incorrect": -1.0, "unattempted": 0.0},
        responses=resp_map,
        subjectBreakdown=attempt.subject_breakdown or {},
        topicBreakdown=attempt.topic_breakdown or [],
        observations=attempt.observations or []
    )
