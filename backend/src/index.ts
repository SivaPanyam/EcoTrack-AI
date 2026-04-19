import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { auth } from 'express-oauth2-jwt-bearer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Auth0 Middleware Configuration
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE as string,
  issuerBaseURL: process.env.AUTH0_ISSUER_URL as string,
  tokenSigningAlg: 'RS256'
});

export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'), 
});

// Daily Activity Schema
const DailyActivitySchema = z.object({
  transport: z.string(),
  energy_usage: z.string(),
  food_type: z.string(),
  waste: z.string(),
});

// Input Sanitization Utility
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/<[^>]*>?/gm, '').replace(/[;`]/g, '').replace(/\s\s+/g, ' ');
}

// Validation Middleware
const validateDailyActivity = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Sanitize all string fields in the body
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
    DailyActivitySchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation Failed", details: error.errors });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// 1. Daily Impact Analysis Flow
export const analyzeDailyImpact = ai.defineFlow(
  {
    name: 'analyzeDailyImpact',
    inputSchema: DailyActivitySchema,
    outputSchema: z.object({
      summary: z.string(),
      suggestions: z.array(z.string()),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Analyze the environmental impact of today's habits.
        Activity:
        - Transport: ${input.transport}
        - Energy Usage: ${input.energy_usage}
        - Food Type: ${input.food_type}
        - Waste: ${input.waste}

        Output format:
        Impact Summary: (2-3 lines)
        Suggestions: (exactly 3 personalized, practical suggestions)
        
        Constraints:
        - Be specific, not generic.
        - Suggestions must be realistic for daily life.
        - Focus on highest impact improvements.
      `,
    });

    const text = response.text;
    const summaryMatch = text.match(/Impact Summary:\s*([\s\S]*?)(?=Suggestions:|$)/i);
    const suggestionsMatch = text.match(/Suggestions:\s*([\s\S]*)/i);

    const summary = (summaryMatch && summaryMatch[1]) ? summaryMatch[1].trim() : text;
    const suggestionsRaw = (suggestionsMatch && suggestionsMatch[1]) ? suggestionsMatch[1].trim() : "";
    const suggestions = suggestionsRaw
      ? suggestionsRaw.split('\n').filter(s => s.trim().startsWith('-')).map(s => s.trim().substring(1).trim())
      : [];

    return { summary, suggestions: suggestions.slice(0, 3) };
  }
);

// 2. Score Explanation Flow
export const explainScore = ai.defineFlow(
  {
    name: 'explainScore',
    inputSchema: z.object({
      activity: DailyActivitySchema,
      score: z.number(),
    }),
    outputSchema: z.object({
      explanation: z.string(),
      positiveBehavior: z.string(),
      improvementArea: z.string(),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Explain the sustainability score for the following daily activity:
        Activity: ${JSON.stringify(input.activity)}
        Score: ${input.score}/100

        Explain:
        - Why this score was given
        - One positive behavior
        - One key area to improve

        Constraints:
        - Max 5 lines total for the explanation.
        - Keep it clear and simple.
      `,
    });

    const text = response.text;
    // Basic parsing - assuming model follows a simple structure or returning as one block if complex
    return {
      explanation: text,
      positiveBehavior: "Extracted from explanation", // Simplification for prototype
      improvementArea: "Extracted from explanation",
    };
  }
);

// 3. Weekly Trends Flow
export const analyzeWeeklyTrends = ai.defineFlow(
  {
    name: 'analyzeWeeklyTrends',
    inputSchema: z.array(DailyActivitySchema),
    outputSchema: z.object({
      weeklySummary: z.string(),
      keyInsights: z.array(z.string()),
      nextWeekGoals: z.array(z.string()),
    }),
  },
  async (logs) => {
    const response = await ai.generate({
      prompt: `
        Analyze the user's sustainability behavior over the week based on these logs:
        ${JSON.stringify(logs)}

        Identify:
        - biggest improvement
        - biggest negative habit
        - trend (improving or declining)

        Output format:
        Weekly Summary: (3-4 lines)
        Key Insights: (2 points)
        Next Week Goals: (exactly 3 goals)
      `,
    });

    const text = response.text;
    const parts = text.split('Key Insights:');
    const weeklySummary = (parts[0] || "").replace('Weekly Summary:', '').trim();
    
    return {
      weeklySummary,
      keyInsights: [],
      nextWeekGoals: [],
    };
  }
);

// Reliable AI Utility
async function safeGenerate(prompt: string, fallback: string): Promise<string> {
  let attempts = 0;
  const MAX_ATTEMPTS = 2;
  while (attempts < MAX_ATTEMPTS) {
    try {
      const response = await ai.generate({ prompt });
      return response.text.trim();
    } catch (error: any) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) return fallback;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return fallback;
}

// 4. Sustainability Nudge Flow
export const generateNudge = ai.defineFlow(
  {
    name: 'generateNudge',
    inputSchema: z.object({ recent_activity: z.string() }),
    outputSchema: z.object({ nudge: z.string() }),
  },
  async (input) => {
    const prompt = `
        User recent behavior: ${input.recent_activity}
        Generate 1 short motivational sustainability nudge.
        Constraints: Max 2 lines, actionable, related to behavior.
      `;
    const fallback = "Great job tracking your habits! Every small green step counts toward a better planet.";
    const nudge = await safeGenerate(prompt, fallback);
    return { nudge };
  }
);

// 5. Sustainability Improvement Plan Flow
export const generateImprovementPlan = ai.defineFlow(
  {
    name: 'generateImprovementPlan',
    inputSchema: z.object({ user_history_summary: z.string() }),
    outputSchema: z.object({ steps: z.array(z.string()) }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        User behavior summary: ${input.user_history_summary}
        Suggest a step-by-step plan to improve sustainability.

        Constraints:
        - Exactly 3 steps.
        - Each step must be practical and high impact.
        - Avoid generic advice.

        Format:
        1. [Step 1]
        2. [Step 2]
        3. [Step 3]
      `,
    });
    
    const text = response.text;
    const steps = text.split('\n')
      .filter(line => /^\d\./.test(line.trim()))
      .map(line => line.replace(/^\d\.\s*/, '').trim());
      
    return { steps: steps.slice(0, 3) };
  }
);

// 6. Identify Main Impact Flow
export const identifyMainImpact = ai.defineFlow(
  {
    name: 'identifyMainImpact',
    inputSchema: z.object({ user_input: z.string() }),
    outputSchema: z.object({ analysis: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        User data: ${input.user_input}

        Identify:
        - The activity contributing most to environmental impact
        - Why it matters
        - One change that would reduce impact the most

        Constraints:
        - Keep explanation simple.
        - Max 4 lines total.
      `,
    });
    return { analysis: response.text.trim() };
  }
);

// 7. UI Formatter Flow
export const formatUIContent = ai.defineFlow(
  {
    name: 'formatUIContent',
    inputSchema: z.object({ ai_raw_response: z.string() }),
    outputSchema: z.object({
      title: z.string(),
      summary: z.string(),
      cards: z.array(z.object({ title: z.string(), description: z.string() })),
    }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Input AI Raw Response: ${input.ai_raw_response}
        Task: Convert this into structured UI content.

        Output JSON format:
        {
          "title": "short heading",
          "summary": "2 line summary",
          "cards": [
            {"title": "...", "description": "..."},
            {"title": "...", "description": "..."}
          ]
        }

        Rules:
        - Keep text short and clean.
        - Make it easy to display on cards.
      `,
    });
    
    try {
      return JSON.parse(response.text);
    } catch (e) {
      return {
        title: "Sustainability Insights",
        summary: "Analysis of your recent activity.",
        cards: [{ title: "Note", description: response.text }]
      };
    }
  }
);

// 8. Score Feedback Flow
export const generateScoreFeedback = ai.defineFlow(
  {
    name: 'generateScoreFeedback',
    inputSchema: z.object({ score: z.number() }),
    outputSchema: z.object({ label: z.string(), explanation: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Score: ${input.score}/100
        Generate:
        - A label (e.g., "Good", "Needs Improvement", "Excellent")
        - A 1-line explanation

        Constraints:
        - Total output under 15 words.
        - Make it motivating.
      `,
    });
    
    // Simple parsing for the 1-line output
    const text = response.text.trim();
    const parts = text.split('\n').map(p => p.replace(/^[-*]\s*/, '').trim());
    return {
      label: parts[0] || "Eco-Tracked",
      explanation: parts[1] || text
    };
  }
);

// 9. Score Trend Analysis Flow
export const analyzeScoreTrend = ai.defineFlow(
  {
    name: 'analyzeScoreTrend',
    inputSchema: z.object({ score_array: z.array(z.number()) }),
    outputSchema: z.object({
      trendType: z.string(),
      insight: z.string(),
      suggestion: z.string()
    }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        User score data over time: ${input.score_array.join(', ')}

        Task:
        Analyze the trend.

        Output JSON format:
        {
          "trendType": "improving / declining / stable",
          "insight": "One-line insight",
          "suggestion": "One suggestion"
        }

        Keep it short and user-friendly.
      `,
    });
    
    try {
      return JSON.parse(response.text);
    } catch (e) {
      return {
        trendType: "stable",
        insight: "Your sustainability score remains steady.",
        suggestion: "Try one new green habit this week to boost your score."
      };
    }
  }
);

// 10. Demo Script Generator Flow
export const generateDemoScript = ai.defineFlow(
  {
    name: 'generateDemoScript',
    inputSchema: z.object({
      appName: z.string(),
      features: z.array(z.string()),
    }),
    outputSchema: z.object({ script: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        You are a product demo presenter.
        App name: ${input.appName}
        Features: ${input.features.join(', ')}

        Generate a 2-minute demo script.

        Structure:
        1. Problem (1–2 lines)
        2. Solution overview
        3. Live demo walkthrough
        4. Impact statement

        Tone: clear and confident
      `,
    });
    return { script: response.text.trim() };
  }
);

// 11. Hackathon Post Generator Flow
export const generateHackathonPost = ai.defineFlow(
  {
    name: 'generateHackathonPost',
    inputSchema: z.object({
      projectName: z.string(),
      details: z.array(z.string()),
      techStack: z.object({
        frontend: z.string(),
        backend: z.string(),
        ai: z.string(),
      }),
    }),
    outputSchema: z.object({ post: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        You are writing a hackathon submission post.
        Project: ${input.projectName}
        Details: ${input.details.join(', ')}
        Tech:
        - Frontend: ${input.techStack.frontend}
        - Backend: ${input.techStack.backend}
        - AI: ${input.techStack.ai}

        Task:
        Write a complete DEV post.

        Structure:
        - Title
        - Introduction (problem)
        - Solution
        - Features
        - Tech stack
        - How it works
        - Future scope

        Make it clear, engaging, and easy to read.
      `,
    });
    return { post: response.text.trim() };
  }
);

// 12. Feature Explainer Flow
export const explainFeature = ai.defineFlow(
  {
    name: 'explainFeature',
    inputSchema: z.object({ feature_name: z.string() }),
    outputSchema: z.object({ explanation: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Feature: ${input.feature_name}

        Explain:
        - What it does
        - Why it matters
        - How it helps users

        Constraints:
        - Max 3 lines total.
        - Keep it simple.
      `,
    });
    return { explanation: response.text.trim() };
  }
);

// 13. Friendly Error Rewriter Flow
export const friendlyError = ai.defineFlow(
  {
    name: 'friendlyError',
    inputSchema: z.object({ error_message: z.string() }),
    outputSchema: z.object({ friendly_message: z.string() }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        System error: ${input.error_message}

        Rewrite it to be:
        - user-friendly
        - clear
        - non-technical

        Constraints:
        - Keep it under 1 line.
      `,
    });
    return { friendly_message: response.text.trim() };
  }
);

// 14. Consolidated Analysis Flow (To stay within API Quota)
export const analyzeEverything = ai.defineFlow(
  {
    name: 'analyzeEverything',
    inputSchema: z.object({
      activity: DailyActivitySchema,
      history: z.array(z.number()),
    }),
    outputSchema: z.object({
      daily: z.object({
        summary: z.string(),
        suggestions: z.array(z.string()),
      }),
      score: z.object({
        label: z.string(),
        explanation: z.string(),
      }),
      trend: z.object({
        trendType: z.string(),
        insight: z.string(),
        suggestion: z.string(),
      }),
      extra: z.object({
        nudge: z.string(),
        plan: z.array(z.string()),
        majorImpact: z.string(),
      })
    }),
  },
  async (input) => {
    const response = await ai.generate({
      prompt: `
        Analyze this sustainability data and return a complete JSON report.
        
        Current Activity: ${JSON.stringify(input.activity)}
        Score History: ${input.history.join(', ')}
        Current Score: 82

        Return EXACTLY this JSON structure:
        {
          "daily": { "summary": "2-3 lines", "suggestions": ["3 tips"] },
          "score": { "label": "e.g. EXCELLENT", "explanation": "10 words max" },
          "trend": { "trendType": "improving/declining/stable", "insight": "1 line", "suggestion": "1 line" },
          "extra": { "nudge": "1 line motivational", "plan": ["3 steps"], "majorImpact": "1 line biggest factor" }
        }
      `,
      output: { format: 'json' }
    });

    return response.output as any;
  }
);

// Express Server
const app = express();

// 1. Enable CORS at the very top for all routes (including preflight)
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per window
  message: {
    error: "Too many requests",
    message: "You have exceeded the limit of 5 requests per minute. Please try again soon."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json());

// 2. Health Check (UNPROTECTED - call this for testing)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EcoTrack Backend is reachable!' });
});

// Protect all routes below this line
app.use(checkJwt);

app.post('/api/analyze-everything', async (req, res) => {
  try {
    const result = await analyzeEverything(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/friendly-error', async (req, res) => {
  try {
    const result = await friendlyError(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/explain-feature', async (req, res) => {
  try {
    const result = await explainFeature(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hackathon-post', async (req, res) => {
  try {
    const result = await generateHackathonPost(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-demo', async (req, res) => {
  try {
    const result = await generateDemoScript(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze-trend', async (req, res) => {
  try {
    const result = await analyzeScoreTrend(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/score-feedback', async (req, res) => {
  try {
    const result = await generateScoreFeedback(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/format-ui', async (req, res) => {
  try {
    const result = await formatUIContent(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/identify-impact', async (req, res) => {
  try {
    const result = await identifyMainImpact(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plan', async (req, res) => {
  try {
    const result = await generateImprovementPlan(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/nudge', async (req, res) => {
  try {
    const result = await generateNudge(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze-daily', async (req, res) => {
  try {
    const result = await analyzeDailyImpact(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/explain-score', async (req, res) => {
  try {
    const result = await explainScore(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze-weekly', async (req, res) => {
  try {
    const result = await analyzeWeeklyTrends(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from the React app
// In production container, frontend is at /app/frontend_dist
const frontendPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../frontend_dist')
  : path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global Error Handler
app.use(async (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 1. Internal Logging (Production Ready)
  console.error(`[Internal Error] ${err.stack || err.message}`);

  // 2. Transform into user-friendly message
  try {
    const { friendly_message } = await friendlyError({ error_message: err.message });
    res.status(err.status || 500).json({
      error: "An unexpected issue occurred",
      message: friendly_message
    });
  } catch (aiError) {
    // Fallback if AI rewriter fails
    res.status(err.status || 500).json({
      error: "Something went wrong",
      message: "Our systems are experiencing a brief hiccup. Please try again in a few moments."
    });
  }
});

const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (All Interfaces)`);
});
