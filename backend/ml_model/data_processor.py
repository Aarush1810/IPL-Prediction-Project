"""
IPL Data Processor - Handles loading, cleaning, and feature engineering
for IPL matches and deliveries datasets (2008-2025).
"""
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')


class IPLDataProcessor:
    def __init__(self):
        self.label_encoders = {}
        self.team_mapping = {}
        self.feature_columns = []

    def load_data(self, matches_path, deliveries_path):
        self.matches = pd.read_csv(matches_path)
        self.deliveries = pd.read_csv(deliveries_path)
        return self

    def clean_matches(self):
        m = self.matches.copy()
        drop_cols = [c for c in ['umpire1', 'umpire2', 'umpire3', 'player_of_match', 'stage'] if c in m.columns]
        m.drop(columns=drop_cols, inplace=True)
        m.dropna(subset=['winner'], inplace=True)
        for col in ['winner', 'team1', 'team2', 'city', 'venue', 'toss_winner']:
            if col in m.columns:
                m[col] = m[col].astype(str).str.strip()

        m['date'] = pd.to_datetime(m['date'], errors='coerce')
        if 'season' in m.columns:
            m['season'] = pd.to_numeric(m['season'], errors='coerce').fillna(2023).astype(int)

        team_renames = {
            'Delhi Daredevils': 'Delhi Capitals',
            'Deccan Chargers': 'Sunrisers Hyderabad',
            'Pune Warriors India': 'Rising Pune Supergiant',
            'Gujarat Lions': 'Gujarat Titans',
            'Rising Pune Supergiant': 'Rising Pune Supergiants',
            'Kings XI Punjab': 'Punjab Kings',
        }
        for col in ['team1', 'team2', 'winner', 'toss_winner']:
            if col in m.columns:
                m[col] = m[col].replace(team_renames)

        m = m[~m['winner'].isin(['nan', 'No Result', 'tie', ''])]

        for col in ['first_innings_score', 'first_innings_wickets',
                     'second_innings_score', 'second_innings_wickets']:
            if col in m.columns:
                m[col] = pd.to_numeric(m[col], errors='coerce')

        self.matches = m
        return self

    def aggregate_delivery_stats(self):
        d = self.deliveries.copy()
        d.rename(columns={
            'ID': 'match_id', 'overs': 'over', 'ballnumber': 'ball',
            'batter': 'batsman', 'batsman_run': 'batsman_runs',
            'isWicketDelivery': 'is_wicket', 'BattingTeam': 'batting_team',
            'total_run': 'total_runs', 'extras_run': 'extra_runs',
        }, inplace=True)

        team_renames = {
            'Delhi Daredevils': 'Delhi Capitals',
            'Deccan Chargers': 'Sunrisers Hyderabad',
            'Pune Warriors India': 'Rising Pune Supergiant',
            'Gujarat Lions': 'Gujarat Titans',
            'Kings XI Punjab': 'Punjab Kings',
        }
        if 'batting_team' in d.columns:
            d['batting_team'] = d['batting_team'].astype(str).str.strip().replace(team_renames)

        self.avg_delivery_stats = {}
        if 'total_runs' in d.columns:
            self.avg_delivery_stats['avg_total_runs'] = float(d['total_runs'].mean())
        if 'is_wicket' in d.columns:
            self.avg_delivery_stats['avg_wickets'] = float(d['is_wicket'].sum() / d['match_id'].nunique())
        if 'extra_runs' in d.columns:
            self.avg_delivery_stats['avg_extras'] = float(d['extra_runs'].mean())

        if 'batsman' in d.columns and 'batsman_runs' in d.columns:
            scorer = d.groupby(['match_id', 'batsman'])['batsman_runs'].sum().reset_index()
            scorer = scorer.sort_values('batsman_runs', ascending=False).groupby('match_id').first().reset_index()
            self.avg_delivery_stats['avg_top_scorer_runs'] = float(scorer['batsman_runs'].mean())
        else:
            self.avg_delivery_stats['avg_top_scorer_runs'] = 40.0

        if 'bowler' in d.columns and 'is_wicket' in d.columns:
            bowler = d.groupby(['match_id', 'bowler'])['is_wicket'].sum().reset_index()
            bowler = bowler.sort_values('is_wicket', ascending=False).groupby('match_id').first().reset_index()
            self.avg_delivery_stats['avg_top_bowler_wkts'] = float(bowler['is_wicket'].mean())
        else:
            self.avg_delivery_stats['avg_top_bowler_wkts'] = 2.0

        self.deliveries_processed = d
        return self

    def create_ml_features(self):
        m = self.matches.copy()
        m['winner_binary'] = (m['winner'] == m['team1']).astype(int)
        m['toss_winner_binary'] = (m['toss_winner'] == m['team1']).astype(int)

        all_teams = pd.concat([m['team1'], m['team2'], m['winner']]).dropna().unique()
        le_team = LabelEncoder()
        le_team.fit(all_teams)
        m['team1_encoded'] = le_team.transform(m['team1'])
        m['team2_encoded'] = le_team.transform(m['team2'])
        self.label_encoders['team'] = le_team

        le_city = LabelEncoder()
        city_vals = m['city'].dropna().unique()
        le_city.fit(city_vals)
        m['city_encoded'] = le_city.transform(m['city'].fillna(city_vals[0]))
        self.label_encoders['city'] = le_city

        le_venue = LabelEncoder()
        venue_vals = m['venue'].dropna().unique()
        le_venue.fit(venue_vals)
        m['venue_encoded'] = le_venue.transform(m['venue'].fillna(venue_vals[0]))
        self.label_encoders['venue'] = le_venue

        le_toss = LabelEncoder()
        le_toss.fit(['bat', 'field'])
        m['toss_decision_encoded'] = le_toss.transform(m['toss_decision'])
        self.label_encoders['toss'] = le_toss

        team_win_rate = {}
        for team in all_teams:
            team_matches = m[(m['team1'] == team) | (m['team2'] == team)]
            wins = (team_matches['winner'] == team).sum()
            total = len(team_matches)
            team_win_rate[team] = wins / total if total > 0 else 0.5
        m['team1_win_rate'] = m['team1'].map(team_win_rate)
        m['team2_win_rate'] = m['team2'].map(team_win_rate)

        h2h = {}
        for _, row in m.iterrows():
            t1, t2, winner = row['team1'], row['team2'], row['winner']
            for key_pair, w in [(f"{t1}_vs_{t2}", t1), (f"{t2}_vs_{t1}", t2)]:
                if key_pair not in h2h:
                    h2h[key_pair] = {'wins': 0, 'total': 0}
                h2h[key_pair]['total'] += 1
                if winner == w:
                    h2h[key_pair]['wins'] += 1

        m['h2h_win_rate'] = m.apply(
            lambda r: h2h.get(f"{r['team1']}_vs_{r['team2']}", {'wins': 0, 'total': 1}).get('wins', 0) /
                       max(h2h.get(f"{r['team1']}_vs_{r['team2']}", {'wins': 0, 'total': 1}).get('total', 1), 1),
            axis=1
        )

        # Use match-level features from the dataset itself
        if 'first_innings_score' in m.columns:
            m['avg_first_innings'] = m['first_innings_score'].fillna(m['first_innings_score'].median())
        else:
            m['avg_first_innings'] = 160.0

        if 'first_innings_wickets' in m.columns:
            m['avg_first_innings_wkts'] = m['first_innings_wickets'].fillna(m['first_innings_wickets'].median())
        else:
            m['avg_first_innings_wkts'] = 6.0

        self.team_win_rate = team_win_rate
        self.h2h = h2h

        feature_cols = [
            'team1_encoded', 'team2_encoded', 'city_encoded', 'venue_encoded',
            'toss_winner_binary', 'toss_decision_encoded',
            'team1_win_rate', 'team2_win_rate', 'h2h_win_rate',
            'avg_first_innings', 'avg_first_innings_wkts',
        ]
        m = m.dropna(subset=feature_cols + ['winner_binary'])
        self.feature_columns = feature_cols
        self.processed_data = m
        return self

    def get_team_stats(self):
        stats = []
        for team, wr in self.team_win_rate.items():
            total_matches = len(self.matches[(self.matches['team1'] == team) | (self.matches['team2'] == team)])
            wins = len(self.matches[self.matches['winner'] == team])
            stats.append({
                'team': team, 'total_matches': total_matches,
                'wins': wins, 'losses': total_matches - wins,
                'win_rate': round(wr * 100, 1)
            })
        return sorted(stats, key=lambda x: x['win_rate'], reverse=True)

    def get_season_stats(self):
        season_wins = self.matches.groupby(['season', 'winner']).size().reset_index(name='wins')
        season_winners = season_wins.loc[season_wins.groupby('season')['wins'].idxmax()]
        result = []
        for _, row in season_winners.iterrows():
            result.append({
                'season': int(row['season']),
                'champion': row['winner'],
                'wins': int(row['wins'])
            })
        return sorted(result, key=lambda x: x['season'])

    def get_venue_stats(self):
        venue_data = self.matches.groupby('venue').size().reset_index(name='total_matches')
        venue_data = venue_data.sort_values('total_matches', ascending=False).head(15)
        return venue_data.to_dict('records')

    def get_city_stats(self):
        city_data = self.matches.groupby('city').size().reset_index(name='total_matches')
        city_data = city_data.sort_values('total_matches', ascending=False).head(15)
        return city_data.to_dict('records')

    def get_toss_stats(self):
        total = self.matches.shape[0]
        toss_then_match = self.matches[self.matches['toss_winner'] == self.matches['winner']].shape[0]
        bat_first = self.matches[self.matches['toss_decision'] == 'bat'].shape[0]
        field_first = self.matches[self.matches['toss_decision'] == 'field'].shape[0]
        return {
            'toss_win_rate': round(toss_then_match / total * 100, 1) if total > 0 else 0,
            'bat_first_count': bat_first,
            'field_first_count': field_first,
            'total_matches': total,
        }

    def get_team_vs_team(self, team1, team2):
        h2h_key = f"{team1}_vs_{team2}"
        h2h_data = self.h2h.get(h2h_key, {'wins': 0, 'total': 0})
        matches = self.matches[
            ((self.matches['team1'] == team1) & (self.matches['team2'] == team2)) |
            ((self.matches['team1'] == team2) & (self.matches['team2'] == team1))
        ]
        results = []
        for _, row in matches.iterrows():
            results.append({
                'season': int(row.get('season', 0)),
                'winner': row['winner'],
                'venue': row.get('venue', ''),
            })
        return {
            'team1': team1, 'team2': team2,
            'total_matches': h2h_data['total'],
            'team1_wins': h2h_data['wins'],
            'team2_wins': h2h_data['total'] - h2h_data['wins'],
            'matches': results,
        }
