const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const multer = require("multer")

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const resumeRouter = require("./routes/resume.routes")
const userRouter = require("./routes/user.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/resumes", resumeRouter)
app.use("/api/users", userRouter)


/* global error handler — must be registered last.
   Returns a clean JSON error response instead of exposing raw
   errors/stack traces, and specifically handles Multer upload errors. */
app.use((err, req, res, next) => {
    console.error(err)

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File is too large. Maximum size is 3 MB." })
        }
        return res.status(400).json({ message: "File upload failed. Please check the file and try again." })
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({ message: "Invalid data provided." })
    }

    // Only trust err.message for errors we deliberately threw with an
    // explicit safe status (e.g. AI-response validation failures).
    // Anything else falls back to a generic message so internal details
    // are never exposed to the client.
    if (err.status) {
        return res.status(err.status).json({ message: err.message })
    }

    res.status(500).json({ message: "Something went wrong. Please try again." })
})

module.exports = app