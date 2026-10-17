import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router'
import './resume-editor.scss'
import { getResumeById, updateResume, getResumePdf } from '../features/resume/services/resume.api'
import { formatDate, errorMessage, downloadPdfBlob, LIMITS } from '../features/resume/resume.utils'

// ── Form <-> API content mapping ──────────────────────────────────────────
// Bullets are edited as one-per-line text and converted back to arrays on save.

const blankExperience = () => ({ role: '', organization: '', duration: '', bullets: '' })
const blankProject = () => ({ name: '', bullets: '' })
const blankEducation = () => ({ institution: '', degree: '', duration: '' })

const toForm = (content = {}) => ({
    fullName: content.fullName || '',
    targetRole: content.targetRole || '',
    contact: {
        email: content.contact?.email || '',
        phone: content.contact?.phone || '',
        location: content.contact?.location || '',
    },
    links: {
        linkedin: content.links?.linkedin || '',
        github: content.links?.github || '',
        portfolio: content.links?.portfolio || '',
    },
    summary: content.summary || '',
    skills: content.skills || [],
    experience: (content.experience || []).map((e) => ({
        role: e.role || '',
        organization: e.organization || '',
        duration: e.duration || '',
        bullets: (e.bullets || []).join('\n'),
    })),
    projects: (content.projects || []).map((p) => ({
        name: p.name || '',
        bullets: (p.bullets || []).join('\n'),
    })),
    education: (content.education || []).map((e) => ({
        institution: e.institution || '',
        degree: e.degree || '',
        duration: e.duration || '',
    })),
    certifications: content.certifications || [],
    achievements: content.achievements || [],
})

const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const opt = (text) => text.trim() || undefined
const isBlank = (obj) => Object.values(obj).every((v) => !String(v).trim())

// Drops fully blank entries/lines and omits empty optional fields.
const toPayload = (form) => ({
    fullName: form.fullName.trim(),
    targetRole: opt(form.targetRole),
    contact: {
        email: opt(form.contact.email),
        phone: opt(form.contact.phone),
        location: opt(form.contact.location),
    },
    links: {
        linkedin: opt(form.links.linkedin),
        github: opt(form.links.github),
        portfolio: opt(form.links.portfolio),
    },
    summary: form.summary.trim(),
    skills: form.skills.map((s) => s.trim()).filter(Boolean),
    experience: form.experience.filter((e) => !isBlank(e)).map((e) => ({
        role: e.role.trim(),
        organization: e.organization.trim(),
        duration: opt(e.duration),
        bullets: lines(e.bullets),
    })),
    projects: form.projects.filter((p) => !isBlank(p)).map((p) => ({
        name: p.name.trim(),
        bullets: lines(p.bullets),
    })),
    education: form.education.filter((e) => !isBlank(e)).map((e) => ({
        institution: e.institution.trim(),
        degree: e.degree.trim(),
        duration: opt(e.duration),
    })),
    certifications: form.certifications.map((c) => c.trim()).filter(Boolean),
    achievements: form.achievements.map((a) => a.trim()).filter(Boolean),
})

const validate = (title, form) => {
    const errors = []

    if (!title.trim()) errors.push('Resume title is required.')
    if (!form.fullName.trim()) errors.push('Full name is required.')

    form.experience.forEach((e, i) => {
        if (isBlank(e)) return
        if (!e.role.trim() || !e.organization.trim()) errors.push(`Experience ${i + 1}: role and organization are required.`)
        const b = lines(e.bullets)
        if (b.length > LIMITS.maxBullets) errors.push(`Experience ${i + 1}: use at most ${LIMITS.maxBullets} bullet points.`)
        if (b.some((l) => l.length > LIMITS.bullet)) errors.push(`Experience ${i + 1}: each bullet must be under ${LIMITS.bullet} characters.`)
    })

    form.projects.forEach((p, i) => {
        if (isBlank(p)) return
        if (!p.name.trim()) errors.push(`Project ${i + 1}: name is required.`)
        const b = lines(p.bullets)
        if (b.length > LIMITS.maxBullets) errors.push(`Project ${i + 1}: use at most ${LIMITS.maxBullets} bullet points.`)
        if (b.some((l) => l.length > LIMITS.bullet)) errors.push(`Project ${i + 1}: each bullet must be under ${LIMITS.bullet} characters.`)
    })

    form.education.forEach((e, i) => {
        if (isBlank(e)) return
        if (!e.institution.trim() || !e.degree.trim()) errors.push(`Education ${i + 1}: institution and degree are required.`)
    })

    return errors
}

// Small inline icons (no icon package)
const Icon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
    </svg>
)
const downloadIcon = <Icon path={<><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></>} />
const plusIcon = <Icon path={<path d="M12 5v14M5 12h14" />} />
const backIcon = <Icon path={<path d="M19 12H5M11 6l-6 6 6 6" />} />

const Field = ({ label, children, hint }) => (
    <label className="editor-field">
        <span className="editor-field__label">{label}</span>
        {children}
        {hint && <span className="editor-field__hint">{hint}</span>}
    </label>
)

const Section = ({ title, description, action, children }) => (
    <section className="editor-section card">
        <div className="editor-section__head">
            <div>
                <h2>{title}</h2>
                {description && <p>{description}</p>}
            </div>
            {action}
        </div>
        {children}
    </section>
)

const AddButton = ({ onClick, disabled, children }) => (
    <button type="button" className="button secondary-button editor-add" onClick={onClick} disabled={disabled}>
        {plusIcon} {children}
    </button>
)

// Shown instead of the list when a section has no entries yet.
const EmptyState = ({ message, label, onAdd }) => (
    <div className="editor-empty-state">
        <p>{message}</p>
        <AddButton onClick={onAdd}>{label}</AddButton>
    </div>
)

const RemoveButton = ({ label, onClick }) => (
    <button type="button" className="button ghost-button editor-remove" onClick={onClick} aria-label={label}>
        Remove
    </button>
)

// ── Page ──────────────────────────────────────────────────────────────────
const ResumeEditor = () => {
    const { resumeId } = useParams()

    const [ status, setStatus ] = useState('loading') // loading | ready | notfound | error
    const [ resume, setResume ] = useState(null)
    const [ title, setTitle ] = useState('')
    const [ form, setForm ] = useState(null)
    const [ savedSnapshot, setSavedSnapshot ] = useState('')

    const [ skillInput, setSkillInput ] = useState('')
    const [ saving, setSaving ] = useState(false)
    const [ downloading, setDownloading ] = useState(false)
    const [ errors, setErrors ] = useState([])
    const [ notice, setNotice ] = useState(null) // { type: 'success' | 'error', text }

    const applyResume = useCallback((data) => {
        const nextForm = toForm(data.content)
        setResume(data)
        setTitle(data.title || '')
        setForm(nextForm)
        setSavedSnapshot(JSON.stringify({ title: data.title || '', form: nextForm }))
    }, [])

    const load = useCallback(async () => {
        setStatus('loading')
        try {
            const data = await getResumeById(resumeId)
            applyResume(data.resume)
            setStatus('ready')
        } catch (err) {
            setStatus(err?.response?.status === 404 ? 'notfound' : 'error')
        }
    }, [ resumeId, applyResume ])

    useEffect(() => {
        load()
    }, [ load ])

    const dirty = useMemo(
        () => status === 'ready' && JSON.stringify({ title, form }) !== savedSnapshot,
        [ status, title, form, savedSnapshot ]
    )

    // Warn before leaving with unsaved changes (in-app navigation + tab close).
    const blocker = useBlocker(dirty)

    useEffect(() => {
        if (blocker.state === 'blocked') {
            if (window.confirm('You have unsaved changes. Leave this page and discard them?')) {
                blocker.proceed()
            } else {
                blocker.reset()
            }
        }
    }, [ blocker ])

    useEffect(() => {
        if (!dirty) return
        const onBeforeUnload = (e) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [ dirty ])

    // ── Updaters ──────────────────────────────────────────────────────────
    const touch = () => {
        if (notice) setNotice(null)
    }
    const patch = (key, value) => { touch(); setForm((f) => ({ ...f, [ key ]: value })) }
    const patchGroup = (group, key, value) => { touch(); setForm((f) => ({ ...f, [ group ]: { ...f[ group ], [ key ]: value } })) }
    const patchItem = (list, index, key, value) => {
        touch()
        setForm((f) => ({ ...f, [ list ]: f[ list ].map((item, i) => (i === index ? { ...item, [ key ]: value } : item)) }))
    }
    const patchString = (list, index, value) => {
        touch()
        setForm((f) => ({ ...f, [ list ]: f[ list ].map((item, i) => (i === index ? value : item)) }))
    }
    const addItem = (list, blank, max) => {
        touch()
        setForm((f) => (f[ list ].length >= max ? f : { ...f, [ list ]: [ ...f[ list ], blank ] }))
    }
    const removeItem = (list, index) => {
        touch()
        setForm((f) => ({ ...f, [ list ]: f[ list ].filter((_, i) => i !== index) }))
    }

    const addSkills = () => {
        const incoming = skillInput.split(',').map((s) => s.trim().slice(0, LIMITS.skill)).filter(Boolean)
        if (incoming.length === 0) return
        touch()
        setForm((f) => {
            const next = [ ...f.skills ]
            incoming.forEach((skill) => {
                if (next.length < LIMITS.maxSkills && !next.some((s) => s.toLowerCase() === skill.toLowerCase())) {
                    next.push(skill)
                }
            })
            return { ...f, skills: next }
        })
        setSkillInput('')
    }

    // ── Actions ───────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (saving) return

        const problems = validate(title, form)
        setErrors(problems)
        if (problems.length > 0) {
            setNotice(null)
            return
        }

        setSaving(true)
        setNotice(null)
        try {
            const data = await updateResume(resumeId, { title: title.trim(), content: toPayload(form) })
            applyResume(data.resume)
            setNotice({ type: 'success', text: 'Changes saved.' })
        } catch (err) {
            setNotice({ type: 'error', text: errorMessage(err, 'Unable to save your changes. Please try again.') })
        } finally {
            setSaving(false)
        }
    }

    const handleDownload = async () => {
        setDownloading(true)
        setNotice(null)
        try {
            const blob = await getResumePdf(resumeId)
            downloadPdfBlob(blob, resume?.title)
        } catch (err) {
            setNotice({ type: 'error', text: 'Unable to download the PDF. Please try again.' })
        } finally {
            setDownloading(false)
        }
    }

    // ── Non-ready states ──────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <div className="resume-editor">
                <div className="editor-skeleton" aria-hidden="true">
                    <div className="editor-skeleton__bar" />
                    <div className="editor-skeleton__block" />
                    <div className="editor-skeleton__block" />
                </div>
                <span className="sr-only" role="status">Loading resume…</span>
            </div>
        )
    }

    if (status === 'notfound' || status === 'error') {
        return (
            <div className="resume-editor">
                <div className="editor-state card">
                    <h3>{status === 'notfound' ? 'Resume not found' : 'Unable to load this resume'}</h3>
                    <p>
                        {status === 'notfound'
                            ? "This resume doesn't exist or has been deleted."
                            : 'Something went wrong while fetching your resume.'}
                    </p>
                    <div className="editor-state__actions">
                        {status === 'error' && (
                            <button type="button" className="button secondary-button" onClick={load}>Try again</button>
                        )}
                        <Link to="/resumes" className="button primary-button">Back to Resume Center</Link>
                    </div>
                </div>
            </div>
        )
    }

    const created = formatDate(resume?.createdAt)

    return (
        <div className="resume-editor">

            <header className="editor-header">
                <Link to="/resumes" className="editor-header__back">{backIcon} Resume Center</Link>

                <div className="editor-header__row">
                    <div>
                        <h1>Review &amp; Edit Resume</h1>
                        <p>
                            Check every detail before you download. AI-generated text can contain mistakes, so correct anything that isn't accurate.
                            {created && ` Created ${created}.`}
                        </p>
                    </div>
                    <div className="editor-header__actions">
                        <button
                            type="button"
                            className="button secondary-button"
                            onClick={handleDownload}
                            disabled={downloading}
                        >
                            {downloadIcon} {downloading ? 'Preparing...' : 'Download PDF'}
                        </button>
                        {dirty && <span className="editor-header__hint">PDF uses the last saved version.</span>}
                    </div>
                </div>
            </header>

            <p className="editor-tip">
                New to the job market? Only your name is required. Students can lead with Education, Projects and Skills, and add internships, volunteering or college activities under Experience or Achievements. Empty sections are left out of the PDF.
            </p>

            <Section title="Basics">
                <div className="editor-grid">
                    <Field label="Resume title *">
                        <input type="text" value={title} maxLength={LIMITS.title} onChange={(e) => { touch(); setTitle(e.target.value) }} />
                    </Field>
                    <Field label="Full name *">
                        <input type="text" value={form.fullName} maxLength={LIMITS.fullName} onChange={(e) => patch('fullName', e.target.value)} />
                    </Field>
                    <Field label="Headline" hint="For example: Full Stack Developer">
                        <input type="text" value={form.targetRole} maxLength={LIMITS.targetRole} onChange={(e) => patch('targetRole', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Contact & links" description="Only add details you want printed on the resume.">
                <div className="editor-grid">
                    <Field label="Email">
                        <input type="email" value={form.contact.email} maxLength={LIMITS.email} onChange={(e) => patchGroup('contact', 'email', e.target.value)} />
                    </Field>
                    <Field label="Phone">
                        <input type="tel" value={form.contact.phone} maxLength={LIMITS.phone} onChange={(e) => patchGroup('contact', 'phone', e.target.value)} />
                    </Field>
                    <Field label="Location">
                        <input type="text" value={form.contact.location} maxLength={LIMITS.location} onChange={(e) => patchGroup('contact', 'location', e.target.value)} />
                    </Field>
                    <Field label="LinkedIn">
                        <input type="text" value={form.links.linkedin} maxLength={LIMITS.link} onChange={(e) => patchGroup('links', 'linkedin', e.target.value)} />
                    </Field>
                    <Field label="GitHub">
                        <input type="text" value={form.links.github} maxLength={LIMITS.link} onChange={(e) => patchGroup('links', 'github', e.target.value)} />
                    </Field>
                    <Field label="Portfolio">
                        <input type="text" value={form.links.portfolio} maxLength={LIMITS.link} onChange={(e) => patchGroup('links', 'portfolio', e.target.value)} />
                    </Field>
                </div>
            </Section>

            <Section title="Summary">
                <Field label="Professional summary" hint={`${form.summary.length}/${LIMITS.summary}`}>
                    <textarea rows={4} value={form.summary} maxLength={LIMITS.summary} onChange={(e) => patch('summary', e.target.value)} />
                </Field>
            </Section>

            <Section title="Skills" description="Technical skills, tools and relevant coursework. Press Enter or Add, and separate several with commas.">
                {form.skills.length > 0 && (
                    <ul className="skill-chips">
                        {form.skills.map((skill, i) => (
                            <li key={`${skill}-${i}`} className="skill-chip">
                                <span>{skill}</span>
                                <button type="button" aria-label={`Remove ${skill}`} onClick={() => removeItem('skills', i)}>×</button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="skill-add">
                    <input
                        type="text"
                        placeholder="Add a skill"
                        aria-label="Add a skill"
                        value={skillInput}
                        maxLength={LIMITS.skill * 4}
                        disabled={form.skills.length >= LIMITS.maxSkills}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                addSkills()
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="button secondary-button"
                        onClick={addSkills}
                        disabled={!skillInput.trim() || form.skills.length >= LIMITS.maxSkills}
                    >
                        Add
                    </button>
                </div>
                {form.skills.length >= LIMITS.maxSkills && (
                    <p className="editor-limit">Maximum of {LIMITS.maxSkills} skills reached.</p>
                )}
            </Section>

            <Section
                title="Experience (optional)"
                description="Internships, part-time jobs, volunteering, freelance work or college roles all count. If you don't have any yet, leave this empty and lean on Projects and Education."
                action={form.experience.length > 0 && (
                    <AddButton onClick={() => addItem('experience', blankExperience(), LIMITS.maxExperience)} disabled={form.experience.length >= LIMITS.maxExperience}>
                        Add experience
                    </AddButton>
                )}
            >
                {form.experience.length === 0 && (
                    <EmptyState
                        message="No experience added yet."
                        label="Add experience"
                        onAdd={() => addItem('experience', blankExperience(), LIMITS.maxExperience)}
                    />
                )}
                {form.experience.map((item, i) => (
                    <div className="editor-entry" key={i}>
                        <div className="editor-entry__head">
                            <h3>Experience {i + 1}</h3>
                            <RemoveButton label={`Remove experience ${i + 1}`} onClick={() => removeItem('experience', i)} />
                        </div>
                        <div className="editor-grid">
                            <Field label="Role *">
                                <input type="text" autoFocus={i === form.experience.length - 1 && isBlank(item)} value={item.role} maxLength={LIMITS.role} onChange={(e) => patchItem('experience', i, 'role', e.target.value)} />
                            </Field>
                            <Field label="Organization *">
                                <input type="text" value={item.organization} maxLength={LIMITS.organization} onChange={(e) => patchItem('experience', i, 'organization', e.target.value)} />
                            </Field>
                            <Field label="Duration">
                                <input type="text" value={item.duration} maxLength={LIMITS.duration} onChange={(e) => patchItem('experience', i, 'duration', e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Bullet points" hint={`One per line, up to ${LIMITS.maxBullets}.`}>
                            <textarea rows={4} value={item.bullets} onChange={(e) => patchItem('experience', i, 'bullets', e.target.value)} />
                        </Field>
                    </div>
                ))}
            </Section>

            <Section
                title="Projects"
                description="Academic, personal, hackathon or open-source projects. For students this is often the strongest section."
                action={form.projects.length > 0 && (
                    <AddButton onClick={() => addItem('projects', blankProject(), LIMITS.maxProjects)} disabled={form.projects.length >= LIMITS.maxProjects}>
                        Add project
                    </AddButton>
                )}
            >
                {form.projects.length === 0 && (
                    <EmptyState
                        message="No projects added yet."
                        label="Add project"
                        onAdd={() => addItem('projects', blankProject(), LIMITS.maxProjects)}
                    />
                )}
                {form.projects.map((item, i) => (
                    <div className="editor-entry" key={i}>
                        <div className="editor-entry__head">
                            <h3>Project {i + 1}</h3>
                            <RemoveButton label={`Remove project ${i + 1}`} onClick={() => removeItem('projects', i)} />
                        </div>
                        <Field label="Project name *">
                            <input type="text" autoFocus={i === form.projects.length - 1 && isBlank(item)} value={item.name} maxLength={LIMITS.projectName} onChange={(e) => patchItem('projects', i, 'name', e.target.value)} />
                        </Field>
                        <Field label="Bullet points" hint={`One per line, up to ${LIMITS.maxBullets}.`}>
                            <textarea rows={4} value={item.bullets} onChange={(e) => patchItem('projects', i, 'bullets', e.target.value)} />
                        </Field>
                    </div>
                ))}
            </Section>

            <Section
                title="Education"
                description="Your college, university or school, degree or course, and dates."
                action={form.education.length > 0 && (
                    <AddButton onClick={() => addItem('education', blankEducation(), LIMITS.maxEducation)} disabled={form.education.length >= LIMITS.maxEducation}>
                        Add education
                    </AddButton>
                )}
            >
                {form.education.length === 0 && (
                    <EmptyState
                        message="No education added yet."
                        label="Add education"
                        onAdd={() => addItem('education', blankEducation(), LIMITS.maxEducation)}
                    />
                )}
                {form.education.map((item, i) => (
                    <div className="editor-entry" key={i}>
                        <div className="editor-entry__head">
                            <h3>Education {i + 1}</h3>
                            <RemoveButton label={`Remove education ${i + 1}`} onClick={() => removeItem('education', i)} />
                        </div>
                        <div className="editor-grid">
                            <Field label="Institution *">
                                <input type="text" autoFocus={i === form.education.length - 1 && isBlank(item)} value={item.institution} maxLength={LIMITS.institution} onChange={(e) => patchItem('education', i, 'institution', e.target.value)} />
                            </Field>
                            <Field label="Degree *">
                                <input type="text" value={item.degree} maxLength={LIMITS.degree} onChange={(e) => patchItem('education', i, 'degree', e.target.value)} />
                            </Field>
                            <Field label="Duration">
                                <input type="text" value={item.duration} maxLength={LIMITS.duration} onChange={(e) => patchItem('education', i, 'duration', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                ))}
            </Section>

            <Section
                title="Certifications (optional)"
                description="Courses or certificates you have completed, such as online courses or vendor certifications."
                action={form.certifications.length > 0 && (
                    <AddButton onClick={() => addItem('certifications', '', LIMITS.maxCertifications)} disabled={form.certifications.length >= LIMITS.maxCertifications}>
                        Add certification
                    </AddButton>
                )}
            >
                {form.certifications.length === 0 && (
                    <EmptyState
                        message="No certifications added yet."
                        label="Add certification"
                        onAdd={() => addItem('certifications', '', LIMITS.maxCertifications)}
                    />
                )}
                {form.certifications.map((cert, i) => (
                    <div className="editor-row" key={i}>
                        <input
                            type="text"
                            aria-label={`Certification ${i + 1}`}
                            autoFocus={i === form.certifications.length - 1 && cert === ''}
                            value={cert}
                            maxLength={LIMITS.certification}
                            onChange={(e) => patchString('certifications', i, e.target.value)}
                        />
                        <RemoveButton label={`Remove certification ${i + 1}`} onClick={() => removeItem('certifications', i)} />
                    </div>
                ))}
            </Section>

            <Section
                title="Achievements (optional)"
                description="Awards, scholarships, hackathon results, leadership roles or college activities. Only add things that are true."
                action={form.achievements.length > 0 && (
                    <AddButton onClick={() => addItem('achievements', '', LIMITS.maxAchievements)} disabled={form.achievements.length >= LIMITS.maxAchievements}>
                        Add achievement
                    </AddButton>
                )}
            >
                {form.achievements.length === 0 && (
                    <EmptyState
                        message="No achievements added yet."
                        label="Add achievement"
                        onAdd={() => addItem('achievements', '', LIMITS.maxAchievements)}
                    />
                )}
                {form.achievements.map((item, i) => (
                    <div className="editor-row" key={i}>
                        <input
                            type="text"
                            aria-label={`Achievement ${i + 1}`}
                            autoFocus={i === form.achievements.length - 1 && item === ''}
                            value={item}
                            maxLength={LIMITS.achievement}
                            onChange={(e) => patchString('achievements', i, e.target.value)}
                        />
                        <RemoveButton label={`Remove achievement ${i + 1}`} onClick={() => removeItem('achievements', i)} />
                    </div>
                ))}
            </Section>

            {/* Sticky save bar */}
            <div className="editor-savebar">
                <div className="editor-savebar__inner">
                    <div className="editor-savebar__status">
                        {errors.length > 0 && (
                            <ul className="editor-errors" role="alert">
                                {errors.slice(0, 4).map((msg) => <li key={msg}>{msg}</li>)}
                                {errors.length > 4 && <li>…and {errors.length - 4} more.</li>}
                            </ul>
                        )}
                        {notice && (
                            <span
                                className={`editor-notice editor-notice--${notice.type}`}
                                role={notice.type === 'error' ? 'alert' : 'status'}
                            >
                                {notice.text}
                            </span>
                        )}
                        {!notice && errors.length === 0 && (
                            <span className="editor-savebar__dirty">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="button primary-button"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ResumeEditor
