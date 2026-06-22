import { useState } from 'react'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  red: '#B5273A', redLight: '#FDECEA',
}
const F = "'Montserrat', sans-serif"

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'articles', icon: '📦', label: 'Articles' },
  { id: 'recettes', icon: '📋', label: 'Recettes' },
  { id: 'commandes', icon: '📥', label: 'Commandes' },
  { id: 'entree', icon: '✅', label: 'Entree' },
  { id: 'production', icon: '⚙️', label: 'Production' },
  { id: 'livraison', icon: '🚚', label: 'Livraison' },
  { id: 'inventaire', icon: '🗂️', label: 'Inventaire' },
  { id: 'historique', icon: '🕐', label: 'Historique' },
  { id: 'parametres', icon: '⚙️', label: 'Parametres' },
]

export default function Layout({ page, setPage, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: F }}>
      {/* Sidebar */}
      <div style={{ width: 230, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
          <div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 13, fontFamily: F }}>JH Corporation</div>
            <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Gestion de stock</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '10px 8px' }}>
          {NAV_ITEMS.map(item => {
            const actif = page === item.id
            return (
              <div key={item.id} onClick={() => setPage(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10,
                cursor: 'pointer', marginBottom: 2, background: actif ? C.indigo : 'transparent',
                transition: 'background 0.15s'
              }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: actif ? 700 : 500, color: actif ? '#fff' : C.textSub, fontFamily: F }}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>Administrateur</span>
          <span style={{ fontSize: 14, cursor: 'pointer' }}>🚪</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 230, flex: 1, padding: '28px 32px', maxWidth: 'calc(100vw - 230px)' }}>
        {children}
      </div>
    </div>
  )
}
