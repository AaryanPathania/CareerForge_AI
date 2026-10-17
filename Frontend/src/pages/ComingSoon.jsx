import React from 'react'
import { Link } from 'react-router'

// Minimal branded fallback for any unmapped route (including the current
// /resumes and /profile nav links, which don't have pages yet). Deliberately
// has no dedicated stylesheet — it only uses the existing global tokens/
// button/typography classes already loaded app-wide.
const ComingSoon = () => (
    <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-5)',
        backgroundColor: 'var(--bg-primary)'
    }}>
        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>CareerForge_AI</span>
        <h1 style={{ fontSize: '1.5rem' }}>Page coming soon</h1>
        <p className="text-small" style={{ maxWidth: 420 }}>
            This page isn't available yet. We're still building it out.
        </p>
        <Link to="/dashboard" className="button primary-button">Back to Dashboard</Link>
    </div>
)

export default ComingSoon
