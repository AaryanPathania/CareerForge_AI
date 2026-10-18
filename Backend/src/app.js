
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");

const app = express();

// Allowed frontend origins
const allowedOrigins = [
    "http://localhost:5173",
    "https://career-forge-ai-olive.vercel.app"
];

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without an Origin header, such as server-to-server
            // requests and certain development tools.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Origin not allowed by CORS"));
        },
        credentials: true
    })
);

// Import routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");
const resumeRouter = require("./routes/resume.routes");
const userRouter = require("./routes/user.routes");

// Register routes
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);
app.use("/api/resumes", resumeRouter);
app.use("/api/users", userRouter);

// Global error handler — keep this last
app.use((err, req, res, next) => {
    console.error(err);

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: "File is too large. Maximum size is 3 MB."
            });
        }

        return res.status(400).json({
            message: "File upload failed. Please check the file and try again."
        });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({
            message: "Invalid data provided."
        });
    }

    if (err.status) {
        return res.status(err.status).json({
            message: err.message
        });
    }

    res.status(500).json({
        message: "Something went wrong. Please try again."
    });
});

module.exports = app;
