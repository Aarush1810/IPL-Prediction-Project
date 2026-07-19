"""
IPL Prediction ML Pipeline
Linear Regression + ensemble methods for match outcome prediction.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import pickle
import warnings
warnings.filterwarnings('ignore')


class IPLPredictor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = None
        self.feature_columns = []
        self.model_metrics = {}
        self.is_trained = False
        self.all_models = {}
        self.best_model_name = ""

    def prepare_features(self, df, feature_columns):
        self.feature_columns = feature_columns
        X = df[feature_columns].copy()
        y = df['winner_binary'].copy()
        return X, y

    def train(self, X, y, test_size=0.2):
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        lr = LinearRegression()
        lr.fit(X_train_scaled, y_train)
        lr_acc = accuracy_score(y_test, (lr.predict(X_test_scaled) > 0.5).astype(int))

        ridge = Ridge(alpha=1.0)
        ridge.fit(X_train_scaled, y_train)
        ridge_acc = accuracy_score(y_test, (ridge.predict(X_test_scaled) > 0.5).astype(int))

        lasso = Lasso(alpha=0.01)
        lasso.fit(X_train_scaled, y_train)
        lasso_acc = accuracy_score(y_test, (lasso.predict(X_test_scaled) > 0.5).astype(int))

        rf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
        rf.fit(X_train, y_train)
        rf_acc = accuracy_score(y_test, rf.predict(X_test))

        gb = GradientBoostingClassifier(n_estimators=200, max_depth=5, random_state=42)
        gb.fit(X_train, y_train)
        gb_acc = accuracy_score(y_test, gb.predict(X_test))

        models = {
            'Linear Regression': (lr, lr_acc, True),
            'Ridge Regression': (ridge, ridge_acc, True),
            'Lasso Regression': (lasso, lasso_acc, True),
            'Random Forest': (rf, rf_acc, False),
            'Gradient Boosting': (gb, gb_acc, False),
        }

        best_name = max(models, key=lambda k: models[k][1])
        self.model = models[best_name][0]
        self.best_model_name = best_name
        self.all_models = {k: v[0] for k, v in models.items()}
        self.is_scaled_model = models[best_name][2]

        accuracy_map = {k: round(v[1] * 100, 2) for k, v in models.items()}

        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
        elif hasattr(self.model, 'coef_'):
            importances = np.abs(self.model.coef_)
        else:
            importances = np.zeros(len(self.feature_columns))

        self.model_metrics = {
            'model_accuracies': accuracy_map,
            'best_model': best_name,
            'best_accuracy': accuracy_map[best_name],
            'feature_importance': dict(zip(self.feature_columns, importances.tolist())),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'features_used': self.feature_columns,
        }
        self.is_trained = True
        return self.model_metrics

    def predict_match(self, features_dict):
        if not self.is_trained:
            raise ValueError("Model not trained yet!")
        features = pd.DataFrame([features_dict])[self.feature_columns]
        if self.is_scaled_model:
            features = self.scaler.transform(features)
        win_prob = np.clip(self.model.predict(features)[0], 0, 1)
        return {
            'team1_win_probability': round(float(win_prob) * 100, 2),
            'team2_win_probability': round(float(1 - win_prob) * 100, 2),
            'predicted_winner': 'team1' if win_prob > 0.5 else 'team2',
            'confidence': round(abs(win_prob - 0.5) * 200, 2),
        }

    def predict_from_teams(self, team1, team2, processor, city=None, venue=None, toss_winner=None, toss_decision=None):
        le_team = processor.label_encoders.get('team')
        le_city = processor.label_encoders.get('city')
        le_venue = processor.label_encoders.get('venue')
        le_toss = processor.label_encoders.get('toss')

        team1_enc = le_team.transform([team1])[0] if team1 in le_team.classes_ else 0
        team2_enc = le_team.transform([team2])[0] if team2 in le_team.classes_ else 0
        city_enc = le_city.transform([city])[0] if city and city in le_city.classes_ else 0
        venue_enc = le_venue.transform([venue])[0] if venue and venue in le_venue.classes_ else 0
        toss_winner_bin = 1 if toss_winner == team1 else 0
        toss_dec_enc = le_toss.transform([toss_decision])[0] if toss_decision and toss_decision in le_toss.classes_ else 0

        team1_wr = processor.team_win_rate.get(team1, 0.5)
        team2_wr = processor.team_win_rate.get(team2, 0.5)
        h2h_key = f"{team1}_vs_{team2}"
        h2h_data = processor.h2h.get(h2h_key, {'wins': 0, 'total': 0})
        h2h_wr = h2h_data['wins'] / max(h2h_data['total'], 1)

        avg_stats = processor.avg_delivery_stats if hasattr(processor, 'avg_delivery_stats') else {}
        avg_first_innings = 165.0
        avg_first_innings_wkts = 6.0

        features = {
            'team1_encoded': team1_enc, 'team2_encoded': team2_enc,
            'city_encoded': city_enc, 'venue_encoded': venue_enc,
            'toss_winner_binary': toss_winner_bin, 'toss_decision_encoded': toss_dec_enc,
            'team1_win_rate': team1_wr, 'team2_win_rate': team2_wr,
            'h2h_win_rate': h2h_wr,
            'avg_first_innings': avg_first_innings, 'avg_first_innings_wkts': avg_first_innings_wkts,
        }
        return self.predict_match(features)

    def get_predictions_for_all_pairs(self, processor):
        teams = list(processor.team_win_rate.keys())
        predictions = []
        for i, t1 in enumerate(teams):
            for t2 in teams[i + 1:]:
                result = self.predict_from_teams(t1, t2, processor)
                predictions.append({
                    'team1': t1, 'team2': t2,
                    'team1_win_prob': result['team1_win_probability'],
                    'team2_win_prob': result['team2_win_probability'],
                })
        return predictions

    def save_model(self, filepath):
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model, 'scaler': self.scaler,
                'feature_columns': self.feature_columns,
                'best_model_name': self.best_model_name,
                'model_metrics': self.model_metrics,
                'all_models': self.all_models,
                'is_scaled_model': self.is_scaled_model,
            }, f)

    def load_model(self, filepath):
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_columns = data['feature_columns']
        self.best_model_name = data['best_model_name']
        self.model_metrics = data['model_metrics']
        self.all_models = data['all_models']
        self.is_scaled_model = data.get('is_scaled_model', True)
        self.is_trained = True
        return self
