import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  green: '#2A7A50', greenLight: '#E6F4ED',
  red: '#B5273A', redLight: '#FDECEA',
}
const F = "'Montserrat', sans-serif"

function NouvelleRecetteModal({ articles, onClose, onSaved }) {
  const [produitId, setProduitId] = useState('')
  const [lignes, setLignes] = useState([{ ingredient_id: '', quantite_par_unite: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const produitsVendables = articles.filter(a => a.vendable_directement)
  const ingredients = articles.filter(a => a.utilise_en_recette)

  function updateLigne(i, field, val) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  async function handleSave() {
    if (!produitId) { setError('Choisissez un produit'); return }
    const lignesValides = lignes.filter(l => l.ingredient_id && l.quantite_par_unite)
    if (lignesValides.length === 0) { setError('Ajoutez au moins un ingredient'); return }
    setSaving(true)
    setError(null)
    const rows = lignesValides.map(l => ({
      article_id: produitId,
      ingredient_id: l.ingredient_id,
      quantite_par_unite: parseFloat(l.quantite_par_unite),
    }))
    const { error } = await supabase.from('recettes').insert(rows)
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <div style={{ background: 'rgba(26,22,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', borderRadius: 14 }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 24, width: 500, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 800, fontFamily: F, margin: 0 }}>Nouvelle recette</h3>
          <span style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Produit a fabriquer *</label>
          <select value={produitId} onChange={ev => setProduitId(ev.target.value)}
            style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}>
            <option value="">Choisir un produit vendable...</option>
            {produitsVendables.map(a => <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>)}
          </select>
        </div>
        <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, fontFamily: F, marginBottom: 8 }}>INGREDIENTS</div>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select value={l.ingredient_id} onChange={ev => updateLigne(i, 'ingredient_id', ev.target.value)}
              style={{ flex: 1, height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12 }}>
              <option value="">Ingredient...</option>
              {ingredients.map(a => <option key={a.id} value={a.id}>{a.designation}</option>)}
            </select>
            <input type="number" placeholder="Qte/unite" value={l.quantite_par_unite} onChange={ev => updateLigne(i, 'quantite_par_unite', ev.target.value)}
              style={{ width: 90, height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12 }} />
            <span style={{ cursor: 'pointer', color: C.red, fontSize: 16 }} onClick={() => setLignes(prev => prev.filter((_, idx) => idx !== i))}>🗑</span>
          </div>
        ))}
        <div onClick={() => setLignes(prev => [...prev, { ingredient_id: '', quantite_par_unite: '' }])}
          style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', marginBottom: 18 }}>
          + Ajouter un ingredient
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 12, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 12, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : 'Creer la recette'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Recettes() {
  const [articles, setArticles] = useState([])
  const [recettes, setRecettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: arts }, { data: recs }] = await Promise.all([
      supabase.from('articles').select('*').order('designation'),
      supabase.from('recettes').select('*, article:article_id(id,designation,reference), ingredient:ingredient_id(id,designation,unite)'),
    ])
    if (arts) setArticles(arts)
    if (recs) {
      const grouped = recs.reduce((acc, r) => {
        const key = r.article_id
        if (!acc[key]) acc[key] = { article: r.article, lignes: [] }
        acc[key].lignes.push(r)
        return acc
      }, {})
      setRecettes(Object.values(grouped))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function supprimerLigne(id) {
    await supabase.from('recettes').delete().eq('id', id)
    load()
  }

  if (creating) return <NouvelleRecetteModal articles={articles} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Recettes</h1>
        <button onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouvelle recette</button>
      </div>
      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
      {!loading && recettes.length === 0 && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucune recette. Cliquez sur "+ Nouvelle recette" pour commencer.</div>}
      {recettes.map(r => (
        <div key={r.article.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 10, overflow: 'hidden' }}>
          <div onClick={() => setOpenId(openId === r.article.id ? null : r.article.id)}
            style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 14, fontFamily: F }}>{r.article.designation}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{r.lignes.length} ingredient(s)</div>
              </div>
            </div>
            <span style={{ color: C.textMuted, fontSize: 16 }}>{openId === r.article.id ? '▲' : '▼'}</span>
          </div>
          {openId === r.article.id && r.lignes.map(l => (
            <div key={l.id} style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: F }}>{l.ingredient.designation}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{l.quantite_par_unite} {l.ingredient.unite} par unite produite</div>
              </div>
              <span style={{ cursor: 'pointer', color: C.red, fontSize: 16 }} onClick={() => supprimerLigne(l.id)}>🗑</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
