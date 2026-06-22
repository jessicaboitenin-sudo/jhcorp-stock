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

const CATEGORIES = ['JH Traiteur', 'JH Frais', 'JH Epicerie', 'JH Boisson']
const UNITES = ['Unite', 'G', 'KG', 'Litre', 'ML', 'Barquette', 'Rouleau']

function stockStatus(a) {
  if (a.stock_actuel === 0) return { label: 'Rupture', color: C.red, bg: C.redLight }
  if (a.stock_actuel <= a.stock_minimum) return { label: 'Bas', color: C.orange, bg: C.orangeLight }
  return { label: 'OK', color: C.green, bg: C.greenLight }
}

function Vignette({ url, size = 48 }) {
  const [err, setErr] = useState(false)
  if (!url || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.45 }}>
        📦
      </div>
    )
  }
  return (
    <img src={url} alt="" onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.border}` }} />
  )
}

const inputStyle = { width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box', background: C.surface }
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }

function ArticleForm({ article, onClose, onSaved }) {
  const isEdit = !!article
  const [form, setForm] = useState(article || {
    reference: '', designation: '', categorie: 'JH Frais', unite: 'Unite',
    stock_minimum: 0, vendable_directement: false, utilise_en_recette: false, photo_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!form.reference.trim() || !form.designation.trim()) { setError('Reference et Designation sont obligatoires'); return }
    setSaving(true); setError(null)
    const payload = {
      reference: form.reference.trim(), designation: form.designation.trim(),
      categorie: form.categorie, unite: form.unite,
      stock_minimum: Number(form.stock_minimum) || 0,
      vendable_directement: form.vendable_directement,
      utilise_en_recette: form.utilise_en_recette,
      photo_url: form.photo_url?.trim() || null,
    }
    const result = isEdit
      ? await supabase.from('articles').update(payload).eq('id', article.id)
      : await supabase.from('articles').insert(payload)
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    onSaved()
  }

  return (
    <div style={{ background: 'rgba(26,22,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', borderRadius: 14 }}>
      <div style={{ background: C.surface, borderRadius: 16, padding: 24, width: 480, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: F, margin: 0 }}>{isEdit ? 'Modifier article' : 'Nouvel article'}</h3>
          <span style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }} onClick={onClose}>✕</span>
        </div>

        {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{error}</div>}

        {/* Apercu image */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: C.bg, borderRadius: 12, padding: '12px 14px' }}>
          <Vignette url={form.photo_url} size={60} />
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>URL de l'image</label>
            <input value={form.photo_url || ''} onChange={ev => setForm({ ...form, photo_url: ev.target.value })}
              placeholder="https://exemple.com/image.jpg" style={{ ...inputStyle }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Reference *</label>
            <input value={form.reference} onChange={ev => setForm({ ...form, reference: ev.target.value })} placeholder="ex: ANANAS-001" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Categorie</label>
            <select value={form.categorie} onChange={ev => setForm({ ...form, categorie: ev.target.value })} style={selectStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Designation *</label>
          <input value={form.designation} onChange={ev => setForm({ ...form, designation: ev.target.value })} placeholder="ex: Ananas Entier Pain de Sucre" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Unite</label>
            <select value={form.unite} onChange={ev => setForm({ ...form, unite: ev.target.value })} style={selectStyle}>
              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock minimum</label>
            <input type="number" min="0" value={form.stock_minimum} onChange={ev => setForm({ ...form, stock_minimum: ev.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={{ background: C.indigoLight, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: C.indigo, fontFamily: F, lineHeight: 1.5 }}>
          ℹ️ Un article peut etre Vendable ET Ingredient en meme temps (ex: Ananas vendu entier ET utilise en Salade de fruits)
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.vendable_directement} onChange={ev => setForm({ ...form, vendable_directement: ev.target.checked })} />
            Vendable directement
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.utilise_en_recette} onChange={ev => setForm({ ...form, utilise_en_recette: ev.target.checked })} />
            Utilise en recette
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 12, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 12, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Creer'}
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
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('articles').select('*').order('designation')
    if (error) setError(error.message)
    else setArticles(data)
    setLoading(false)
  }

  useEffect(() => { loadArticles() }, [])

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
    return <ArticleForm article={editing} onClose={() => { setEditing(null); setCreating(false) }} onSaved={() => { setEditing(null); setCreating(false); loadArticles() }} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Articles</h1>
        <button onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouveau</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Rechercher..." value={search} onChange={ev => setSearch(ev.target.value)}
          style={{ flex: 1, minWidth: 200, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '0 14px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
        {filtres.map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{
            border: `1.5px solid ${filtre === f.id ? C.indigo : C.border2}`, borderRadius: 10, padding: '8px 16px',
            background: filtre === f.id ? C.indigo : C.surface, color: filtre === f.id ? '#fff' : C.text,
            fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{f.label}</button>
        ))}
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '12px 16px', fontFamily: F, fontSize: 13 }}>Erreur : {error}</div>}
      {!loading && !error && liste.length === 0 && (
        <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun article. Cliquez sur "+ Nouveau" pour en creer un.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {liste.map(a => {
          const status = stockStatus(a)
          return (
            <div key={a.id} onClick={() => setEditing(a)}
              style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Vignette url={a.photo_url} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F, lineHeight: 1.3 }}>{a.designation}</div>
                </div>
                <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F, marginBottom: 6 }}>{a.reference} · {a.categorie}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {a.vendable_directement && <span style={{ background: C.blueLight, color: C.blue, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: F }}>Vendable</span>}
                  {a.utilise_en_recette && <span style={{ background: C.indigoLight, color: C.indigo, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: F }}>Ingredient</span>}
                  <span style={{ background: status.bg, color: status.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: F }}>{status.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 9, fontFamily: F }}>STOCK</div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 800, fontFamily: F }}>{a.stock_actuel} {a.unite}</div>
                  </div>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 9, fontFamily: F }}>MIN</div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 800, fontFamily: F }}>{a.stock_minimum} {a.unite}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
