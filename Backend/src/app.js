
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://career-forge-ai-olive.vercel.app",
];

// CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header, such as health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow matching Vercel preview deployments for this project.
      const isVercelPreview =
        /^https:\/\/career-forge-[a-z0-9-]+-aarychee-7877s-projects\.vercel\.app$/.test(
          origin
        );

      if (isVercelPreview) {
        return callback(null, true);
      }

      console.error("[CORS BLOCKED] Origin:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

// Parse incoming request data
app.use(express.json());
app.use(cookieParser());

// Request logging for Render diagnostics.
// Do not log passwords or request bodies.
app.use((req, res, next) => {
  console.log(
    `[REQUEST] ${req.method} ${req.originalUrl} | CF-Ray: ${
      req.headers["cf-ray"] || "not available"
    }`
  );

  next();
});

// Health-check route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CareerForge_AI API is running",
  });
});

// API routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");
const resumeRouter = require("./routes/resume.routes");
const userRouter = require("./routes/user.routes");

// Register endpoints
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/resumes", resumeRouter);
app.use("/api/users", userRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File is too large. Maximum size is 3 MB.",
      });
    }

    return res.status(400).json({
      message: "File upload failed. Please check the file and try again.",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Invalid data provided.",
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
});

module.exports = app;
