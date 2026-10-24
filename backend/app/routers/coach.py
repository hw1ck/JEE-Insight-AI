from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.coach import (
    CoachChatRequest, CoachChatResponse, CoachStatusResponse, CoachContextSummaryResponse
)
from backend.app.services.coach_service import AICoachEngine

router = APIRouter(prefix="/coach", tags=["AI Performance Coach"])


@router.get("/status", response_model=CoachStatusResponse)
def get_coach_status():
    """Returns AI Coach engine status and available telemetry sources."""
    return AICoachEngine.get_coach_status()


@router.get("/context-summary", response_model=CoachContextSummaryResponse)
def get_coach_context_summary(
    student_id: str = "student-aarav-01",
    db: Session = Depends(get_db)
):
    """
    Returns the real empirical student telemetry data that grounds the AI Coach.
    Used for UI transparency so students can see exactly what data informs their advice.
    """
    ctx = AICoachEngine.assemble_student_context(db=db, student_id=student_id)
    latest = ctx.get("latestAttempt", {})
    mark_loss = ctx.get("markLoss", {})
    categories = mark_loss.get("categories", [])
    breakdown_dict = {c["category"]: c["marksLost"] for c in categories}
    weak_names = [w["topic"] for w in ctx.get("weakTopics", [])]

    return CoachContextSummaryResponse(
        studentName=ctx["student"]["name"],
        totalCompletedAttempts=ctx["overall"]["totalCompletedAttempts"],
        latestScore=latest.get("score", 0.0),
        latestAccuracy=latest.get("accuracy", 0.0),
        weakestTopics=weak_names[:5],
        markLossBreakdown=breakdown_dict,
        personaTitle=ctx["persona"]["title"],
        repeatedMistakesCount=len(ctx.get("repeatedMistakes", []))
    )


@router.post("/chat", response_model=CoachChatResponse)
def coach_chat(
    payload: CoachChatRequest,
    db: Session = Depends(get_db)
):
    """
    AI Performance Coach dialogue endpoint.
    Powered by Google Gemini (google-genai) with rich database context injection
    covering mock test scores, mark-loss categories, pacing quadrants, and weak concepts.
    Gracefully falls back to deterministic diagnostic guidance if Gemini API is offline.
    """
    return AICoachEngine.chat(db=db, request=payload)


@router.get("/history")
def get_coach_history(
    student_id: str = "student-aarav-01",
    session_id: str = "default-session",
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Retrieves persisted conversation turns from SQLite database."""
    from backend.app.models.coach import CoachMessageModel
    query = db.query(CoachMessageModel).filter_by(student_id=student_id)
    if session_id:
        query = query.filter_by(session_id=session_id)
    messages = query.order_by(CoachMessageModel.created_at.asc()).limit(limit).all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "sender": "coach" if m.role == "assistant" else "student",
            "content": m.content,
            "text": m.content,
            "contextTopic": m.context_topic,
            "questionId": m.question_id,
            "provider": m.provider,
            "timestamp": m.created_at.strftime("%I:%M %p") if m.created_at else "",
            "createdAt": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]


@router.delete("/history")
def clear_coach_history(
    student_id: str = "student-aarav-01",
    session_id: str = "default-session",
    db: Session = Depends(get_db)
):
    """Clears persisted conversation history for the student."""
    from backend.app.models.coach import CoachMessageModel
    query = db.query(CoachMessageModel).filter_by(student_id=student_id)
    if session_id:
        query = query.filter_by(session_id=session_id)
    deleted = query.delete()
    db.commit()
    return {"status": "cleared", "deletedCount": deleted}


# Support alternative route prefix /api/v1/ai-coach for complete API compatibility
ai_coach_router = APIRouter(prefix="/ai-coach", tags=["AI Performance Coach"])
ai_coach_router.add_api_route("/chat", coach_chat, methods=["POST"], response_model=CoachChatResponse)
ai_coach_router.add_api_route("/status", get_coach_status, methods=["GET"], response_model=CoachStatusResponse)
ai_coach_router.add_api_route("/context-summary", get_coach_context_summary, methods=["GET"], response_model=CoachContextSummaryResponse)
ai_coach_router.add_api_route("/history", get_coach_history, methods=["GET"])
ai_coach_router.add_api_route("/history", clear_coach_history, methods=["DELETE"])



