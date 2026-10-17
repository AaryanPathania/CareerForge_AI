const mongoose = require("mongoose")
const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")




/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    let resumeText = ""

    if (req.file) {
        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
        resumeText = resumeContent.text
    }

    const { selfDescription, jobDescription } = req.body

    const interViewReportByAi = await generateInterviewReport({
        resume: resumeText,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeText,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    const { resume, jobDescription, selfDescription } = interviewReport

    const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

/**
 * @description Mark (or unmark) one interview question as practiced. Idempotent per question.
 */
async function setQuestionPracticedController(req, res) {
    const { interviewId } = req.params
    const { type, index, practiced } = req.body || {}

    if (!mongoose.isValidObjectId(interviewId)) {
        return res.status(404).json({ message: "Interview report not found." })
    }

    if (!([ "technical", "behavioral" ].includes(type)) || !Number.isInteger(index) || index < 0 || typeof practiced !== "boolean") {
        return res.status(400).json({ message: "Invalid practice data." })
    }

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({ message: "Interview report not found." })
    }

    const questions = type === "technical" ? interviewReport.technicalQuestions : interviewReport.behavioralQuestions

    if (index >= questions.length) {
        return res.status(400).json({ message: "Invalid practice data." })
    }

    // addToSet / pull keep this idempotent (and save as atomic $addToSet / $pull)
    if (practiced) {
        interviewReport.practiced[ type ].addToSet(index)
    } else {
        interviewReport.practiced[ type ].pull(index)
    }

    await interviewReport.save()

    res.status(200).json({
        message: "Practice progress saved.",
        practiced: {
            technical: [ ...interviewReport.practiced.technical ],
            behavioral: [ ...interviewReport.practiced.behavioral ]
        }
    })
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController, setQuestionPracticedController }