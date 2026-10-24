import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.attempt import TestAttemptModel, AttemptResponseModel
from backend.app.models.question import QuestionModel
from backend.app.models.task import StudyTaskModel
from backend.app.services.feedback_loop import FeedbackLoopService

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def test_feedback_loop_task_outcomes_endpoint():
    """Verify GET /analytics/feedback-loop/task-outcomes returns valid structure and disclaimer."""
    response = client.get("/api/v1/analytics/feedback-loop/task-outcomes?student_id=student-aarav-01")
    assert response.status_code == 200
    data = response.json()
    assert "studentId" in data
    assert "totalCompletedTasks" in data
    assert "evaluatedOutcomes" in data
    assert "disclaimer" in data
    assert "empirical correlation" in data["disclaimer"].lower() or "not prove" in data["disclaimer"].lower()


def test_feedback_loop_recommendations_endpoint():
    """Verify GET /analytics/feedback-loop/recommendations evaluates retirement rules."""
    response = client.get("/api/v1/analytics/feedback-loop/recommendations?student_id=student-aarav-01&threshold=75.0&min_questions=4")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "retired" in data["summary"]
    assert "improving" in data["summary"]
    assert "active" in data["summary"]
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)


def test_feedback_loop_service_insufficient_data(db_session):
    """Verify FeedbackLoopService handles tasks with insufficient post-completion data gracefully."""
    task = StudyTaskModel(
        id="task-test-insufficient-data",
        student_id="student-test-fb",
        day="Mon",
        subject="Physics",
        topic="Rotational Dynamics",
        title="Rotational test drill",
        duration_minutes=45,
        task_type="Practice",
        priority="High",
        completed=True,
        reason="Targeted rotational dynamics drill to verify feedback loop.",
        completed_at=datetime.utcnow()
    )
    db_session.add(task)
    db_session.commit()

    outcome = FeedbackLoopService.analyze_task_outcome(db_session, task.id, "student-test-fb")
    assert outcome["status"] == "insufficient_data"
    assert "Not enough data yet" in outcome["message"]
    assert "disclaimer" in outcome
    assert "preQuestionCount" in outcome
    assert "postQuestionCount" in outcome

    # Cleanup
    db_session.delete(task)
    db_session.commit()
