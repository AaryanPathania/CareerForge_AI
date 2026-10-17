import React, { useState } from 'react'
import { Link } from 'react-router'
import './landing.scss'
import { useAuth } from '../features/auth/hooks/useAuth'

// ── Small inline icons (no extra package — plain SVG, subtle single-color) ──
const Icon = ({ path }) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
    </svg>
)

const icons = {
    resume: <Icon path={<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>} />,
    questions: <Icon path={<><path d="M12 17h.01" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" /><circle cx="12" cy="12" r="9" /></>} />,
    gap: <Icon path={<><path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 5-7" /></>} />,
    roadmap: <Icon path={<><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M6 8v3a2 2 0 0 0 2 2h8a2 2 0 0 1 2 2v3" /></>} />,
    generate: <Icon path={<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M7 7l2.5 2.5M17 17l-2.5-2.5M7 17l2.5-2.5M17 7l-2.5 2.5" /></>} />,
    arrow: <Icon path={<path d="M5 12h14M13 6l6 6-6 6" />} />,
    dashboard: <Icon path={<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>} />,
    profile: <Icon path={<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" /></>} />,
}

// ── Navbar ────────────────────────────────────────────────────────────────
const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)

    return (
        <header className="landing-navbar">
            <div className="landing-navbar__inner">
                <span className="landing-navbar__logo">CareerForge_AI</span>

                <nav className="landing-navbar__links">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#about">About</a>
                </nav>

                <div className="landing-navbar__actions">
                    <Link to="/login" className="button ghost-button">Login</Link>
                    <Link to="/register" className="button primary-button">Get Started</Link>
                </div>

                <button
                    className="landing-navbar__toggle"
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {menuOpen && (
                <div className="landing-navbar__mobile">
                    <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
                    <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
                    <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
                    <Link to="/login" className="button ghost-button">Login</Link>
                    <Link to="/register" className="button primary-button">Get Started</Link>
                </div>
            )}
        </header>
    )
}

// ── Product Preview (static mock UI — no backend data) ──────────────────────
const sidebarItems = [
    { icon: icons.dashboard, label: 'Dashboard', active: true },
    { icon: icons.questions, label: 'Interviews', active: false },
    { icon: icons.resume, label: 'Resumes', active: false },
    { icon: icons.profile, label: 'Profile', active: false },
]

const ProductPreview = () => (
    <div className="product-preview card">
        {/* Mini app header */}
        <div className="product-preview__topbar">
            <span className="product-preview__logo">CareerForge_AI</span>
        </div>

        <div className="product-preview__body">
            {/* Mini sidebar */}
            <nav className="product-preview__sidebar">
                {sidebarItems.map((item) => (
                    <span
                        key={item.label}
                        className={`product-preview__nav-item${item.active ? ' is-active' : ''}`}
                    >
                        <span className="product-preview__nav-icon">{item.icon}</span>
                        <span className="product-preview__nav-label">{item.label}</span>
                    </span>
                ))}
            </nav>

            {/* Mini dashboard */}
            <div className="product-preview__main">
                <p className="product-preview__greeting">Welcome back 👋</p>
                <p className="product-preview__subtitle">Ready to prepare for your next role?</p>

                <div className="product-preview__stats">
                    <div className="product-preview__stat">
                        <span className="product-preview__stat-value">8</span>
                        <span className="product-preview__stat-label">Interview Plans</span>
                    </div>
                    <div className="product-preview__stat">
                        <span className="product-preview__stat-value">82%</span>
                        <span className="product-preview__stat-label">Average Match</span>
                    </div>
                    <div className="product-preview__stat">
                        <span className="product-preview__stat-value">3</span>
                        <span className="product-preview__stat-label">Skills to Improve</span>
                    </div>
                </div>

                <p className="product-preview__section-title">Recent Interview Plans</p>

                <ul className="product-preview__list">
                    <li>
                        <span>React Developer</span>
                        <span className="product-preview__score">85% {icons.arrow}</span>
                    </li>
                    <li>
                        <span>Java Developer</span>
                        <span className="product-preview__score">74% {icons.arrow}</span>
                    </li>
                    <li>
                        <span>Full Stack Developer</span>
                        <span className="product-preview__score">72% {icons.arrow}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
)

// ── Hero ─────────────────────────────────────────────────────────────────
const Hero = ({ getStartedTo }) => (
    <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="hero__inner">
            <div className="hero__left">
                <h1 className="hero__headline">
                    Turn Your Resume<br />
                    Into <span className="highlight">Interview Success.</span>
                </h1>
                <p className="hero__description">
                    CareerForge_AI analyzes your resume, target job, and experience to create a
                    personalized interview preparation strategy.
                </p>
                <div className="hero__actions">
                    <Link to={getStartedTo} className="button primary-button">Get Started {icons.arrow}</Link>
                    <a href="#how-it-works" className="button secondary-button">See How It Works</a>
                </div>

                <ul className="hero__value-row">
                    <li>AI Resume Analysis</li>
                    <li>Role-specific Questions</li>
                    <li>Skill Gap Detection</li>
                    <li>Preparation Roadmap</li>
                    <li>Resume Generation</li>
                </ul>
            </div>

            <div className="hero__right">
                <ProductPreview />
            </div>
        </div>
    </section>
)

// ── Features ─────────────────────────────────────────────────────────────
const featureList = [
    { icon: icons.resume, title: 'Resume Analysis', text: 'Analyze your resume and identify the experience and skills relevant to the target role.' },
    { icon: icons.questions, title: 'AI Interview Questions', text: 'Generate technical and behavioral questions based on the target job and your profile.' },
    { icon: icons.gap, title: 'Skill Gap Detection', text: 'Identify important skills that need improvement before the interview.' },
    { icon: icons.roadmap, title: 'Preparation Roadmap', text: 'Get a structured day-by-day preparation plan.' },
    { icon: icons.generate, title: 'Resume Generation', text: 'Generate a professional, job-targeted resume.' },
]

const Features = () => (
    <section className="features" id="features">
        <h2 className="section-heading">Everything you need to prepare smarter.</h2>
        <div className="features__grid">
            {featureList.map((f) => (
                <div className="feature-card card card--hover" key={f.title}>
                    <span className="feature-card__icon">{f.icon}</span>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                </div>
            ))}
        </div>
    </section>
)

// ── How It Works ─────────────────────────────────────────────────────────
const steps = [
    { n: '01', title: 'Add your resume' },
    { n: '02', title: 'Add your target job' },
    { n: '03', title: 'AI analyzes your profile' },
    { n: '04', title: 'Prepare with your personalized plan' },
]

const HowItWorks = () => (
    <section className="how-it-works" id="how-it-works">
        <h2 className="section-heading">How CareerForge_AI works</h2>
        <div className="how-it-works__steps">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className="step">
                        <span className="step__number">{s.n}</span>
                        <p className="step__title">{s.title}</p>
                    </div>
                    {i < steps.length - 1 && <div className="step__connector" aria-hidden="true" />}
                </React.Fragment>
            ))}
        </div>
    </section>
)

// ── About ────────────────────────────────────────────────────────────────
const About = () => (
    <section className="about" id="about">
        <h2 className="section-heading">About CareerForge_AI</h2>
        <p className="about__text">
            CareerForge_AI helps candidates turn their resume, target role, and experience
            into a personalized interview preparation strategy.
        </p>
    </section>
)

// ── Final CTA ────────────────────────────────────────────────────────────
const FinalCta = ({ getStartedTo }) => (
    <section className="final-cta">
        <h2>Your next interview starts here.</h2>
        <p>Build a preparation strategy around your skills, your resume, and your target role.</p>
        <Link to={getStartedTo} className="button primary-button">Get Started {icons.arrow}</Link>
    </section>
)

// ── Footer ───────────────────────────────────────────────────────────────
const Footer = () => (
    <footer className="landing-footer">
        <div className="landing-footer__inner">
            <div className="landing-footer__brand">
                <span className="landing-footer__logo">CareerForge_AI</span>
                <p>AI-powered interview preparation.</p>
            </div>

            <nav className="landing-footer__links">
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#about">About</a>
                <Link to="/login">Login</Link>
            </nav>
        </div>
        <p className="landing-footer__copyright">© 2026 CareerForge_AI</p>
    </footer>
)

// ── Landing Page ─────────────────────────────────────────────────────────
const Landing = () => {
    const { user } = useAuth()
    const getStartedTo = user ? '/dashboard' : '/register'

    React.useEffect(() => {
        document.title = 'CareerForge_AI — AI-Powered Interview Preparation'
    }, [])

    return (
        <div className="landing-page">
            <Navbar />
            <Hero getStartedTo={getStartedTo} />
            <Features />
            <HowItWorks />
            <About />
            <FinalCta getStartedTo={getStartedTo} />
            <Footer />
        </div>
    )
}

export default Landing
