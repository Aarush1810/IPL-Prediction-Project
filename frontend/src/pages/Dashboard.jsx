import React, { useState, useEffect } from 'react'
import { useAuth } from '../services/AuthContext'
import { dashboardAPI, predictionAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
} from 'recharts'

const TEAM_COLORS = {
  'Mumbai Indians': '#004BA0',
  'Chennai Super Kings': '#FCCA06',
  'Royal Challengers Bangalore': '#EC1C24',
  'Kolkata Knight Riders': '#3A225D',
  'Delhi Capitals': '#0078BC',
  'Rajasthan Royals': '#EA1A85',
  'Sunrisers Hyderabad': '#FF822A',
  'Kings XI Punjab': '#ED1B24',
  'Gujarat Titans': '#1C1C1C',
  'Lucknow Super Giants': '#A72056',
  'Punjab Kings': '#ED1B24',
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fbc2eb']

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  // Prediction form state
  const [teams, setTeams] = useState([])
  const [cities, setCities] = useState([])
  const [venues, setVenues] = useState([])
  const [predForm, setPredForm] = useState({ team1: '', team2: '', city: '', venue: '', toss_winner: '', toss_decision: '' })
  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)

  // Head to head
  const [h2hForm, setH2hForm] = useState({ team1: '', team2: '' })
  const [h2hResult, setH2hResult] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsRes, metricsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getModelMetrics(),
      ])
      setStats(statsRes.data)
      setMetrics(metricsRes.data)
      setTeams(statsRes.data.available_teams || [])
      setCities(statsRes.data.available_cities || [])
      setVenues(statsRes.data.available_venues || [])
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!predForm.team1 || !predForm.team2) {
      toast.error('Please select both teams')
      return
    }
    if (predForm.team1 === predForm.team2) {
      toast.error('Please select different teams')
      return
    }
    setPredicting(true)
    try {
      const res = await predictionAPI.predict(predForm)
      setPrediction(res.data)
      toast.success('Prediction ready!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setPredicting(false)
    }
  }

  const handleH2H = async () => {
    if (!h2hForm.team1 || !h2hForm.team2) return
    try {
      const res = await dashboardAPI.getHeadToHead(h2hForm.team1, h2hForm.team2)
      setH2hResult(res.data)
    } catch (err) {
      toast.error('Failed to load head-to-head')
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    )
  }

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>IPL Predictor</h2>
          <p>ML-Powered Analytics</p>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'predict', label: 'Predict Match', icon: '🏏' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'models', label: 'Model Metrics', icon: '🤖' },
            { id: 'headtohead', label: 'Head to Head', icon: '⚔️' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{user?.full_name}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'overview' && <OverviewTab stats={stats} metrics={metrics} />}
        {activeTab === 'predict' && (
          <PredictTab
            teams={teams} cities={cities} venues={venues}
            predForm={predForm} setPredForm={setPredForm}
            prediction={prediction} predicting={predicting}
            handlePredict={handlePredict}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab stats={stats} />}
        {activeTab === 'models' && <ModelsTab metrics={metrics} />}
        {activeTab === 'headtohead' && (
          <HeadToHeadTab
            teams={teams} h2hForm={h2hForm} setH2hForm={setH2hForm}
            h2hResult={h2hResult} handleH2H={handleH2H}
          />
        )}
      </main>
    </div>
  )
}

/* ───── OVERVIEW TAB ───── */
function OverviewTab({ stats, metrics }) {
  const teamData = (stats?.team_stats || []).map(t => ({
    ...t, fill: TEAM_COLORS[t.team] || '#667eea',
  }))

  const seasonData = (stats?.season_stats || [])
  const topTeams = teamData.slice(0, 8)

  return (
    <>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>IPL Analytics from 2008-2025 powered by Machine Learning</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(102,126,234,0.15)', color: '#667eea'}}>🏏</div>
          <div className="stat-value">{stats?.team_stats?.reduce((a, t) => a + t.total_matches, 0) / 2 || 0}</div>
          <div className="stat-label">Total Matches Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(52,211,153,0.15)', color: '#34d399'}}>🤖</div>
          <div className="stat-value">{metrics?.best_accuracy || 0}%</div>
          <div className="stat-label">Best Model Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(245,158,11,0.15)', color: '#f59e0b'}}>📊</div>
          <div className="stat-value">{stats?.team_stats?.length || 0}</div>
          <div className="stat-label">Teams Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(240,147,251,0.15)', color: '#f093fb'}}>🏆</div>
          <div className="stat-value">{stats?.season_stats?.length || 0}</div>
          <div className="stat-label">Seasons Covered</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>🏏 Team Win Rates</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={topTeams} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9aa0b4', fontSize: 12 }} />
              <YAxis type="category" dataKey="team" tick={{ fill: '#9aa0b4', fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="win_rate" radius={[0, 6, 6, 0]}>
                {topTeams.map((entry, i) => (
                  <Cell key={i} fill={TEAM_COLORS[entry.team] || COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🏆 Season Champions</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={seasonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="season" tick={{ fill: '#9aa0b4', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }}
                formatter={(value, name, props) => [props.payload.champion, 'Champion']}
              />
              <Line type="monotone" dataKey="wins" stroke="#667eea" strokeWidth={2} dot={{ fill: '#667eea', r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🏟️ Matches by City</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={(stats?.city_stats || []).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="city" tick={{ fill: '#9aa0b4', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#9aa0b4', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="total_matches" radius={[6, 6, 0, 0]}>
                {(stats?.city_stats || []).slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🎯 Toss Decision Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Bat First', value: stats?.toss_stats?.bat_first_count || 0 },
                  { name: 'Field First', value: stats?.toss_stats?.field_first_count || 0 },
                ]}
                cx="50%" cy="50%" outerRadius={120} innerRadius={60}
                dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                <Cell fill="#667eea" />
                <Cell fill="#f093fb" />
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

/* ───── PREDICT TAB ───── */
function PredictTab({ teams, cities, venues, predForm, setPredForm, prediction, predicting, handlePredict }) {
  const handleChange = (field) => (e) => setPredForm({ ...predForm, [field]: e.target.value })

  return (
    <>
      <div className="page-header">
        <h1>Predict Match Outcome</h1>
        <p>Select two teams and optional conditions to get ML-powered win predictions</p>
      </div>

      <div className="predict-section">
        <div className="predict-form">
          <div className="form-group">
            <label>Team 1 (Home)</label>
            <select value={predForm.team1} onChange={handleChange('team1')}>
              <option value="">Select Team 1</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Team 2 (Away)</label>
            <select value={predForm.team2} onChange={handleChange('team2')}>
              <option value="">Select Team 2</option>
              {teams.filter(t => t !== predForm.team1).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>City</label>
            <select value={predForm.city} onChange={handleChange('city')}>
              <option value="">Any City</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Venue</label>
            <select value={predForm.venue} onChange={handleChange('venue')}>
              <option value="">Any Venue</option>
              {venues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Toss Winner</label>
            <select value={predForm.toss_winner} onChange={handleChange('toss_winner')}>
              <option value="">Unknown</option>
              {predForm.team1 && <option value={predForm.team1}>{predForm.team1}</option>}
              {predForm.team2 && <option value={predForm.team2}>{predForm.team2}</option>}
            </select>
          </div>
          <div className="form-group">
            <label>Toss Decision</label>
            <select value={predForm.toss_decision} onChange={handleChange('toss_decision')}>
              <option value="">Unknown</option>
              <option value="bat">Bat First</option>
              <option value="field">Field First</option>
            </select>
          </div>
          <button className="btn btn-primary predict-btn" onClick={handlePredict} disabled={predicting}>
            {predicting ? 'Predicting...' : '🔮 Predict Winner'}
          </button>
        </div>

        {prediction && (
          <div className="prediction-result">
            <div className="winner-badge">
              🏆 Predicted Winner: {prediction.predicted_winner}
            </div>
            <p style={{color: 'var(--text-secondary)', marginTop: 12}}>
              Confidence: {prediction.confidence}%
            </p>
            <div className="prob-bars">
              <div className="prob-bar-container">
                <div className="prob-bar-label">
                  <span>{prediction.team1}</span>
                  <span style={{fontWeight: 700}}>{prediction.team1_win_probability}%</span>
                </div>
                <div className="prob-bar">
                  <div className="prob-bar-fill" style={{
                    width: `${prediction.team1_win_probability}%`,
                    background: TEAM_COLORS[prediction.team1] || '#667eea',
                  }} />
                </div>
              </div>
              <div className="prob-bar-container">
                <div className="prob-bar-label">
                  <span>{prediction.team2}</span>
                  <span style={{fontWeight: 700}}>{prediction.team2_win_probability}%</span>
                </div>
                <div className="prob-bar">
                  <div className="prob-bar-fill" style={{
                    width: `${prediction.team2_win_probability}%`,
                    background: TEAM_COLORS[prediction.team2] || '#764ba2',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ───── ANALYTICS TAB ───── */
function AnalyticsTab({ stats }) {
  const teamData = (stats?.team_stats || []).map(t => ({
    ...t, fill: TEAM_COLORS[t.team] || '#667eea',
  }))

  const venueData = (stats?.venue_stats || []).map((v, i) => ({
    ...v, fill: COLORS[i % COLORS.length],
  }))

  const radarData = teamData.slice(0, 6).map(t => ({
    team: t.team.split(' ').pop(),
    winRate: t.win_rate,
    matches: t.total_matches,
    wins: t.wins,
  }))

  return (
    <>
      <div className="page-header">
        <h1>Deep Analytics</h1>
        <p>Comprehensive IPL statistics and trends</p>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>📊 Wins vs Losses by Team</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="team" tick={{ fill: '#9aa0b4', fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
              <YAxis tick={{ fill: '#9aa0b4' }} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Legend />
              <Bar dataKey="wins" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="losses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🏟️ Top Venues by Matches</h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={venueData.slice(0, 10)} layout="vertical" margin={{ left: 160 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis type="number" tick={{ fill: '#9aa0b4' }} />
              <YAxis type="category" dataKey="venue" tick={{ fill: '#9aa0b4', fontSize: 10 }} width={200} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="total_matches" radius={[0, 6, 6, 0]}>
                {venueData.slice(0, 10).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🕸️ Top 6 Teams Radar</h3>
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2d3148" />
              <PolarAngleAxis dataKey="team" tick={{ fill: '#9aa0b4', fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: '#9aa0b4', fontSize: 10 }} />
              <Radar name="Win Rate" dataKey="winRate" stroke="#667eea" fill="#667eea" fillOpacity={0.3} />
              <Radar name="Matches" dataKey="matches" stroke="#f093fb" fill="#f093fb" fillOpacity={0.15} />
              <Legend />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>📍 Matches by City (Area)</h3>
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={(stats?.city_stats || []).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="city" tick={{ fill: '#9aa0b4', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#9aa0b4' }} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <defs>
                <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="total_matches" stroke="#667eea" fill="url(#colorMatches)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

/* ───── MODELS TAB ───── */
function ModelsTab({ metrics }) {
  const accuracyData = metrics
    ? Object.entries(metrics.model_accuracies).map(([name, acc]) => ({
        name, accuracy: acc, isBest: name === metrics.best_model,
      }))
    : []

  const featureData = metrics
    ? Object.entries(metrics.feature_importance || {}).map(([name, imp]) => ({
        name: name.replace(/_/g, ' '), importance: parseFloat((imp * 100).toFixed(2)),
      })).sort((a, b) => b.importance - a.importance).slice(0, 10)
    : []

  return (
    <>
      <div className="page-header">
        <h1>Model Performance</h1>
        <p>Machine learning model comparison and feature analysis</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(52,211,153,0.15)', color: '#34d399'}}>🎯</div>
          <div className="stat-value">{metrics?.best_accuracy || 0}%</div>
          <div className="stat-label">Best Accuracy ({metrics?.best_model})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(102,126,234,0.15)', color: '#667eea'}}>📐</div>
          <div className="stat-value">{metrics?.training_samples || 0}</div>
          <div className="stat-label">Training Samples</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(240,147,251,0.15)', color: '#f093fb'}}>🧪</div>
          <div className="stat-value">{metrics?.test_samples || 0}</div>
          <div className="stat-label">Test Samples</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{background: 'rgba(245,158,11,0.15)', color: '#f59e0b'}}>📋</div>
          <div className="stat-value">{metrics?.features_used?.length || 0}</div>
          <div className="stat-label">Features Used</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>📊 Model Accuracy Comparison</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="name" tick={{ fill: '#9aa0b4', fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9aa0b4' }} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                {accuracyData.map((entry, i) => (
                  <Cell key={i} fill={entry.isBest ? '#34d399' : '#667eea'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>🔑 Top Feature Importance</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={featureData} layout="vertical" margin={{ left: 130 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis type="number" tick={{ fill: '#9aa0b4' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#9aa0b4', fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="importance" radius={[0, 6, 6, 0]}>
                {featureData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h4>All Model Accuracies</h4>
          {accuracyData.map(item => (
            <div key={item.name} className="accuracy-item">
              <span className="accuracy-name">{item.name}</span>
              <span className={`accuracy-value ${item.isBest ? 'best' : ''}`}>
                {item.accuracy}% {item.isBest && '✓ BEST'}
              </span>
            </div>
          ))}
        </div>
        <div className="metric-card">
          <h4>Features in Pipeline</h4>
          {(metrics?.features_used || []).map((feat, i) => (
            <div key={feat} className="accuracy-item">
              <span className="accuracy-name">{i + 1}. {feat.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ───── HEAD TO HEAD TAB ───── */
function HeadToHeadTab({ teams, h2hForm, setH2hForm, h2hResult, handleH2H }) {
  return (
    <>
      <div className="page-header">
        <h1>Head to Head</h1>
        <p>Compare two teams' historical record</p>
      </div>

      <div className="predict-section">
        <div className="predict-form" style={{gridTemplateColumns: '1fr 1fr auto'}}>
          <div className="form-group">
            <label>Team 1</label>
            <select value={h2hForm.team1} onChange={(e) => setH2hForm({...h2hForm, team1: e.target.value})}>
              <option value="">Select Team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Team 2</label>
            <select value={h2hForm.team2} onChange={(e) => setH2hForm({...h2hForm, team2: e.target.value})}>
              <option value="">Select Team</option>
              {teams.filter(t => t !== h2hForm.team1).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{display: 'flex', alignItems: 'flex-end'}}>
            <button className="btn btn-primary" onClick={handleH2H} style={{width: 'auto', padding: '12px 24px'}}>
              Compare
            </button>
          </div>
        </div>

        {h2hResult && (
          <div className="prediction-result" style={{textAlign: 'left'}}>
            <div style={{display: 'flex', justifyContent: 'space-around', marginBottom: 24}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: 32, fontWeight: 800, color: '#667eea'}}>{h2hResult.team1_wins}</div>
                <div style={{color: 'var(--text-secondary)', fontSize: 13}}>{h2hResult.team1}</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: 14, color: 'var(--text-muted)'}}>{h2hResult.total_matches} Total Matches</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: 32, fontWeight: 800, color: '#f093fb'}}>{h2hResult.team2_wins}</div>
                <div style={{color: 'var(--text-secondary)', fontSize: 13}}>{h2hResult.team2}</div>
              </div>
            </div>

            {h2hResult.matches?.length > 0 && (
              <>
                <h4 style={{marginBottom: 12}}>Match History</h4>
                <div style={{maxHeight: 300, overflowY: 'auto'}}>
                  {h2hResult.matches.map((m, i) => (
                    <div key={i} className="accuracy-item">
                      <span className="accuracy-name">Season {m.season}</span>
                      <span style={{color: 'var(--text-secondary)', fontSize: 13}}>{m.venue}</span>
                      <span className="accuracy-value" style={{color: '#34d399'}}>{m.winner}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
