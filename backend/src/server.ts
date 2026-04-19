import express, { type Request, type Response, type NextFunction } from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import { auth } from 'express-oauth2-jwt-bearer';

// 1. Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 2. Auth0 Middleware Configuration
const checkJwt = auth({
  audience: `https://dev-r5227zj1zyeb0gnn.us.auth0.com/api/v2/`,
  issuerBaseURL: `https://dev-r5227zj1zyeb0gnn.us.auth0.com/`,
  tokenSigningAlg: 'RS256'
});

// 3. Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 4. Essential Middleware
app.use(cors()); 
app.use(express.json());

/**
 * POST /api/analyze
 * Protected: Only authenticated users can call this.
 */
app.post('/api/analyze', checkJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activity } = req.body;

    // Basic Input Validation
    if (!activity) {
      return res.status(400).json({ error: "Activity data is required" });
    }

    // Call Gemini API (API key is used here, safe from the frontend)
    const prompt = `Analyze the sustainability of this behavior: ${activity}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Return only the processed text to the frontend
    res.json({ analysis: text });

  } catch (error) {
    // Pass errors to the global error handler
    next(error);
  }
});

// 4. Global Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Server Error]: ${err.message}`);
  
  // Do not expose stack traces or internal details to the user
  res.status(500).json({ 
    error: "Analysis failed", 
    message: "We encountered an error while processing your request. Please try again later." 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Secure backend running on http://localhost:${PORT}`);
});
