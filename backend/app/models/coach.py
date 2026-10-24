from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from backend.app.database import Base


class CoachMessageModel(Base):
    __tablename__ = "coach_messages"

    id = Column(String(64), primary_key=True, index=True)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context_topic = Column(String(128), nullable=True)
    question_id = Column(String(64), nullable=True)
    provider = Column(String(64), nullable=False, default="Google Gemini (google-genai)")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
