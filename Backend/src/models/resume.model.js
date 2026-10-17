const mongoose = require("mongoose")
const L = require("../config/resume.limits")

const text = (max, required = false) => ({ type: String, trim: true, maxlength: max, ...(required && { required: true }) })
const arrayLimit = (max) => ({
    validator: (arr) => !arr || arr.length <= max,
    message: `Too many items (max ${max}).`
})

const experienceSchema = new mongoose.Schema({
    role: text(L.role, true),
    organization: text(L.organization, true),
    duration: text(L.duration),
    bullets: { type: [ text(L.bullet) ], validate: arrayLimit(L.maxBullets) }
}, { _id: false })

const projectSchema = new mongoose.Schema({
    name: text(L.projectName, true),
    bullets: { type: [ text(L.bullet) ], validate: arrayLimit(L.maxBullets) }
}, { _id: false })

const educationSchema = new mongoose.Schema({
    institution: text(L.institution, true),
    degree: text(L.degree, true),
    duration: text(L.duration)
}, { _id: false })

const contentSchema = new mongoose.Schema({
    fullName: text(L.fullName, true),
    targetRole: text(L.targetRole),
    contact: {
        email: text(L.email),
        phone: text(L.phone),
        location: text(L.location)
    },
    summary: text(L.summary),
    skills: { type: [ text(L.skill) ], validate: arrayLimit(L.maxSkills) },
    experience: { type: [ experienceSchema ], validate: arrayLimit(L.maxExperience) },
    projects: { type: [ projectSchema ], validate: arrayLimit(L.maxProjects) },
    education: { type: [ educationSchema ], validate: arrayLimit(L.maxEducation) },
    certifications: { type: [ text(L.certification) ], validate: arrayLimit(L.maxCertifications) },
    achievements: { type: [ text(L.achievement) ], validate: arrayLimit(L.maxAchievements) },
    links: {
        linkedin: text(L.link),
        github: text(L.link),
        portfolio: text(L.link)
    }
}, { _id: false })

const resumeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, index: true },
    interviewReport: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewReport" },
    title: text(L.title, true),
    content: { type: contentSchema, required: true }
}, { timestamps: true })

const resumeModel = mongoose.model("Resume", resumeSchema)

module.exports = resumeModel
