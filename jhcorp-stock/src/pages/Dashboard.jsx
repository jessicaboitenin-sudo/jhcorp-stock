import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA', indigoMid: '#B5A6E2',
  green: '#2A7A50', greenLight: '#E6F4ED',
  orange: '#C2610F', orangeLight: '#FDF0E8',
  red: '#B5273A', redLight: '#FDECEA',
}
const F = "'Montserrat', sans-serif"

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, vendables: 0, ingredients: 0, rupture: 0, bas: 0 })
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: articles } = await supabase.from('articles').select('vendable_directement,utilise_en_recette,stock_actuel,stock_minimum')
      const { data: mvts } = await supabase.from('mouvements_stock').select('*,articles(designation)').order('date', { ascending: false }).limit(10)
      if (articles) {
        setStats({
          total: articles.length,
          vendables: articles.filter(a => a.vendable_directement).length,
          ingredients: articles.filter(a => a.utilise_en_recette).length,
          rupture: articles.filter(a => a.stock_actuel === 0).length,
          bas: articles.filter(a => a.stock_actuel > 0 && a.stock_actuel <= a.stock_minimum).length,
        })
      }
      if (mvts) setMouvements(mvts)
      setLoading(false)
    }
    load()
  }, [])

  const MOUV_META = {
    entree: { label: 'Entree', color: C.green, bg: C.greenLight, signe: '+' },
    sortie_production: { label: 'Sortie prod', color: C.red, bg: C.redLight, signe: '-' },
    sortie_bl: { label: 'Sortie BL', color: C.red, bg: C.redLight, signe: '-' },
    casse_bl: { label: 'Casse BL', color: C.orange, bg: C.orangeLight, signe: '-' },
    ajustement_inventaire: { label: 'Ajustement', color: C.indigo, bg: C.indigoLight, signe: '±' },
  }

  const cards = [
    { label: 'Articles', value: stats.total, sub: `${stats.vendables} vendables · ${stats.ingredients} ingredients`, icon: '📦' },
    { label: 'Ruptures', value: stats.rupture, sub: 'Articles a zero', icon: '🔴' },
    { label: 'Stock bas', value: stats.bas, sub: 'Sous le minimum', icon: '🟠' },
  ]

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>{c.label}</span>
            </div>
            <div style={{ color: C.indigo, fontSize: 28, fontWeight: 900, fontFamily: F }}>{loading ? '...' : c.value}</div>
            <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {(stats.rupture > 0 || stats.bas > 0) && (
        <div style={{ background: C.orangeLight, border: `1.5px solid ${C.orange}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ color: C.orange, fontWeight: 800, fontSize: 13, fontFamily: F, marginBottom: 4 }}>⚠️ Alertes stock</div>
          {stats.rupture > 0 && <div style={{ color: C.red, fontSize: 12, fontFamily: F }}>{stats.rupture} article(s) en rupture</div>}
          {stats.bas > 0 && <div style={{ color: C.orange, fontSize: 12, fontFamily: F }}>{stats.bas} article(s) sous le seuil minimum</div>}
        </div>
      )}

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px 8px' }}>
          <span style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F }}>Mouvements recents</span>
        </div>
        {loading && <div style={{ padding: '16px', color: C.textSub, fontSize: 13, fontFamily: F }}>Chargement...</div>}
        {!loading && mouvements.length === 0 && <div style={{ padding: '16px', color: C.textMuted, fontSize: 13, fontFamily: F }}>Aucun mouvement enregistre</div>}
        {mouvements.map((m, i) => {
          const meta = MOUV_META[m.type] || { label: m.type, color: C.textSub, bg: C.bg, signe: '' }
          return (
            <div key={m.id || i} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: F }}>{m.articles?.designation || m.reference_document}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{meta.label} · {new Date(m.date).toLocaleDateString('fr-FR')}</div>
              </div>
              <span style={{ background: meta.bg, color: meta.color, fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>
                {meta.signe}{m.quantite}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
