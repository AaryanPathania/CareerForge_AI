import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import './resumes.scss'
import { getAllResumes, createResume, generateResume, getResumePdf, deleteResume } from '../features/resume/services/resume.api'
import { getAllInterviewReports } from '../features/interview/services/interview.api'
import { formatDate, wasUpdated, errorMessage, downloadPdfBlob, LIMITS } from '../features/resume/resume.utils'

// Small inline icons (no icon package)
const Icon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
    </svg>
)

const icons = {
    plus: <Icon path={<path d="M12 5v14M5 12h14" />} />,
    edit: <Icon path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>} />,
    download: <Icon path={<><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></>} />,
    trash: <Icon path={<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></>} />,
    file: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>} />,
}

// ── Modal shell: Escape / backdrop close, locked while busy ───────────────
const Modal = ({ title, onClose, busy, children }) => {
    const dialogRef = useRef(null)

    // Focus the dialog once, when it opens.
    useEffect(() => {
        dialogRef.current?.focus()
    }, [])

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && !busy) onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [ busy, onClose ])

    return (
        <div
            className="resume-modal__backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !busy) onClose()
            }}
        >
            <div
                className="resume-modal card"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                ref={dialogRef}
            >
                <h2>{title}</h2>
                {children}
            </div>
        </div>
    )
}

// ── Create Resume: choose how to start ────────────────────────────────────
const CreateResumeModal = ({ reports, reportsError, initialReportId, onClose, onCreated }) => {
    // null = choosing a method, otherwise 'scratch' | 'interview'
    const [ mode, setMode ] = useState(initialReportId ? 'interview' : null)
    const [ selectedId, setSelectedId ] = useState(initialReportId || null)
    const [ fullName, setFullName ] = useState('')
    const [ title, setTitle ] = useState('')
    const [ busy, setBusy ] = useState(false)
    const [ error, setError ] = useState(null)

    const chooseMode = (next) => {
        setError(null)
        setMode(next)
    }

    const handleGenerate = async () => {
        if (!selectedId || busy) return
        setBusy(true)
        setError(null)
        try {
            const data = await generateResume({ interviewReportId: selectedId })
            onCreated(data.resume)
        } catch (err) {
            setError(errorMessage(err, 'Unable to generate the resume. Please try again.'))
            setBusy(false)
        }
    }

    const handleCreateScratch = async (e) => {
        e.preventDefault()
        if (!fullName.trim() || busy) return
        setBusy(true)
        setError(null)
        try {
            const data = await createResume({ fullName: fullName.trim(), title: title.trim() || undefined })
            onCreated(data.resume)
        } catch (err) {
            setError(errorMessage(err, 'Unable to create the resume. Please try again.'))
            setBusy(false)
        }
    }

    const hasReports = reports.length > 0

    return (
        <Modal title="Create Resume" onClose={onClose} busy={busy}>

            {/* Step 1: pick a method */}
            {mode === null && (
                <>
                    <p className="resume-modal__text">How would you like to start?</p>
                    <div className="method-options">
                        <button type="button" className="method-option" onClick={() => chooseMode('scratch')}>
                            <span className="method-option__icon">{icons.edit}</span>
                            <span className="method-option__title">Build From Scratch</span>
                            <span className="method-option__text">
                                Start with an empty resume and write it yourself. No interview plan needed. Best when you want full control.
                            </span>
                        </button>
                        <button type="button" className="method-option" onClick={() => chooseMode('interview')}>
                            <span className="method-option__icon">{icons.file}</span>
                            <span className="method-option__title">Build From Interview</span>
                            <span className="method-option__text">
                                Generate a resume tailored to one of your interview plans, using its job description and your profile. You can edit it afterwards.
                            </span>
                            {!reportsError && reports.length === 0 && (
                                <span className="method-option__note">You have no interview plans yet.</span>
                            )}
                        </button>
                    </div>
                    <div className="resume-modal__actions">
                        <button type="button" className="button ghost-button" onClick={onClose}>Cancel</button>
                    </div>
                </>
            )}

            {/* From scratch */}
            {mode === 'scratch' && (
                <form className="resume-modal__form" onSubmit={handleCreateScratch}>
                    <p className="resume-modal__text">
                        Start with an empty resume. You'll fill in the details in the editor.
                    </p>
                    <label className="editor-field">
                        <span className="editor-field__label">Full name *</span>
                        <input type="text" value={fullName} maxLength={LIMITS.fullName} autoFocus disabled={busy} onChange={(e) => setFullName(e.target.value)} />
                    </label>
                    <label className="editor-field">
                        <span className="editor-field__label">Resume title</span>
                        <input type="text" value={title} maxLength={LIMITS.title} placeholder="Untitled Resume" disabled={busy} onChange={(e) => setTitle(e.target.value)} />
                    </label>

                    {error && <p className="resumes-inline-error" role="alert">{error}</p>}

                    <div className="resume-modal__actions">
                        <button type="button" className="button ghost-button" onClick={() => chooseMode(null)} disabled={busy}>Back</button>
                        <button type="submit" className="button primary-button" disabled={!fullName.trim() || busy}>
                            {busy ? 'Creating...' : 'Create Resume'}
                        </button>
                    </div>
                </form>
            )}

            {/* From interview */}
            {mode === 'interview' && (
                <>
                    <p className="resume-modal__text">
                        Choose the interview plan this resume should be tailored to. It is built from the profile and job description saved with that plan.
                    </p>

                    {reportsError && (
                        <p className="resumes-inline-error" role="alert">Unable to load your interview plans. Close this window and try again.</p>
                    )}

                    {!reportsError && !hasReports && (
                        <div className="resume-modal__empty">
                            <p>You don't have any interview plans yet.</p>
                            <Link to="/interview/new" className="button secondary-button">Create Interview Plan</Link>
                        </div>
                    )}

                    {hasReports && (
                        <ul className="report-picker" role="radiogroup" aria-label="Interview plans">
                            {reports.map((report) => {
                                const selected = selectedId === report._id
                                return (
                                    <li key={report._id}>
                                        <label className={`report-picker__item${selected ? ' is-selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="interviewReport"
                                                value={report._id}
                                                checked={selected}
                                                disabled={busy}
                                                onChange={() => setSelectedId(report._id)}
                                            />
                                            <span className="report-picker__text">
                                                <span className="report-picker__title">{report.title || 'Untitled Position'}</span>
                                                <span className="report-picker__meta">
                                                    {formatDate(report.createdAt)}
                                                    {typeof report.matchScore === 'number' && ` • ${report.matchScore}% match`}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {error && <p className="resumes-inline-error" role="alert">{error}</p>}

                    {busy && (
                        <p className="resume-modal__status" role="status">Generating your resume. This can take a few seconds…</p>
                    )}

                    <div className="resume-modal__actions">
                        <button type="button" className="button ghost-button" onClick={() => chooseMode(null)} disabled={busy}>Back</button>
                        <button
                            type="button"
                            className="button primary-button"
                            onClick={handleGenerate}
                            disabled={!selectedId || busy}
                        >
                            {busy ? 'Generating...' : 'Generate Resume'}
                        </button>
                    </div>
                </>
            )}
        </Modal>
    )
}

// ── Delete confirmation ───────────────────────────────────────────────────
const DeleteResumeModal = ({ resume, onClose, onDeleted }) => {
    const [ deleting, setDeleting ] = useState(false)
    const [ error, setError ] = useState(null)

    const handleDelete = async () => {
        setDeleting(true)
        setError(null)
        try {
            await deleteResume(resume._id)
            onDeleted(resume._id)
        } catch (err) {
            setError(errorMessage(err, 'Unable to delete the resume. Please try again.'))
            setDeleting(false)
        }
    }

    return (
        <Modal title="Delete resume?" onClose={onClose} busy={deleting}>
            <p className="resume-modal__text">
                “{resume.title}” will be permanently deleted. This can't be undone.
            </p>

            {error && <p className="resumes-inline-error" role="alert">{error}</p>}

            <div className="resume-modal__actions">
                <button type="button" className="button ghost-button" onClick={onClose} disabled={deleting}>
                    Cancel
                </button>
                <button type="button" className="button danger-button" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting...' : 'Delete'}
                </button>
            </div>
        </Modal>
    )
}

// ── Page ──────────────────────────────────────────────────────────────────
const Resumes = () => {
    const navigate = useNavigate()
    const location = useLocation()

    const [ resumes, setResumes ] = useState([])
    const [ reports, setReports ] = useState([])
    const [ status, setStatus ] = useState('loading') // loading | ready | error
    const [ reportsError, setReportsError ] = useState(false)

    const [ createOpen, setCreateOpen ] = useState(false)
    const [ presetReportId, setPresetReportId ] = useState(null)
    const [ deleteTarget, setDeleteTarget ] = useState(null)
    const [ downloadingId, setDownloadingId ] = useState(null)
    const [ actionError, setActionError ] = useState(null)

    const load = useCallback(async () => {
        setStatus('loading')
        setReportsError(false)

        const [ resumesResult, reportsResult ] = await Promise.allSettled([
            getAllResumes(),
            getAllInterviewReports()
        ])

        if (resumesResult.status === 'fulfilled') {
            setResumes(resumesResult.value.resumes || [])
            setStatus('ready')
        } else {
            setStatus('error')
        }

        if (reportsResult.status === 'fulfilled') {
            setReports(reportsResult.value.interviewReports || [])
        } else {
            setReportsError(true)
        }
    }, [])

    useEffect(() => {
        load()
    }, [ load ])

    // Arriving from an interview report ("Create Tailored Resume"): open the
    // Create Resume dialog on the From Interview step with that plan selected.
    useEffect(() => {
        const state = location.state
        if (status !== 'ready' || state?.createFrom !== 'interview') return
        setPresetReportId(state.interviewReportId || null)
        setCreateOpen(true)
        navigate(location.pathname, { replace: true, state: null })
    }, [ status, location, navigate ])

    // Interview report id -> title, so each resume can show where it came from.
    const reportTitles = useMemo(() => {
        const map = {}
        reports.forEach((r) => { map[ r._id ] = r.title || 'Untitled Position' })
        return map
    }, [ reports ])

    const handleDownload = async (resume) => {
        setDownloadingId(resume._id)
        setActionError(null)
        try {
            const blob = await getResumePdf(resume._id)
            downloadPdfBlob(blob, resume.title)
        } catch (err) {
            setActionError('Unable to download the PDF. Please try again.')
        } finally {
            setDownloadingId(null)
        }
    }

    const handleCreated = (resume) => {
        setCreateOpen(false)
        setPresetReportId(null)
        navigate(`/resumes/${resume._id}`)
    }

    const handleDeleted = (id) => {
        setResumes((prev) => prev.filter((r) => r._id !== id))
        setDeleteTarget(null)
    }

    const hasResumes = resumes.length > 0

    return (
        <div className="resumes-page">

            <section className="resumes-header">
                <div>
                    <h1>Resume Center</h1>
                    <p>Build resumes from scratch or tailor them to an interview plan, then review, edit and download them.</p>
                </div>
                <button
                    type="button"
                    className="button primary-button resumes-header__cta"
                    onClick={() => setCreateOpen(true)}
                    disabled={status === 'loading'}
                >
                    {icons.plus} Create Resume
                </button>
            </section>

            {actionError && (
                <div className="resumes-banner" role="alert">
                    <span>{actionError}</span>
                    <button type="button" className="button ghost-button" onClick={() => setActionError(null)}>Dismiss</button>
                </div>
            )}

            {status === 'loading' && (
                <div className="resumes-skeleton" aria-hidden="true" role="status">
                    {[ 1, 2, 3 ].map((i) => <div className="resumes-skeleton__card" key={i} />)}
                </div>
            )}

            {status === 'error' && (
                <div className="resumes-state card">
                    <h3>Unable to load your resumes</h3>
                    <p>Something went wrong while fetching your saved resumes.</p>
                    <button type="button" className="button secondary-button" onClick={load}>Try again</button>
                </div>
            )}

            {status === 'ready' && !hasResumes && (
                <div className="resumes-state card">
                    <h3>No resumes yet</h3>
                    <p>Start from scratch, or build one tailored to an interview plan.</p>
                    <button type="button" className="button primary-button" onClick={() => setCreateOpen(true)}>
                        Create Resume
                    </button>
                </div>
            )}

            {status === 'ready' && hasResumes && (
                <ul className="resumes-grid">
                    {resumes.map((resume) => {
                        const created = formatDate(resume.createdAt)
                        const updated = wasUpdated(resume) ? formatDate(resume.updatedAt) : null
                        const source = resume.interviewReport ? reportTitles[ resume.interviewReport ] : null
                        const downloading = downloadingId === resume._id

                        return (
                            <li key={resume._id}>
                                <article className="resume-card card">
                                    <div className="resume-card__top">
                                        <span className="resume-card__icon">{icons.file}</span>
                                        <div className="resume-card__heading">
                                            <h3>
                                                <Link to={`/resumes/${resume._id}`}>{resume.title}</Link>
                                            </h3>
                                            {resume.content?.fullName && (
                                                <p className="resume-card__name">{resume.content.fullName}</p>
                                            )}
                                        </div>
                                    </div>

                                    <dl className="resume-card__meta">
                                        <div>
                                            <dt>Source</dt>
                                            <dd>
                                                {resume.interviewReport
                                                    ? (source ? `Interview: ${source}` : 'Interview plan')
                                                    : 'Built from scratch'}
                                            </dd>
                                        </div>
                                        {created && (
                                            <div>
                                                <dt>Created</dt>
                                                <dd>{created}</dd>
                                            </div>
                                        )}
                                        {updated && (
                                            <div>
                                                <dt>Updated</dt>
                                                <dd>{updated}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    <div className="resume-card__actions">
                                        <Link to={`/resumes/${resume._id}`} className="button secondary-button">
                                            {icons.edit} Review / Edit
                                        </Link>
                                        <button
                                            type="button"
                                            className="button secondary-button"
                                            onClick={() => handleDownload(resume)}
                                            disabled={downloading}
                                        >
                                            {icons.download} {downloading ? 'Preparing...' : 'Download'}
                                        </button>
                                        <button
                                            type="button"
                                            className="button ghost-button resume-card__delete"
                                            onClick={() => setDeleteTarget(resume)}
                                            aria-label={`Delete ${resume.title}`}
                                        >
                                            {icons.trash} Delete
                                        </button>
                                    </div>
                                </article>
                            </li>
                        )
                    })}
                </ul>
            )}

            {createOpen && (
                <CreateResumeModal
                    reports={reports}
                    reportsError={reportsError}
                    initialReportId={presetReportId}
                    onClose={() => { setCreateOpen(false); setPresetReportId(null) }}
                    onCreated={handleCreated}
                />
            )}

            {deleteTarget && (
                <DeleteResumeModal
                    resume={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    )
}

export default Resumes
