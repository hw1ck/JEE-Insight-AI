import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.task import StudyTaskModel
from backend.app.schemas.task import (
    StudyTaskCreate, StudyTaskUpdate, StudyTaskResponse, WeakTopicToTaskInput
)

router = APIRouter(prefix="/tasks", tags=["Study Planner"])


@router.get("", response_model=List[StudyTaskResponse])
def list_tasks(
    student_id: Optional[str] = "student-aarav-01",
    db: Session = Depends(get_db)
):
    """Retrieve all scheduled study objectives for the student."""
    tasks = db.query(StudyTaskModel).filter_by(student_id=student_id).order_by(StudyTaskModel.created_at.desc()).all()
    return [
        StudyTaskResponse(
            id=t.id,
            day=t.day,
            subject=t.subject,
            topic=t.topic,
            title=t.title,
            durationMinutes=t.duration_minutes,
            taskType=t.task_type,
            priority=t.priority,
            completed=t.completed,
            completedAt=t.completed_at.isoformat() if t.completed_at else None,
            retirementStatus=t.retirement_status or "active",
            retirementReason=t.retirement_reason,
            reason=t.reason,
            isAutoRecommended=t.is_auto_recommended
        )
        for t in tasks
    ]


@router.post("", response_model=StudyTaskResponse)
def create_task(
    payload: StudyTaskCreate,
    student_id: Optional[str] = "student-aarav-01",
    db: Session = Depends(get_db)
):
    """Create a new study task."""
    task_id = f"task-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:4]}"
    task = StudyTaskModel(
        id=task_id,
        student_id=student_id or "student-aarav-01",
        day=payload.day,
        subject=payload.subject,
        topic=payload.topic,
        title=payload.title,
        duration_minutes=payload.durationMinutes,
        task_type=payload.taskType,
        priority=payload.priority,
        completed=False,
        completed_at=None,
        retirement_status="active",
        retirement_reason=None,
        reason=payload.reason,
        is_auto_recommended=payload.isAutoRecommended
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return StudyTaskResponse(
        id=task.id,
        day=task.day,
        subject=task.subject,
        topic=task.topic,
        title=task.title,
        durationMinutes=task.duration_minutes,
        taskType=task.task_type,
        priority=task.priority,
        completed=task.completed,
        completedAt=None,
        retirementStatus=task.retirement_status or "active",
        retirementReason=task.retirement_reason,
        reason=task.reason,
        isAutoRecommended=task.is_auto_recommended
    )


@router.patch("/{task_id}", response_model=StudyTaskResponse)
def update_task(
    task_id: str,
    payload: StudyTaskUpdate,
    db: Session = Depends(get_db)
):
    """Update study task fields or toggle completion status."""
    task = db.query(StudyTaskModel).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Study task not found.")

    if payload.day is not None:
        task.day = payload.day
    if payload.subject is not None:
        task.subject = payload.subject
    if payload.topic is not None:
        task.topic = payload.topic
    if payload.title is not None:
        task.title = payload.title
    if payload.durationMinutes is not None:
        task.duration_minutes = payload.durationMinutes
    if payload.taskType is not None:
        task.task_type = payload.taskType
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.completed is not None:
        task.completed = payload.completed
        if payload.completed:
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
    if payload.reason is not None:
        task.reason = payload.reason
    if payload.retirementStatus is not None:
        task.retirement_status = payload.retirementStatus
    if payload.retirementReason is not None:
        task.retirement_reason = payload.retirementReason

    db.commit()
    db.refresh(task)

    return StudyTaskResponse(
        id=task.id,
        day=task.day,
        subject=task.subject,
        topic=task.topic,
        title=task.title,
        durationMinutes=task.duration_minutes,
        taskType=task.task_type,
        priority=task.priority,
        completed=task.completed,
        completedAt=task.completed_at.isoformat() if task.completed_at else None,
        retirementStatus=task.retirement_status or "active",
        retirementReason=task.retirement_reason,
        reason=task.reason,
        isAutoRecommended=task.is_auto_recommended
    )


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    """Delete a study task."""
    task = db.query(StudyTaskModel).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Study task not found.")

    db.delete(task)
    db.commit()
    return {"status": "deleted", "taskId": task_id}


@router.post("/from-weak-topics", response_model=List[StudyTaskResponse])
def add_tasks_from_weak_topics(
    weak_topics: List[WeakTopicToTaskInput],
    student_id: Optional[str] = "student-aarav-01",
    db: Session = Depends(get_db)
):
    """Auto-generates prioritized tasks from weak concept diagnostics with duplicate and retirement prevention."""
    created_tasks = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    existing_tasks = db.query(StudyTaskModel).filter_by(student_id=student_id).all()
    
    # Avoid regenerating tasks for uncompleted topics or topics that are already retired
    existing_active_topics = {t.topic.lower() for t in existing_tasks if not t.completed}
    retired_topics = {t.topic.lower() for t in existing_tasks if t.retirement_status == "retired"}

    for idx, wt in enumerate(weak_topics):
        topic_lower = wt.topic.lower()
        if topic_lower in existing_active_topics or topic_lower in retired_topics:
            continue

        assigned_day = days[(idx + 1) % len(days)]
        task_id = f"task-auto-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:4]}"
        new_task = StudyTaskModel(
            id=task_id,
            student_id=student_id or "student-aarav-01",
            day=assigned_day,
            subject=wt.subject,
            topic=wt.topic,
            title=f"Targeted review & 20 problem drill on {wt.topic}",
            duration_minutes=60,
            task_type="Concept Revision",
            priority=wt.priority or "High",
            completed=False,
            completed_at=None,
            retirement_status="active",
            retirement_reason=None,
            reason=wt.reason or "Auto-recommended from diagnostic examination mark loss.",
            is_auto_recommended=True
        )
        db.add(new_task)
        created_tasks.append(new_task)

    db.commit()
    return [
        StudyTaskResponse(
            id=t.id,
            day=t.day,
            subject=t.subject,
            topic=t.topic,
            title=t.title,
            durationMinutes=t.duration_minutes,
            taskType=t.task_type,
            priority=t.priority,
            completed=t.completed,
            completedAt=t.completed_at.isoformat() if t.completed_at else None,
            retirementStatus=t.retirement_status or "active",
            retirementReason=t.retirement_reason,
            reason=t.reason,
            isAutoRecommended=t.is_auto_recommended
        )
        for t in created_tasks
    ]

