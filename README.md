# IPL Prediction Platform (2008-2025)
## Machine Learning Powered Match Prediction System

---

## PROJECT OVERVIEW

This is a full-stack web application that uses Machine Learning (Linear Regression + ensemble methods)
to predict IPL cricket match outcomes. It features user authentication, interactive dashboards with
charts, and real-time match predictions.

---

## TECHNOLOGY STACK

### Frontend
- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Axios** - HTTP client for API calls
- **Recharts** - Data visualization (Bar, Pie, Line, Radar, Area charts)
- **Vite** - Build tool and dev server
- **CSS3** - Custom dark theme styling

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - SQL database for user authentication
- **Pydantic** - Data validation and serialization
- **python-jose** - JWT token authentication
- **passlib + bcrypt** - Password hashing

### Machine Learning
- **Scikit-learn** - ML library
  - Linear Regression (primary model)
  - Ridge Regression
  - Lasso Regression
  - Random Forest Classifier
  - Gradient Boosting Classifier
- **Pandas** - Data manipulation
- **NumPy** - Numerical computing

---

## ARCHITECTURE

```
ipl-prediction-project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application + API endpoints
│   │   ├── config.py            # Environment configuration
│   │   └── models/
│   │       ├── database.py      # SQLAlchemy models + DB setup
│   │       ├── schemas.py       # Pydantic request/response schemas
│   │       └── auth.py          # Authentication utilities
│   ├── ml_model/
│   │   ├── __init__.py
│   │   ├── pipeline.py          # ML model training + prediction
│   │   └── data_processor.py    # Data cleaning + feature engineering
│   ├── data/
│   │   ├── matches.csv          # IPL matches dataset
│   │   └── deliveries.csv       # IPL deliveries dataset
│   ├── requirements.txt
│   └── start_backend.bat
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Router + Auth guards
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Register.jsx     # Registration page
│   │   │   └── Dashboard.jsx    # Main dashboard + all charts
│   │   ├── services/
│   │   │   ├── api.js           # Axios API client
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   └── styles/
│   │       └── index.css        # Complete styling
│   ├── package.json
│   ├── vite.config.js
│   └── start_frontend.bat
├── start.bat                    # Quick start script
└── README.md
```

---

## ML PIPELINE EXPLANATION

### Step 1: Data Loading & Cleaning
- Load matches.csv (1000+ matches) and deliveries.csv (250000+ balls)
- Handle missing values, rename defunct teams (Delhi Daredevils → Delhi Capitals)
- Parse dates and extract season/year

### Step 2: Feature Engineering (14 features)
| Feature | Description |
|---------|-------------|
| team1_encoded | Label-encoded team 1 |
| team2_encoded | Label-encoded team 2 |
| city_encoded | Label-encoded city |
| venue_encoded | Label-encoded venue |
| toss_winner_binary | 1 if team1 won toss |
| toss_decision_encoded | bat=0, field=1 |
| team1_win_rate | Historical win rate of team 1 |
| team2_win_rate | Historical win rate of team 2 |
| h2h_win_rate | Head-to-head win rate |
| total_runs | Average total runs in match |
| total_wickets | Average wickets fallen |
| extras_runs | Average extras given |
| top_scorer_runs | Average top scorer runs |
| top_bowler_wkts | Average top bowler wickets |

### Step 3: Model Training
Five models are trained and compared:
1. **Linear Regression** - Baseline linear model
2. **Ridge Regression** - L2-regularized linear model
3. **Lasso Regression** - L1-regularized linear model
4. **Random Forest** - Ensemble of decision trees
5. **Gradient Boosting** - Sequential ensemble boosting

The BEST performing model is automatically selected.

### Step 4: Prediction
- User selects two teams + optional conditions
- Features are engineered and scaled
- Model outputs win probability (0-100%) for each team
- Confidence score calculated from probability distance

---

## API ENDPOINTS

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/predict | Predict match winner |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Team/season/venue/city stats |
| GET | /api/dashboard/model-metrics | ML model performance |
| GET | /api/dashboard/head-to-head | Team vs team history |
| GET | /api/dashboard/predictions | All pair predictions |

---

## HOW TO RUN

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm

### Step 1: Place Data Files
Put your IPL datasets in `backend/data/`:
- `matches.csv` (from Kaggle IPL dataset)
- `deliveries.csv` (from Kaggle IPL dataset)

### Step 2: Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Step 3: Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Step 4: Open Browser
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

---

## DASHBOARD FEATURES

### Overview Tab
- Total matches analyzed
- Model accuracy
- Teams tracked
- Seasons covered
- Team win rates (bar chart)
- Season champions (line chart)
- Matches by city (bar chart)
- Toss decision distribution (pie chart)

### Predict Match Tab
- Select two teams
- Optional: city, venue, toss winner, toss decision
- Real-time ML prediction
- Win probability bars with team colors
- Confidence percentage

### Analytics Tab
- Wins vs Losses by team (grouped bar)
- Top venues (horizontal bar)
- Top 6 teams radar chart
- Matches by city (area chart)

### Model Metrics Tab
- All 5 model accuracies (bar chart)
- Top feature importance (horizontal bar)
- Training/test sample counts
- Features used list

### Head to Head Tab
- Select any two teams
- Total matches, wins for each
- Match-by-match history

---

## DATABASE SCHEMA

### users table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(100) | Unique email |
| full_name | VARCHAR(100) | User's full name |
| hashed_password | VARCHAR(255) | Bcrypt hashed password |
| is_active | BOOLEAN | Account status |
| created_at | DATETIME | Registration time |

### prediction_logs table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | FK to users |
| team1 | VARCHAR(50) | First team |
| team2 | VARCHAR(50) | Second team |
| predicted_winner | VARCHAR(50) | ML prediction |
| team1_win_prob | FLOAT | Team 1 win probability |
| team2_win_prob | FLOAT | Team 2 win probability |
| created_at | DATETIME | Prediction time |

---

## PRESENTATION TALKING POINTS

1. **Problem Statement**: Predict IPL match outcomes using historical data
2. **Data Sources**: 1000+ matches, 250K+ deliveries from 2008-2025
3. **Feature Engineering**: 14 carefully crafted features from raw data
4. **Model Comparison**: 5 models compared, best automatically selected
5. **Full-Stack**: React + FastAPI + SQLite with JWT authentication
6. **Real-Time Predictions**: Select any two teams for instant ML predictions
7. **Interactive Dashboards**: 8+ chart types for comprehensive analytics
8. **Scalable Architecture**: Clean separation of ML, API, and UI layers
