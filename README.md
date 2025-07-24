# Rush University HR Assistant

An AI-powered resume evaluation system designed specifically for Rush University System for Health. This application streamlines the hiring process by automatically analyzing resumes against job descriptions, providing ranked results, detailed scoring, and an interactive HR copilot chat assistant.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or later
- npm (or yarn/pnpm/bun)
- OpenAI API key with access to GPT-4o and GPT-4o-mini models

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sajor2000/rush_hr_v2.git
   cd rush_hr_v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🌐 Deployment on Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/sajor2000/rush_hr_v2)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - **IMPORTANT**: Keep all files in the root directory (no subdirectories)

3. **Configure Environment Variables**
   In Vercel project settings, add:
   ```
   OPENAI_API_KEY = your_openai_api_key_here
   ```

4. **Deploy**
   Vercel will automatically build and deploy your application

## 📋 Features

- **AI-Powered Resume Evaluation**: Uses GPT-4o for comprehensive analysis
- **Batch Processing**: Evaluate up to 40 resumes simultaneously
- **Intelligent Scoring**: 5-category scoring system with detailed breakdowns
- **Smart Ranking**: Quartile-based ranking for qualified candidates
- **HR Copilot Chat**: Interactive AI assistant for deeper candidate insights
- **Multiple Export Formats**: CSV and PDF reports with professional formatting
- **File Support**: Accepts PDF and DOCX resume formats
- **Rate Limiting**: Built-in protection (50 requests/minute)
- **CORS Support**: Ready for cross-origin deployments

## 🔧 Environment Variables

Only one environment variable is required:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# This key must have access to:
# - gpt-4o (for resume evaluation and requirement extraction)
# - gpt-4o-mini (for job type detection and chat)
```

## 📁 Project Structure

```
rush_hr_v2/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Core business logic
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── .env.example         # Environment variable template
├── package.json         # Project dependencies
├── vercel.json         # Vercel configuration
└── README.md           # This file
```

## 🛠️ Configuration

### Vercel Configuration
The `vercel.json` file includes optimized settings:
- Extended timeout (300s) for batch processing
- Increased memory (3GB) for handling multiple resumes
- Proper function configuration for all API routes

### API Limits
- Maximum file size: 5MB per resume
- Batch limit: 40 resumes per evaluation
- Rate limit: 50 requests per minute
- Concurrent parsing: 15 resumes
- Concurrent evaluation: 5 resumes

## 🔒 Security Features

- No hardcoded secrets or API keys
- File size validation (5MB limit)
- Input sanitization for chat
- CORS headers configured
- Production-ready logging
- Test endpoints removed

## 📊 Scoring System

### Rubric-Based Mathematical Scoring (v2)
The application now uses a rigorous mathematical scoring system with objective rubrics:

**Base Score (0-85 points)**
- Each category has specific rubric items scored 0-10
- Scores are weighted by job type (entry-level, technical, professional)
- Mathematical calculation ensures consistency and fairness

**Bonus Points (0-15 points)**
- Transferable skills: +0-10 points
- Preferred qualifications met: +0-5 points

**Categories Evaluated:**
1. **Technical Skills Match** - Exact tech matches, similar technologies, years of experience
2. **Experience Relevance** - Industry match, role similarity, achievements, career progression
3. **Education & Certifications** - Degree requirements, relevance, professional certifications
4. **Soft Skills & Culture Fit** - Communication, leadership, cultural alignment, adaptability
5. **Resume Quality** - Clarity and completeness of information

**Score Breakdown Display:**
- Visual progress bars show contribution of each category
- Detailed mathematical calculations visible in UI
- Addresses score clustering with precise differentiation

## 🚨 Troubleshooting

### Common Issues

1. **404 Error on Vercel**
   - Ensure all files are in the root directory
   - Check that Vercel's root directory setting is "/"

2. **Build Failures**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` fresh
   - Ensure Node.js 18+ is being used

3. **API Key Issues**
   - Verify your OpenAI API key is valid
   - Ensure it has access to GPT-4o models
   - Check for sufficient API credits

### Getting Help

For issues or questions:
- Open an issue on [GitHub](https://github.com/sajor2000/rush_hr_v2/issues)
- Check existing issues for solutions
- Review the deployment logs in Vercel

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏥 About Rush University System for Health

This application is tailored for Rush University System for Health's HR methodology, incorporating their specific evaluation criteria and hiring practices.