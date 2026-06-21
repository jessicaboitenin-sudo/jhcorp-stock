import Articles from './pages/Articles'

const C = {
  bg: '#F6F4FD', border: '#E8E3FA', text: '#1A1630', textSub: '#7B72A8',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
}
const F = "'Montserrat', sans-serif"

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: F }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          📦
        </div>
        <span style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>JH Corporation — Stock</span>
        <span style={{ color: C.textSub, fontSize: 11, fontFamily: F, marginLeft: 10 }}>Test de connexion — ecran Articles</span>
      </div>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 28px' }}>
        <Articles />
      </div>
    </div>
  )
}
