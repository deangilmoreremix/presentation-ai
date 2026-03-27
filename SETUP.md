# ALLWEONE AI Presentation Generator - Setup Guide

This guide will help you set up the ALLWEONE AI Presentation Generator on your local machine.

## Quick Start (5 minutes)

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone git@github.com:allweonedev/presentation-ai.git
cd presentation-ai

# 2. Start database with Docker
./scripts/setup-db.sh

# 3. Install dependencies
pnpm install

# 4. Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in as a guest to start creating presentations!

### Option 2: Without Docker

If you have PostgreSQL already running:

```bash
# 1. Set DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/presentation_ai"

# 2. Push schema and seed
pnpm db:push
pnpm db:seed

# 3. Start development server
pnpm dev
```

## Setup Scripts

| Command | Description |
|---------|-------------|
| `./scripts/setup-db.sh` | Complete database setup (Docker + schema + seed) |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:seed` | Seed database with themes and sample data |
| `pnpm db:studio` | Open Prisma Studio to browse database |

## Features Without API Keys

The application works without any API keys using **mock mode**:

| Feature | Without API Keys | With API Keys |
|---------|-----------------|---------------|
| AI Generation | Mock responses | Real AI |
| Image Generation | Placeholders | AI-generated |
| Web Search | Mock results | Real search |
| Local Models | Disabled | Ollama/LM Studio |
| Themes | Full access | Full access |
| Export | Full | Full |

## Cloud AI Setup (Optional)

For real AI-powered features, add these to your `.env`:

### OpenAI (Recommended)
```env
OPENAI_API_KEY="sk-..."
```

### Together AI (Alternative)
```env
TOGETHER_AI_API_KEY="..."
```

### Tavily Search
```env
TAVILY_API_KEY="..."
```

## Local AI Setup (Optional)

### Ollama

1. Install [Ollama](https://ollama.com)
2. Download models:
   ```bash
   ollama pull llama3.1
   ollama pull mistral
   ```
3. Start Ollama server (usually runs automatically)
4. Add to `.env`:
   ```env
   OLLAMA_BASE_URL="http://localhost:11434"
   ```

### LM Studio

1. Install [LM Studio](https://lmstudio.ai)
2. Download and load a model
3. Enable server in LM Studio (localhost:1234)
4. Add to `.env`:
   ```env
   LM_STUDIO_BASE_URL="http://localhost:1234/v1"
   ```

## Authentication

### Development Mode
- **Guest Access**: No login required - click "Sign in as Guest"
- **Demo Account**: `demo@allweone.com` / `demo123`
- **Admin Account**: `admin@allweone.com` / `admin123`

### Production Mode
Set up Google OAuth:
```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## Environment Variables

Full example in `.env.example`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/presentation_ai"

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers (all optional)
OPENAI_API_KEY=""
TOGETHER_AI_API_KEY=""

# Local AI (optional)
OLLAMA_BASE_URL="http://localhost:11434"
LM_STUDIO_BASE_URL="http://localhost:1234/v1"

# Search (optional)
TAVILY_API_KEY=""

# Images (optional)
UNSPLASH_ACCESS_KEY=""
FAL_API_KEY=""

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

## Health Check

Verify your setup at [http://localhost:3000/api/health](http://localhost:3000/api/health)

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "up" },
    "ai": { "status": "up", "availableModels": ["mock"] }
  },
  "features": {
    "aiGeneration": true,
    "localModels": false
  }
}
```

## Troubleshooting

### Database Connection Failed
- Make sure Docker is running: `docker info`
- Check container status: `docker compose ps`
- View logs: `docker compose logs postgres`

### Port Already in Use
```bash
# Find and kill process on port 5432
lsof -ti:5432 | xargs kill
```

### Prisma Errors
```bash
# Regenerate Prisma client
pnpm postinstall

# Reset database
pnpm db:push --force
pnpm db:seed
```

### AI Not Working
- Check `/api/health` for provider status
- Verify API keys are set correctly in `.env`
- For local models, ensure Ollama/LM Studio is running

## Next Steps

1. Sign in as a guest or use demo credentials
2. Create your first presentation
3. Try the built-in themes
4. Experiment with AI generation (if API keys configured)

## Need Help?

- [Documentation](README.md)
- [Discord Community](https://discord.gg/kZaJjZ7HjR)
- [Report an Issue](https://github.com/allweonedev/presentation-ai/issues)
