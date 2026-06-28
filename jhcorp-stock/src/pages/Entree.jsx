import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F' }
const F = "'Montserrat', sans-serif"

function ArticleSearch({ articles, value, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const matches = query.length > 0 ? articles.filter(a => a.designation.toLowerCase().includes(query.toLowerCase()) || a.reference.toLowerCase().includes(query.toLowerCase())) : []
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input value={query} placeholder="Rechercher un article..." onChange={ev => { setQuery(ev.target.value); onSelect(null) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: 42, left: 0, right: 0, background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 9, boxShadow: '0 4px 14px rgba(26,22,48,0.1)', zIndex: 20, maxHeight: 180, overflowY: 'auto' }}>
          {matches.map(a => (
            <div key={a.id} onClick={() => { setQuery(a.designation); onSelect(a) }} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, fontFamily: F }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 12 }}>{a.designation}</div>
              <div style={{ color: C.textMuted, fontSize: 10 }}>{a.reference} · stock actuel {a.stock_actuel} {a.unite}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Entree() {
  const [articles, setArticles] = useState([])
  const [lignes, setLignes] = useState([{ article: null, qte: '' }])
  const [observations, setObservations] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [historique, setHistorique] = useState([])

  async function load() {
    const { data: arts } = await supabase.from('articles').select('*').order('designation')
    const { data: bons } = await supabase.from('bons_entree').select('*, lignes_bon_entree(*, articles(designation,unite))').order('created_at', { ascending: false }).limit(10)
    if (arts) setArticles(arts)
    if (bons) setHistorique(bons)
  }

  useEffect(() => { load() }, [])

  function updateLigne(i, field, val) {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  async function handleValider() {
    const lignesValides = lignes.filter(l => l.article && l.qte && parseFloat(l.qte) > 0)
    if (lignesValides.length === 0) { setError('Ajoutez au moins une ligne valide'); return }
    setSaving(true); setError(null)
    const numero = `BE-${Date.now().toString().slice(-8)}`
    const { data: bon, error: e1 } = await supabase.from('bons_entree').insert({ numero, observations, statut: 'valide' }).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }
    for (const l of lignesValides) {
      await supabase.from('lignes_bon_entree').insert({ bon_entree_id: bon.id, article_id: l.article.id, quantite: parseFloat(l.qte) })
      await supabase.from('articles').update({ stock_actuel: l.article.stock_actuel + parseFloat(l.qte) }).eq('id', l.article.id)
      await supabase.from('mouvements_stock').insert({ article_id: l.article.id, type: 'entree', quantite: parseFloat(l.qte), reference_document: numero })
    }
    setSaving(false); setSuccess(true); setLignes([{ article: null, qte: '' }]); setObservations(''); load()
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Bon d'entree</h1>
      {success && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ Bon d'entree enregistre, stock mis a jour</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: F }}>{error}</div>}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>Nouveau bon d'entree</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>ARTICLE</span>
          <span style={{ width: 90, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>QUANTITE</span>
          <span style={{ width: 20 }} />
        </div>
        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <ArticleSearch articles={articles} value={l.article?.designation || ''} onSelect={a => updateLigne(i, 'article', a)} />
            <input type="number" onWheel={ev => ev.target.blur()} min="0" placeholder="0" value={l.qte} onChange={ev => updateLigne(i, 'qte', ev.target.value)} style={{ width: 90, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
            <span onClick={() => setLignes(p => p.filter((_, idx) => idx !== i))} style={{ alignSelf: 'center', cursor: 'pointer', color: C.red, fontSize: 16 }}>✕</span>
          </div>
        ))}
        <div onClick={() => setLignes(p => [...p, { article: null, qte: '' }])} style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', marginBottom: 14 }}>+ Ajouter une ligne</div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Observations</label>
          <textarea value={observations} onChange={ev => setObservations(ev.target.value)} placeholder="Fournisseur, details..." rows={2} style={{ width: '100%', border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: 10, fontFamily: F, fontSize: 13, marginTop: 4, resize: 'none', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleValider} disabled={saving} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Enregistrement...' : 'Valider le bon d\'entree'}
        </button>
      </div>
      {historique.length > 0 && (
        <div>
          <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F, marginBottom: 10 }}>Historique</div>
          {historique.map(b => (
            <div key={b.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F }}>{b.numero}</span>
                <span style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{new Date(b.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {b.lignes_bon_entree?.map(l => (
                <div key={l.id} style={{ color: C.text, fontSize: 12, fontFamily: F }}>+{l.quantite} {l.articles?.unite} — {l.articles?.designation}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
