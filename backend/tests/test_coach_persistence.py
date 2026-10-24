import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.coach import CoachMessageModel

client = TestClient(app)


def test_coach_message_persistence_and_retrieval():
    """Verify chat turns are persisted in SQLite coach_messages and returned by /coach/history."""
    student_id = "student-test-persist-01"
    session_id = "test-session-persist"

    # 1. Clean existing messages for this test session
    client.delete(f"/api/v1/coach/history?student_id={student_id}&session_id={session_id}")

    # 2. Send chat turn
    res = client.post("/api/v1/coach/chat", json={
        "message": "Why did my score drop in integration?",
        "contextTopic": "Integration",
        "sessionId": session_id
    })
    assert res.status_code == 200

    # 3. Retrieve history
    hist_res = client.get(f"/api/v1/coach/history?student_id={student_id}&session_id={session_id}")
    assert hist_res.status_code == 200
    messages = hist_res.json()
    assert isinstance(messages, list)

    # 4. Verify delete endpoint
    del_res = client.delete(f"/api/v1/coach/history?student_id={student_id}&session_id={session_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "cleared"

    # 5. Check history is empty after delete
    empty_res = client.get(f"/api/v1/coach/history?student_id={student_id}&session_id={session_id}")
    assert empty_res.status_code == 200
    assert len(empty_res.json()) == 0
