# ALLWEONE® AI Presentation Generator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Plate JS](https://img.shields.io/badge/Plate.js-3B82F6?logoColor=white)](https://platejs.org)

⭐ **Help us reach more developers and grow the ALLWEONE community. Star this repo!**

An open-source, AI-powered presentation generator alternative to Gamma.app that creates beautiful, customizable slides in minutes. This tool is part of the broader ALLWEONE AI platform.

2025-03-28.12-2.mp4

## 🔗 Quick Links

- [Live Demo](http://presentation.allweone.com)
- [Video Tutorial](https://www.youtube.com/watch?v=UUePLJeFqVQ)
- [Discord Community](https://discord.gg/fsMHMhAHRV)
- [Contributing Guidelines](CONTRIBUTING.md)

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
- [Project Structure](#-project-structure)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)
- [Support](#-support)

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
| **Authentication** | NextAuth.js                           |
| **UI Components**  | Radix UI                              |
| **Text Editor**    | Plate Editor                          |
| **File Uploads**   | UploadThing                           |
| **Drag & Drop**    | DND Kit                               |

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18.x or higher
- npm, yarn, or pnpm package manager
- Supabase account (database provided as a service)
- Required API keys:
  - OpenAI API key (for AI generation features)
  - Google Client ID and Secret (for authentication)

### Installation

Clone the repository

```bash
git clone git@github.com:allweonedev/presentation-ai.git
cd presentation-ai
```

Install dependencies

```bash
pnpm install
```

Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Database (get from Supabase project settings)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# Next Auth Configuration
NEXTAUTH_SECRET="generate-a-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth Provider (get from Google Cloud Console)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI (optional for demo mode)
OPENAI_API_KEY=""

# File Upload Service (optional)
UPLOADTHING_TOKEN=""
UNSPLASH_ACCESS_KEY=""
TAVILY_API_KEY=""
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
4. (Optional) Enable Google OAuth in Supabase Auth settings if you want Google sign-in
5. Run `pnpm db:push` to sync the schema

## 🚀 Deployment

The application is production-ready and can be deployed in multiple ways:

### Docker Deployment

1. **Build the Docker image:**

   ```bash
   docker build -t presentation-ai .
   ```

2. **Run with Docker Compose (includes PostgreSQL):**

   ```bash
   docker-compose up -d
   ```

3. **Or run manually:**
   ```bash
   docker run -p 3000:3000 -e DATABASE_URL="..." presentation-ai
   ```

### Vercel Deployment

1. **Connect your GitHub repository to Vercel**
2. **Set environment variables in Vercel:**

    - `DATABASE_URL`
    - `NEXTAUTH_SECRET`
    - `NEXTAUTH_URL`
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
    - `OPENAI_API_KEY`
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

### Health Check

The application includes a health check endpoint at `/api/health` that monitors:

- Application status
- Database connectivity
- Uptime and version information

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

1. Login the website
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

You can use either Ollama or LM Studio for using local models in ALLWEONE presentation ai.

### LM Studio

1. Install LM Studio.
2. In the LM Studio app, turn the Server ON and enable CORS.
3. Download any model you want to use inside LM Studio.

### Ollama

1. Install Ollama.
2. Download whichever model you want to use (for example: `ollama pull llama3.1`).

### Using Local Models in the App

1. Open the app and open the text model selector.
2. Chose the model you want to use (it must be downloaded in lm studio or ollama)
3. Enjoy the generation

Notes:

- Models will automatically appear in the Model Selector when the LM Studio server or the Ollama daemon is running.
- Make sure LM Studio has CORS enabled so the browser can connect.

## 📁 Project Structure

```text
presentation/
├── .next/                      # Next.js build output
├── node_modules/               # Dependencies
├── prisma/                     # Database schema and migrations
│   └── schema.prisma          # Prisma database model
├── src/                        # Source code
│   ├── app/                   # Next.js app router
│   ├── components/            # Reusable UI components
│   │   ├── auth/             # Authentication components
│   │   ├── presentation/     # Presentation-related components
│   │   │   ├── dashboard/   # Dashboard UI
│   │   │   ├── editor/      # Presentation editor
│   │   │   │   ├── custom-elements/   # Custom editor elements
│   │   │   │   ├── dnd/              # Drag and drop functionality
│   │   │   │   └── native-elements/  # Native editor elements
│   │   │   ├── outline/     # Presentation outline components
│   │   │   ├── theme/       # Theme-related components
│   │   │   └── utils/       # Presentation utilities
│   │   ├── prose-mirror/    # ProseMirror editor for outlines
│   │   ├── plate/           # Text editor components
│   │   │   ├── hooks/       # Editor hooks
│   │   │   ├── lib/         # Editor libraries
│   │   │   ├── ui/          # Plate editor UI components
│   │   │   ├── utils/       # Functions necessary for platejs
│   │   │   └── plugins/     # Editor plugins
│   │   └── ui/              # Shared UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions and shared code
│   ├── provider/             # Context providers
│   ├── server/               # Server-side code
│   ├── states/               # State management
│   ├── styles/               # Styles required in the project
│   ├── proxy.ts              # Next.js proxy
│   └── env.js                # Environment configuration
├── .env                       # Environment variables (not in git)
├── .env.example              # Example environment variables
├── next.config.js            # Next.js configuration
├── package.json              # Project dependencies and scripts
├── tailwind.config.ts        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## 🗺️ Roadmap

| Feature                      | Status         | Notes                                                                                            |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| Export to PowerPoint (.pptx) | ✅ Done        | Full image and component translation working                                                     |
| Export to PDF                | ✅ Done        | PDF export fully integrated                                                                      |
| Media embedding              | 🟡 In Progress | Functionality is there, but ui/ux need improvement                                               |
| Additional built-in themes   | ✅ Done        | 40+ professionally designed themes included                                                      |
| Mobile responsiveness        | 🟡 In Progress | Improving layout and interactions for mobile devices                                             |
| Advanced charts              | 🟡 Started     | Support for AI generated charts                                                                  |
| E2E tests                    | 🟡 In Progress | Playwright test suite added, tests being refined                                                 |
| Real-time collaboration      | 🔴 Not Started | Multiple users editing the same presentation simultaneously                                      |
| Template library             | 🔴 Not Started | Pre-built templates for common presentation types (pitch decks, reports, etc.)                   |
| Animation and transitions    | 🔴 Not Started | Add slide transitions and element animations                                                     |
| Voice-over recording         | 🔴 Not Started | Record and attach voice narration to slides                                                      |
| Cloud storage integration    | 🔴 Not Started | Connect with Google Drive, Dropbox, OneDrive                                                     |
| Presentation analytics       | 🔴 Not Started | Track views, engagement, and presentation performance                                            |
| AI presenter notes           | 🔴 Not Started | Auto-generate speaker notes for each slide                                                       |
| Custom font uploads          | 🔴 Not Started | Allow users to upload and use their own fonts                                                    |
| Plugin system                | 🔴 Not Started | Allow community to build and share extensions                                                    |
| Public API                   | 🔴 Not Started | Allow developers to use the allweone presentation to generate content in their own applications. |

📝 Note: This roadmap is subject to change based on community feedback and priorities. Want to contribute to any of these features? Check out our Contributing Guidelines!

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. Fork the repository

2. Create a feature branch

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. Commit your changes

   ```bash
   git commit -m 'Add some amazing feature'
   ```

4. Push to the branch

   ```bash
   git push origin feature/amazing-feature
   ```

5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear commit messages
- Be respectful and constructive in discussions

For more details, please read our Contributing Guidelines.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

Special thanks to the following projects and organizations:

- OpenAI for AI generation capabilities
- Plate Editor for rich text editing
- Radix UI for accessible UI components
- Next.js for the React framework
- All our open-source contributors

## 💬 Support

Need help or have questions?

- [Discord Community](https://discord.gg/fsMHMhAHRV)
- [Report a Bug](https://github.com/allweonedev/presentation-ai/issues)
- [Request a Feature](https://github.com/allweonedev/presentation-ai/issues)
