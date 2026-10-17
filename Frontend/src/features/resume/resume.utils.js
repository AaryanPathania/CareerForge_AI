// Small helpers shared by the Resume Center pages.

export const formatDate = (value) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

// True only when the resume was actually edited after it was created.
export const wasUpdated = (resume) => {
    if (!resume?.createdAt || !resume?.updatedAt) return false
    return new Date(resume.updatedAt).getTime() - new Date(resume.createdAt).getTime() > 2000
}

// Backend sends { message } for handled errors; fall back to a generic text.
export const errorMessage = (error, fallback) =>
    error?.response?.data?.message || fallback

// Turn a PDF blob into a browser download, then release the object URL.
export const downloadPdfBlob = (blob, title) => {
    const safeName = (title || "resume")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60) || "resume"

    const url = window.URL.createObjectURL(new Blob([ blob ], { type: "application/pdf" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `${safeName}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

// Mirrors Backend/src/config/resume.limits.js (used for input maxLength + array caps).
export const LIMITS = {
    title: 150,
    fullName: 100,
    targetRole: 120,
    email: 254,
    phone: 40,
    location: 120,
    link: 300,
    summary: 1200,
    skill: 60,
    maxSkills: 40,
    role: 120,
    organization: 120,
    duration: 60,
    bullet: 400,
    maxBullets: 8,
    maxExperience: 8,
    projectName: 150,
    maxProjects: 8,
    institution: 200,
    degree: 200,
    maxEducation: 6,
    certification: 200,
    maxCertifications: 15,
    achievement: 300,
    maxAchievements: 10,
}
