from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ActionLinkSchema(BaseModel):
    label: str
    page: str
    context: Optional[str] = None


class CoachChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="Student's prompt or question")
    studentId: Optional[str] = Field(default="student-aarav-01", description="Student identifier")
    contextTopic: Optional[str] = Field(default=None, description="Optional topic or chapter context")
    questionId: Optional[str] = Field(default=None, description="Optional question ID to explain or dissect")
    attemptId: Optional[str] = Field(default=None, description="Optional attempt ID for mistake autopsy")
    sessionId: Optional[str] = Field(default="default-session", description="Conversation session identifier for persistence")
    availableStudyHours: Optional[float] = Field(default=None, description="Available study hours for schedule generation")
    conversationHistory: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Recent conversation turns")


    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty or whitespace only.")
        return v



class CoachChatResponse(BaseModel):
    id: str
    sender: str = "coach"
    text: str
    timestamp: str
    contextTopic: Optional[str] = None
    actionSuggestions: List[str] = Field(default_factory=list)
    actionLinks: List[ActionLinkSchema] = Field(default_factory=list)
    isSimulated: bool = False
    modelUsed: Optional[str] = None
    sourceSummary: Optional[str] = None
    disclaimer: Optional[str] = None


class CoachStatusResponse(BaseModel):
    isLiveAiAvailable: bool
    model: str
    provider: str
    contextSourcesAvailable: List[str]


class CoachContextSummaryResponse(BaseModel):
    studentName: str
    totalCompletedAttempts: int
    latestScore: float
    latestAccuracy: float
    weakestTopics: List[str]
    markLossBreakdown: Dict[str, float]
    personaTitle: str
    repeatedMistakesCount: int

