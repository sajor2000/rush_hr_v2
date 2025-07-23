# HR Assistant Pro

HR Assistant Pro is an AI-powered application designed to streamline the hiring process by automatically evaluating candidate resumes against job descriptions. It leverages OpenAI's GPT models to provide ranked results, detailed analysis, and professional reports, tailored to the hiring methodology of Rush University System for Health.

## Key Features

-   **AI-Powered Evaluation:** Analyzes resumes based on job requirements, including must-have and preferred qualifications.
-   **Structured Output:** Provides a ranked list of candidates with scores, tiers (Top Tier, Qualified, etc.), strengths, weaknesses, and resume professionalism assessment.
-   **Customizable Logic:** Evaluation criteria are aligned with specific HR methodologies.
-   **Job Description Parsing:** Accepts job descriptions via text input or file upload.
-   **Batch Resume Processing:** Handles multiple resumes (PDF, DOCX) simultaneously.
-   **Professional Reports:** Exports results to well-formatted CSV and PDF files.
-   **Branded UI:** User interface styled with Rush University branding.

## Prerequisites

-   Node.js (v18.x or later recommended)
-   npm, yarn, pnpm, or bun (for package management)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd hr-assistant-pro
    ```

2.  **Install dependencies:**
    Choose your preferred package manager:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Set up environment variables:**
    Copy the example environment file to a new local environment file:
    ```bash
    cp .env.example .env.local
    ```
    Open `.env.local` and add your OpenAI API key:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    *Note: Ensure your OpenAI account has sufficient credits and access to the models used (e.g., GPT-4 Turbo).*

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment on Vercel

The easiest way to deploy this Next.js application is to use the [Vercel Platform](https://vercel.com/) from the creators of Next.js.

1.  Push your code to a GitHub repository.
2.  Import your project into Vercel from your GitHub repository.
3.  **Configure Environment Variables:** In your Vercel project settings, add the `OPENAI_API_KEY` with your OpenAI API key as its value.
4.  Vercel will automatically build and deploy your application. A `vercel.json` file is included in this project with recommended function settings for optimal performance.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Learn More (Next.js)

To learn more about the underlying Next.js framework, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
