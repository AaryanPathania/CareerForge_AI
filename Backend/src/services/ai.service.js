const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    let parsedResponse

    try {
        parsedResponse = JSON.parse(response.text)
    } catch (err) {
        throw Object.assign(new Error("AI returned an invalid response. Please try again."), { status: 502 })
    }

    const validationResult = interviewReportSchema.safeParse(parsedResponse)

    if (!validationResult.success) {
        throw Object.assign(new Error("AI returned an invalid response. Please try again."), { status: 502 })
    }

    return validationResult.data


}



const L = require("../config/resume.limits")

/* Resume content schema, built in two flavours from one definition:
   - strict (with length/count limits): validates AI output and user edits (PUT)
   - lenient (no limits): sent to Gemini as responseSchema, so the request keeps
     the same plain shape as the interview report schema. Limits are enforced
     afterwards by the strict schema. */
function buildResumeContentSchema(strict) {
    const str = (max, min = 0) => {
        let t = z.string()
        if (strict) { t = t.trim(); if (min) t = t.min(min); t = t.max(max) }
        return t
    }
    const arr = (item, max) => strict ? z.array(item).max(max) : z.array(item)

    return z.object({
        fullName: str(L.fullName, 1).describe("The candidate's full name, taken from the resume or self description if mentioned there; otherwise a neutral placeholder like 'Your Name'"),
        targetRole: str(L.targetRole).optional().describe("The job title this resume is tailored for, based on the job description"),
        contact: z.object({
            email: str(L.email).optional().describe("Candidate's email address, only if actually present in the resume or self description"),
            phone: str(L.phone).optional().describe("Candidate's phone number, only if actually present in the resume or self description"),
            location: str(L.location).optional().describe("Candidate's city/location, only if actually present in the resume or self description"),
        }).optional().describe("Contact details — only include fields that are actually present in the candidate's own information, never invent them"),
        summary: str(L.summary).describe("A concise 2-3 sentence professional summary tailored to the target job description, based only on the candidate's real background"),
        skills: arr(str(L.skill), L.maxSkills).describe("The candidate's real, relevant skills only — drawn from their resume or self description"),
        experience: arr(z.object({
            role: str(L.role, 1),
            organization: str(L.organization, 1),
            duration: str(L.duration).optional(),
            bullets: arr(str(L.bullet), L.maxBullets).describe("Concise, concrete achievement/responsibility bullet points, based only on real information provided")
        }), L.maxExperience).describe("Work experience entries — only include entries that are genuinely present in the candidate's background; leave empty if none"),
        projects: arr(z.object({
            name: str(L.projectName, 1),
            bullets: arr(str(L.bullet), L.maxBullets)
        }), L.maxProjects).describe("Relevant projects — only include projects genuinely present in the candidate's background; leave empty if none"),
        education: arr(z.object({
            institution: str(L.institution, 1),
            degree: str(L.degree, 1),
            duration: str(L.duration).optional()
        }), L.maxEducation).describe("Education entries — only include entries genuinely present in the candidate's background; leave empty if none"),
        certifications: arr(str(L.certification), L.maxCertifications).describe("Certifications — only include ones genuinely present in the candidate's background; leave empty if none"),
        achievements: arr(str(L.achievement), L.maxAchievements).optional().describe("Notable achievements or awards — only include ones explicitly present in the candidate's background; leave empty if none"),
        links: z.object({
            linkedin: str(L.link).optional().describe("LinkedIn URL, only if actually present in the candidate's information"),
            github: str(L.link).optional().describe("GitHub URL, only if actually present in the candidate's information"),
            portfolio: str(L.link).optional().describe("Portfolio/website URL, only if actually present in the candidate's information"),
        }).optional().describe("Profile links — only include those actually present in the candidate's own information, never invent them"),
    })
}

const resumeContentSchema = buildResumeContentSchema(true)
const resumeAiResponseSchema = buildResumeContentSchema(false)

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    // A4 at 96 DPI (210mm x 297mm), used so the on-screen box model used for
    // the shrink-to-fit measurement below matches the printed A4 page.
    await page.setViewport({ width: 794, height: 1123 })
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    // Fit-to-page: adjust the resume's font/spacing scale (together, via a
    // single CSS custom property) so the content fills roughly 85-92% of the
    // A4 page height.
    //   - content too short      -> scale UP (capped at MAX_SCALE)
    //   - content near target    -> leave as-is
    //   - content too long       -> scale DOWN (floored at MIN_SCALE)
    // If it still overflows at the readable floor, let it flow onto a second
    // page rather than clipping it or shrinking to an unreadable size.
    await page.evaluate(() => {
        const pageEl = document.querySelector(".resume-page")
        const root = document.documentElement

        if (!pageEl) return

        const MIN_SCALE = 0.78 // 12px base * 0.78 ≈ 9.4px minimum body text
        const MAX_SCALE = 1.25 // 12px base * 1.25 = 15px (11.25pt) maximum body text
        // Fractions of the usable height (page height minus its padding).
        // 0.92 of usable height ≈ 88% of the full A4 page.
        const TARGET_MIN = 0.89
        const TARGET_MAX = 0.94
        const TARGET = 0.92

        const style = getComputedStyle(pageEl)
        const usableHeight = pageEl.clientHeight
            - parseFloat(style.paddingTop)
            - parseFloat(style.paddingBottom)

        const MAX_SPACE = 3 // spacing may grow up to 3x — spacing only, never font size

        const setScale = (value) => root.style.setProperty("--resume-scale", value)
        const setSpace = (value) => root.style.setProperty("--resume-space", value)

        // Height the content actually occupies (excluding page padding), as a
        // fraction of the usable A4 height.
        const fillRatio = () => {
            const last = pageEl.lastElementChild
            if (!last) return 0
            const used = last.getBoundingClientRect().bottom
                - pageEl.getBoundingClientRect().top
                - parseFloat(style.paddingTop)
            return used / usableHeight
        }

        const overflows = () => pageEl.scrollHeight > pageEl.clientHeight + 1

        // Spreads leftover height across the page by growing only the gaps
        // between sections/entries/bullets (font size stays as chosen). Used
        // when the content is still short even at the maximum font scale.
        const spreadSpacing = () => {
            setSpace(1)
            if (overflows() || fillRatio() >= TARGET_MIN) return

            let lo = 1
            let hi = MAX_SPACE
            setSpace(hi)
            if (!overflows() && fillRatio() <= TARGET) return // cap reached, still fits

            for (let i = 0; i < 12; i++) {
                const mid = (lo + hi) / 2
                setSpace(mid)
                if (!overflows() && fillRatio() <= TARGET) {
                    lo = mid
                } else {
                    hi = mid
                }
            }
            setSpace(lo)
        }

        // Content already close to the target at the default scale — keep it.
        setScale(1)
        if (!overflows() && fillRatio() >= TARGET_MIN && fillRatio() <= TARGET_MAX) return

        // Otherwise find the largest scale in [MIN_SCALE, MAX_SCALE] whose
        // content still fits within TARGET of the usable height. Content height grows
        // monotonically with scale, so a binary search converges quickly.
        const fitsAt = (value) => {
            setScale(value)
            return !overflows() && fillRatio() <= TARGET
        }

        let low = MIN_SCALE
        let high = MAX_SCALE
        let best = null

        if (fitsAt(MAX_SCALE)) {
            best = MAX_SCALE // very short content: enlarge to the cap, never beyond
        } else {
            for (let i = 0; i < 12; i++) {
                const mid = (low + high) / 2
                if (fitsAt(mid)) {
                    best = mid
                    low = mid
                } else {
                    high = mid
                }
            }
        }

        if (best !== null) {
            setScale(best)
            spreadSpacing()
            return
        }

        // Nothing in range fits within the target (i.e. long content). Fall back
        // to the largest scale that still fits on one page at all, down to
        // the readable floor.
        let scale = 1
        setScale(scale)
        while (overflows() && scale > MIN_SCALE) {
            scale = Math.max(MIN_SCALE, scale - 0.02)
            setScale(scale)
        }

        if (overflows()) {
            // Genuinely too much content even at the readable floor —
            // allow it to spill onto a second page instead of clipping it.
            pageEl.style.height = "auto"
            pageEl.style.overflow = "visible"
        }
    })

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" } // margins are handled inside the template itself
    })

    await browser.close()

    return pdfBuffer
}

// Builds the fixed, professional A4 resume template around the AI's
// structured content. This is our own controlled layout — the AI only
// supplies data, never markup/CSS — which is what makes the one-page
// fitting mechanism above possible.
function buildResumeHtml(data) {
    const esc = (str) => String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")

    // Empty sections are omitted entirely: blank/whitespace-only items are
    // dropped, and a section is only rendered if something real is left.
    const clean = (arr) => (Array.isArray(arr) ? arr : [])
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
    const has = (v) => String(v ?? "").trim().length > 0
    const bulletsHtml = (arr) => {
        const items = clean(arr)
        return items.length ? `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""
    }

    const skills = clean(data.skills)
    const experience = (data.experience || []).filter((e) => e && (has(e.role) || has(e.organization)))
    const projects = (data.projects || []).filter((p) => p && has(p.name))
    const education = (data.education || []).filter((e) => e && (has(e.institution) || has(e.degree)))
    const certifications = clean(data.certifications)
    const achievements = clean(data.achievements)

    const contactParts = [ data.contact?.email, data.contact?.phone, data.contact?.location ]
        .filter(Boolean)
        .map(esc)
        .join(" &bull; ")

    const linksParts = [ data.links?.linkedin, data.links?.github, data.links?.portfolio ]
        .filter(Boolean)
        .map(esc)
        .join(" &bull; ")

    const skillsHtml = skills.length
        ? `<section class="section">
            <h2>Skills</h2>
            <p class="skills">${skills.map(esc).join(" &bull; ")}</p>
        </section>`
        : ""

    const experienceHtml = experience.length
        ? `<section class="section">
            <h2>Experience</h2>
            ${experience.map((exp) => `
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">${[ exp.role, exp.organization ].filter(has).map((v) => esc(String(v).trim())).join(" &mdash; ")}</span>
                        ${exp.duration ? `<span class="entry-duration">${esc(exp.duration)}</span>` : ""}
                    </div>
                    ${bulletsHtml(exp.bullets)}
                </div>
            `).join("")}
        </section>`
        : ""

    const projectsHtml = projects.length
        ? `<section class="section">
            <h2>Projects</h2>
            ${projects.map((proj) => `
                <div class="entry">
                    <div class="entry-header">
                        <span class="entry-title">${esc(proj.name)}</span>
                    </div>
                    ${bulletsHtml(proj.bullets)}
                </div>
            `).join("")}
        </section>`
        : ""

    const educationHtml = education.length
        ? `<section class="section">
            <h2>Education</h2>
            ${education.map((edu) => `
                <div class="entry entry--tight">
                    <div class="entry-header">
                        <span class="entry-title">${[ edu.degree, edu.institution ].filter(has).map((v) => esc(String(v).trim())).join(" &mdash; ")}</span>
                        ${edu.duration ? `<span class="entry-duration">${esc(edu.duration)}</span>` : ""}
                    </div>
                </div>
            `).join("")}
        </section>`
        : ""

    const certificationsHtml = certifications.length
        ? `<section class="section">
            <h2>Certifications</h2>
            <ul class="certifications">
                ${certifications.map((c) => `<li>${esc(c)}</li>`).join("")}
            </ul>
        </section>`
        : ""

    const achievementsHtml = achievements.length
        ? `<section class="section">
            <h2>Achievements</h2>
            <ul class="certifications">
                ${achievements.map((a) => `<li>${esc(a)}</li>`).join("")}
            </ul>
        </section>`
        : ""

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
    @page {
        size: A4;
        margin: 0;
    }

    :root {
        --resume-scale: 1;
        --resume-space: 1; /* extra vertical breathing room, used only when content is short */
    }

    * {
        box-sizing: border-box;
    }

    html, body {
        margin: 0;
        padding: 0;
    }

    body {
        font-family: 'Helvetica', 'Arial', sans-serif;
    }

    .resume-page {
        width: 210mm;
        height: 297mm;
        padding: 16mm 18mm;
        overflow: hidden;
        font-size: calc(12px * var(--resume-scale));
        line-height: 1.55;
        color: #1a1a1a;
    }

    .header {
        margin-bottom: calc(14px * var(--resume-scale) * var(--resume-space));
    }

    .header h1 {
        margin: 0;
        font-size: calc(1.9em);
        font-weight: 700;
        color: #111827;
    }

    .header .target-role {
        margin: calc(4px * var(--resume-scale)) 0 0;
        font-size: calc(1.05em);
        color: #2563EB;
        font-weight: 600;
    }

    .header .contact {
        margin: calc(6px * var(--resume-scale)) 0 0;
        font-size: calc(0.9em);
        color: #4b5563;
    }

    .summary {
        margin: calc(10px * var(--resume-scale) * var(--resume-space)) 0 calc(18px * var(--resume-scale) * var(--resume-space));
        font-size: calc(0.95em);
        color: #1f2937;
    }

    .section {
        margin-bottom: calc(20px * var(--resume-scale) * var(--resume-space));
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .section h2 {
        margin: 0 0 calc(8px * var(--resume-scale) * var(--resume-space));
        font-size: calc(1em);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #111827;
        border-bottom: 1.5px solid #2563EB;
        padding-bottom: calc(3px * var(--resume-scale));
    }

    .entry {
        margin-bottom: calc(13px * var(--resume-scale) * var(--resume-space));
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .entry--tight {
        margin-bottom: calc(6px * var(--resume-scale) * var(--resume-space));
    }

    .entry-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: calc(8px * var(--resume-scale));
    }

    .entry-title {
        font-weight: 700;
        font-size: calc(0.97em);
        color: #111827;
    }

    .entry-duration {
        font-size: calc(0.85em);
        color: #6b7280;
        white-space: nowrap;
    }

    .entry ul {
        margin: calc(5px * var(--resume-scale) * var(--resume-space)) 0 0;
        padding-left: calc(16px * var(--resume-scale));
    }

    .entry li {
        margin-bottom: calc(4px * var(--resume-scale) * var(--resume-space));
        font-size: calc(0.92em);
    }

    .skills {
        margin: 0;
        font-size: calc(0.92em);
        color: #1f2937;
    }

    .certifications {
        margin: 0;
        padding-left: calc(16px * var(--resume-scale));
        font-size: calc(0.92em);
    }

    .certifications li {
        margin-bottom: calc(3px * var(--resume-scale) * var(--resume-space));
    }
</style>
</head>
<body>
    <div class="resume-page">
        <div class="header">
            <h1>${esc(data.fullName)}</h1>
            ${has(data.targetRole) ? `<p class="target-role">${esc(data.targetRole)}</p>` : ""}
            ${contactParts ? `<p class="contact">${contactParts}</p>` : ""}
            ${linksParts ? `<p class="contact">${linksParts}</p>` : ""}
        </div>

        ${has(data.summary) ? `<p class="summary">${esc(data.summary)}</p>` : ""}

        ${skillsHtml}
        ${experienceHtml}
        ${projectsHtml}
        ${educationHtml}
        ${achievementsHtml}
        ${certificationsHtml}
    </div>
</body>
</html>`
}

async function generateResumeContent({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate tailored, ATS-friendly resume content for a candidate, based strictly on their real information below. Do not invent employers, schools, certifications, skills, or links that are not supported by the given information.

                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        Tailor the summary and bullet points toward the job description, using only the candidate's real, existing background. Keep bullet points concise and results-oriented (each under ${L.bullet} characters, at most ${L.maxBullets} per entry; summary under ${L.summary} characters). If the candidate has little or no work experience (e.g. a student), it is fine and expected for the "experience" array to be empty and to rely on "projects" and "education" instead — do not fabricate work experience to fill the section.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeAiResponseSchema),
        }
    })

    let parsedResponse

    try {
        parsedResponse = JSON.parse(response.text)
    } catch (err) {
        throw Object.assign(new Error("AI returned an invalid response. Please try again."), { status: 502 })
    }

    const validationResult = resumeContentSchema.safeParse(parsedResponse)

    if (!validationResult.success) {
        throw Object.assign(new Error("AI returned an invalid response. Please try again."), { status: 502 })
    }

    return validationResult.data
}

/* Deterministic: renders saved content to a PDF. Never calls Gemini. */
function renderResumePdf(content) {
    const html = buildResumeHtml(content)
    return generatePdfFromHtml(html)
}

/* Compatibility wrapper used by POST /api/interview/resume/pdf/:id */
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const content = await generateResumeContent({ resume, selfDescription, jobDescription })
    return renderResumePdf(content)
}

module.exports = { generateInterviewReport, generateResumePdf, generateResumeContent, renderResumePdf, resumeContentSchema }
