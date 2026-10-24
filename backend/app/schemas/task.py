from typing import Optional, List
from pydantic import BaseModel, Field


class StudyTaskCreate(BaseModel):
    day: str = Field(..., examples=["Tue"])
    subject: str = Field(..., examples=["Mathematics"])
    topic: str = Field(..., examples=["Integral Calculus & Differential Equations"])
    title: str = Field(..., examples=["Targeted drill on standard integrals"])
    durationMinutes: int = Field(45, ge=10, le=300)
    taskType: str = Field("Concept Revision", examples=["Concept Revision"])
    priority: str = Field("Medium", examples=["High"])
    reason: str = Field(..., examples=["Observed weak performance in Mock #9"])
    isAutoRecommended: bool = False


class StudyTaskUpdate(BaseModel):
    day: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    title: Optional[str] = None
    durationMinutes: Optional[int] = None
    taskType: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None
    reason: Optional[str] = None
    retirementStatus: Optional[str] = None
    retirementReason: Optional[str] = None


class StudyTaskResponse(BaseModel):
    id: str
    day: str
    subject: str
    topic: str
    title: str
    durationMinutes: int
    taskType: str
    priority: str
    completed: bool
    completedAt: Optional[str] = None
    retirementStatus: str = "active"
    retirementReason: Optional[str] = None
    reason: str
    isAutoRecommended: bool = False

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }



class WeakTopicToTaskInput(BaseModel):
    topic: str
    subject: str
    priority: str = "High"
    reason: str
