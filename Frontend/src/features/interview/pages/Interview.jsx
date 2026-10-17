import React, { useEffect, useRef, useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { setQuestionPracticed } from '../services/interview.api.js'
import { useNavigate, useParams, Link } from 'react-router'

// ── Small inline icons (no icon package) ─────────────────────────────────
const Icon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
    </svg>
)

const icons = {
    back: <Icon path={<path d="M15 18l-6-6 6-6" />} />,
    resume: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>} />,
    chevron: <Icon path={<polyline points="6 9 12 15 18 9" />} />,
    check: <Icon path={<path d="M20 6 9 17l-5-5" />} />,
}

// Section-nav targets, in the same order they appear on the page
const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'technical-questions', label: 'Technical Questions' },
    { id: 'behavioral-questions', label: 'Behavioral Questions' },
    { id: 'skill-gaps', label: 'Skill Gaps' },
    { id: 'preparation-roadmap', label: 'Preparation Roadmap' },
]

// ── Sub-components ────────────────────────────────────────────────────────
const QuestionCard = ({ item, index, practiced, saving, error, onTogglePracticed }) => {
    const [ open, setOpen ] = useState(false)
    const errorRef = useRef(null)

    // Make sure a failed save is actually seen, even if the button is near the screen edge.
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView({ block: 'nearest' })
    }, [ error ])

    return (
        <div className={`q-card${practiced ? ' q-card--practiced' : ''}`}>
            <button type='button' className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                {practiced && <span className='q-card__practiced-badge'>{icons.check} Practiced</span>}
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>{icons.chevron}</span>
            </button>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                    <button
                        type='button'
                        className={`button ${practiced ? 'secondary-button' : 'primary-button'} q-card__practice-btn`}
                        onClick={onTogglePracticed}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : practiced ? <>{icons.check} Mark Not Practiced</> : 'Mark Practiced'}
                    </button>
                    {error && <p className='practice-error' role='alert' ref={errorRef}>{error}</p>}
                </div>
            )}
        </div>
    )
}

const ProgressRow = ({ label, practicedCount, total }) => {
    const pct = total > 0 ? Math.round((practicedCount / total) * 100) : 0
    return (
        <div className='progress-row'>
            <div className='progress-row__header'>
                <span className='progress-row__label'>{label}</span>
                <span className='progress-row__count'>
                    {total > 0 ? `${practicedCount} / ${total} practiced` : 'No questions to practice'}
                </span>
            </div>
            <div className='progress-row__track'>
                <div className='progress-row__fill' style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {(day.tasks ?? []).map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

// ── Main Component ────────────────────────────────────────────────────────
const Interview = () => {
    // useInterview()'s own internal effect already calls getReportById(interviewId)
    // whenever :interviewId is present in the route — no separate fetch needed here.
    const { report, loading } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    // Practice tracking is saved per user on the backend (report.practiced) and
    // loaded here, so it survives refreshes and revisits without double counting.
    const [ practicedTechnical, setPracticedTechnical ] = useState(() => new Set())
    const [ practicedBehavioral, setPracticedBehavioral ] = useState(() => new Set())
    // Per-question save state, keyed like "technical-0". The UI only changes once the
    // server confirms the save, so what you see is always what is stored.
    const [ saving, setSaving ] = useState(() => new Set())
    const [ practiceErrors, setPracticeErrors ] = useState({})

    useEffect(() => {
        setPracticedTechnical(new Set(report?.practiced?.technical ?? []))
        setPracticedBehavioral(new Set(report?.practiced?.behavioral ?? []))
    }, [ report ])

    const practiceErrorMessage = (error) => {
        const status = error?.response?.status
        const serverMessage = error?.response?.data?.message
        if (!error?.response) return "Couldn't reach the server. Check that the backend is running, then try again."
        if (status === 401) return 'Your session has expired. Please log in again.'
        if (status === 404 && !serverMessage) return 'The server has no practice endpoint yet. Update the backend files and restart the server.'
        if (status === 404) return serverMessage
        return `Couldn't save your practice progress (${status}${serverMessage ? `: ${serverMessage}` : ''}). Please try again.`
    }

    const togglePracticed = async (type, index) => {
        const key = `${type}-${index}`
        if (saving.has(key)) return

        const current = type === 'technical' ? practicedTechnical : practicedBehavioral
        const nowPracticed = !current.has(index)

        setSaving((prev) => new Set(prev).add(key))
        setPracticeErrors((prev) => ({ ...prev, [ key ]: null }))

        try {
            const data = await setQuestionPracticed({ interviewId, type, index, practiced: nowPracticed })
            // Use the saved record from the server as the source of truth.
            setPracticedTechnical(new Set(data.practiced?.technical ?? []))
            setPracticedBehavioral(new Set(data.practiced?.behavioral ?? []))
        } catch (error) {
            setPracticeErrors((prev) => ({ ...prev, [ key ]: practiceErrorMessage(error) }))
        } finally {
            setSaving((prev) => {
                const next = new Set(prev)
                next.delete(key)
                return next
            })
        }
    }

    const toggleTechnical = (index) => togglePracticed('technical', index)
    const toggleBehavioral = (index) => togglePracticed('behavioral', index)

    // Hand off to the Resume Center's "Build From Interview" flow for this report.
    const handleCreateResume = () => {
        navigate('/resumes', { state: { createFrom: 'interview', interviewReportId: interviewId } })
    }

    const handleNavClick = (id) => (e) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (loading) {
        return (
            <div className='interview-loading'>
                <div className='interview-loading__spinner' aria-hidden="true" />
                <p>Loading your interview report...</p>
            </div>
        )
    }

    if (!report) {
        return (
            <div className='interview-error'>
                <h2>Report not found</h2>
                <p>We couldn't find this interview report. It may not exist, or you may not have access to it.</p>
                <Link to='/dashboard' className='button primary-button'>Back to Dashboard</Link>
            </div>
        )
    }

    const technicalQuestions = report?.technicalQuestions ?? []
    const behavioralQuestions = report?.behavioralQuestions ?? []
    const skillGaps = report?.skillGaps ?? []
    const preparationPlan = report?.preparationPlan ?? []
    const matchScore = typeof report.matchScore === 'number' ? report.matchScore : 0

    const scoreBand = matchScore >= 80 ? 'high' : matchScore >= 60 ? 'mid' : 'low'
    const scoreLabel = scoreBand === 'high' ? 'Strong alignment' : scoreBand === 'mid' ? 'Good alignment' : 'Needs improvement'

    const generatedDate = report.createdAt
        ? new Date(report.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : null

    const technicalPracticedCount = [ ...practicedTechnical ].filter((i) => i < technicalQuestions.length).length
    const behavioralPracticedCount = [ ...practicedBehavioral ].filter((i) => i < behavioralQuestions.length).length
    const overallTotal = technicalQuestions.length + behavioralQuestions.length
    const overallPracticed = technicalPracticedCount + behavioralPracticedCount

    return (
        <div className='interview-page'>

            {/* Top Header */}
            <header className='report-header'>
                <Link to='/dashboard' className='report-header__back'>
                    {icons.back} Back to Interview Plans
                </Link>
                <div className='report-header__row'>
                    <div>
                        <h1>Interview Report</h1>
                        <p className='report-header__meta'>
                            {report.title || 'Untitled Position'}
                            {generatedDate && <> &bull; Generated {generatedDate}</>}
                        </p>
                    </div>
                    <button onClick={handleCreateResume} className='button primary-button report-header__cta'>
                        {icons.resume} Create Tailored Resume
                    </button>
                </div>
            </header>

            {/* Section Navigation */}
            <nav className='section-nav'>
                {SECTIONS.map((s) => (
                    <a key={s.id} href={`#${s.id}`} onClick={handleNavClick(s.id)} className='section-nav__link'>
                        {s.label}
                    </a>
                ))}
            </nav>

            {/* Match Score Hero */}
            <section className='match-hero card' id='overview'>
                <div
                    className={`match-hero__ring match-hero__ring--${scoreBand}`}
                    style={{ '--pct': matchScore }}
                >
                    <div className='match-hero__ring-inner'>
                        <span className='match-hero__value'>{matchScore}<span className='match-hero__pct'>%</span></span>
                    </div>
                </div>
                <div className='match-hero__text'>
                    <p className='match-hero__label'>Interview Match</p>
                    <p className={`match-hero__status match-hero__status--${scoreBand}`}>{scoreLabel}</p>
                </div>
            </section>

            {/* Report Overview strip — factual recap of real fields, not an AI summary */}
            <section className='overview-strip'>
                Prepared for <strong>{report.title || 'this role'}</strong>
                {' '}&bull; {matchScore}% match
                {' '}&bull; {skillGaps.length} skill {skillGaps.length === 1 ? 'gap' : 'gaps'} to address
            </section>

            {/* Practice Progress */}
            <section className='report-section card'>
                <h2>Practice Progress</h2>
                <div className='progress-list'>
                    <ProgressRow label='Technical' practicedCount={technicalPracticedCount} total={technicalQuestions.length} />
                    <ProgressRow label='Behavioral' practicedCount={behavioralPracticedCount} total={behavioralQuestions.length} />
                    <ProgressRow label='Overall' practicedCount={overallPracticed} total={overallTotal} />
                </div>
            </section>

            {/* Technical Questions */}
            <section className='report-section card' id='technical-questions'>
                <div className='content-header'>
                    <h2>Technical Questions</h2>
                    <span className='content-header__count'>
                        {technicalQuestions.length > 0
                            ? `${technicalPracticedCount} / ${technicalQuestions.length} practiced`
                            : '0 questions'}
                    </span>
                </div>
                {technicalQuestions.length > 0 ? (
                    <div className='q-list'>
                        {technicalQuestions.map((q, i) => (
                            <QuestionCard
                                key={i}
                                item={q}
                                index={i}
                                practiced={practicedTechnical.has(i)}
                                saving={saving.has(`technical-${i}`)}
                                error={practiceErrors[ `technical-${i}` ]}
                                onTogglePracticed={() => toggleTechnical(i)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className='text-small'>No technical questions are available for this report.</p>
                )}
            </section>

            {/* Behavioral Questions */}
            <section className='report-section card' id='behavioral-questions'>
                <div className='content-header'>
                    <h2>Behavioral Questions</h2>
                    <span className='content-header__count'>
                        {behavioralQuestions.length > 0
                            ? `${behavioralPracticedCount} / ${behavioralQuestions.length} practiced`
                            : '0 questions'}
                    </span>
                </div>
                {behavioralQuestions.length > 0 ? (
                    <div className='q-list'>
                        {behavioralQuestions.map((q, i) => (
                            <QuestionCard
                                key={i}
                                item={q}
                                index={i}
                                practiced={practicedBehavioral.has(i)}
                                saving={saving.has(`behavioral-${i}`)}
                                error={practiceErrors[ `behavioral-${i}` ]}
                                onTogglePracticed={() => toggleBehavioral(i)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className='text-small'>No behavioral questions are available for this report.</p>
                )}
            </section>

            {/* Skill Gaps */}
            <section className='report-section card' id='skill-gaps'>
                <h2>Skill Gaps</h2>
                {skillGaps.length > 0 ? (
                    <div className='skill-gaps__list'>
                        {skillGaps.map((gap, i) => (
                            <div key={i} className={`skill-row skill-row--${gap.severity}`}>
                                <span className='skill-row__name'>{gap.skill}</span>
                                <span className={`skill-row__severity skill-row__severity--${gap.severity}`}>
                                    {gap.severity ? gap.severity.charAt(0).toUpperCase() + gap.severity.slice(1) : 'Unknown'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className='text-small'>No skill gaps were identified for this role.</p>
                )}
            </section>

            {/* Preparation Roadmap */}
            <section className='report-section card' id='preparation-roadmap'>
                <div className='content-header'>
                    <h2>Preparation Roadmap</h2>
                    {preparationPlan.length > 0 && (
                        <span className='content-header__count'>{preparationPlan.length}-day plan</span>
                    )}
                </div>
                {preparationPlan.length > 0 ? (
                    <div className='roadmap-list'>
                        {preparationPlan.map((day, i) => (
                            <RoadMapDay key={day.day ?? i} day={day} />
                        ))}
                    </div>
                ) : (
                    <p className='text-small'>No preparation plan is available for this report.</p>
                )}
            </section>

            {/* Action Area */}
            <section className='action-bar'>
                <button onClick={handleCreateResume} className='button primary-button'>
                    {icons.resume} Create Tailored Resume
                </button>
                <Link to='/dashboard' className='button ghost-button'>Back to Dashboard</Link>
            </section>
        </div>
    )
}

export default Interview
