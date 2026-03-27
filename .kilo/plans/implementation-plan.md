# ALLWEONE AI Presentation Generator - Implementation Plan

## Overview
Full implementation of an AI-powered presentation generator with support for both cloud AI providers (OpenAI, Together AI) and local models (Ollama/LM Studio), with Docker-based PostgreSQL setup and graceful fallbacks when API keys are unavailable.

---

## Phase 1: Infrastructure & Database Setup

### 1.1 Docker Configuration
**Files to Create:**
- `docker-compose.yml` - PostgreSQL + optional services
- `Dockerfile` - Production build
- `.dockerignore` - Optimize build context

**Key Requirements:**
- PostgreSQL 15+ with persistent volume
- Health checks for database
- Environment variable injection
- Optional: Redis for session caching

**Estimated Time:** 30 minutes

### 1.2 Environment Configuration Updates
**Files to Modify:**
- `src/env.js` - Make API keys optional with fallbacks
- `.env.example` - Add comprehensive examples
- `src/config/ai.ts` - Create new AI configuration module

**Key Requirements:**
- All AI API keys should be optional in development
- Feature flags for AI capabilities
- Local model endpoints configuration
- Database URL with Docker defaults

**Estimated Time:** 45 minutes

---

## Phase 2: AI Provider Abstraction Layer

### 2.1 Model Provider Interface
**Files to Create:**
- `src/ai/providers/index.ts` - Unified provider interface
- `src/ai/providers/openai.ts` - OpenAI provider
- `src/ai/providers/together.ts` - Together AI provider
- `src/ai/providers/ollama.ts` - Ollama local provider
- `src/ai/providers/mock.ts` - Mock provider for development

**Key Requirements:**
- Common interface for all providers
- Automatic fallback chain: OpenAI → Together → Ollama → Mock
- Configuration-driven provider selection
- Error handling with graceful degradation

**Estimated Time:** 1.5 hours

### 2.2 Update Model Picker
**Files to Modify:**
- `src/lib/modelPicker.ts` - Add local model support
- `src/ai/lib/postgres.ts` - Add fallback for missing checkpointer

**Key Requirements:**
- Detect available models from Ollama/LM Studio
- Cache model list with TTL
- Support both streaming and non-streaming

**Estimated Time:** 45 minutes

---

## Phase 3: Mock/Fallback System

### 3.1 Mock AI Responses
**Files to Create:**
- `src/ai/mock/presentations.ts` - Mock presentation generation
- `src/ai/mock/outlines.ts` - Mock outline generation
- `src/ai/mock/images.ts` - Mock image generation responses
- `src/ai/mock/search.ts` - Mock web search results

**Key Requirements:**
- Realistic mock data for all AI features
- Themed mock presentations matching built-in themes
- Deterministic responses for consistent testing
- Configurable mock delay for realistic UX

**Estimated Time:** 1.5 hours

### 3.2 Feature Flag System
**Files to Create:**
- `src/lib/features.ts` - Feature flag management
- `src/components/ui/feature-gate.tsx` - UI component for feature restrictions

**Files to Modify:**
- All AI-dependent components to check feature flags

**Key Requirements:**
- Runtime feature detection based on available API keys
- UI indicators for disabled features
- Graceful degradation messages

**Estimated Time:** 1 hour

---

## Phase 4: Local AI Model Integration

### 4.1 Ollama Integration
**Files to Create:**
- `src/app/api/ollama/models/route.ts` - List available Ollama models
- `src/ai/providers/ollama.ts` - Ollama provider implementation
- `src/hooks/useOllamaModels.ts` - React hook for model selection

**Files to Modify:**
- `src/components/presentation/model-selector.tsx` - Add Ollama models

**Key Requirements:**
- Auto-detect Ollama running locally
- Support for common models (llama3.1, mistral, etc.)
- Streaming support
- Error handling for unavailable Ollama

**Estimated Time:** 1 hour

### 4.2 LM Studio Integration
**Files to Create:**
- `src/app/api/lmstudio/models/route.ts` - List available LM Studio models
- `src/ai/providers/lmstudio.ts` - LM Studio provider implementation

**Key Requirements:**
- Connect to LM Studio server (default: localhost:1234)
- OpenAI-compatible API wrapper
- Model discovery from LM Studio

**Estimated Time:** 45 minutes

---

## Phase 5: Authentication & User Management

### 5.1 NextAuth Configuration
**Files to Modify:**
- `src/server/auth.ts` - Add credentials provider for dev mode
- `src/app/api/auth/[...nextauth]/route.ts` - Ensure proper configuration

**Key Requirements:**
- Google OAuth for production
- Credentials provider for development (no OAuth setup needed)
- Session management with database
- Guest mode for testing without login

**Estimated Time:** 45 minutes

### 5.2 Guest Mode
**Files to Create:**
- `src/lib/guest-mode.ts` - Guest session management
- `src/components/auth/guest-login.tsx` - Guest login UI

**Key Requirements:**
- LocalStorage-based session for guests
- Prompt to sign up before saving
- Clear differentiation from authenticated users

**Estimated Time:** 30 minutes

---

## Phase 6: Database Seeding & Setup

### 6.1 Seed Data
**Files to Modify:**
- `prisma/seed/seed.ts` - Expand seed data

**Files to Create:**
- `prisma/seed/data/themes.ts` - Built-in theme seed data
- `prisma/seed/data/templates.ts` - Sample presentation templates

**Key Requirements:**
- 9 built-in themes with full configuration
- Sample presentations for demonstration
- Default admin user for testing

**Estimated Time:** 1 hour

### 6.2 Database Migration Helper
**Files to Create:**
- `scripts/setup-db.sh` - One-command database setup
- `package.json` - Add setup script

**Key Requirements:**
- Check Docker is running
- Start PostgreSQL container
- Run migrations
- Seed data
- Verify connection

**Estimated Time:** 30 minutes

---

## Phase 7: Development Experience

### 7.1 Dev Container Support (Optional)
**Files to Create:**
- `.devcontainer/devcontainer.json` - VS Code dev container
- `.devcontainer/docker-compose.yml` - Container services

**Estimated Time:** 30 minutes

### 7.2 Documentation Updates
**Files to Create:**
- `SETUP.md` - Complete setup guide
- `CONTRIBUTING.md` - Updated contribution guidelines

**Files to Modify:**
- `README.md` - Update with new setup instructions

**Key Requirements:**
- Step-by-step Docker setup
- API key acquisition guide
- Local model setup instructions
- Troubleshooting section

**Estimated Time:** 45 minutes

---

## Phase 8: Testing & Verification

### 8.1 Health Check Endpoint
**Files to Create:**
- `src/app/api/health/route.ts` - System health check

**Key Requirements:**
- Database connectivity
- AI provider availability
- Required environment variables

**Estimated Time:** 15 minutes

### 8.2 Integration Tests
**Files to Create:**
- `src/__tests__/ai/providers.test.ts` - Provider tests
- `src/__tests__/db/connection.test.ts` - Database tests

**Key Requirements:**
- Mock provider validation
- Database connection tests
- Feature flag verification

**Estimated Time:** 45 minutes

---

## Implementation Order

### Sprint 1: Foundation (Day 1)
1. Docker configuration (PostgreSQL)
2. Environment variable updates
3. Database seeding with themes
4. Health check endpoint

**Deliverable:** `pnpm db:setup` command works end-to-end

### Sprint 2: AI Provider Abstraction (Day 2)
1. Create provider interface
2. Implement OpenAI provider
3. Implement Together AI provider
4. Implement Mock provider
5. Update model picker

**Deliverable:** AI generation works with or without API keys

### Sprint 3: Local Models & Auth (Day 3)
1. Ollama integration
2. LM Studio integration
3. Guest mode authentication
4. Credentials provider for dev

**Deliverable:** Can use local AI models and dev auth

### Sprint 4: Polish & Documentation (Day 4)
1. Feature flag system
2. UI indicators for disabled features
3. Complete documentation
4. Testing and bug fixes

**Deliverable:** Fully documented, production-ready application

---

## Key Design Decisions

### 1. Provider Fallback Chain
```
User Request → Check Configured Provider
    ↓
OpenAI → Together AI → Ollama → LM Studio → Mock
    ↓
Return Response
```

### 2. Feature Availability Matrix
| Feature | With API Keys | Without API Keys | Local Models |
|---------|---------------|------------------|--------------|
| AI Generation | Full | Mock data | Limited |
| Image Gen | Full | Placeholders | N/A |
| Web Search | Full | Mock results | N/A |
| Themes | Full | Full | Full |
| Export | Full | Full | Full |

### 3. Environment Modes
- **Development**: Mock providers allowed, verbose logging, guest mode
- **Staging**: Real providers, test API keys
- **Production**: Real providers only, all keys required

---

## Dependencies

### Required
- Node.js 18+
- pnpm
- Docker & Docker Compose

### Optional
- Ollama (for local models)
- LM Studio (for local models)
- API keys (for cloud AI)

---

## Success Criteria

1. **Docker Setup**: `docker-compose up` starts PostgreSQL successfully
2. **Database**: `pnpm db:push && pnpm db:seed` completes without errors
3. **Development**: `pnpm dev` starts without requiring API keys
4. **Mock Mode**: AI features work with mock data when keys are missing
5. **Local AI**: Ollama/LM Studio models appear in selector when available
6. **Auth**: Can login as guest or with credentials without Google OAuth
7. **Full Features**: All 9 themes work, presentations can be created/edited
8. **Export**: PPTX export works

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complex AI abstraction | Start with simple interface, iterate |
| Database connection issues | Include health checks and clear error messages |
| Model compatibility | Test with most common models first |
| Performance | Add caching layer for model lists |
| API rate limits | Implement request queuing and backoff |

---

**Total Estimated Time:** 4-5 days for complete implementation
**Priority:** High - Core infrastructure required for all other features
