from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import os
import sys

from .models.database import get_db, init_db, PredictionLog
from .models.schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    PredictionRequest, PredictionResponse
)
from .models.auth import create_user, authenticate_user, create_access_token, decode_token
from .config import settings

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ml_model'))
from ml_model.pipeline import IPLPredictor
from ml_model.data_processor import IPLDataProcessor

predictor = IPLPredictor()
processor = IPLDataProcessor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, 'ml_model', 'ipl_model.pkl')

    matches_path = os.path.join(base_dir, 'data', 'matches.csv')
    deliveries_path = os.path.join(base_dir, 'data', 'deliveries.csv')

    if os.path.exists(matches_path) and os.path.exists(deliveries_path):
        print("Loading and processing IPL data...")
        processor.load_data(matches_path, deliveries_path)
        processor.clean_matches()
        processor.aggregate_delivery_stats()
        processor.create_ml_features()

        if os.path.exists(model_path):
            print("Loading saved model...")
            predictor.load_model(model_path)
        else:
            print("Training new model...")
            X, y = predictor.prepare_features(
                processor.processed_data, processor.feature_columns
            )
            predictor.train(X, y)
            predictor.save_model(model_path)
        print(f"Model ready: {predictor.best_model_name} ({predictor.model_metrics.get('best_accuracy', 'N/A')}% accuracy)")
    else:
        print(f"WARNING: Dataset files not found at {matches_path}")
        print("Please place matches.csv and deliveries.csv in the data/ folder")
    yield


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]
VERCEL_URL = os.environ.get("VERCEL_URL")
if VERCEL_URL:
    ALLOWED_ORIGINS.append(f"https://{VERCEL_URL}")
VERCEL_APP = os.environ.get("VERCEL")
if VERCEL_APP:
    ALLOWED_ORIGINS.append("https://ipl-prediction-project.vercel.app")
ALLOWED_ORIGINS.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    from .models.database import User
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        user = create_user(db, user_data.username, user_data.email, user_data.full_name, user_data.password)
        token = create_access_token(data={"sub": str(user.id), "username": user.username})
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@app.post("/api/predict", response_model=PredictionResponse)
def predict_match(req: PredictionRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not predictor.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained yet. Please ensure data files are available.")

    result = predictor.predict_from_teams(
        team1=req.team1,
        team2=req.team2,
        processor=processor,
        city=req.city,
        venue=req.venue,
        toss_winner=req.toss_winner,
        toss_decision=req.toss_decision,
    )

    log = PredictionLog(
        user_id=current_user.id,
        team1=req.team1,
        team2=req.team2,
        predicted_winner=req.team1 if result['predicted_winner'] == 'team1' else req.team2,
        team1_win_prob=result['team1_win_probability'],
        team2_win_prob=result['team2_win_probability'],
    )
    db.add(log)
    db.commit()

    winner = req.team1 if result['predicted_winner'] == 'team1' else req.team2
    return PredictionResponse(
        team1=req.team1,
        team2=req.team2,
        team1_win_probability=result['team1_win_probability'],
        team2_win_probability=result['team2_win_probability'],
        predicted_winner=winner,
        confidence=result['confidence'],
    )


@app.get("/api/dashboard/stats")
def get_dashboard_stats(current_user=Depends(get_current_user)):
    if not processor.team_win_rate:
        raise HTTPException(status_code=503, detail="Data not loaded yet")

    return {
        "team_stats": processor.get_team_stats(),
        "season_stats": processor.get_season_stats(),
        "venue_stats": processor.get_venue_stats(),
        "city_stats": processor.get_city_stats(),
        "toss_stats": processor.get_toss_stats(),
        "available_teams": list(processor.team_win_rate.keys()),
        "available_cities": list(processor.label_encoders.get('city', type('', (), {'classes_': []})()).classes_),
        "available_venues": list(processor.label_encoders.get('venue', type('', (), {'classes_': []})()).classes_),
    }


@app.get("/api/dashboard/model-metrics")
def get_model_metrics(current_user=Depends(get_current_user)):
    if not predictor.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    return predictor.model_metrics


@app.get("/api/dashboard/head-to-head")
def get_head_to_head(team1: str, team2: str, current_user=Depends(get_current_user)):
    return processor.get_team_vs_team(team1, team2)


@app.get("/api/dashboard/predictions")
def get_all_predictions(current_user=Depends(get_current_user)):
    if not predictor.is_trained:
        raise HTTPException(status_code=503, detail="Model not trained")
    return predictor.get_predictions_for_all_pairs(processor)
