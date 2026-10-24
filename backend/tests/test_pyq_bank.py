import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models.question import QuestionModel, QuestionOptionModel
from backend.app.models.test import MockTestModel
from backend.app.seed.pyq_importer import import_pyqs

client = TestClient(app)


def test_pyq_catalog_stats():
    """Verify PYQ statistics endpoint returns accurate question bank metrics."""
    res = client.get("/api/v1/tests/pyq/catalog/stats")
    assert res.status_code == 200
    data = res.json()
    assert "CC-BY-4.0" in data["license"]
    assert data["total_pyq_questions"] == 7784
    assert data["verified_questions"] >= 7500
    assert "Chemistry" in data["subject_distribution"]
    assert "Physics" in data["subject_distribution"]
    assert "Mathematics" in data["subject_distribution"]
    assert "2024" in data["year_distribution"]
    assert "2025" in data["year_distribution"]
    assert 2024 in data["available_years"]
    assert len(data["official_full_mock_papers"]) >= 8
    assert data["total_distinct_chapters"] >= 200


def test_pyq_unique_identifiers():
    """Verify all imported PYQ questions in the database have strictly unique IDs."""
    db = SessionLocal()
    try:
        pyq_questions = db.query(QuestionModel.id).filter(QuestionModel.is_pyq == 1).all()
        ids = [q[0] for q in pyq_questions]
        assert len(ids) == 7784
        assert len(ids) == len(set(ids)), "Duplicate question IDs detected in database!"
    finally:
        db.close()


def test_pyq_options_and_answers_preserved():
    """Verify answer options and keys are properly preserved for MCQs and numerical questions."""
    db = SessionLocal()
    try:
        # Check MCQs have options
        sample_mcq = db.query(QuestionModel).filter(
            QuestionModel.is_pyq == 1,
            QuestionModel.question_type == "single_correct"
        ).first()
        assert sample_mcq is not None
        assert sample_mcq.correct_option_id in ["A", "B", "C", "D"]
        assert len(sample_mcq.options) >= 2

        # Check numerical questions
        sample_num = db.query(QuestionModel).filter(
            QuestionModel.is_pyq == 1,
            QuestionModel.question_type == "numerical"
        ).first()
        assert sample_num is not None
        assert sample_num.numerical_answer is not None or sample_num.correct_option_id is not None
    finally:
        db.close()


def test_pyq_subject_and_year_filtering():
    """Verify subject and year filters on Question Bank search endpoint."""
    res = client.get("/api/v1/tests/pyq/bank/search?subject=Physics&year=2024&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 100
    for item in data["items"]:
        assert item["subject"] == "Physics"
        assert item["year"] == 2024
        assert item["isPyq"] is True


def test_pyq_official_75q_mock_test():
    """Verify official 75-question full mock test paper retrieval."""
    for paper_id in ["pyq-jee-2020-p01", "pyq-jee-2024-jan31-s1", "pyq-jee-2023-jan31-s2", "pyq-jee-2022-jun24-s2"]:
        res = client.get(f"/api/v1/tests/{paper_id}/questions")
        assert res.status_code == 200, f"Failed for {paper_id}"
        questions = res.json()
        assert len(questions) == 75, f"Expected 75 questions in {paper_id}, got {len(questions)}"


def test_pyq_dynamic_practice_generation_with_year():
    """Verify custom practice mock tests can be dynamically assembled with year filter."""
    res = client.post("/api/v1/tests/pyq/generate-practice?title=Pytest%202024%20Sprint&year=2024&subject=Mathematics&questions_count=10&duration_minutes=25")
    assert res.status_code == 200
    test_data = res.json()
    assert test_data["questionsCount"] == 10
    assert test_data["subject"] == "Mathematics"

    test_id = test_data["id"]
    # Verify questions can be retrieved
    q_res = client.get(f"/api/v1/tests/{test_id}/questions")
    assert q_res.status_code == 200
    assert len(q_res.json()) == 10

    # Clean up generated ephemeral test
    db = SessionLocal()
    try:
        db.query(QuestionOptionModel).filter(QuestionOptionModel.question_id.like(f"{test_id}%")).delete(synchronize_session=False)
        db.query(QuestionModel).filter(QuestionModel.test_id == test_id).delete(synchronize_session=False)
        db.query(MockTestModel).filter(MockTestModel.id == test_id).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_pyq_reimport_idempotence():
    """Verify re-running importer does not duplicate questions."""
    db = SessionLocal()
    try:
        count_before = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1).count()
        import_pyqs(db)
        count_after = db.query(QuestionModel).filter(QuestionModel.is_pyq == 1).count()
        assert count_before == count_after == 7784
    finally:
        db.close()


def test_benchmark_data_preserved():
    """Verify that existing benchmark mock tests, attempts, and demo data remain intact."""
    res = client.get("/api/v1/tests/mock-jee-09/questions")
    assert res.status_code == 200
    assert len(res.json()) == 15

    # Check that attempts still exist and diagnostic endpoint works
    diag_res = client.get("/api/v1/analytics/dashboard")
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert "averageScore" in diag_data
    assert diag_data["completedTestsCount"] > 0
