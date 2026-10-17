const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const resumeController = require("../controllers/resume.controller")

const resumeRouter = express.Router()

/** @route POST /api/resumes — create an empty resume from scratch (no AI). @access private */
resumeRouter.post("/", authMiddleware.authUser, resumeController.createResumeController)

/** @route POST /api/resumes/generate — generate + save a resume from an interview report. @access private */
resumeRouter.post("/generate", authMiddleware.authUser, resumeController.generateResumeController)

/** @route GET /api/resumes — list logged-in user's resumes (newest first). @access private */
resumeRouter.get("/", authMiddleware.authUser, resumeController.getResumesController)

/** @route GET /api/resumes/:id/pdf — render saved resume as PDF. @access private */
resumeRouter.get("/:id/pdf", authMiddleware.authUser, resumeController.getResumePdfController)

/** @route GET /api/resumes/:id @access private */
resumeRouter.get("/:id", authMiddleware.authUser, resumeController.getResumeByIdController)

/** @route PUT /api/resumes/:id — update saved content. @access private */
resumeRouter.put("/:id", authMiddleware.authUser, resumeController.updateResumeController)

/** @route DELETE /api/resumes/:id @access private */
resumeRouter.delete("/:id", authMiddleware.authUser, resumeController.deleteResumeController)

module.exports = resumeRouter
