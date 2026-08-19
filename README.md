# Smart Presentations

[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Plate JS](https://img.shields.io/badge/Plate.js-3B82F6?logoColor=white)](https://platejs.org)

An AI-powered smart presentation application that transforms your ideas into stunning, professional slides in seconds. Smart Presentations leverages cutting-edge AI to research, generate, and design presentations tailored to your topic, tone, and audience.

## 🔗 Quick Links

- [Live Demo](http://presentation.smartpresentations.ai)
- [Video Tutorial](https://www.youtube.com/watch?v=UUePLJeFqVQ)
- [Discord Community](https://discord.gg/fsMHMhAHRV)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
- [Deployment](#-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Local Development](#local-development)
- [Usage](#-usage)
  - [Creating a Presentation](#creating-a-presentation)
  - [Custom Themes](#custom-themes)
- [Local Models Guide](#-local-models-guide)
- [Testing](#-testing)
- [Health Check](#-health-check)

## 🌟 Features

### Core Functionality

- **AI-Powered Content Generation**: Create complete presentations on any topic with AI
- **Customizable Slides**: Choose the number of slides, language, and page style
- **Editable Outlines**: Review and modify AI-generated outlines before finalizing
- **Real-Time Generation**: Watch your presentation build live as content is created
- **Auto-Save**: Everything saves automatically as you work

### Design & Customization

- **40+ Built-in Themes**: Choose from a wide variety of professionally designed themes
- **Custom Theme Creation**: Create and save your own themes from scratch
- **Full Editability**: Modify text, fonts, and design elements as needed
- **Image Generation**: Choose different AI image generation models for your slides
- **Audience-Focused Styles**: Select between professional and casual presentation styles

### Presentation Tools

- **Presentation Mode**: Present directly from the application
- **Rich Text Editing**: Powered by Plate Editor for comprehensive text and image handling
- **Drag and Drop**: Intuitive slide reordering and element manipulation
- **Export Options**: Download your presentation as PowerPoint (.pptx) or PDF

## 🧰 Tech Stack

| Category           | Technologies                          |
| ------------------ | ------------------------------------- |
| **Framework**      | Next.js, React, TypeScript            |
| **Styling**        | Tailwind CSS                          |
| **Database**       | Supabase (PostgreSQL) with Prisma ORM |
| **AI Integration** | OpenAI API (GPT-4, DALL-E) |
| **Authentication** | Clerk                                 |
| **UI Components**  | Radix UI                              |
| **Text Editor**    | Plate Editor                          |
| **File Uploads**   | UploadThing                           |
| **Drag & Drop**    | DND Kit                               |

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18.x or higher
- pnpm package manager
- Supabase account (database provided as a service)
- Required API keys:
  - OpenAI API key (for AI generation features)
  - Clerk publishable key and secret key (for authentication)

### Installation

Clone the repository

```bash
git clone git@github.com:smartpresentations/smart-presentations.git
cd smart-presentations
```

Install dependencies

```bash
pnpm install
```

Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Database (via Supabase)
DATABASE_URL=""

# OpenAI for text and image generation
OPENAI_API_KEY=""

# Used to encrypt user API keys at rest (if server storage enabled)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
API_KEY_ENCRYPTION_MASTER_KEY=""

# Optional: External APIs
UNSPLASH_ACCESS_KEY=""
TAVILY_API_KEY=""

# Uploadthing (if used)
UPLOADTHING_TOKEN=""
```

💡 Tip: Copy `.env.example` to `.env` and fill in your actual values.

### Database Setup

Initialize the database schema using Prisma

```bash
pnpm db:push
```

This will create the necessary tables in your Supabase database.

### Supabase Configuration

1. Create a new project on [Supabase](https://supabase.com)
2. Go to Project Settings → Database to get your connection string
3. Copy the **Connection string** (pooling mode) to your `.env` as `DATABASE_URL`
4. Run `pnpm db:push` to sync the schema

### Clerk Configuration

1. Create a new application on [Clerk](https://clerk.com)
2. Go to the API keys section and copy your **Publishable key** and **Secret key**
3. Add them to your `.env` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
4. Configure your Clerk domains to include your local development URL

## 🚀 Deployment

The application is production-ready and can be deployed in multiple ways:

### Docker Deployment

1. **Build the Docker image:**

   ```bash
   docker build -t smart-presentations .
   ```

2. **Run with Docker Compose (includes PostgreSQL):**

   ```bash
   docker-compose up -d
   ```

3. **Or run manually:**
   ```bash
   docker run -p 3000:3000 -e DATABASE_URL="..." smart-presentations
   ```

### Vercel Deployment

1. **Connect your GitHub repository to Vercel**
2. **Set environment variables in Vercel:**

   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `API_KEY_ENCRYPTION_MASTER_KEY`
   - `UPLOADTHING_TOKEN`
   - `UNSPLASH_ACCESS_KEY`
   - `TAVILY_API_KEY`

3. **Deploy automatically on push to main branch**

### Local Development

For development with hot reloading:

```bash
pnpm dev
```

For production build testing:

```bash
pnpm build
pnpm start
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test tests/core.spec.ts

# Generate test report
pnpm test:report
```

## 💻 Usage

### Creating a Presentation

Follow these steps to create your first AI-generated presentation:

1. Sign in to Smart Presentations
2. Navigate to the dashboard
3. Enter your presentation topic
4. Choose the number of slides (recommended: 5-10)
5. Select your preferred language
6. Choose a page style
7. Toggle web search (if you want)
8. Click "Generate Outline"
9. Review and edit the AI-generated outline
10. Select a theme for your presentation
11. Choose an image source (ai / stock)
12. Select your presentation style (Professional/Casual)
13. Click "Generate Presentation"
14. Wait for the AI to create your slides in real-time
15. Preview, edit, and refine your presentation as needed
16. Present directly from the app or export your presentation

### Custom Themes

Create personalized themes to match your brand or style:

1. Click "Create New Theme"
2. Start from scratch or derive from an existing theme
3. Customize colors, fonts, and layout
4. Save your theme for future use

## 🧠 Local Models Guide

You can use LM Studio for using local models in Smart Presentations.

### LM Studio

1. Install LM Studio.
2. In the LM Studio app, turn the Server ON and enable CORS.
3. Download any model you want to use inside LM Studio.

### Using Local Models in the App

1. Open the app and open the text model selector.
2. Choose the model you want to use (it must be downloaded in LM Studio)
3. Enjoy the generation

Notes:

- Models will automatically appear in the Model Selector when the LM Studio server is running.
- Make sure LM Studio has CORS enabled so the browser can connect.

## 🤝 Support

Need help or have questions?

- [Discord Community](https://discord.gg/fsMHMhAHRV)
