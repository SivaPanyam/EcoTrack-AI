import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import './App.css';

interface DailyAnalysis {
  summary: string;
  suggestions: string[];
}

interface ScoreExplanation {
  explanation: string;
}

interface Nudge {
  nudge: string;
}

interface Plan {
  steps: string[];
}

interface ImpactAnalysis {
  analysis: string;
}

interface ScoreFeedback {
  label: string;
  explanation: string;
}

interface TrendAnalysis {
  trendType: string;
  insight: string;
  suggestion: string;
}

interface WeeklyReport {
  weeklySummary: string;
  keyInsights: string[];
  nextWeekGoals: string[];
}

function App() {
  const { user, isAuthenticated, loginWithRedirect, logout, isLoading, getAccessTokenSilently } = useAuth0();
  
  // States
  const [formData, setFormData] = useState({
    transport: '',
    energy_usage: '',
    food_type: '',
    waste: '',
  });
  const [analysis, setAnalysis] = useState<DailyAnalysis | null>(null);
  const [scoreExplanation, setScoreExplanation] = useState<ScoreExplanation | null>(null);
  const [scoreFeedback, setScoreFeedback] = useState<ScoreFeedback | null>(null);
  const [trend, setTrend] = useState<TrendAnalysis | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

  // Health Check Effect
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get('/api/health');
        console.log('Backend Status:', res.data);
      } catch (err) {
        console.error('Backend unreachable on startup:', err);
      }
    };
    checkHealth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePresentationMode = () => {
    setPresentationMode(!presentationMode);
    if (!presentationMode) {
      setFormData({
        transport: '15 miles in a hybrid SUV',
        energy_usage: '6 hours of heat, energy-efficient appliances',
        food_type: 'Locally sourced vegetarian meals',
        waste: '1kg mixed recycling, 0.5kg composted organic',
      });
    } else {
      setFormData({ transport: '', energy_usage: '', food_type: '', waste: '' });
    }
  };

  const handleWeeklyReport = async () => {
    setWeeklyLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const mockLogs = [
        { transport: '10m car', energy_usage: 'high', food_type: 'meat', waste: '2kg' },
        { transport: 'bus', energy_usage: 'low', food_type: 'vegan', waste: '0.5kg' },
        { transport: 'bike', energy_usage: 'med', food_type: 'vegetarian', waste: '1kg' },
      ];
      const res = await axios.post('/api/analyze-weekly', mockLogs, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWeeklyReport(res.data);
    } catch (error: any) {
      alert(`Weekly Error: ${error.message}`);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const baseUrl = '/api';
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const mockScoreHistory = presentationMode ? [55, 62, 70, 78, 82] : [60, 65, 70, 68, 75];
      
      // Call ONE consolidated endpoint instead of 7 separate ones
      const response = await axios.post(`${baseUrl}/analyze-everything`, {
        activity: formData,
        history: mockScoreHistory
      }, config);

      const { daily, score, trend, extra } = response.data;

      setAnalysis(daily);
      setScoreExplanation({ explanation: score.explanation });
      setScoreFeedback(score);
      setTrend(trend);
      setNudge({ nudge: extra.nudge });
      setPlan({ steps: extra.plan });
      setImpact({ analysis: extra.majorImpact });

    } catch (error: any) {
      console.error('Error fetching data:', error);
      const msg = error.response ? `Backend Error (${error.response.status}): ${error.response.data.message || error.message}` : error.message;
      alert(`EcoTrack Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="container loading-container">Planting your sustainability environment...</div>;

  return (
    <div className="container animate-fade-in">
      <header>
        <div className="header-top">
          <div className="logo-section">
            <span className="leaf-icon">🌿</span>
            <h1>EcoTrack AI</h1>
          </div>
          <div className="auth-controls">
            {isAuthenticated ? (
              <>
                <span className="welcome-text">Welcome back, <strong>{user?.name}</strong></span>
                <button className="auth-btn" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
                  Log Out
                </button>
              </>
            ) : (
              <button className="auth-btn" onClick={() => loginWithRedirect()}>
                Log In / Sign Up
              </button>
            )}
          </div>
        </div>
        <p className="tagline">Your personal guide to a lower carbon footprint through smart AI analysis.</p>
      </header>

      {!isAuthenticated ? (
        <main className="landing animate-slide-up">
          <div className="hero-card">
            <h2>Ready to transform your impact?</h2>
            <p>Join thousands of others tracking their daily habits to build a more sustainable future for our planet.</p>
            <button className="hero-btn" onClick={() => loginWithRedirect()}>Get Started for Free</button>
            <div className="hero-features">
              <span>✓ Daily AI Insights</span>
              <span>✓ Custom 3-Step Plans</span>
              <span>✓ Weekly Trend Tracking</span>
            </div>
          </div>
        </main>
      ) : (
        <main>
          <section className="input-section card animate-slide-left">
            <div className="section-header">
              <h2>Log Daily Activity</h2>
              <button className={`demo-toggle ${presentationMode ? 'active' : ''}`} onClick={togglePresentationMode}>
                {presentationMode ? '✨ Demo Mode On' : 'Presentation Mode'}
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Transport</label>
                <input type="text" name="transport" placeholder="e.g., 10 miles in a car" value={formData.transport} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Energy Usage</label>
                <input type="text" name="energy_usage" placeholder="e.g., 5 hours of AC" value={formData.energy_usage} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Food Type</label>
                <input type="text" name="food_type" placeholder="e.g., Plant-based" value={formData.food_type} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Waste</label>
                <input type="text" name="waste" placeholder="e.g., Composted organic" value={formData.waste} onChange={handleChange} required />
              </div>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? <span className="loader">Analyzing...</span> : 'Analyze My Impact'}
              </button>
            </form>

            {scoreFeedback && (
              <div className="score-badge-container animate-bounce-in">
                <div className="score-badge">
                  <span className="badge-label">{scoreFeedback.label}</span>
                  <p>{scoreFeedback.explanation}</p>
                </div>
              </div>
            )}

            {nudge && (
              <div className="nudge-box animate-fade-in">
                <span className="nudge-sparkle">💡</span>
                <p><strong>Daily Nudge:</strong> {nudge.nudge}</p>
              </div>
            )}

            <div className="extra-actions">
              <button className="secondary-btn" onClick={handleWeeklyReport} disabled={weeklyLoading}>
                {weeklyLoading ? 'Generating...' : '📊 View Weekly Insights'}
              </button>
            </div>
          </section>

          <section className="results-section">
            {!analysis && !weeklyReport && (
              <div className="empty-state">
                <p>Waiting for your data to sprout insights...</p>
                <div className="empty-graphic">🌱</div>
              </div>
            )}

            {weeklyReport && (
              <div className="card weekly-card animate-slide-up highlight">
                <div className="card-header">
                  <h3>Weekly Sustainability Report</h3>
                  <span className="report-icon">📅</span>
                </div>
                <p className="summary-text">{weeklyReport.weeklySummary}</p>
              </div>
            )}

            {analysis && (
              <div className="analysis-grid">
                <div className="card analysis-card animate-slide-up">
                  <h3>Daily Impact Summary</h3>
                  <p>{analysis.summary}</p>
                </div>

                {impact && (
                  <div className="card impact-card animate-slide-up delay-100">
                    <h3>Major Impact Factor</h3>
                    <p>{impact.analysis}</p>
                  </div>
                )}

                <div className="card suggestion-card animate-slide-up delay-200">
                  <h3>AI Suggestions</h3>
                  <ul className="suggestion-list">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i}><span className="check">✓</span> {s}</li>
                    ))}
                  </ul>
                </div>

                {trend && (
                  <div className="card trend-card animate-slide-up delay-300">
                    <div className="card-header">
                      <h3>Progress Trend</h3>
                      <span className={`trend-badge-pill ${trend.trendType}`}>{trend.trendType}</span>
                    </div>
                    <p className="trend-insight"><strong>Insight:</strong> {trend.insight}</p>
                    
                    {/* Simulated History Chart */}
                    <div className="history-chart">
                      {[40, 55, 62, 75, 82].map((h, i) => (
                        <div key={i} className="bar-wrap" title={`Day ${i+1}: ${h}`}>
                          <div className="bar" style={{ height: `${h}%` }}></div>
                        </div>
                      ))}
                    </div>
                    <p className="pro-tip"><strong>Pro-Tip:</strong> {trend.suggestion}</p>
                  </div>
                )}

                {plan && (
                  <div className="card plan-card animate-slide-up delay-400">
                    <h3>Strategic 3-Step Plan</h3>
                    <div className="plan-steps">
                      {plan.steps.map((step, i) => (
                        <div key={i} className="plan-step">
                          <span className="step-number">{i + 1}</span>
                          <p>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scoreExplanation && (
                  <div className="card score-card animate-slide-up delay-500">
                    <h3>Scoring Methodology</h3>
                    <p className="explanation-text">{scoreExplanation.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}

      <footer>
        <p>&copy; 2026 EcoTrack AI - Small steps for a better planet.</p>
        <div className="footer-links">
          <span>Documentation</span>
          <span>Privacy Policy</span>
          <span>Open Source</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
