import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', orange: '#C2610F', orangeLight: '#FDF0E8', red: '#B5273A', redLight: '#FDECEA', blue: '#2554A8', blueLight: '#EBF2FB' }
const F = "'Montserrat', sans-serif"

function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

function Carte({ label, valeur, sous, couleur, bg, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, borderRadius: 14, padding: '18px 20px', border: `1.5px solid ${couleur}33`, cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.1s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'scale(1.02)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'scale(1)')}>
      <div style={{ fontSize: 11, color: couleur, fontWeight: 700, fontFamily: F, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: C.text, fontFamily: F, lineHeight: 1 }}>{valeur}</div>
      {sous && <div style={{ fontSize: 11, color: C.textSub, fontFamily: F, marginTop: 4 }}>{sous}</div>}
    </div>
  )
}

function PanneauDetail({ titre, articles, couleur, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16, fontFamily: F }}>{titre}</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>{articles.length} article(s)</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: C.bg, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {articles.map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F }}>{a.designation}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{a.reference} · {a.categorie}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: couleur, fontFamily: F }}>{a.stock_actuel} {a.unite}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>min {a.stock_minimum}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [panneau, setPanneau] = useState(null)

  useEffect(() => {
    supabase.from('articles').select('*').then(({ data }) => {
      if (data) setArticles(data)
      setLoading(false)
    })
  }, [])

  const ruptures = articles.filter(a => a.stock_actuel === 0)
  const stockBas = articles.filter(a => a.stock_actuel > 0 && a.stock_actuel <= a.stock_minimum)
  const ok = articles.filter(a => a.stock_actuel > a.stock_minimum)

  // Valeur totale par type
  const valeurTotale = articles.reduce((sum, a) => sum + ((a.stock_actuel || 0) * (a.prix_revient || 0)), 0)
  const valeurJHC = articles.filter(a => a.reference?.startsWith('JHC')).reduce((sum, a) => sum + ((a.stock_actuel || 0) * (a.prix_revient || 0)), 0)
  const valeurMP = articles.filter(a => a.reference?.startsWith('MP')).reduce((sum, a) => sum + ((a.stock_actuel || 0) * (a.prix_revient || 0)), 0)
  const valeurCONSO = articles.filter(a => a.reference?.startsWith('CONSO')).reduce((sum, a) => sum + ((a.stock_actuel || 0) * (a.prix_revient || 0)), 0)

  if (loading) return <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 24px' }}>Dashboard</h1>

      {/* Valeur du stock */}
      <div style={{ background: C.indigo, borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F, fontWeight: 700, marginBottom: 4 }}>VALEUR TOTALE DU STOCK</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: F }}>{fmt(Math.round(valeurTotale))} <span style={{ fontSize: 16, fontWeight: 600 }}>FCFA</span></div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Vendables (JHC)', val: valeurJHC },
            { label: 'Mat. 1ères (MP)', val: valeurMP },
            { label: 'Consommables', val: valeurCONSO },
          ].map(v => (
            <div key={v.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: F, fontWeight: 700 }}>{v.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: F }}>{fmt(Math.round(v.val))}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cartes statut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <Carte label="🔴 Ruptures de stock" valeur={ruptures.length} sous="articles à 0" couleur={C.red} bg={C.redLight} onClick={ruptures.length ? () => setPanneau('ruptures') : null} />
        <Carte label="🟠 Stock bas" valeur={stockBas.length} sous="en dessous du minimum" couleur={C.orange} bg={C.orangeLight} onClick={stockBas.length ? () => setPanneau('bas') : null} />
        <Carte label="✅ Stock OK" valeur={ok.length} sous={`sur ${articles.length} articles`} couleur={C.green} bg={C.greenLight} />
      </div>

      {/* Répartition par catégorie */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 16 }}>Répartition par catégorie</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {['JH Traiteur','JH Frais','JH Epicerie','JH Boisson'].map(cat => {
            const arts = articles.filter(a => a.categorie === cat)
            const valeur = arts.reduce((s, a) => s + ((a.stock_actuel || 0) * (a.prix_revient || 0)), 0)
            return (
              <div key={cat} style={{ background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F }}>{cat}</div>
                <div style={{ fontSize: 11, color: C.textSub, fontFamily: F, marginTop: 2 }}>{arts.length} article(s)</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.indigo, fontFamily: F, marginTop: 4 }}>{fmt(Math.round(valeur))} FCFA</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panneau détail */}
      {panneau && (
        <>
          <div onClick={() => setPanneau(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,22,48,0.2)', zIndex: 99 }} />
          <PanneauDetail
            titre={panneau === 'ruptures' ? '🔴 Ruptures de stock' : '🟠 Stock bas'}
            articles={panneau === 'ruptures' ? ruptures : stockBas}
            couleur={panneau === 'ruptures' ? C.red : C.orange}
            onClose={() => setPanneau(null)}
          />
        </>
      )}
    </div>
  )
}
