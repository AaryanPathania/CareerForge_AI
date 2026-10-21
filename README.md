# CareerForge_AI 🚀
### AI-Powered Interview Preparation and Resume Builder

CareerForge_AI is a full-stack web application designed to help job seekers prepare for interviews and build professional resumes. It uses AI to generate personalized interview preparation content and provides a resume editor with PDF export functionality.

## 🌐 Live Demo

**Live Website:** https://career-forge-ai-olive.vercel.app

**GitHub Repository:** https://github.com/AaryanPathania/CareerForge_AI

## ✨ Features

- **User Authentication:** Register and log in securely.
- **AI-Powered Interview Preparation:** Generate personalized interview preparation reports based on job descriptions and candidate information.
- **Resume Builder:** Create and edit professional resumes.
- **PDF Export:** Download your resume as a PDF.
- **Interview Reports:** Access previously generated interview preparation reports.
- **Responsive Interface:** Use the application on different screen sizes.
- **Data Persistence:** Store application data using MongoDB.

## 🛠️ Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS/SCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI Integration | Google Gemini API |
| Authentication | JWT, HTTP-only cookies |
| PDF Generation | Puppeteer, Chromium |
| Deployment | Vercel (frontend), Render (backend) |
| Version Control | Git and GitHub |

## 📂 Project Structure

```text
CareerForge_AI/
├── Backend/
│   ├── src/
│   │   ├── app.js
│   │   └── services/
│   │       └── ai.service.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── Frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
└── README.md
```

*Note: This is a high-level overview. The exact files and folders may vary with the current repository structure.*

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- Git
- A MongoDB database
- A Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/AaryanPathania/CareerForge_AI.git
cd CareerForge_AI
```

### 2. Set up the backend

```bash
cd Backend
npm install
```

Create a `.env` file in the backend directory and configure the required environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GOOGLE_GENAI_API_KEY=your_gemini_api_key
JWT_SECRET=your_secure_random_secret
```

Use your own credentials. Never commit real API keys, database credentials, or secrets to GitHub.

Start the backend:

```bash
npm start
```

### 3. Set up the frontend

Open another terminal:

```bash
cd Frontend
npm install
```

Create the frontend environment file and configure the API base URL according to the backend configuration:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend using:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

*Ensure the frontend API URL, backend routes, CORS configuration, and environment variable names match the actual project configuration.*

## 🔐 Security

- Keep API keys and secrets in environment variables.
- Do not upload `.env` files containing real credentials.
- Use secure authentication practices.
- Configure production CORS and cookie settings appropriately.

## 🚀 Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB

The deployed application requires correctly configured environment variables and database connectivity.

## 🎯 Project Objective

The goal of CareerForge_AI is to simplify interview preparation and resume creation by combining web technologies, AI-assisted content generation, and downloadable professional documents in one application.

## 👨‍💻 Author

**Aaryan Pathania**

GitHub: https://github.com/AaryanPathania

---

If you find this project useful, consider giving the repository a ⭐ on GitHub.
