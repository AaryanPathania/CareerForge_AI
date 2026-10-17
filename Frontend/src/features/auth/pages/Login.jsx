import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

// Small inline check icon for the benefits list (no icon package)
const CheckIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

const benefits = [
    'AI Resume Analysis',
    'Targeted Interview Questions',
    'Skill Gap Detection',
    'Personalized Preparation Roadmap',
]

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ errorMessage, setErrorMessage ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage("")
        try {
            await handleLogin({ email, password })
            navigate('/dashboard')
        } catch (err) {
            setErrorMessage(err?.response?.data?.message || "Unable to sign in. Please check your credentials and try again.")
        }
    }

    if(loading){
        return (
            <main className="auth-page">
                <div className="auth-loading">
                    <div className="auth-loading__spinner" aria-hidden="true" />
                    <p>Signing you in...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="auth-page">
            <section className="auth-page__brand">
                <div className="auth-page__brand-inner">
                    <span className="auth-page__logo">CareerForge_AI</span>
                    <h1 className="auth-page__tagline">
                        Prepare Smarter.<br />
                        Interview with <span className="auth-page__accent">Confidence.</span>
                    </h1>
                    <p className="auth-page__description">
                        CareerForge_AI analyzes your resume, target role, and experience to create
                        a personalized interview preparation strategy.
                    </p>
                    <ul className="auth-page__benefits">
                        {benefits.map((b) => (
                            <li key={b}>
                                <span className="auth-page__benefit-icon"><CheckIcon /></span>
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="auth-page__form-panel">
                <div className="auth-card card">
                    <h2>Welcome back</h2>
                    <p className="auth-card__subtitle">Sign in to your CareerForge_AI account.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input
                                onChange={(e) => { setEmail(e.target.value) }}
                                type="email"
                                id="email"
                                name="email"
                                placeholder="Enter email address"
                                autoComplete="email"
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input
                                onChange={(e) => { setPassword(e.target.value) }}
                                type="password"
                                id="password"
                                name="password"
                                placeholder="Enter password"
                                autoComplete="current-password"
                            />
                        </div>
                        {errorMessage && (
                            <p className="auth-card__error" role="alert">{errorMessage}</p>
                        )}
                        <button type="submit" className="button primary-button auth-card__submit">Sign In</button>
                    </form>

                    <p className="auth-card__footer-text">
                        Don't have an account? <Link to="/register">Create one</Link>
                    </p>
                </div>
            </section>
        </main>
    )
}

export default Login
