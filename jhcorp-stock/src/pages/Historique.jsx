import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8', blue: '#2554A8', blueLight: '#EBF2FB' }
const F = "'Montserrat', sans-serif"

const MOUV_META = {
  entree: { label: 'Entree', color: C.green, bg: C.greenLight, signe: '+' },
  sortie_production: { label: 'Sortie prod', color: C.red, bg: C.redLight, signe: '-' },
  sortie_bl: { label: 'Sortie BL', color: C.red, bg: C.redLight, signe: '-' },
  casse_bl: { label: 'Casse BL', color: C.orange, bg: C.orangeLight, signe: '-' },
  ajustement_inventaire: { label: 'Ajustement', color: C.indigo, bg: C.indigoLight, signe: '±' },
}

export default function Historique() {
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFiltre, setTypeFiltre] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  async function load() {
    setLoading(true)
    let query = supabase.from('mouvements_stock').select('*, articles(designation,unite)').order('date', { ascending: false }).limit(100)
    if (typeFiltre) query = query.eq('type', typeFiltre)
    if (dateDebut) query = query.gte('date', dateDebut)
    if (dateFin) query = query.lte('date', dateFin + 'T23:59:59')
    const { data } = await query
    if (data) setMouvements(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [typeFiltre, dateDebut, dateFin])

  const filtre = mouvements.filter(m => !search || (m.articles?.designation || '').toLowerCase().includes(search.toLowerCase()) || (m.reference_document || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Historique</h1>
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
          <input placeholder="Rechercher..." value={search} onChange={ev => setSearch(ev.target.value)} style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
          <select value={typeFiltre} onChange={ev => setTypeFiltre(ev.target.value)} style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }}>
            <option value="">Tous les types</option>
            {Object.entries(MOUV_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" value={dateDebut} onChange={ev => setDateDebut(ev.target.value)} style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
          <input type="date" value={dateFin} onChange={ev => setDateFin(ev.target.value)} style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
        </div>
      </div>
      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {!loading && filtre.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun mouvement</div>}
      {filtre.map((m, i) => {
        const meta = MOUV_META[m.type] || { label: m.type, color: C.textSub, bg: C.bg, signe: '' }
        return (
          <div key={m.id || i} style={{ background: meta.bg, borderRadius: 12, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{meta.signe === '+' ? '⬇️' : meta.signe === '-' ? '⬆️' : '↕️'}</span>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: F }}>{m.articles?.designation || '—'}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{m.reference_document} · {new Date(m.date).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: meta.color, fontSize: 14, fontWeight: 900, fontFamily: F }}>{meta.signe}{m.quantite} {m.articles?.unite || ''}</div>
              <div style={{ color: C.textSub, fontSize: 10, fontFamily: F }}>{meta.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
