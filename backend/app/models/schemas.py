from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class PredictionRequest(BaseModel):
    team1: str
    team2: str
    city: Optional[str] = None
    venue: Optional[str] = None
    toss_winner: Optional[str] = None
    toss_decision: Optional[str] = None


class PredictionResponse(BaseModel):
    team1: str
    team2: str
    team1_win_probability: float
    team2_win_probability: float
    predicted_winner: str
    confidence: float
