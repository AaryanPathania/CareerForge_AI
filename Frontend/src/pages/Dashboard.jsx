import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import './dashboard.scss'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useInterview } from '../features/interview/hooks/useInterview'
import { getAllResumes } from '../features/resume/services/resume.api'

// Small inline icons (no icon package)
const Icon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
    </svg>
)

const icons = {
    plans: <Icon path={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></>} />,
    match: <Icon path={<><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 5-7" /></>} />,
    questions: <Icon path={<><path d="M12 17h.01" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" /><circle cx="12" cy="12" r="9" /></>} />,
    resume: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>} />,
    plus: <Icon path={<path d="M12 5v14M5 12h14" />} />,
    arrow: <Icon path={<path d="M5 12h14M13 6l6 6-6 6" />} />,
    profile: <Icon path={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" /></>} />,
}

const Dashboard = () => {
    const { user } = useAuth()
    const { loading, reports, getReports } = useInterview()

    // Local error tracking for manual retry attempts only.
    // (useInterview()/InterviewContext do not currently expose an error
    // state. Dashboard no longer triggers its own fetch on mount —
    // useInterview()'s own effect already fetches reports automatically
    // when there is no :interviewId route param — so this state is only
    // ever set by an explicit "Try again" click, not on initial load.)
    const [ fetchError, setFetchError ] = useState(false)
    const [ retrying, setRetrying ] = useState(false)

    const handleRetry = async () => {
        setRetrying(true)
        setFetchError(false)
        try {
            await getReports()
        } catch (err) {
            setFetchError(true)
        } finally {
            setRetrying(false)
        }
    }

    // The report list lives in a shared context, so on arrival it can still hold the
    // previous visit's data. Every successful fetch replaces `reports` with a new array,
    // so the list is "fresh" exactly when it is no longer the array we arrived with.
    // This keeps the Questions Practiced card from flashing an old count.
    const reportsOnArrival = useRef(reports)
    const reportsFresh = reports !== reportsOnArrival.current

    // Resume count comes from the existing GET /api/resumes (scoped to the logged-in user).
    const [ resumeCount, setResumeCount ] = useState(null)
    const [ resumeStatus, setResumeStatus ] = useState('loading') // loading | ready | error

    useEffect(() => {
        let cancelled = false
        getAllResumes()
            .then((data) => {
                if (cancelled) return
                setResumeCount((data.resumes || []).length)
                setResumeStatus('ready')
            })
            .catch(() => {
                if (!cancelled) setResumeStatus('error')
            })
        return () => { cancelled = true }
    }, [])

    const hasReports = Array.isArray(reports) && reports.length > 0

    const avgMatch = hasReports
        ? Math.round(reports.reduce((sum, r) => sum + (r.matchScore || 0), 0) / reports.length)
        : null

    // Only questions the user has actually marked as practiced (saved on each report).
    const questionCount = hasReports
        ? reports.reduce(
            (sum, r) => sum + (r.practiced?.technical?.length || 0) + (r.practiced?.behavioral?.length || 0),
            0
        )
        : 0

    const showSkeleton = loading && !hasReports && !fetchError

    return (
        <div className="dashboard-page">
            {/* Welcome */}
            <section className="dashboard-welcome">
                <div>
                    <h1>Good to see you, {user?.username || 'there'} 👋</h1>
                    <p>Turn your career goals into a focused preparation plan.</p>
                </div>
                <Link to="/interview/new" className="button primary-button dashboard-welcome__cta">
                    {icons.plus} Create Interview Plan
                </Link>
            </section>

            {/* Statistics */}
            <section className="dashboard-stats">
                <div className="stat-card card">
                    <span className="stat-card__icon">{icons.plans}</span>
                    <span className="stat-card__value">{hasReports ? reports.length : (loading ? '—' : 0)}</span>
                    <span className="stat-card__label">Interview Plans</span>
                </div>
                <div className="stat-card card">
                    <span className="stat-card__icon">{icons.match}</span>
                    <span className="stat-card__value">{avgMatch === null ? '—' : `${avgMatch}%`}</span>
                    <span className="stat-card__label">Average Match Score</span>
                </div>
                <div className="stat-card card">
                    <span className="stat-card__icon">{icons.questions}</span>
                    <span className="stat-card__value">{reportsFresh ? questionCount : '—'}</span>
                    <span className="stat-card__label">Questions Practiced</span>
                </div>
                <div className="stat-card card">
                    <span className="stat-card__icon">{icons.resume}</span>
                    <span className="stat-card__value">{resumeStatus === 'ready' ? resumeCount : '—'}</span>
                    <span className="stat-card__label">Resumes</span>
                    {resumeStatus === 'error' && <span className="stat-card__note" role="status">Couldn't load</span>}
                </div>
            </section>

            {/* Recent Interview Plans */}
            <section className="dashboard-recent">
                <div className="dashboard-recent__header">
                    <h2>Recent Interview Plans</h2>
                </div>

                {showSkeleton && (
                    <div className="dashboard-skeleton" aria-hidden="true">
                        {[ 1, 2, 3 ].map((i) => <div className="dashboard-skeleton__row" key={i} />)}
                    </div>
                )}

                {fetchError && (
                    <div className="dashboard-error card">
                        <p>Unable to load your interview plans.</p>
                        <button className="button secondary-button" onClick={handleRetry} disabled={retrying}>
                            {retrying ? 'Retrying...' : 'Try again'}
                        </button>
                    </div>
                )}

                {!showSkeleton && !fetchError && !hasReports && (
                    <div className="dashboard-empty card">
                        <h3>No interview plans yet</h3>
                        <p>Create your first interview plan to start preparing for your target role.</p>
                        <Link to="/interview/new" className="button primary-button">Create Interview Plan</Link>
                    </div>
                )}

                {!fetchError && hasReports && (
                    <ul className="dashboard-recent__list">
                        {reports.slice(0, 5).map((report) => {
                            const qCount = (report.technicalQuestions?.length || 0) + (report.behavioralQuestions?.length || 0)
                            return (
                                <li key={report._id}>
                                    <Link
                                        to={`/interview/${report._id}`}
                                        className="recent-item card card--hover"
                                    >
                                        <div className="recent-item__main">
                                            <h3>{report.title || 'Untitled Position'}</h3>
                                            <p className="recent-item__meta">
                                                {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
                                                {qCount > 0 && ` • ${qCount} questions`}
                                            </p>
                                        </div>
                                        <div className="recent-item__side">
                                            <span className="recent-item__score">
                                                {typeof report.matchScore === 'number' ? `${report.matchScore}%` : '—'}
                                            </span>
                                            {icons.arrow}
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>

            {/* Quick Actions */}
            <section className="dashboard-quick-actions">
                <Link to="/interview/new" className="quick-action card card--hover">
                    <span className="quick-action__icon">{icons.plus}</span>
                    <span>New Interview Plan</span>
                </Link>
                <Link to="/resumes" className="quick-action card card--hover">
                    <span className="quick-action__icon">{icons.resume}</span>
                    <span>Generate Resume</span>
                </Link>
                <Link to="/profile" className="quick-action card card--hover">
                    <span className="quick-action__icon">{icons.profile}</span>
                    <span>Profile</span>
                </Link>
            </section>
        </div>
    )
}

export default Dashboard
