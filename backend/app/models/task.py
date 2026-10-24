from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from backend.app.database import Base


class StudyTaskModel(Base):
    __tablename__ = "study_tasks"

    id = Column(String(64), primary_key=True, index=True)
    student_id = Column(String(64), ForeignKey("student_profiles.id"), nullable=False, index=True)
    day = Column(String(8), nullable=False)  # 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
    subject = Column(String(32), nullable=False)
    topic = Column(String(128), nullable=False)
    title = Column(String(256), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=45)
    task_type = Column(String(32), nullable=False, default="Concept Revision")
    priority = Column(String(16), nullable=False, default="Medium")
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    retirement_status = Column(String(32), default="active", nullable=False)  # 'active', 'improving', 'retired'
    retirement_reason = Column(Text, nullable=True)
    reason = Column(Text, nullable=False)
    is_auto_recommended = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

