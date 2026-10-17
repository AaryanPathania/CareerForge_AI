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
    'Personalized Preparation',
    'AI Interview Questions',
    'Skill Gap Detection',
    'Professional Resume Generation',
]

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    const [ errorMessage, setErrorMessage ] = useState("")

    const {loading,handleRegister} = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage("")
        try {
            await handleRegister({ username, email, password })
            navigate("/dashboard")
        } catch (err) {
            setErrorMessage(err?.response?.data?.message || "Unable to create your account. Please try again.")
        }
    }

    if(loading){
        return (
            <main className="auth-page">
                <div className="auth-loading">
                    <div className="auth-loading__spinner" aria-hidden="true" />
                    <p>Creating your account...</p>
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
                        Start Your Interview<br />
                        <span className="auth-page__accent">Success Journey.</span>
                    </h1>
                    <p className="auth-page__description">
                        Prepare for interviews using your resume, target role, and AI-driven
                        analysis, questions, skill gaps, and preparation plans.
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
                    <h2>Create your account</h2>
                    <p className="auth-card__subtitle">Join CareerForge_AI and start preparing smarter.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <input
                                onChange={(e) => { setUsername(e.target.value) }}
                                type="text"
                                id="username"
                                name="username"
                                placeholder="Enter username"
                                autoComplete="username"
                            />
                        </div>
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
                                autoComplete="new-password"
                            />
                        </div>

                        {errorMessage && (
                            <p className="auth-card__error" role="alert">{errorMessage}</p>
                        )}

                        <button type="submit" className="button primary-button auth-card__submit">Create Account</button>
                    </form>

                    <p className="auth-card__footer-text">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </section>
        </main>
    )
}

export default Register
