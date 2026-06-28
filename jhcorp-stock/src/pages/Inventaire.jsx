import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8' }
const F = "'Montserrat', sans-serif"
const CATEGORIES = ['Toutes', 'JH Traiteur', 'JH Frais', 'JH Epicerie', 'JH Boisson']

export default function Inventaire() {
  const [onglet, setOnglet] = useState('inventaire') // 'inventaire' | 'ajustement'
  const [articles, setArticles] = useState([])
  const [inventaires, setInventaires] = useState([])
  const [comptes, setComptes] = useState({})
  const [categorie, setCategorie] = useState('Toutes')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [actif, setActif] = useState(false)

  // Ajustement (casses)
  const [ajustements, setAjustements] = useState([{ article: null, qte: '', motif: '' }])
  const [searchAj, setSearchAj] = useState([''])
  const [openAj, setOpenAj] = useState([false])
  const [savingAj, setSavingAj] = useState(false)
  const [successAj, setSuccessAj] = useState(null)

  async function load() {
    setLoading(true)
    const { data: arts } = await supabase.from('articles').select('*').order('designation')
    const { data: invs } = await supabase.from('inventaires').select('*, lignes_inventaire(*, articles(designation,unite))').order('created_at', { ascending: false }).limit(10)
    if (arts) setArticles(arts)
    if (invs) setInventaires(invs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const articlesFiltres = articles.filter(a => categorie === 'Toutes' || a.categorie === categorie)

  async function handleSoumettre() {
    setSaving(true)
    const numero = `INV-${Date.now().toString().slice(-8)}`
    const { data: inv, error } = await supabase.from('inventaires').insert({ numero, statut: 'soumis' }).select().single()
    if (error) { setSaving(false); return }
    const rows = articlesFiltres.map(a => ({
      inventaire_id: inv.id, article_id: a.id,
      stock_theorique: a.stock_actuel,
      stock_compte: comptes[a.id] !== undefined && comptes[a.id] !== '' ? parseFloat(comptes[a.id]) : null
    }))
    await supabase.from('lignes_inventaire').insert(rows)
    setSaving(false)
    setSuccess(`Inventaire ${numero} soumis — en attente de validation du comptable`)
    setComptes({}); setActif(false); load()
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleValider(invId) {
    const { data: inv } = await supabase.from('inventaires').select('*, lignes_inventaire(*, articles(id,stock_actuel))').eq('id', invId).single()
    if (!inv) return
    for (const l of inv.lignes_inventaire) {
      if (l.stock_compte !== null) {
        await supabase.from('articles').update({ stock_actuel: l.stock_compte }).eq('id', l.article_id)
        const ecart = l.stock_compte - l.stock_theorique
        if (ecart !== 0) {
          await supabase.from('mouvements_stock').insert({ article_id: l.article_id, type: 'ajustement_inventaire', quantite: Math.abs(ecart), reference_document: inv.numero })
        }
      }
    }
    await supabase.from('inventaires').update({ statut: 'valide' }).eq('id', invId)
    load()
  }

  // Ajustements manuels (casses)
  function updateAj(i, field, val) {
    setAjustements(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }

  async function handleAjustement() {
    const lignesValides = ajustements.filter(a => a.article && a.qte && parseFloat(a.qte) > 0)
    if (lignesValides.length === 0) return
    setSavingAj(true)
    const ref = `AJ-${Date.now().toString().slice(-8)}`
    for (const l of lignesValides) {
      const qte = parseFloat(l.qte)
      await supabase.from('articles').update({ stock_actuel: Math.max(0, l.article.stock_actuel - qte) }).eq('id', l.article.id)
      await supabase.from('mouvements_stock').insert({ article_id: l.article.id, type: 'ajustement_inventaire', quantite: qte, reference_document: ref })
    }
    setSavingAj(false)
    setSuccessAj(`${lignesValides.length} ajustement(s) enregistre(s)`)
    setAjustements([{ article: null, qte: '', motif: '' }])
    setSearchAj(['']); setOpenAj([false])
    load(); setTimeout(() => setSuccessAj(null), 3000)
  }

  const STATUT = { brouillon: { label: 'Brouillon', color: C.textSub }, soumis: { label: 'Soumis', color: C.orange }, valide: { label: 'Valide', color: C.green } }

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Inventaire</h1>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ id: 'inventaire', label: '📋 Inventaire' }, { id: 'ajustement', label: '⚠️ Ajustement de stock' }].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)} style={{
            border: `1.5px solid ${onglet === o.id ? C.indigo : C.border2}`, borderRadius: 10, padding: '9px 18px',
            background: onglet === o.id ? C.indigo : C.surface, color: onglet === o.id ? '#fff' : C.text,
            fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>{o.label}</button>
        ))}
      </div>

      {/* ===== ONGLET INVENTAIRE ===== */}
      {onglet === 'inventaire' && (
        <div>
          {success && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ {success}</div>}

          {!actif && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginBottom: 12 }}>Lancer un inventaire par categorie :</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setCategorie(cat); setActif(true); setComptes({}) }} style={{
                    border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '10px 18px',
                    background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                  }}>
                    {cat === 'Toutes' ? '📦 Tous les articles' : `📂 ${cat}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {actif && (
            <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F }}>Inventaire — {categorie}</div>
                  <div style={{ color: C.textSub, fontSize: 11, fontFamily: F, marginTop: 2 }}>{articlesFiltres.length} article(s)</div>
                </div>
                <button onClick={() => { setActif(false); setComptes({}) }} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '6px 12px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
              </div>

              <div style={{ padding: '0 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 60px', gap: 8, padding: '10px 0 6px', borderBottom: `1px solid ${C.border}` }}>
                  {['Article', 'Theorique', 'Compte', 'Ecart'].map(h => (
                    <span key={h} style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F, textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                {loading ? <div style={{ padding: 20, color: C.textSub, fontFamily: F }}>Chargement...</div> : articlesFiltres.map(a => {
                  const compte = comptes[a.id]
                  const ecart = compte !== undefined && compte !== '' ? parseFloat(compte) - a.stock_actuel : null
                  return (
                    <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 60px', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ color: C.text, fontSize: 12, fontWeight: 600, fontFamily: F }}>{a.designation}</div>
                        <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>{a.unite} · {a.categorie || '—'}</div>
                      </div>
                      <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>{a.stock_actuel}</span>
                      <input type="number" min="0" placeholder="—" value={comptes[a.id] ?? ''}
                        onChange={ev => setComptes(p => ({ ...p, [a.id]: ev.target.value }))}
                        onWheel={ev => ev.target.blur()}
                        style={{ width: '100%', height: 34, border: `1.5px solid ${comptes[a.id] !== undefined ? C.indigo : C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, boxSizing: 'border-box' }} />
                      <span style={{ fontSize: 12, fontWeight: 800, fontFamily: F, color: ecart === null ? C.textMuted : ecart === 0 ? C.green : C.red }}>
                        {ecart === null ? '—' : ecart > 0 ? `+${ecart}` : ecart}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: 16 }}>
                <button onClick={handleSoumettre} disabled={saving} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Soumission...' : 'Soumettre au comptable'}
                </button>
              </div>
            </div>
          )}

          <div style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F, marginBottom: 10 }}>Historique des inventaires</div>
          {inventaires.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 30 }}>Aucun inventaire</div>}
          {inventaires.map(inv => {
            const meta = STATUT[inv.statut] || STATUT.brouillon
            return (
              <div key={inv.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 18px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.indigo, fontSize: 13, fontWeight: 700, fontFamily: F }}>{inv.numero}</span>
                    <span style={{ color: meta.color, fontSize: 11, fontWeight: 700, fontFamily: F }}>● {meta.label}</span>
                  </div>
                  <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{new Date(inv.created_at).toLocaleDateString('fr-FR')} · {inv.lignes_inventaire?.length} article(s)</div>
                </div>
                {inv.statut === 'soumis' && (
                  <button onClick={() => handleValider(inv.id)} style={{ border: 'none', borderRadius: 9, padding: '8px 14px', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    ✅ Valider (comptable)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== ONGLET AJUSTEMENT ===== */}
      {onglet === 'ajustement' && (
        <div>
          <div style={{ background: C.orangeLight, border: `1.5px solid ${C.orange}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 12, color: C.orange, fontFamily: F, lineHeight: 1.6 }}>
            ⚠️ L'ajustement de stock sert a sortir des articles casses, perdus ou detruits. Ces quantites seront deduites du stock de facon permanente et tracees dans l'historique.
          </div>

          {successAj && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ {successAj}</div>}

          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>Articles a ajuster</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 2, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>ARTICLE</span>
              <span style={{ width: 100, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>QTE A SORTIR</span>
              <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>MOTIF</span>
              <span style={{ width: 20 }} />
            </div>
            {ajustements.map((aj, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <input value={searchAj[i] || ''} placeholder="Rechercher un article..."
                    onChange={ev => {
                      const s = [...searchAj]; s[i] = ev.target.value; setSearchAj(s)
                      updateAj(i, 'article', null)
                      const o = [...openAj]; o[i] = true; setOpenAj(o)
                    }}
                    onFocus={() => { const o = [...openAj]; o[i] = true; setOpenAj(o) }}
                    onBlur={() => setTimeout(() => { const o = [...openAj]; o[i] = false; setOpenAj(o) }, 150)}
                    style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
                  {openAj[i] && searchAj[i] && (
                    <div style={{ position: 'absolute', top: 42, left: 0, right: 0, background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 9, boxShadow: '0 4px 14px rgba(26,22,48,0.1)', zIndex: 20, maxHeight: 160, overflowY: 'auto' }}>
                      {articles.filter(a => a.designation.toLowerCase().includes(searchAj[i].toLowerCase())).map(a => (
                        <div key={a.id} onClick={() => {
                          const s = [...searchAj]; s[i] = a.designation; setSearchAj(s)
                          updateAj(i, 'article', a)
                          const o = [...openAj]; o[i] = false; setOpenAj(o)
                        }} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, fontFamily: F, fontSize: 12 }}>
                          <div style={{ color: C.text, fontWeight: 700 }}>{a.designation}</div>
                          <div style={{ color: C.textMuted, fontSize: 10 }}>Stock actuel : {a.stock_actuel} {a.unite}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" min="0" placeholder="0" value={aj.qte}
                  onChange={ev => updateAj(i, 'qte', ev.target.value)}
                  onWheel={ev => ev.target.blur()}
                  style={{ width: 100, height: 38, border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
                <input placeholder="Casse, perte..." value={aj.motif} onChange={ev => updateAj(i, 'motif', ev.target.value)}
                  style={{ flex: 1, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
                <span onClick={() => {
                  setAjustements(p => p.filter((_, idx) => idx !== i))
                  setSearchAj(p => p.filter((_, idx) => idx !== i))
                  setOpenAj(p => p.filter((_, idx) => idx !== i))
                }} style={{ cursor: 'pointer', color: C.red }}>✕</span>
              </div>
            ))}
            <div onClick={() => { setAjustements(p => [...p, { article: null, qte: '', motif: '' }]); setSearchAj(p => [...p, '']); setOpenAj(p => [...p, false]) }}
              style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', marginBottom: 16 }}>+ Ajouter une ligne</div>
            <button onClick={handleAjustement} disabled={savingAj}
              style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.orange, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: savingAj ? 'default' : 'pointer', opacity: savingAj ? 0.6 : 1 }}>
              {savingAj ? 'Enregistrement...' : 'Valider les ajustements'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
