# EcoTrack AI - Google Cloud Run Deployment Script

# 1. Load variables from .env
$envFile = "backend/.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "GOOGLE_GENAI_API_KEY=(.*)") { $script:apiKey = $matches[1].Trim() }
    }
}

if (-not $script:apiKey) {
    Write-Host "❌ Error: GOOGLE_GENAI_API_KEY not found in backend/.env" -ForegroundColor Red
    exit
}

$DOMAIN = "dev-r5227zj1zyeb0gnn.us.auth0.com"
$CLIENT_ID = "Xt3FC01KNWJR3uQarpUCwBsASCKvIcAq"
$AUDIENCE = "https://dev-r5227zj1zyeb0gnn.us.auth0.com/api/v2/"
$ISSUER = "https://dev-r5227zj1zyeb0gnn.us.auth0.com/"

Write-Host "🚀 Starting Deployment for EcoTrack AI..." -ForegroundColor Cyan

# 2. Run the deployment
gcloud run deploy ecotrack-ai `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --port 8080 `
  --set-env-vars="GOOGLE_GENAI_API_KEY=$apiKey,AUTH0_AUDIENCE=$AUDIENCE,AUTH0_ISSUER_URL=$ISSUER" `
  --set-build-env-vars="VITE_AUTH0_DOMAIN=$DOMAIN,VITE_AUTH0_CLIENT_ID=$CLIENT_ID,VITE_AUTH0_AUDIENCE=$AUDIENCE"

Write-Host "✅ Deployment Process Finished!" -ForegroundColor Green
