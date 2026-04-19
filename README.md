# EcoTrack AI 🌿

**EcoTrack AI** is a professional sustainability command center designed to help users track, analyze, and reduce their environmental impact. Powered by **Google Gemini 2.5 Flash** and built with a modern full-stack architecture, it provides intelligent, personalized insights to foster greener daily habits.

## 🌟 Key Features

- **Consolidated AI Analysis**: A high-efficiency "Super Flow" that generates a complete sustainability report (daily impact, score feedback, trend analysis, and strategic plans) in a single AI request.
- **Interactive Dashboard**: A dynamic, animated React UI featuring a sustainability journey chart, categorical score badges, and behavioral nudges.
- **Enterprise-Grade Security**: Full authentication via **Auth0**, protected backend routes with JWT verification, and built-in rate limiting.
- **Presentation Ready**: Includes a "Demo Mode" to instantly populate the dashboard with data-rich examples for flawless presentations.
- **Automated Documentation**: Built-in Genkit flows to generate professional demo scripts and hackathon submission posts.

## 🛠️ Tech Stack

- **Frontend**: React (TypeScript), Vite, Axios, Auth0 SDK.
- **Backend**: Node.js (Express), TypeScript, Genkit.
- **AI Model**: Google Gemini 2.5 Flash.
- **Security**: express-oauth2-jwt-bearer, express-rate-limit, Helmet, CORS.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- A Google AI Studio API Key
- An Auth0 Application (Single Page Web Application)

### 2. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file and add your credentials:
   ```env
   GOOGLE_GENAI_API_KEY=your_gemini_api_key
   AUTH0_AUDIENCE=https://your-tenant.us.auth0.com/api/v2/
   AUTH0_ISSUER_URL=https://your-tenant.us.auth0.com/
   PORT=3001
   ```
4. Start the server: `npm run dev`

### 3. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure Auth0 in `src/main.tsx`:
   - Replace `domain` and `clientId` with your specific Auth0 credentials.
4. Start the application: `npm run dev`

## 🎬 Presentation Mode
To showcase the full power of EcoTrack AI during a demo:
1. Log in to the application.
2. Click the **"✨ Presentation Mode"** button on the dashboard.
3. Submit the pre-populated form to view the high-impact analysis and progress trend.

## 🔒 Security & Optimization
- **Rate Limiting**: Users are limited to 5 requests per minute to ensure stable API usage.
- **Consolidated Flows**: All 13 Genkit flows are optimized to minimize latency and stay within API quotas.
- **Data Integrity**: Built-in sanitization and validation middleware protect the system from injection and malformed data.

---
*Created with EcoTrack AI - Small steps for a better planet.*
