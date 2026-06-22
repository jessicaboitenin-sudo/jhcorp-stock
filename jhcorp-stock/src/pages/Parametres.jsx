const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', red: '#B5273A', redLight: '#FDECEA', green: '#2A7A50', greenLight: '#E6F4ED' }
const F = "'Montserrat', sans-serif"

const ROLES = [
  { id: 'admin', label: 'Administrateur', desc: 'Acces complet, gestion des utilisateurs', color: C.red, bg: C.redLight },
  { id: 'comptable', label: 'Comptable', desc: 'Validation documents, inventaires, commandes', color: C.indigo, bg: C.indigoLight },
  { id: 'magasinier', label: 'Magasinier', desc: 'Bons d\'entree, production, livraisons, inventaires', color: C.green, bg: C.greenLight },
]

export default function Parametres() {
  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Parametres</h1>
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>🏢</span>
          <span style={{ color: C.text, fontWeight: 700, fontSize: 15, fontFamily: F }}>JH Corporation — Gestion de stock</span>
        </div>
        <div style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>Version 1.0 · Supabase + Vercel</div>
      </div>

      <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F, marginBottom: 10 }}>Roles et permissions</div>
      {ROLES.map(r => (
        <div key={r.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ background: r.bg, color: r.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, fontFamily: F, whiteSpace: 'nowrap' }}>{r.label}</span>
          <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>{r.desc}</span>
        </div>
      ))}

      <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F, margin: '20px 0 10px' }}>Entites JH Corporation</div>
      {['JH Traiteur', 'JH Frais', 'JH Epicerie', 'JH Boisson'].map(e => (
        <div key={e} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 8, color: C.text, fontSize: 13, fontWeight: 600, fontFamily: F }}>{e}</div>
      ))}

      <div style={{ background: C.indigoLight, borderRadius: 12, padding: '14px 16px', marginTop: 20, fontSize: 12, color: C.indigo, fontFamily: F, lineHeight: 1.6 }}>
        ℹ️ La gestion des utilisateurs et l'authentification seront activees dans une prochaine version. Pour l'instant, l'acces est ouvert sans restriction.
      </div>
    </div>
  )
}
