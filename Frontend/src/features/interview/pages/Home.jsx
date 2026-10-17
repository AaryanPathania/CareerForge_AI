import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'

const MAX_RESUME_SIZE = 3 * 1024 * 1024 // 3MB — matches the backend's multer limit

const Home = () => {

    const { loading, generateReport } = useInterview()
    const navigate = useNavigate()

    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ resumeFile, setResumeFile ] = useState(null)
    const [ resumeError, setResumeError ] = useState(null)
    const [ isDragging, setIsDragging ] = useState(false)
    const [ attemptedSubmit, setAttemptedSubmit ] = useState(false)
    const [ generateError, setGenerateError ] = useState(null)

    const resumeInputRef = useRef()

    const jobDescriptionMissing = attemptedSubmit && jobDescription.trim().length === 0
    const profileMissing = attemptedSubmit && !resumeFile && selfDescription.trim().length === 0

    const validateAndSetFile = (file) => {
        if (!file) return

        if (file.type !== 'application/pdf') {
            setResumeError('Please upload a PDF file.')
            setResumeFile(null)
            return
        }

        if (file.size > MAX_RESUME_SIZE) {
            setResumeError('File is too large. Maximum size is 3 MB.')
            setResumeFile(null)
            return
        }

        setResumeError(null)
        setResumeFile(file)
    }

    const handleFileInputChange = (e) => {
        validateAndSetFile(e.target.files[ 0 ])
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        validateAndSetFile(e.dataTransfer.files[ 0 ])
    }

    const handleRemoveFile = () => {
        setResumeFile(null)
        setResumeError(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ''
        }
    }

    const handleGenerateReport = async () => {
        setAttemptedSubmit(true)

        const trimmedJobDescription = jobDescription.trim()
        const trimmedSelfDescription = selfDescription.trim()

        if (!trimmedJobDescription) return
        if (!resumeFile && !trimmedSelfDescription) return

        setGenerateError(null)

        try {
            const data = await generateReport({ jobDescription, selfDescription, resumeFile })
            navigate(`/interview/${data._id}`)
        } catch (err) {
            setGenerateError('Something went wrong generating your plan. Please try again.')
        }
    }

    if (loading) {
        return (
            <div className='generating-state'>
                <div className='generating-state__spinner' aria-hidden="true" />
                <p>Generating your personalized plan...</p>
            </div>
        )
    }

    return (
        <div className='home-page'>

            {/* Page Header */}
            <header className='page-header'>
                <h1>Create <span className='highlight'>Interview Plan</span></h1>
                <p>Let our AI analyze the job requirements and your unique profile to build a personalized preparation strategy.</p>
            </header>

            {/* Target Job */}
            <section className='form-section card'>
                <div className='section-header'>
                    <span className='section-icon'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </span>
                    <h2>Target Job</h2>
                    <span className='badge badge--required'>Required</span>
                </div>

                <div className='field'>
                    <label htmlFor='jobDescription' className='text-small'>Job Description</label>
                    <textarea
                        id='jobDescription'
                        onChange={(e) => { setJobDescription(e.target.value) }}
                        className={`field__textarea${jobDescriptionMissing ? ' has-error' : ''}`}
                        placeholder={`Paste the job description you're preparing for...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                        maxLength={5000}
                    />
                    <div className='field__footer'>
                        {jobDescriptionMissing
                            ? <span className='field__error'>Job description is required.</span>
                            : <span>Paste the job description you're preparing for.</span>}
                        <span>{jobDescription.length} / 5000</span>
                    </div>
                </div>
            </section>

            {/* Your Profile */}
            <section className='form-section card'>
                <div className='section-header'>
                    <span className='section-icon'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </span>
                    <h2>Your Profile</h2>
                </div>
                <p className='text-small'>Provide your background using one or both options below.</p>

                {/* Upload Resume */}
                <div className='field'>
                    <label className='text-small'>
                        Upload Resume <span className='badge badge--best'>Best Results</span>
                    </label>

                    {resumeFile ? (
                        <div className='resume-file'>
                            <span className='resume-file__info'>
                                <span className='resume-file__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                                </span>
                                <span className='resume-file__name'>{resumeFile.name}</span>
                            </span>
                            <button
                                type='button'
                                className='resume-file__remove'
                                onClick={handleRemoveFile}
                                aria-label='Remove selected file'
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ) : (
                        <label
                            className={`dropzone${isDragging ? ' is-dragging' : ''}${resumeError ? ' has-error' : ''}`}
                            htmlFor='resume'
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                        >
                            <span className='dropzone__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                            </span>
                            <p className='dropzone__title'>Click to browse or drag &amp; drop</p>
                            <p className='dropzone__subtitle'>PDF, maximum 3 MB</p>
                            <input
                                ref={resumeInputRef}
                                onChange={handleFileInputChange}
                                hidden
                                type='file'
                                id='resume'
                                name='resume'
                                accept='.pdf,application/pdf'
                            />
                        </label>
                    )}
                    {resumeError && <span className='field__error'>{resumeError}</span>}
                </div>

                <div className='or-divider'><span>Or</span></div>

                {/* Self Description */}
                <div className='field'>
                    <label className='text-small' htmlFor='selfDescription'>Self Description</label>
                    <p className='text-small'>Don't have a resume? Tell us about your skills, education, projects and experience.</p>
                    <textarea
                        onChange={(e) => { setSelfDescription(e.target.value) }}
                        id='selfDescription'
                        name='selfDescription'
                        className='field__textarea field__textarea--short'
                        placeholder="e.g. I am a CSE student with experience in Java, React, SQL and .NET. I have built a CRM project and an AI interview preparation project."
                    />
                </div>

                {/* Info / Error strip */}
                <div className={`info-box${profileMissing ? ' info-box--error' : ''}`}>
                    <span className='info-box__icon'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                    </span>
                    <p>
                        {profileMissing
                            ? 'Please provide a resume or a self description to continue.'
                            : <>You only need a <strong>resume</strong> or a <strong>self description</strong> — not both.</>}
                    </p>
                </div>
            </section>

            {generateError && (
                <div className='info-box info-box--error'>
                    <span className='info-box__icon'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                    </span>
                    <p>{generateError}</p>
                </div>
            )}

            {/* Submit */}
            <div className='submit-bar'>
                <span className='submit-bar__info'>AI-Powered Strategy Generation &bull; Approx 30s</span>
                <button
                    onClick={handleGenerateReport}
                    className='button primary-button'
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                    Generate Interview Plan
                </button>
            </div>
        </div>
    )
}

export default Home
