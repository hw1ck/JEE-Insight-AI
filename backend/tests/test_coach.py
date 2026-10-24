import pytest
from unittest.mock import MagicMock, patch
from backend.app.config import settings
from backend.app.services.coach_service import ai_coach_engine


def test_coach_status_endpoint(client):
    """GET /api/v1/coach/status returns expected schema and state."""
    res = client.get("/api/v1/coach/status")
    assert res.status_code == 200
    data = res.json()
    assert "isLiveAiAvailable" in data
    assert "model" in data
    assert "provider" in data
    assert "contextSourcesAvailable" in data
    assert isinstance(data["contextSourcesAvailable"], list)


def test_coach_context_summary_endpoint(client):
    """GET /api/v1/coach/context-summary returns assembled diagnostic context."""
    res = client.get("/api/v1/coach/context-summary")
    assert res.status_code == 200
    data = res.json()
    assert data["studentName"] == "Aarav Sharma"
    assert "totalCompletedAttempts" in data
    assert "personaTitle" in data
    assert "weakestTopics" in data



def test_coach_chat_offline_fallback(client, monkeypatch):
    """When GEMINI_API_KEY is not configured, the coach uses transparent diagnostic fallback."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    res = client.post(
        "/api/v1/coach/chat",
        json={"message": "Why did my score change in Mock 8?"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["isSimulated"] is True
    assert data["modelUsed"] == "offline-diagnostic-heuristics"
    assert "Mock 8" in data["text"] or "Benchmark" in data["text"] or "score" in data["text"].lower()
    assert len(data["actionSuggestions"]) > 0
    assert data["disclaimer"] is not None
    assert "offline" in data["disclaimer"].lower() or "gemini" in data["disclaimer"].lower()


def test_coach_chat_empty_message_validation(client):
    """Empty messages should fail with HTTP 422."""
    res = client.post(
        "/api/v1/coach/chat",
        json={"message": ""}
    )
    assert res.status_code == 422


def test_coach_chat_whitespace_message_validation(client):
    """Whitespace-only messages should fail with HTTP 422."""
    res = client.post(
        "/api/v1/coach/chat",
        json={"message": "    "}
    )
    assert res.status_code == 422


def test_coach_chat_excessive_length_validation(client):
    """Messages exceeding 4000 characters should fail with HTTP 422."""
    long_message = "x" * 4001
    res = client.post(
        "/api/v1/coach/chat",
        json={"message": long_message}
    )
    assert res.status_code == 422


def test_coach_chat_mocked_gemini_success(client, monkeypatch):
    """When GEMINI_API_KEY is set and LLM succeeds, returns live response."""
    test_key = "AIzaSyFakeTestKeyForUnitTestingOnly123"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", test_key)
    monkeypatch.setattr(settings, "AI_MODEL", "gemini-2.5-flash")

    # Mock the google-genai client
    mock_response = MagicMock()
    mock_response.text = (
        "Based on your Mock 8 autopsy, your primary bottleneck in Mathematics is negative marking. "
        "Review King's property before attempting high-latency integrals."
    )

    mock_client_instance = MagicMock()
    mock_client_instance.models.generate_content.return_value = mock_response

    with patch("backend.app.services.coach_service.genai.Client", return_value=mock_client_instance):
        res = client.post(
            "/api/v1/coach/chat",
            json={
                "message": "What should I focus on next?",
                "availableStudyHours": 2.5
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["isSimulated"] is False
        assert data["modelUsed"] == "gemini-2.5-flash"
        assert "Mock 8" in data["text"]
        assert test_key not in data["text"]
        assert test_key not in str(data)


def test_coach_chat_gemini_api_failure_fallback(client, monkeypatch):
    """When the LLM provider times out or throws an error, graceful fallback activates."""
    test_key = "AIzaSyFakeTestKeyForUnitTestingOnly123"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", test_key)

    mock_client_instance = MagicMock()
    mock_client_instance.models.generate_content.side_effect = Exception("DeadlineExceeded: 504 Gateway Timeout")

    with patch("backend.app.services.coach_service.genai.Client", return_value=mock_client_instance):
        res = client.post(
            "/api/v1/coach/chat",
            json={"message": "Analyze my integration mistakes"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["isSimulated"] is True
        assert "offline" in data["modelUsed"] or "fallback" in data["modelUsed"]
        assert data["disclaimer"] is not None
        assert "temporarily unavailable" in data["disclaimer"].lower() or "offline" in data["disclaimer"].lower()
        # Verify secrets are never exposed in error responses
        assert test_key not in str(data)


def test_coach_chat_with_question_context(client, monkeypatch):
    """Question context is extracted and fed into the response."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    res = client.post(
        "/api/v1/coach/chat",
        json={
            "message": "Why is my answer wrong?",
            "questionId": "q-m9-p01"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "q-m9-p01" in data["text"] or "Question" in data["text"]
    assert len(data["actionLinks"]) > 0


def test_coach_chat_with_invalid_question_id(client, monkeypatch):
    """An invalid question ID does not crash the system."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    res = client.post(
        "/api/v1/coach/chat",
        json={
            "message": "Explain this question",
            "questionId": "nonexistent-question-99999"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["text"]) > 0


def test_coach_conversation_history_handling(client, monkeypatch):
    """Conversation history is received and handled without errors."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    res = client.post(
        "/api/v1/coach/chat",
        json={
            "message": "Can you give me 3 practice problems?",
            "conversationHistory": [
                {"sender": "student", "text": "I am struggling with Integration."},
                {"sender": "coach", "text": "Focus on King's property first."}
            ]
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["text"]) > 0


def test_coach_alias_route(client, monkeypatch):
    """The alias /api/v1/ai-coach/chat route functions identically."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    res = client.post(
        "/api/v1/ai-coach/chat",
        json={"message": "Suggest a time management strategy"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "Round 1" in data["text"] or "time" in data["text"].lower()
