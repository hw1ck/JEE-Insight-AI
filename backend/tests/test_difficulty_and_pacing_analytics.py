import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_analytics_workspace_dynamic_difficulty_and_pacing():
    """Verify GET /analytics/workspace returns dynamically calculated difficulty & pacing arrays."""
    response = client.get("/api/v1/analytics/workspace?subject=All")
    assert response.status_code == 200
    data = response.json()

    # 1. Difficulty Breakdown verification
    assert "difficultyBreakdown" in data
    diffs = data["difficultyBreakdown"]
    assert len(diffs) == 3
    diff_names = [d["difficulty"] for d in diffs]
    assert "Easy" in diff_names
    assert "Moderate" in diff_names
    assert "Challenging" in diff_names

    for d in diffs:
        assert "accuracy" in d
        assert "attempted" in d
        assert "total" in d
        assert isinstance(d["accuracy"], (int, float))
        assert isinstance(d["attempted"], int)
        assert d["attempted"] >= 0

    # 2. Pacing & Time Analysis verification
    assert "timeAnalysis" in data
    times = data["timeAnalysis"]
    assert len(times) == 3
    subj_names = [t["subject"] for t in times]
    assert "Physics" in subj_names
    assert "Chemistry" in subj_names
    assert "Mathematics" in subj_names

    for t in times:
        assert "avgSeconds" in t
        assert "targetSeconds" in t
        assert isinstance(t["avgSeconds"], (int, float))
        assert t["targetSeconds"] > 0
