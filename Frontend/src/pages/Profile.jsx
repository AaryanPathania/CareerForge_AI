import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import './profile.scss'
import { AuthContext } from '../features/auth/auth.context'
import { updateProfile, changePassword } from '../features/profile/services/profile.api'
import { getAllInterviewReports } from '../features/interview/services/interview.api'
import { getAllResumes } from '../features/resume/services/resume.api'
import { formatDate, errorMessage } from '../features/resume/resume.utils'

// Mirrors Backend/src/controllers/user.controller.js
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const EMAIL_MAX = 254
const PASSWORD_MIN = 6
const PASSWORD_MAX = 72
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Small inline icons (no icon package)
const Icon = ({ path, size = 20 }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
    </svg>
)

const icons = {
    user: <Icon path={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" /></>} />,
    shield: <Icon path={<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />} />,
    sliders: <Icon path={<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>} />,
    bars: <Icon path={<><path d="M6 20V11M12 20V5M18 20v-7" /></>} />,
    plans: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>} />,
    resume: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>} />,
    trend: <Icon path={<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>} />,
    target: <Icon path={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>} />,
    mail: <Icon size={18} path={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>} />,
    userSmall: <Icon size={18} path={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" /></>} />,
    lock: <Icon size={18} path={<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} />,
    eye: <Icon size={18} path={<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>} />,
    eyeOff: <Icon size={18} path={<><path d="M3 3l18 18" /><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>} />,
    calendar: <Icon size={16} path={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>} />,
    pencil: <Icon size={16} path={<><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>} />,
    moon: <Icon path={<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />} />,
    bell: <Icon path={<><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2z" /><path d="M10 21h4" /></>} />,
    arrow: <Icon size={16} path={<path d="M5 12h14M13 6l6 6-6 6" />} />,
}

// Sidebar entries → section ids on this page
const SECTIONS = [
    { id: 'account', label: 'Account Settings', icon: icons.user },
    { id: 'security', label: 'Security', icon: icons.shield },
    { id: 'preferences', label: 'Preferences', icon: icons.sliders },
    { id: 'activity', label: 'Activity', icon: icons.bars },
]

// The user's Mongo _id starts with the creation time (seconds, 8 hex chars), so the
// "member since" date can be shown without any extra backend field.
const memberSince = (userId) => {
    if (typeof userId !== 'string' || !/^[0-9a-f]{24}$/i.test(userId)) return null
    return formatDate(parseInt(userId.slice(0, 8), 16) * 1000)
}

const validateAccount = (user, username, email) => {
    const errors = {}
    const name = username.trim()
    const mail = email.trim()

    // Only changed fields are validated (same as the backend), so older accounts
    // can still edit one field while the other keeps its saved value.
    if (name !== user.username && (name.length < USERNAME_MIN || name.length > USERNAME_MAX)) {
        errors.username = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.`
    }
    if (mail !== user.email && (!mail || mail.length > EMAIL_MAX || !EMAIL_PATTERN.test(mail))) {
        errors.email = 'Please enter a valid email address.'
    }
    return errors
}

const validatePassword = ({ currentPassword, newPassword, confirmPassword }) => {
    const errors = {}
    if (!currentPassword) errors.currentPassword = 'Enter your current password.'
    if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
        errors.newPassword = `New password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters long.`
    } else if (currentPassword && newPassword === currentPassword) {
        errors.newPassword = 'New password must be different from your current password.'
    }
    if (!confirmPassword) {
        errors.confirmPassword = 'Confirm your new password.'
    } else if (confirmPassword !== newPassword) {
        errors.confirmPassword = 'New password and confirmation do not match.'
    }
    return errors
}

// Advisory only (never blocks saving): 0 = empty, 1 Weak, 2 Fair, 3 Good, 4 Strong.
const STRENGTH_LABELS = [ '', 'Weak', 'Fair', 'Good', 'Strong' ]

const passwordStrength = (password) => {
    if (!password) return 0
    let points = 0
    if (password.length >= 8) points += 1
    if (password.length >= 12) points += 1
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1
    if (/\d/.test(password)) points += 1
    if (/[^A-Za-z0-9]/.test(password)) points += 1

    if (password.length < PASSWORD_MIN || points <= 1) return 1
    if (points === 2) return 2
    if (points === 3) return 3
    return 4
}

// Defined outside Profile so typing never remounts the input (which would drop focus).
const PasswordField = ({ id, name, label, placeholder, value, onChange, autoComplete, error, children }) => {
    const [ visible, setVisible ] = useState(false)

    return (
        <div className="profile-field">
            <label htmlFor={id}>{label}</label>
            <div className="profile-input profile-input--password">
                <span className="profile-input__icon">{icons.lock}</span>
                <input
                    id={id}
                    name={name}
                    type={visible ? 'text' : 'password'}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={onChange}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                />
                <button
                    type="button"
                    className="profile-input__toggle"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                >
                    {visible ? icons.eyeOff : icons.eye}
                </button>
            </div>
            {error && (
                <p className="profile-field__error" id={`${id}-error`} role="alert">{error}</p>
            )}
            {children}
        </div>
    )
}

const Profile = () => {
    // Read the context directly so the saved user can be pushed into AuthContext
    // (navbar and Dashboard greeting update immediately) without changing useAuth.
    const { user, setUser } = useContext(AuthContext)

    // ── Section navigation ───────────────────────────────────────────────
    const [ activeSection, setActiveSection ] = useState(SECTIONS[0].id)
    const usernameRef = useRef(null)

    const scrollToSection = (id) => {
        const el = document.getElementById(id)
        if (!el) return
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        setActiveSection(id)
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }

    const handleEditProfile = () => {
        scrollToSection('account')
        if (usernameRef.current) usernameRef.current.focus({ preventScroll: true })
    }

    // Highlight the sidebar item for the section currently near the top of the screen.
    useEffect(() => {
        let frame = 0

        const update = () => {
            frame = 0
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
            let current = SECTIONS[0].id

            if (atBottom) {
                current = SECTIONS[SECTIONS.length - 1].id
            } else {
                SECTIONS.forEach(({ id }) => {
                    const el = document.getElementById(id)
                    if (el && el.getBoundingClientRect().top <= 140) current = id
                })
            }
            setActiveSection(current)
        }

        const onScroll = () => {
            if (!frame) frame = window.requestAnimationFrame(update)
        }

        update()
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onScroll)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onScroll)
            if (frame) window.cancelAnimationFrame(frame)
        }
    }, [])

    // ── Account ──────────────────────────────────────────────────────────
    const [ username, setUsername ] = useState(user?.username || '')
    const [ email, setEmail ] = useState(user?.email || '')
    const [ accountErrors, setAccountErrors ] = useState({})
    const [ accountMessage, setAccountMessage ] = useState(null) // { type: 'success' | 'error', text }
    const [ accountSaving, setAccountSaving ] = useState(false)

    const accountDirty = !!user && (username.trim() !== user.username || email.trim() !== user.email)

    const handleAccountSubmit = async (e) => {
        e.preventDefault()
        if (!user || accountSaving) return

        const errors = validateAccount(user, username, email)
        setAccountErrors(errors)
        setAccountMessage(null)
        if (Object.keys(errors).length > 0) return

        setAccountSaving(true)
        try {
            const data = await updateProfile({ username: username.trim(), email: email.trim() })
            setUser(data.user)
            setUsername(data.user.username)
            setEmail(data.user.email)
            setAccountMessage({ type: 'success', text: 'Your account details were saved.' })
        } catch (error) {
            setAccountMessage({
                type: 'error',
                text: errorMessage(error, "Couldn't save your changes. Please try again.")
            })
        } finally {
            setAccountSaving(false)
        }
    }

    const handleAccountReset = () => {
        setUsername(user?.username || '')
        setEmail(user?.email || '')
        setAccountErrors({})
        setAccountMessage(null)
    }

    // ── Password ─────────────────────────────────────────────────────────
    const [ passwords, setPasswords ] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [ passwordErrors, setPasswordErrors ] = useState({})
    const [ passwordMessage, setPasswordMessage ] = useState(null)
    const [ passwordSaving, setPasswordSaving ] = useState(false)

    const setPasswordField = (field) => (e) => {
        setPasswords((prev) => ({ ...prev, [field]: e.target.value }))
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwordSaving) return

        const errors = validatePassword(passwords)
        setPasswordErrors(errors)
        setPasswordMessage(null)
        if (Object.keys(errors).length > 0) return

        setPasswordSaving(true)
        try {
            await changePassword(passwords)
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setPasswordMessage({ type: 'success', text: 'Your password was changed. You are still signed in.' })
        } catch (error) {
            setPasswordMessage({
                type: 'error',
                text: errorMessage(error, "Couldn't change your password. Please try again.")
            })
        } finally {
            setPasswordSaving(false)
        }
    }

    const strength = passwordStrength(passwords.newPassword)

    // ── Career statistics (real data from the existing list endpoints) ───
    // GET /api/interview/ → { interviewReports: [{ _id, title, matchScore, practiced, createdAt, ... }] }
    // GET /api/resumes    → { resumes: [{ _id, title, createdAt, updatedAt, ... }] }
    const [ reports, setReports ] = useState(null)
    const [ reportStatus, setReportStatus ] = useState('loading') // loading | ready | error
    const [ resumes, setResumes ] = useState(null)
    const [ resumeStatus, setResumeStatus ] = useState('loading')

    useEffect(() => {
        let cancelled = false

        getAllInterviewReports()
            .then((data) => {
                if (cancelled) return
                setReports(Array.isArray(data.interviewReports) ? data.interviewReports : [])
                setReportStatus('ready')
            })
            .catch(() => {
                if (!cancelled) setReportStatus('error')
            })

        getAllResumes()
            .then((data) => {
                if (cancelled) return
                setResumes(Array.isArray(data.resumes) ? data.resumes : [])
                setResumeStatus('ready')
            })
            .catch(() => {
                if (!cancelled) setResumeStatus('error')
            })

        return () => { cancelled = true }
    }, [])

    const reportsReady = reportStatus === 'ready'
    const resumesReady = resumeStatus === 'ready'

    const planCount = reportsReady ? reports.length : null

    // Only questions the user explicitly marked as practiced (saved on each report).
    const practicedCount = reportsReady
        ? reports.reduce(
            (sum, r) => sum + (r.practiced?.technical?.length || 0) + (r.practiced?.behavioral?.length || 0),
            0
        )
        : null

    // Average over the reports that actually have a numeric match score.
    const scored = reportsReady ? reports.filter((r) => typeof r.matchScore === 'number') : []
    const avgMatch = scored.length > 0
        ? Math.round(scored.reduce((sum, r) => sum + r.matchScore, 0) / scored.length)
        : null

    const latestReportId = reportsReady && reports.length > 0 ? reports[0]._id : null

    const reportNote = reportStatus === 'error' ? "Couldn't load" : null

    const stats = [
        {
            key: 'plans', icon: icons.plans, label: 'Interview plans',
            value: planCount, note: reportNote,
            to: '/dashboard', cta: 'View all',
        },
        {
            key: 'resumes', icon: icons.resume, label: 'Resumes',
            value: resumesReady ? resumes.length : null, note: resumeStatus === 'error' ? "Couldn't load" : null,
            to: '/resumes', cta: 'View all',
        },
        {
            key: 'practiced', icon: icons.trend, label: 'Questions practiced',
            value: practicedCount, note: reportNote,
            to: latestReportId ? `/interview/${latestReportId}` : '/interview/new',
            cta: latestReportId ? 'Start practice' : 'Create a plan',
        },
        {
            key: 'match', icon: icons.target, label: 'Avg. match score',
            value: avgMatch === null ? null : `${avgMatch}%`,
            note: reportNote || (reportsReady && avgMatch === null ? 'No scores yet' : null),
            to: '/dashboard', cta: 'View details',
        },
    ]

    const since = memberSince(user?.id)
    const initial = user?.username ? user.username.charAt(0).toUpperCase() : '?'

    const recentReports = reportsReady ? reports.slice(0, 3) : []
    const recentResumes = resumesReady ? resumes.slice(0, 3) : []

    return (
        <div className="profile-page">
            <div className="profile-layout">

                {/* Sidebar */}
                <aside className="profile-sidebar">
                    <nav className="profile-sidebar__nav" aria-label="Profile sections">
                        {SECTIONS.map((section) => (
                            <a
                                key={section.id}
                                href={`#${section.id}`}
                                className={`profile-sidebar__item${activeSection === section.id ? ' is-active' : ''}`}
                                aria-current={activeSection === section.id ? 'true' : undefined}
                                onClick={(e) => {
                                    e.preventDefault()
                                    scrollToSection(section.id)
                                }}
                            >
                                {section.icon}
                                <span>{section.label}</span>
                            </a>
                        ))}
                    </nav>
                </aside>

                <div className="profile-main">

                    {/* Title */}
                    <header className="profile-title">
                        <h1>Profile &amp; Settings</h1>
                        <p>Manage your account, security and preferences</p>
                    </header>

                    {/* Banner */}
                    <section className="profile-banner" aria-label="Your profile">
                        <span className="profile-banner__avatar" aria-hidden="true">{initial}</span>

                        <div className="profile-banner__info">
                            <div className="profile-banner__name">
                                <h2>{user?.username}</h2>
                                <span className="profile-banner__status">Active</span>
                            </div>
                            <p className="profile-banner__email">{user?.email}</p>
                            {since && (
                                <p className="profile-banner__since">
                                    {icons.calendar}
                                    <span>Member since {since}</span>
                                </p>
                            )}
                        </div>

                        <button type="button" className="button secondary-button profile-banner__edit" onClick={handleEditProfile}>
                            {icons.pencil}
                            Edit Profile
                        </button>
                    </section>

                    {/* Career statistics */}
                    <section className="profile-stats" aria-label="Career statistics">
                        {stats.map((stat) => (
                            <div className="profile-stat" key={stat.key}>
                                <span className="profile-stat__icon">{stat.icon}</span>
                                <div className="profile-stat__body">
                                    <span className="profile-stat__value">
                                        {stat.value === null ? '—' : stat.value}
                                    </span>
                                    <span className="profile-stat__label">{stat.label}</span>
                                    {stat.note && <span className="profile-stat__note">{stat.note}</span>}
                                    <Link to={stat.to} className="profile-stat__link">
                                        {stat.cta} {icons.arrow}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Personal information */}
                    <section className="profile-card" id="account" aria-labelledby="profile-account-title">
                        <div className="profile-card__head">
                            <span className="profile-card__icon">{icons.user}</span>
                            <div>
                                <h2 id="profile-account-title">Personal Information</h2>
                                <p>Update your account details. This information is used for your account.</p>
                            </div>
                        </div>

                        <form className="profile-form" onSubmit={handleAccountSubmit} noValidate>
                            <div className="profile-form__grid profile-form__grid--two">
                                <div className="profile-field">
                                    <label htmlFor="profile-username">Username</label>
                                    <div className="profile-input">
                                        <span className="profile-input__icon">{icons.userSmall}</span>
                                        <input
                                            id="profile-username"
                                            name="username"
                                            type="text"
                                            autoComplete="username"
                                            ref={usernameRef}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            aria-invalid={!!accountErrors.username}
                                            aria-describedby={accountErrors.username ? 'profile-username-error' : 'profile-username-hint'}
                                        />
                                    </div>
                                    {accountErrors.username ? (
                                        <p className="profile-field__error" id="profile-username-error" role="alert">
                                            {accountErrors.username}
                                        </p>
                                    ) : (
                                        <p className="profile-field__hint" id="profile-username-hint">
                                            This is your display name on CareerForge_AI.
                                        </p>
                                    )}
                                </div>

                                <div className="profile-field">
                                    <label htmlFor="profile-email">Email address</label>
                                    <div className="profile-input">
                                        <span className="profile-input__icon">{icons.mail}</span>
                                        <input
                                            id="profile-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            aria-invalid={!!accountErrors.email}
                                            aria-describedby={accountErrors.email ? 'profile-email-error' : 'profile-email-hint'}
                                        />
                                    </div>
                                    {accountErrors.email ? (
                                        <p className="profile-field__error" id="profile-email-error" role="alert">
                                            {accountErrors.email}
                                        </p>
                                    ) : (
                                        <p className="profile-field__hint" id="profile-email-hint">
                                            You will log in with this exact email address.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {accountMessage && (
                                <p
                                    className={`profile-message profile-message--${accountMessage.type}`}
                                    role={accountMessage.type === 'error' ? 'alert' : 'status'}
                                >
                                    {accountMessage.text}
                                </p>
                            )}

                            <div className="profile-form__actions">
                                <button
                                    type="button"
                                    className="button secondary-button"
                                    onClick={handleAccountReset}
                                    disabled={!accountDirty || accountSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button primary-button"
                                    disabled={!accountDirty || accountSaving}
                                >
                                    {accountSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Password & security */}
                    <section className="profile-card" id="security" aria-labelledby="profile-password-title">
                        <div className="profile-card__head">
                            <span className="profile-card__icon">{icons.shield}</span>
                            <div>
                                <h2 id="profile-password-title">Password &amp; Security</h2>
                                <p>Keep your account secure with a strong password.</p>
                            </div>
                            <span className="profile-card__tip">
                                {icons.lock}
                                Use a strong password to keep your account safe.
                            </span>
                        </div>

                        <form className="profile-form" onSubmit={handlePasswordSubmit} noValidate>
                            <div className="profile-form__grid profile-form__grid--three">
                                <PasswordField
                                    id="profile-current-password"
                                    name="currentPassword"
                                    label="Current password"
                                    placeholder="Enter current password"
                                    autoComplete="current-password"
                                    value={passwords.currentPassword}
                                    onChange={setPasswordField('currentPassword')}
                                    error={passwordErrors.currentPassword}
                                />

                                <PasswordField
                                    id="profile-new-password"
                                    name="newPassword"
                                    label="New password"
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                    value={passwords.newPassword}
                                    onChange={setPasswordField('newPassword')}
                                    error={passwordErrors.newPassword}
                                >
                                    <div className="profile-strength" data-level={strength}>
                                        <div className="profile-strength__bars" aria-hidden="true">
                                            {[ 1, 2, 3, 4 ].map((level) => (
                                                <span key={level} className={level <= strength ? 'is-on' : ''} />
                                            ))}
                                        </div>
                                        <span className="profile-strength__label" aria-live="polite">
                                            {strength > 0 ? `Strength: ${STRENGTH_LABELS[strength]}` : ''}
                                        </span>
                                    </div>
                                </PasswordField>

                                <PasswordField
                                    id="profile-confirm-password"
                                    name="confirmPassword"
                                    label="Confirm new password"
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                    value={passwords.confirmPassword}
                                    onChange={setPasswordField('confirmPassword')}
                                    error={passwordErrors.confirmPassword}
                                />
                            </div>

                            {passwordMessage && (
                                <p
                                    className={`profile-message profile-message--${passwordMessage.type}`}
                                    role={passwordMessage.type === 'error' ? 'alert' : 'status'}
                                >
                                    {passwordMessage.text}
                                </p>
                            )}

                            <div className="profile-form__footer">
                                <p className="profile-field__hint">
                                    {PASSWORD_MIN}-{PASSWORD_MAX} characters. Use a combination of letters, numbers and symbols.
                                    You will stay signed in after changing it.
                                </p>
                                <button type="submit" className="button primary-button" disabled={passwordSaving}>
                                    {passwordSaving ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Preferences — only what the app really supports today */}
                    <section className="profile-card" id="preferences" aria-labelledby="profile-preferences-title">
                        <div className="profile-card__head">
                            <span className="profile-card__icon">{icons.sliders}</span>
                            <div>
                                <h2 id="profile-preferences-title">Preferences</h2>
                                <p>Customize your experience on CareerForge_AI.</p>
                            </div>
                        </div>

                        <ul className="profile-prefs">
                            <li className="profile-prefs__row">
                                <span className="profile-prefs__icon">{icons.moon}</span>
                                <div className="profile-prefs__text">
                                    <span className="profile-prefs__title">Appearance</span>
                                    <span className="profile-prefs__desc">CareerForge_AI currently uses its dark theme everywhere.</span>
                                </div>
                                <span className="profile-prefs__value">Dark (default)</span>
                            </li>
                            <li className="profile-prefs__row">
                                <span className="profile-prefs__icon">{icons.bell}</span>
                                <div className="profile-prefs__text">
                                    <span className="profile-prefs__title">Email notifications</span>
                                    <span className="profile-prefs__desc">Notifications aren't part of the app yet, so there is nothing to switch on.</span>
                                </div>
                                <span className="profile-prefs__value profile-prefs__value--muted">Not available yet</span>
                            </li>
                        </ul>
                    </section>

                    {/* Activity — recent real items */}
                    <section className="profile-card" id="activity" aria-labelledby="profile-activity-title">
                        <div className="profile-card__head">
                            <span className="profile-card__icon">{icons.bars}</span>
                            <div>
                                <h2 id="profile-activity-title">Activity</h2>
                                <p>Your most recent interview plans and resumes.</p>
                            </div>
                        </div>

                        <div className="profile-activity">
                            <div className="profile-activity__col">
                                <h3>Recent interview plans</h3>
                                {reportStatus === 'loading' && <p className="profile-activity__empty">Loading...</p>}
                                {reportStatus === 'error' && <p className="profile-activity__empty">Couldn't load your interview plans.</p>}
                                {reportsReady && recentReports.length === 0 && (
                                    <p className="profile-activity__empty">
                                        No interview plans yet. <Link to="/interview/new">Create one</Link>
                                    </p>
                                )}
                                {recentReports.length > 0 && (
                                    <ul className="profile-activity__list">
                                        {recentReports.map((report) => (
                                            <li key={report._id}>
                                                <Link to={`/interview/${report._id}`} className="profile-activity__item">
                                                    <span className="profile-activity__name">{report.title || 'Untitled Position'}</span>
                                                    <span className="profile-activity__meta">
                                                        {formatDate(report.createdAt) || '—'}
                                                        {typeof report.matchScore === 'number' && ` • ${report.matchScore}% match`}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="profile-activity__col">
                                <h3>Recent resumes</h3>
                                {resumeStatus === 'loading' && <p className="profile-activity__empty">Loading...</p>}
                                {resumeStatus === 'error' && <p className="profile-activity__empty">Couldn't load your resumes.</p>}
                                {resumesReady && recentResumes.length === 0 && (
                                    <p className="profile-activity__empty">
                                        No resumes yet. <Link to="/resumes">Open Resume Center</Link>
                                    </p>
                                )}
                                {recentResumes.length > 0 && (
                                    <ul className="profile-activity__list">
                                        {recentResumes.map((resume) => (
                                            <li key={resume._id}>
                                                <Link to={`/resumes/${resume._id}`} className="profile-activity__item">
                                                    <span className="profile-activity__name">{resume.title || 'Untitled Resume'}</span>
                                                    <span className="profile-activity__meta">
                                                        {formatDate(resume.updatedAt || resume.createdAt) || '—'}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    )
}

export default Profile
