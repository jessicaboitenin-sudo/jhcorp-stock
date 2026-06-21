import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  green: '#2A7A50', greenLight: '#E6F4ED',
  orange: '#C2610F', orangeLight: '#FDF0E8',
  red: '#B5273A', redLight: '#FDECEA',
  blue: '#2554A8', blueLight: '#EBF2FB',
}
const F = "'Montserrat', sans-serif"

function stockStatus(article) {
  if (article.stock_actuel === 0) return { label: 'Rupture', color: C.red, bg: C.redLight }
  if (article.stock_actuel <= article.stock_minimum) return { label: 'Bas', color: C.orange, bg: C.orangeLight }
  return { label: 'OK', color: C.green, bg: C.greenLight }
}

function ArticleForm({ article, onClose, onSaved }) {
  const isEdit = !!article
  const [form, setForm] = useState(article || {
    reference: '', designation: '', categorie: '', unite: 'unite',
    stock_minimum: 0, vendable_directement: false, utilise_en_recette: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      reference: form.reference,
      designation: form.designation,
      categorie: form.categorie,
      unite: form.unite,
      stock_minimum: Number(form.stock_minimum) || 0,
      vendable_directement: form.vendable_directement,
      utilise_en_recette: form.utilise_en_recette,
    }
    let result
    if (isEdit) {
      result = await supabase.from('articles').update(payload).eq('id', article.id)
    } else {
      result = await supabase.from('articles').insert(payload)
    }
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    onSaved()
  }

  return (
    <div style={{ position: 'relative', minHeight: 500, background: 'rgba(26,22,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 24, width: 440, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: F, margin: 0 }}>
            {isEdit ? 'Modifier article' : 'Nouvel article'}
          </h3>
          <span style={{ cursor: 'pointer', color: C.textSub }} onClick={onClose}>✕</span>
        </div>

        {error && (
          <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Reference *</label>
            <input value={form.reference} onChange={ev => setForm({ ...form, reference: ev.target.value })}
              style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Categorie</label>
            <input value={form.categorie || ''} onChange={ev => setForm({ ...form, categorie: ev.target.value })}
              style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Designation *</label>
          <input value={form.designation} onChange={ev => setForm({ ...form, designation: ev.target.value })}
            style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Unite</label>
            <input value={form.unite} onChange={ev => setForm({ ...form, unite: ev.target.value })}
              style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Stock minimum</label>
            <input type="number" value={form.stock_minimum} onChange={ev => setForm({ ...form, stock_minimum: ev.target.value })}
              style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.vendable_directement} onChange={ev => setForm({ ...form, vendable_directement: ev.target.checked })} />
            Vendable directement
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.utilise_en_recette} onChange={ev => setForm({ ...form, utilise_en_recette: ev.target.checked })} />
            Utilise en recette
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '10px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || !form.reference || !form.designation}
            style={{ flex: 1, border: 'none', borderRadius: 10, padding: '10px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Creer')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtre, setFiltre] = useState('tous')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  async function loadArticles() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('articles').select('*').order('designation')
    if (error) {
      setError(error.message)
    } else {
      setArticles(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadArticles()
  }, [])

  const filtres = [
    { id: 'tous', label: 'Tous' },
    { id: 'vendable_directement', label: 'Vendables' },
    { id: 'utilise_en_recette', label: 'Ingredients' },
  ]

  const liste = articles.filter(a => {
    const matchFiltre = filtre === 'tous' || a[filtre]
    const matchSearch = a.designation.toLowerCase().includes(search.toLowerCase()) || a.reference.toLowerCase().includes(search.toLowerCase())
    return matchFiltre && matchSearch
  })

  if (editing || creating) {
    return (
      <ArticleForm
        article={editing}
        onClose={() => { setEditing(null); setCreating(false) }}
        onSaved={() => { setEditing(null); setCreating(false); loadArticles() }}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Articles</h1>
        <button onClick={() => setCreating(true)}
          style={{ border: 'none', borderRadius: 10, padding: '10px 16px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Nouveau
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Rechercher..." value={search} onChange={ev => setSearch(ev.target.value)}
          style={{ flex: 1, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '0 14px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
        {filtres.map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)}
            style={{
              border: `1.5px solid ${filtre === f.id ? C.indigo : C.border2}`, borderRadius: 10, padding: '10px 16px',
              background: filtre === f.id ? C.indigo : C.surface, color: filtre === f.id ? '#fff' : C.text,
              fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}

      {error && (
        <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '12px 16px', fontFamily: F, fontSize: 13 }}>
          Erreur de connexion a Supabase : {error}
        </div>
      )}

      {!loading && !error && liste.length === 0 && (
        <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 30 }}>
          Aucun article. Cliquez sur "+ Nouveau" pour en creer un.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {liste.map(a => {
          const status = stockStatus(a)
          return (
            <div key={a.id} onClick={() => setEditing(a)}
              style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14, fontFamily: F }}>{a.designation}</div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F, marginTop: 2 }}>{a.reference}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                {a.vendable_directement && <span style={{ background: C.blueLight, color: C.blue, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>Vendable</span>}
                {a.utilise_en_recette && <span style={{ background: C.indigoLight, color: C.indigo, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>Ingredient</span>}
                <span style={{ background: status.bg, color: status.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>{status.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Stock</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 800, fontFamily: F }}>{a.stock_actuel} {a.unite}</div>
                </div>
                <div>
                  <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Min</div>
                  <div style={{ color: C.text, fontSize: 15, fontWeight: 800, fontFamily: F }}>{a.stock_minimum} {a.unite}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
