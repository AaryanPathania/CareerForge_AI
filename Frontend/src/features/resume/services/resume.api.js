import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
    withCredentials: true,
})


/**
 * @description Service to get all saved resumes of the logged in user (newest first).
 */
export const getAllResumes = async () => {
    const response = await api.get("/api/resumes")

    return response.data
}


/**
 * @description Service to get one saved resume by id.
 */
export const getResumeById = async (resumeId) => {
    const response = await api.get(`/api/resumes/${resumeId}`)

    return response.data
}


/**
 * @description Service to create an empty resume from scratch (no AI).
 */
export const createResume = async ({ title, fullName }) => {
    const response = await api.post("/api/resumes", { title, fullName })

    return response.data
}


/**
 * @description Service to generate and save a resume from an existing interview report.
 */
export const generateResume = async ({ interviewReportId }) => {
    const response = await api.post("/api/resumes/generate", { interviewReportId })

    return response.data
}


/**
 * @description Service to save edited resume content (and optionally the title).
 */
export const updateResume = async (resumeId, { title, content }) => {
    const response = await api.put(`/api/resumes/${resumeId}`, { title, content })

    return response.data
}


/**
 * @description Service to download the PDF of a saved resume as a blob.
 */
export const getResumePdf = async (resumeId) => {
    const response = await api.get(`/api/resumes/${resumeId}/pdf`, {
        responseType: "blob"
    })

    return response.data
}


/**
 * @description Service to delete a saved resume.
 */
export const deleteResume = async (resumeId) => {
    const response = await api.delete(`/api/resumes/${resumeId}`)

    return response.data
}
