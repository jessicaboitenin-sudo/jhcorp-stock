import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA' }
const F = "'Montserrat', sans-serif"

const NAV_ITEMS = [
  { id: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { id: 'articles',   icon: '📦', label: 'Articles' },
  { id: 'mouvement',  icon: '↕️',  label: 'Mouvement' },
  { id: 'production', icon: '🏭', label: 'Production' },
  { id: 'historique', icon: '🕐', label: 'Historique' },
  { id: 'parametres', icon: '⚙️', label: 'Paramètres' },
]

const ROLE_PAGES = {
  admin:      ['dashboard','articles','mouvement','production','historique','parametres'],
  comptable:  ['dashboard','articles','mouvement','production','historique'],
  magasinier: ['dashboard','articles','mouvement','production','historique'],
}

const ROLE_LABELS = { admin: 'Administrateur', comptable: 'Comptable', magasinier: 'Magasinier' }

export default function Layout({ page, setPage, profile, children }) {
  const role = profile?.role || 'magasinier'
  const allowedPages = ROLE_PAGES[role] || []
  const navItems = NAV_ITEMS.filter(item => allowedPages.includes(item.id))
  const email = profile?.email || ''
  const initiales = email.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: F }}>
      <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 13 }}>JH Corporation</div>
            <div style={{ color: C.textMuted, fontSize: 10 }}>Gestion de stock</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 8px' }}>
          {navItems.map(item => {
            const actif = page === item.id
            return (
              <div key={item.id} onClick={() => setPage(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 2, background: actif ? C.indigo : 'transparent' }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: actif ? 700 : 500, color: actif ? '#fff' : C.textSub }}>{item.label}</span>
              </div>
            )
          })}
        </div>
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.indigo, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{initiales}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ROLE_LABELS[role]}</div>
            <div style={{ color: C.textMuted, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
          </div>
          <span onClick={() => supabase.auth.signOut()} title="Déconnexion" style={{ fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>🚪</span>
        </div>
      </div>
      <div style={{ marginLeft: 220, flex: 1, padding: '28px 32px', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </div>
    </div>
  )
}
