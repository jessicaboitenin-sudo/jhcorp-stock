import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8' }
const F = "'Montserrat', sans-serif"

const MOUV_META = {
  entree:               { label: 'Entrée',      color: C.green,  bg: C.greenLight,  signe: '+', icon: '⬇️' },
  sortie_manuelle:      { label: 'Sortie',       color: C.red,    bg: C.redLight,    signe: '-', icon: '⬆️' },
  ajustement_inventaire:{ label: 'Ajustement',   color: C.indigo, bg: C.indigoLight, signe: '±', icon: '↕️' },
  sortie_production:    { label: 'Prod.',         color: C.orange, bg: C.orangeLight, signe: '-', icon: '⚙️' },
  sortie_bl:            { label: 'BL',            color: C.red,    bg: C.redLight,    signe: '-', icon: '🚚' },
  casse_bl:             { label: 'Casse',         color: C.orange, bg: C.orangeLight, signe: '-', icon: '💥' },
}

function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

export default function Historique() {
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFiltre, setTypeFiltre] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  async function load() {
    setLoading(true)
    let query = supabase.from('mouvements_stock')
      .select('*, articles(designation, unite, reference)')
      .order('date', { ascending: false })
      .limit(200)
    if (typeFiltre) query = query.eq('type', typeFiltre)
    if (dateDebut) query = query.gte('date', dateDebut)
    if (dateFin) query = query.lte('date', dateFin + 'T23:59:59')
    const { data } = await query
    if (data) setMouvements(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFiltre, dateDebut, dateFin])

  const filtre = mouvements.filter(m =>
    !search || (m.articles?.designation || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.articles?.reference || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.reference_document || '').toLowerCase().includes(search.toLowerCase())
  )

  function exportCSV() {
    const lignes = filtre.map(m => [
      new Date(m.date).toLocaleDateString('fr-FR'),
      m.articles?.reference || '',
      `"${m.articles?.designation || ''}"`,
      MOUV_META[m.type]?.label || m.type,
      (MOUV_META[m.type]?.signe === '-' ? '-' : '') + m.quantite,
      m.articles?.unite || '',
      m.prix_unitaire || '',
      `"${m.reference_document || ''}"`,
      `"${m.note || ''}"`,
    ])
    const header = ['Date','Référence','Désignation','Type','Quantité','Unité','Prix unitaire','Motif','Note']
    const csv = [header, ...lignes].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'historique_mouvements.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Historique</h1>
        <button onClick={exportCSV} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '9px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          📥 Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
          <input placeholder="Rechercher article, motif..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
          <select value={typeFiltre} onChange={e => setTypeFiltre(e.target.value)}
            style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12, cursor: 'pointer' }}>
            <option value="">Tous les types</option>
            {Object.entries(MOUV_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
            style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
        </div>
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {!loading && filtre.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun mouvement</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtre.map((m, i) => {
          const meta = MOUV_META[m.type] || { label: m.type, color: C.textSub, bg: C.bg, signe: '', icon: '•' }
          const isEntree = meta.signe === '+'
          return (
            <div key={m.id || i} style={{ background: C.surface, borderRadius: 12, padding: '12px 16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {meta.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: F }}>{m.articles?.designation || '—'}</span>
                  <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: F }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 11, color: C.textSub, fontFamily: F }}>
                  {m.articles?.reference} · {m.reference_document || '—'}
                  {m.note && <span style={{ color: C.textMuted }}> — {m.note}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: isEntree ? C.green : C.red, fontFamily: F }}>
                  {meta.signe}{m.quantite} {m.articles?.unite}
                </div>
                {m.prix_unitaire && (
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{fmt(m.prix_unitaire)} FCFA/u</div>
                )}
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>
                  {new Date(m.date).toLocaleDateString('fr-FR')} {new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
