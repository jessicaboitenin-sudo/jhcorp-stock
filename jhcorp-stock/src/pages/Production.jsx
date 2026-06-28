import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F' }
const F = "'Montserrat', sans-serif"

function ProduitSearch({ produits, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const matches = query.length > 0 ? produits.filter(p => p.designation.toLowerCase().includes(query.toLowerCase())) : produits
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input value={query} placeholder="Rechercher un produit a fabriquer..." onChange={ev => { setQuery(ev.target.value); onSelect(null) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: 42, left: 0, right: 0, background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 9, boxShadow: '0 4px 14px rgba(26,22,48,0.1)', zIndex: 20, maxHeight: 180, overflowY: 'auto' }}>
          {matches.map(p => (
            <div key={p.id} onClick={() => { setQuery(p.designation); onSelect(p) }} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, fontFamily: F }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{p.designation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Production() {
  const [produitsAvecRecette, setProduitsAvecRecette] = useState([])
  const [lignes, setLignes] = useState([{ produit: null, qte: '', casse: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [historique, setHistorique] = useState([])

  async function load() {
    const { data: recs } = await supabase.from('recettes').select('article_id').limit(100)
    if (recs) {
      const ids = [...new Set(recs.map(r => r.article_id))]
      const { data: arts } = await supabase.from('articles').select('*').in('id', ids)
      if (arts) setProduitsAvecRecette(arts)
    }
    const { data: prods } = await supabase.from('productions').select('*, articles(designation,unite)').order('created_at', { ascending: false }).limit(10)
    if (prods) setHistorique(prods)
  }

  useEffect(() => { load() }, [])

  function updateLigne(i, field, val) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  async function handleValider() {
    const lignesValides = lignes.filter(l => l.produit && l.qte && parseFloat(l.qte) > 0)
    if (lignesValides.length === 0) { setError('Ajoutez au moins une ligne valide'); return }
    setSaving(true); setError(null)
    for (const l of lignesValides) {
      const qteN = parseFloat(l.qte) || 0
      const casseN = parseFloat(l.casse) || 0
      const numero = `PR-${Date.now().toString().slice(-8)}`
      const { error: e1 } = await supabase.from('productions').insert({ numero, article_id: l.produit.id, quantite_produite: qteN, casses: casseN })
      if (e1) { setError(e1.message); setSaving(false); return }
      const { data: recetteLines } = await supabase.from('recettes').select('*, ingredient:articles!recettes_ingredient_id_fkey(id,designation,stock_actuel,unite)').eq('article_id', l.produit.id)
      if (recetteLines) {
        for (const ri of recetteLines) {
          const ded = Math.round((qteN + casseN) * ri.quantite_par_unite * 100) / 100
          await supabase.from('articles').update({ stock_actuel: Math.max(0, ri.ingredient.stock_actuel - ded) }).eq('id', ri.ingredient_id)
          await supabase.from('mouvements_stock').insert({ article_id: ri.ingredient_id, type: 'sortie_production', quantite: ded, reference_document: numero })
        }
      }
      const { data: produitActuel } = await supabase.from('articles').select('stock_actuel').eq('id', l.produit.id).single()
      await supabase.from('articles').update({ stock_actuel: (produitActuel?.stock_actuel || 0) + qteN }).eq('id', l.produit.id)
      await supabase.from('mouvements_stock').insert({ article_id: l.produit.id, type: 'entree', quantite: qteN, reference_document: numero })
    }
    setSaving(false)
    setSuccess(`${lignesValides.reduce((s, l) => s + parseFloat(l.qte), 0)} produit(s) ajoutes au stock`)
    setLignes([{ produit: null, qte: '', casse: '' }]); load()
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Production</h1>
      {success && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ {success}</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: F }}>{error}</div>}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>Nouvelle production</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>PRODUIT</span>
          <span style={{ width: 90, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>QTE PRODUITE</span>
          <span style={{ width: 90, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>CASSES</span>
          <span style={{ width: 20 }} />
        </div>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <ProduitSearch produits={produitsAvecRecette} onSelect={p => updateLigne(i, 'produit', p)} />
            <input type="number" onWheel={ev => ev.target.blur()} min="0" placeholder="0" value={l.qte} onChange={ev => updateLigne(i, 'qte', ev.target.value)} style={{ width: 90, height: 38, border: `1.5px solid ${C.indigo}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
            <input type="number" onWheel={ev => ev.target.blur()} min="0" placeholder="0" value={l.casse} onChange={ev => updateLigne(i, 'casse', ev.target.value)} style={{ width: 90, height: 38, border: `1.5px solid ${C.orange}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
            <span onClick={() => setLignes(p => p.filter((_, idx) => idx !== i))} style={{ alignSelf: 'center', cursor: 'pointer', color: C.red, fontSize: 16 }}>✕</span>
          </div>
        ))}
        <div onClick={() => setLignes(p => [...p, { produit: null, qte: '', casse: '' }])} style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', marginBottom: 16 }}>+ Ajouter une ligne</div>
        <button onClick={handleValider} disabled={saving} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Enregistrement...' : 'Valider la production'}
        </button>
      </div>
      {historique.length > 0 && (
        <div>
          <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F, marginBottom: 10 }}>Historique des productions</div>
          {historique.map(p => (
            <div key={p.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: F }}>{p.articles?.designation}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{p.numero} · {new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: C.green, fontSize: 14, fontWeight: 800, fontFamily: F }}>+{p.quantite_produite} {p.articles?.unite}</div>
                {p.casses > 0 && <div style={{ color: C.orange, fontSize: 11, fontFamily: F }}>{p.casses} casse(s)</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
