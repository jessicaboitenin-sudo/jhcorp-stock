import { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  red: '#B5273A', redLight: '#FDECEA',
}
const F = "'Montserrat', sans-serif"

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('Email ou mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: F
    }}>
      <div style={{
        background: C.surface, borderRadius: 16, padding: '40px 36px',
        width: 360, boxShadow: '0 4px 24px rgba(105,84,196,0.10)',
        border: `1px solid ${C.border}`
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: C.indigoLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>📦</div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>JH Corporation</div>
            <div style={{ color: C.textMuted, fontSize: 11 }}>Gestion de stock</div>
          </div>
        </div>

        <div style={{ color: C.text, fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Connexion</div>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 28 }}>Accès réservé au personnel autorisé</div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="votre@email.com"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontFamily: F, fontSize: 13,
              color: C.text, outline: 'none', boxSizing: 'border-box',
              background: '#FAFBFF'
            }}
          />
        </div>

        {/* Mot de passe */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.textSub, display: 'block', marginBottom: 6 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontFamily: F, fontSize: 13,
              color: C.text, outline: 'none', boxSizing: 'border-box',
              background: '#FAFBFF'
            }}
          />
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red
          }}>
            {error}
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading ? C.textMuted : C.indigo, color: '#fff',
            fontFamily: F, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s'
          }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}
