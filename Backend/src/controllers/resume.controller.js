const mongoose = require("mongoose")
const resumeModel = require("../models/resume.model")
const interviewReportModel = require("../models/interviewReport.model")
const { generateResumeContent, renderResumePdf, resumeContentSchema } = require("../services/ai.service")
const L = require("../config/resume.limits")

const notFound = (res) => res.status(404).json({ message: "Resume not found." })
const validId = (id) => typeof id === "string" && mongoose.isValidObjectId(id)

/**
 * @description Generate structured resume content from an interview report (one Gemini call) and save it.
 */
async function generateResumeController(req, res) {
    const { interviewReportId, title } = req.body || {}

    if (!validId(interviewReportId)) {
        return res.status(404).json({ message: "Interview report not found." })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({ message: "Interview report not found." })
    }

    const { resume, selfDescription, jobDescription } = interviewReport

    const content = await generateResumeContent({ resume, selfDescription, jobDescription })

    const resumeTitle = (typeof title === "string" && title.trim()) ? title.trim().slice(0, L.title) : (interviewReport.title || "Resume").slice(0, L.title)

    const savedResume = await resumeModel.create({
        user: req.user.id,
        interviewReport: interviewReport._id,
        title: resumeTitle,
        content
    })

    res.status(201).json({ message: "Resume generated successfully.", resume: savedResume })
}

/**
 * @description Create an empty, user-authored resume ("build from scratch"). No Gemini call.
 * Content is validated with the same schema as every other resume write.
 */
async function createResumeController(req, res) {
    const { title, fullName } = req.body || {}

    const content = resumeContentSchema.safeParse({
        fullName,
        summary: "",
        skills: [],
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        achievements: []
    })

    if (!content.success) {
        return res.status(400).json({ message: "A valid full name is required." })
    }

    if (title !== undefined && typeof title !== "string") {
        return res.status(400).json({ message: "Invalid resume title." })
    }

    const resumeTitle = (typeof title === "string" && title.trim()) ? title.trim().slice(0, L.title) : "Untitled Resume"

    const savedResume = await resumeModel.create({
        user: req.user.id,
        title: resumeTitle,
        content: content.data
    })

    res.status(201).json({ message: "Resume created successfully.", resume: savedResume })
}

/**
 * @description List the logged-in user's resumes, newest first.
 */
async function getResumesController(req, res) {
    const resumes = await resumeModel.find({ user: req.user.id }).sort({ createdAt: -1 })

    res.status(200).json({ message: "Resumes fetched successfully.", resumes })
}

async function getResumeByIdController(req, res) {
    const { id } = req.params
    if (!validId(id)) return notFound(res)

    const resume = await resumeModel.findOne({ _id: id, user: req.user.id })
    if (!resume) return notFound(res)

    res.status(200).json({ message: "Resume fetched successfully.", resume })
}

/**
 * @description Update saved resume content (validated with the same schema as AI output; no Gemini call).
 */
async function updateResumeController(req, res) {
    const { id } = req.params
    if (!validId(id)) return notFound(res)

    const { content, title } = req.body || {}

    const parsed = resumeContentSchema.safeParse(content)
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid resume content." })
    }

    if (title !== undefined && (typeof title !== "string" || !title.trim() || title.trim().length > L.title)) {
        return res.status(400).json({ message: "Invalid resume title." })
    }

    const resume = await resumeModel.findOne({ _id: id, user: req.user.id })
    if (!resume) return notFound(res)

    resume.content = parsed.data
    if (title !== undefined) resume.title = title.trim()
    await resume.save()

    res.status(200).json({ message: "Resume updated successfully.", resume })
}

/**
 * @description Render a saved resume to PDF. Deterministic, no Gemini call.
 */
async function getResumePdfController(req, res) {
    const { id } = req.params
    if (!validId(id)) return notFound(res)

    const resume = await resumeModel.findOne({ _id: id, user: req.user.id })
    if (!resume) return notFound(res)

    const pdfBuffer = await renderResumePdf(resume.content.toObject ? resume.content.toObject() : resume.content)

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${id}.pdf`
    })

    res.send(pdfBuffer)
}

async function deleteResumeController(req, res) {
    const { id } = req.params
    if (!validId(id)) return notFound(res)

    const deleted = await resumeModel.findOneAndDelete({ _id: id, user: req.user.id })
    if (!deleted) return notFound(res)

    res.status(200).json({ message: "Resume deleted successfully." })
}

module.exports = {
    createResumeController,
    generateResumeController,
    getResumesController,
    getResumeByIdController,
    updateResumeController,
    getResumePdfController,
    deleteResumeController
}
