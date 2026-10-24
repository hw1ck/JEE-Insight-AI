import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.question import QuestionModel, QuestionOptionModel
from backend.app.models.attempt import TestAttemptModel, AttemptResponseModel
from backend.app.models.test import MockTestModel

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def test_cbt_session_recovery_endpoint(db_session):
    """Verify GET /attempts/{attempt_id}/state accurately restores in-progress CBT state."""
    # Create a mock test and in-progress attempt
    test = MockTestModel(
        id="test-cbt-recovery-01",
        title="Recovery Test",
        test_type="Chapter Test",
        questions_count=10,
        duration_minutes=60,
        max_marks=40,
        difficulty="Moderate",
        status="Available",
        description="Recovery test for CBT state persistence verification."
    )
    test = db_session.merge(test)

    attempt = TestAttemptModel(
        id="attempt-cbt-recovery-01",
        test_id=test.id,
        test_title=test.title,
        student_id="student-aarav-01",
        date="2026-10-24",
        time_spent_seconds=300,
        score=0,
        total_marks=40,
        correct_count=0,
        incorrect_count=0,
        unattempted_count=10,
        accuracy=0.0,
        status="in_progress",
        marking_scheme={"correct": 4.0, "incorrect": -1.0, "unattempted": 0.0},
        start_time=datetime.utcnow()
    )
    attempt = db_session.merge(attempt)

    # Add a saved response
    resp = AttemptResponseModel(
        id="resp-recovery-01",
        attempt_id=attempt.id,
        question_id="q-recovery-101",
        selected_option="B",
        marked_for_review=True,
        time_spent_seconds=45
    )
    resp = db_session.merge(resp)
    db_session.commit()

    # Call endpoint
    res = client.get(f"/api/v1/attempts/{attempt.id}/state")
    assert res.status_code == 200
    data = res.json()
    assert data["attemptId"] == attempt.id
    assert data["status"] == "in_progress"
    assert data["remainingSeconds"] > 0
    assert "responses" in data
    assert "q-recovery-101" in data["responses"]
    assert data["responses"]["q-recovery-101"]["selectedOption"] == "B"
    assert data["responses"]["q-recovery-101"]["markedForReview"] is True

    # Cleanup
    db_session.delete(resp)
    db_session.delete(attempt)
    db_session.delete(test)
    db_session.commit()


def test_evaluate_answer_mcq(db_session):
    """Verify POST /tests/pyq/evaluate-answer correctly scores Single Choice MCQs (+4 / -1)."""
    q = QuestionModel(
        id="q-test-eval-mcq",
        test_id="pyq-bank",
        question_number=1,
        subject="Physics",
        topic="Electrostatics",
        statement="What is electric charge unit?",
        correct_option_id="C",
        question_type="single_correct",
        positive_marks=4.0,
        negative_marks=-1.0,
        is_pyq=0,
        explanation="Coulomb is the SI unit of charge."
    )
    q = db_session.merge(q)
    db_session.commit()

    # 1. Correct option
    res_correct = client.post("/api/v1/tests/pyq/evaluate-answer", json={
        "questionId": q.id,
        "selectedOption": "C"
    })
    assert res_correct.status_code == 200
    data_c = res_correct.json()
    assert data_c["isCorrect"] is True
    assert data_c["marksAwarded"] == 4.0
    assert data_c["correctOptionId"] == "C"

    # 2. Incorrect option
    res_incorrect = client.post("/api/v1/tests/pyq/evaluate-answer", json={
        "questionId": q.id,
        "selectedOption": "A"
    })
    assert res_incorrect.status_code == 200
    data_inc = res_incorrect.json()
    assert data_inc["isCorrect"] is False
    assert data_inc["marksAwarded"] == -1.0

    # Cleanup
    db_session.delete(q)
    db_session.commit()


def test_evaluate_answer_numerical(db_session):
    """Verify POST /tests/pyq/evaluate-answer scores Numerical questions (+4 / 0) with tolerance."""
    q_num = QuestionModel(
        id="q-test-eval-num",
        test_id="pyq-bank",
        question_number=2,
        subject="Mathematics",
        topic="Definite Integration",
        statement="Calculate integral value",
        correct_option_id="",
        numerical_answer=42.0,
        question_type="numerical",
        positive_marks=4.0,
        negative_marks=0.0,
        is_pyq=0,
        explanation="Integral evaluates to 42."
    )
    q_num = db_session.merge(q_num)
    db_session.commit()

    # Correct numerical (exact)
    res_num_correct = client.post("/api/v1/tests/pyq/evaluate-answer", json={
        "questionId": q_num.id,
        "numericalAnswer": 42.0
    })
    assert res_num_correct.status_code == 200
    assert res_num_correct.json()["isCorrect"] is True
    assert res_num_correct.json()["marksAwarded"] == 4.0

    # Correct numerical within tolerance (42.02 within +- 0.05)
    res_tol = client.post("/api/v1/tests/pyq/evaluate-answer", json={
        "questionId": q_num.id,
        "numericalAnswer": 42.02
    })
    assert res_tol.status_code == 200
    assert res_tol.json()["isCorrect"] is True

    # Incorrect numerical (+4/0 scheme: 0 marks penalty)
    res_wrong = client.post("/api/v1/tests/pyq/evaluate-answer", json={
        "questionId": q_num.id,
        "numericalAnswer": 15.0
    })
    assert res_wrong.status_code == 200
    assert res_wrong.json()["isCorrect"] is False
    assert res_wrong.json()["marksAwarded"] == 0.0

    # Cleanup
    db_session.delete(q_num)
    db_session.commit()
