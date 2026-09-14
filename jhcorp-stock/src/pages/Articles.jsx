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
const inputStyle = { width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box', background: C.surface }
const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F, display: 'block', marginBottom: 4 }
function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

function stockStatus(a) {
  if (a.stock_actuel === 0) return { label: 'Rupture', color: C.red, bg: C.redLight }
  if (a.stock_actuel <= a.stock_minimum) return { label: 'Bas', color: C.orange, bg: C.orangeLight }
  return { label: 'OK', color: C.green, bg: C.greenLight }
}

function Vignette({ url, size = 48 }) {
  const [err, setErr] = useState(false)
  if (!url || err) return (
    <div style={{ width: size, height: size, borderRadius: 10, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.45 }}>📦</div>
  )
  return <img src={url} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.border}` }} />
}

// ─── Autocomplétion générique ─────────────────────────────────────────────
function Autocomplete({ value, articles, onSelect, onClear, placeholder }) {
  const [search, setSearch] = useState(value?.designation || '')
  const [open, setOpen] = useState(false)
  const filtered = search.length > 1
    ? articles.filter(a =>
        a.designation.toLowerCase().includes(search.toLowerCase()) ||
        a.reference.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onClear() }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder || 'Rechercher...'}
          style={{ ...inputStyle, height: 36 }}
        />
        {value && <button onClick={() => { setSearch(''); onClear() }} style={{ height: 36, width: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, background: C.surface, cursor: 'pointer', color: C.red }}>✕</button>}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: 40, left: 0, right: 0, background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 10, boxShadow: '0 4px 16px rgba(26,22,48,0.12)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
          {filtered.map(a => (
            <div key={a.id} onMouseDown={() => { setSearch(a.designation); setOpen(false); onSelect(a) }}
              style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F }}>{a.designation}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{a.reference}</div>
              </div>
              {a.prix_revient > 0 && <div style={{ fontSize: 11, color: C.indigo, fontWeight: 700, fontFamily: F }}>{fmt(Math.round(a.prix_revient))} F/{a.unite}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Panneau Dérivés MP ───────────────────────────────────────────────────
function PanneauDerivesMP({ article, allArticles, onClose }) {
  const [derives, setDerives] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const produitsJHC = allArticles.filter(a => a.reference?.startsWith('JHC'))

  useEffect(() => {
    supabase.from('mp_derives')
      .select('*, produit:produit_id(id, designation, reference, unite)')
      .eq('mp_id', article.id)
      .then(({ data }) => {
        if (data) setDerives(data.map(d => ({
          id: d.id,
          produit_id: d.produit_id,
          produit: d.produit,
          pourcentage_cout: d.pourcentage_cout || '',
          nb_unites_mp: d.nb_unites_mp || 1,
        })))
        setLoading(false)
      })
  }, [article.id])

  const prixMp = article.prix_revient || 0

  function calcCout(d) {
    const pct = parseFloat(d.pourcentage_cout) || 0
    const nb = parseFloat(d.nb_unites_mp) || 1
    return Math.round(prixMp * (pct / 100) * nb)
  }

  function addDerive() { setDerives(p => [...p, { id: null, produit_id: '', produit: null, pourcentage_cout: '', nb_unites_mp: 1 }]) }
  function removeDerive(i) { setDerives(p => p.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    setSaving(true); setError(null)
    const valides = derives.filter(d => d.produit_id)
    await supabase.from('mp_derives').delete().eq('mp_id', article.id)
    if (valides.length > 0) {
      const { error: e } = await supabase.from('mp_derives').insert(valides.map(d => ({
        mp_id: article.id,
        produit_id: d.produit_id,
        pourcentage_cout: parseFloat(d.pourcentage_cout) || 0,
        nb_unites_mp: parseFloat(d.nb_unites_mp) || 1,
      })))
      if (e) { setError(e.message); setSaving(false); return }
    }
    setSuccess(`✅ ${valides.length} produit(s) dérivé(s) sauvegardé(s)`)
    setSaving(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 560, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>Produits dérivés</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>{article.designation} · Prix actuel : {article.prix_revient > 0 ? fmt(Math.round(article.prix_revient)) + ' FCFA' : '—'}</div>
          <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F, marginTop: 4 }}>
            Coût/unité = Prix MP × % × Nb MP
          </div>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }}>✕</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
        {!loading && (
          <>
            {/* En-têtes */}
            {derives.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px', gap: 8, marginBottom: 6 }}>
                {['Produit fini', '% coût', 'Nb MP/u', 'Coût/unité'].map(h => (
                  <div key={h} style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>{h}</div>
                ))}
              </div>
            )}

            {derives.map((d, i) => {
              const cout = d.produit_id && d.pourcentage_cout ? calcCout(d) : null
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 80px 90px', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                  <Autocomplete
                    value={d.produit}
                    articles={produitsJHC.filter(a => !derives.some((dd, di) => di !== i && dd.produit_id === a.id))}
                    onSelect={a => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, produit_id: a.id, produit: a } : dd))}
                    onClear={() => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, produit_id: '', produit: null } : dd))}
                    placeholder="Rechercher produit JHC..."
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input type="number" min="0" max="100" step="0.5"
                      value={d.pourcentage_cout}
                      onChange={e => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, pourcentage_cout: e.target.value } : dd))}
                      onWheel={e => e.target.blur()}
                      placeholder="0"
                      style={{ width: '100%', height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 6px', fontFamily: F, fontSize: 12, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 11, color: C.textMuted }}>%</span>
                  </div>
                  <input type="number" min="0.1" step="0.25"
                    value={d.nb_unites_mp}
                    onChange={e => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, nb_unites_mp: e.target.value } : dd))}
                    onWheel={e => e.target.blur()}
                    placeholder="1"
                    style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, textAlign: 'right', width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cout ? C.green : C.textMuted, fontFamily: F }}>
                      {cout ? `${fmt(cout)} F` : '—'}
                    </span>
                    <span onClick={() => removeDerive(i)} style={{ cursor: 'pointer', color: C.red, fontSize: 16 }}>✕</span>
                  </div>
                </div>
              )
            })}

            <button onClick={addDerive} style={{ width: '100%', border: `1.5px dashed ${C.border2}`, borderRadius: 10, padding: '10px 0', background: 'transparent', color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
              + Ajouter un produit dérivé
            </button>

            {/* Résumé coûts */}
            {derives.filter(d => d.produit_id && d.pourcentage_cout).length > 0 && prixMp > 0 && (
              <div style={{ marginTop: 16, background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F, marginBottom: 8 }}>RÉSUMÉ DES COÛTS</div>
                {derives.filter(d => d.produit_id && d.pourcentage_cout).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: F, color: C.textSub, marginBottom: 4 }}>
                    <span>{d.produit?.designation} (×{d.nb_unites_mp} MP)</span>
                    <span style={{ fontWeight: 700, color: C.text }}>{fmt(calcCout(d))} F/unité</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
        {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontFamily: F }}>{error}</div>}
        {success && <div style={{ background: C.greenLight, color: C.green, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontFamily: F }}>{success}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

// ─── Panneau Composition JHC ──────────────────────────────────────────────
// Définit emballage + étiquette + prix de vente pour un produit fini JHC
function PanneauComposition({ article, allArticles, onClose, onSaved }) {
  const [lignes, setLignes] = useState([])
  const [prixVente, setPrixVente] = useState(article.prix_vente ? String(article.prix_vente) : '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const consommables = allArticles.filter(a => a.reference?.startsWith('CONSO') || a.reference?.startsWith('MP'))

  useEffect(() => {
    supabase.from('compositions')
      .select('*, composant:composant_id(id, designation, reference, unite, prix_revient)')
      .eq('article_id', article.id)
      .then(({ data }) => {
        if (data) setLignes(data.map(d => ({ id: d.id, composant_id: d.composant_id, composant: d.composant, quantite: d.quantite })))
        setLoading(false)
      })
  }, [article.id])

  const coutComposants = lignes.reduce((s, l) => s + ((l.composant?.prix_revient || 0) * (parseFloat(l.quantite) || 0)), 0)
  const prixR = article.prix_revient || 0
  const prixV = parseFloat(prixVente) || 0
  const marge = prixV - prixR
  const margeP = prixV > 0 ? Math.round((marge / prixV) * 100) : null

  function addLigne() { setLignes(p => [...p, { id: null, composant_id: '', composant: null, quantite: 1 }]) }
  function removeLigne(i) { setLignes(p => p.filter((_, idx) => idx !== i)) }

  async function handleSave() {
    setSaving(true)
    const valides = lignes.filter(l => l.composant_id && parseFloat(l.quantite) > 0)
    await supabase.from('compositions').delete().eq('article_id', article.id)
    if (valides.length > 0) {
      await supabase.from('compositions').insert(valides.map(l => ({
        article_id: article.id, composant_id: l.composant_id, quantite: parseFloat(l.quantite)
      })))
    }
    // Mettre à jour prix de vente + prix de revient (composants uniquement, le reste vient de la production)
    await supabase.from('articles').update({
      prix_vente: prixV || null,
      cout_composants: Math.round(coutComposants * 100) / 100,
    }).eq('id', article.id)
    setSaving(false)
    setSuccess('✅ Composition sauvegardée')
    setTimeout(() => { setSuccess(null); onSaved() }, 2000)
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 520, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>Composition & Prix</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>{article.designation}</div>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }}>✕</span>
      </div>

      {/* Résumé prix */}
      <div style={{ margin: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'COÛT MP (production)', val: prixR > 0 ? `${fmt(Math.round(prixR - coutComposants))} F` : '— F', color: C.indigo },
          { label: 'COÛT COMPOSANTS', val: `${fmt(Math.round(coutComposants))} F`, color: C.orange },
          { label: 'PRIX DE REVIENT TOTAL', val: `${fmt(Math.round(prixR))} F`, color: C.text },
        ].map(c => (
          <div key={c.label} style={{ background: C.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: c.color, fontFamily: F }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Marge */}
      {prixV > 0 && (
        <div style={{ margin: '10px 20px 0', background: marge >= 0 ? C.greenLight : C.redLight, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontFamily: F, color: C.text }}>Prix de vente : <strong>{fmt(prixV)} FCFA</strong></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: marge >= 0 ? C.green : C.red, fontFamily: F }}>Marge : {fmt(Math.round(marge))} F</div>
            {margeP !== null && <div style={{ fontSize: 11, color: marge >= 0 ? C.green : C.red, fontFamily: F }}>{margeP}%</div>}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {/* Prix de vente */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Prix de vente (FCFA)</label>
          <input type="number" min="0" value={prixVente} onChange={e => setPrixVente(e.target.value)}
            onWheel={e => e.target.blur()} placeholder="ex: 2500" style={inputStyle} />
        </div>

        {/* Composants */}
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, fontFamily: F, marginBottom: 10 }}>Emballage & Étiquettes</div>
        {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
        {!loading && lignes.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <Autocomplete
              value={l.composant}
              articles={consommables}
              onSelect={a => setLignes(p => p.map((ll, idx) => idx === i ? { ...ll, composant_id: a.id, composant: a } : ll))}
              onClear={() => setLignes(p => p.map((ll, idx) => idx === i ? { ...ll, composant_id: '', composant: null } : ll))}
              placeholder="Emballage ou étiquette..."
            />
            <input type="number" min="0.001" step="0.001" value={l.quantite}
              onChange={e => setLignes(p => p.map((ll, idx) => idx === i ? { ...ll, quantite: e.target.value } : ll))}
              onWheel={e => e.target.blur()}
              style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, textAlign: 'right' }}
            />
            <span onClick={() => removeLigne(i)} style={{ cursor: 'pointer', color: C.red, fontSize: 16, textAlign: 'center' }}>✕</span>
          </div>
        ))}
        {!loading && (
          <button onClick={addLigne} style={{ width: '100%', border: `1.5px dashed ${C.border2}`, borderRadius: 10, padding: '10px 0', background: 'transparent', color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
            + Ajouter emballage / étiquette
          </button>
        )}
      </div>

      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
        {success && <div style={{ background: C.greenLight, color: C.green, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, fontFamily: F }}>{success}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

// ─── Formulaire Article ───────────────────────────────────────────────────
function ArticleForm({ article, onClose, onSaved, onDelete, allArticles }) {
  const isEdit = !!article

  // Détecter le type/sous-type depuis la référence ou catégorie existante
  function detectType(a) {
    if (!a) return { niveau1: '', niveau2: '' }
    const ref = a.reference || ''
    const cat = a.categorie || ''
    if (ref.startsWith('MP') || cat === 'Matière première') return { niveau1: 'production', niveau2: 'Matière première' }
    if (ref.startsWith('CONSO') || cat === 'Consommable') return { niveau1: 'production', niveau2: 'Consommable' }
    if (ref.startsWith('JHF') || cat === 'JH Frais') return { niveau1: 'produit_fini', niveau2: 'JH Frais' }
    if (ref.startsWith('JHT') || cat === 'JH Traiteur') return { niveau1: 'produit_fini', niveau2: 'JH Traiteur' }
    if (ref.startsWith('JHB') || cat === 'JH Boisson') return { niveau1: 'produit_fini', niveau2: 'JH Boisson' }
    if (ref.startsWith('JHE') || cat === 'JH Epicerie') return { niveau1: 'produit_fini', niveau2: 'JH Epicerie' }
    return { niveau1: '', niveau2: '' }
  }

  const initType = detectType(article)
  const [niveau1, setNiveau1] = useState(initType.niveau1)
  const [niveau2, setNiveau2] = useState(initType.niveau2)
  const [genRef, setGenRef] = useState(article?.reference || '')
  const [form, setForm] = useState({
    reference: article?.reference || '',
    designation: article?.designation || '',
    unite: article?.unite || 'Unite',
    stock_minimum: article?.stock_minimum || 0,
    vendable_directement: article?.vendable_directement || false,
    utilise_en_recette: article?.utilise_en_recette || false,
    photo_url: article?.photo_url || '',
    prix_vente: article?.prix_vente || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [panneau, setPanneau] = useState(null)

  const isProduitFini = niveau1 === 'produit_fini'
  const isMP = niveau2 === 'Matière première'
  const isCONSO = niveau2 === 'Consommable'
  const sous = niveau1 ? Object.entries(TYPES[niveau1].sous) : []
  const prefix = niveau1 && niveau2 ? TYPES[niveau1].sous[niveau2]?.prefix : null

  // Générer référence auto quand niveau2 change
  useEffect(() => {
    if (isEdit || !prefix) return
    const existing = allArticles
      .map(a => a.reference || '')
      .filter(r => r.startsWith(prefix))
      .map(r => parseInt(r.replace(prefix, ''), 10))
      .filter(n => !isNaN(n))
    const max = existing.length > 0 ? Math.max(...existing) : 0
    const next = `${prefix}${String(max + 1).padStart(3, '0')}`
    setGenRef(next)
    setForm(f => ({ ...f, reference: next }))
  }, [niveau2, prefix, isEdit])

  function handleNiveau1(v) {
    setNiveau1(v)
    setNiveau2('')
    setGenRef('')
    setForm(f => ({ ...f, reference: '' }))
  }

  const prixRevient = article?.prix_revient || 0
  const prixVente = parseFloat(form.prix_vente) || 0
  const marge = prixVente - prixRevient
  const margeP = prixVente > 0 ? Math.round((marge / prixVente) * 100) : null

  async function handleSave() {
    if (!niveau1 || !niveau2) { setError('Sélectionnez le type de produit'); return }
    if (!form.reference.trim() || !form.designation.trim()) { setError('Référence et Désignation obligatoires'); return }
    setSaving(true); setError(null)
    const payload = {
      reference: form.reference.trim(),
      designation: form.designation.trim(),
      categorie: niveau2,
      unite: form.unite,
      stock_minimum: Number(form.stock_minimum) || 0,
      vendable_directement: isProduitFini,
      utilise_en_recette: isMP,
      photo_url: form.photo_url?.trim() || null,
      prix_vente: parseFloat(form.prix_vente) || null,
    }
    const result = isEdit
      ? await supabase.from('articles').update(payload).eq('id', article.id)
      : await supabase.from('articles').insert(payload)
    setSaving(false)
    if (result.error) { setError(result.error.message); return }
    onSaved()
  }

  return (
    <>
      <div style={{ background: 'rgba(26,22,48,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', borderRadius: 14 }}>
        <div style={{ background: C.surface, borderRadius: 16, padding: 24, width: 520, boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: F, margin: 0 }}>{isEdit ? 'Modifier article' : 'Nouvel article'}</h3>
            <span style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }} onClick={onClose}>✕</span>
          </div>

          {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{error}</div>}

          {/* NIVEAU 1 : Type de produit */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Type de produit *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(TYPES).map(([key, t]) => (
                <div key={key} onClick={() => handleNiveau1(key)}
                  style={{ border: `2px solid ${niveau1 === key ? C.indigo : C.border2}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', background: niveau1 === key ? C.indigoLight : C.surface }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: niveau1 === key ? C.indigo : C.text, fontFamily: F }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F, marginTop: 2 }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* NIVEAU 2 : Sous-catégorie */}
          {niveau1 && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Sous-catégorie *</label>
              <div style={{ display: 'grid', gridTemplateColumns: sous.length > 2 ? '1fr 1fr' : '1fr 1fr', gap: 8 }}>
                {sous.map(([key, s]) => (
                  <div key={key} onClick={() => setNiveau2(key)}
                    style={{ border: `2px solid ${niveau2 === key ? C.indigo : C.border2}`, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', background: niveau2 === key ? C.indigoLight : C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: niveau2 === key ? C.indigo : C.text, fontFamily: F }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{s.prefix}001, {s.prefix}002...</div>
                    </div>
                    {niveau2 === key && <span style={{ color: C.indigo, fontSize: 16 }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Référence auto-générée */}
          {niveau2 && (
            <div style={{ background: C.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔖</span>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>RÉFÉRENCE {isEdit ? 'ACTUELLE' : 'GÉNÉRÉE AUTO'}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.indigo, fontFamily: F }}>{form.reference || '...'}</div>
              </div>
            </div>
          )}

          {/* Image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, background: C.bg, borderRadius: 12, padding: '12px 14px' }}>
            <Vignette url={form.photo_url} size={56} />
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>URL de l'image</label>
              <input value={form.photo_url || ''} onChange={ev => setForm({ ...form, photo_url: ev.target.value })} placeholder="https://exemple.com/image.jpg" style={inputStyle} />
            </div>
          </div>

          {/* Désignation */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Désignation *</label>
            <input value={form.designation} onChange={ev => setForm({ ...form, designation: ev.target.value })} placeholder="ex: Cocktail Papaye & Pastèque 250g" style={inputStyle} />
          </div>

          {/* Unité + Stock min */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Unité</label>
              <select value={form.unite} onChange={ev => setForm({ ...form, unite: ev.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Stock minimum</label>
              <input type="number" min="0" value={form.stock_minimum} onChange={ev => setForm({ ...form, stock_minimum: ev.target.value })} onWheel={e => e.target.blur()} style={inputStyle} />
            </div>
          </div>

          {/* Prix de vente (produit fini uniquement) */}
          {isProduitFini && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Prix de vente (FCFA)</label>
              <input type="number" min="0" value={form.prix_vente || ''} onChange={ev => setForm({ ...form, prix_vente: ev.target.value })} onWheel={e => e.target.blur()} placeholder="ex: 2500" style={inputStyle} />
            </div>
          )}

          {/* Marge */}
          {isEdit && isProduitFini && prixRevient > 0 && prixVente > 0 && (
            <div style={{ background: marge >= 0 ? C.greenLight : C.redLight, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              {[
                { label: 'PRIX REVIENT', val: `${fmt(Math.round(prixRevient))} F`, color: C.text },
                { label: 'MARGE', val: `${fmt(Math.round(marge))} F`, color: marge >= 0 ? C.green : C.red },
                { label: 'MARGE %', val: `${margeP}%`, color: marge >= 0 ? C.green : C.red },
              ].map(c => (
                <div key={c.label}>
                  <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: c.color, fontFamily: F }}>{c.val}</div>
                </div>
              ))}
            </div>
          )}

          {/* Boutons panneaux */}
          {isEdit && (
            <div style={{ display: 'grid', gridTemplateColumns: isMP ? '1fr' : isProduitFini ? '1fr' : '1fr', gap: 8, marginBottom: 14 }}>
              {isMP && (
                <button onClick={() => setPanneau('derives')}
                  style={{ border: `1.5px solid ${C.green}`, borderRadius: 10, padding: '10px 0', background: C.greenLight, color: C.green, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  🌿 Produits dérivés
                </button>
              )}
              {isProduitFini && (
                <button onClick={() => setPanneau('composition')}
                  style={{ border: `1.5px solid ${C.indigo}`, borderRadius: 10, padding: '10px 0', background: C.indigoLight, color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  🧩 Emballage & Composition
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 12, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            {isEdit && (
              <button onClick={() => onDelete(article)} style={{ border: `1.5px solid ${C.red}`, borderRadius: 10, padding: 12, background: C.redLight, color: C.red, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑️</button>
            )}
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 12, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </div>

      {panneau && (
        <>
          <div onClick={() => setPanneau(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,22,48,0.2)', zIndex: 199 }} />
          {panneau === 'derives' && <PanneauDerivesMP article={article} allArticles={allArticles} onClose={() => setPanneau(null)} />}
          {panneau === 'composition' && <PanneauComposition article={article} allArticles={allArticles} onClose={() => setPanneau(null)} onSaved={() => { setPanneau(null); onSaved() }} />}
        </>
      )}
    </>
  )
}


// ─── Page Articles ────────────────────────────────────────────────────────
export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtre, setFiltre] = useState('tous')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadArticles() {
    setLoading(true); setError(null)
    const { data, error } = await supabase.from('articles').select('*').order('designation')
    if (error) setError(error.message)
    else setArticles(data)
    setLoading(false)
  }

  useEffect(() => { loadArticles() }, [])

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    await supabase.from('articles').delete().eq('id', toDelete.id)
    setDeleting(false)
    setToDelete(null)
    setEditing(null)
    loadArticles()
  }

  const filtres = [
    { id: 'tous', label: 'Tous' },
    { id: 'fini', label: 'Produits finis', match: a => ['JHF','JHT','JHB','JHE'].some(p => a.reference?.startsWith(p)) },
    { id: 'mp', label: 'MP', match: a => a.reference?.startsWith('MP') },
    { id: 'conso', label: 'CONSO', match: a => a.reference?.startsWith('CONSO') },
  ]

  const liste = articles.filter(a => {
    const f = filtres.find(f => f.id === filtre)
    const matchFiltre = filtre === 'tous' || (f?.match ? f.match(a) : true)
    const matchSearch = !search || a.designation.toLowerCase().includes(search.toLowerCase()) || a.reference.toLowerCase().includes(search.toLowerCase())
    const matchCategorie = !filtreCategorie || a.categorie === filtreCategorie
    return matchFiltre && matchSearch && matchCategorie
  })

  if (editing || creating) {
    return <ArticleForm article={editing} onClose={() => { setEditing(null); setCreating(false) }} onSaved={() => { setEditing(null); setCreating(false); loadArticles() }} onDelete={(a) => { setToDelete(a) }} allArticles={articles} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Articles</h1>
        <button onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouveau</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10, background: C.bg, paddingTop: 8, paddingBottom: 8 }}>
        <input placeholder="Rechercher..." value={search} onChange={ev => setSearch(ev.target.value)}
          style={{ flex: 1, minWidth: 200, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '0 14px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
        {filtres.map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{
            border: `1.5px solid ${filtre === f.id ? C.indigo : C.border2}`, borderRadius: 10, padding: '8px 14px',
            background: filtre === f.id ? C.indigo : C.surface, color: filtre === f.id ? '#fff' : C.text,
            fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{f.label}</button>
        ))}
        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
          style={{ height: 38, border: `1.5px solid ${filtreCategorie ? C.indigo : C.border2}`, borderRadius: 10, padding: '0 12px', fontFamily: F, fontSize: 12, cursor: 'pointer', background: filtreCategorie ? C.indigoLight : C.surface, color: filtreCategorie ? C.indigo : C.text, fontWeight: filtreCategorie ? 700 : 400 }}>
          <option value="">Toutes catégories</option>
          <optgroup label="Produits finis">
            {['JH Frais','JH Traiteur','JH Boisson','JH Epicerie'].map(c => <option key={c} value={c}>{c}</option>)}
          </optgroup>
          <optgroup label="Production">
            {['Matière première','Consommable'].map(c => <option key={c} value={c}>{c}</option>)}
          </optgroup>
        </select>
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '12px 16px', fontFamily: F, fontSize: 13 }}>Erreur : {error}</div>}
      {!loading && !error && liste.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun article trouvé.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {liste.map(a => {
          const status = stockStatus(a)
          const isJHC = ['JHF','JHT','JHB','JHE'].some(p => a.reference?.startsWith(p))
          const prixR = a.prix_revient || 0
          const prixV = a.prix_vente || 0
          const marge = prixV - prixR
          const margeP = prixV > 0 ? Math.round((marge / prixV) * 100) : null
          return (
            <div key={a.id} onClick={() => setEditing(a)}
              style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Vignette url={a.photo_url} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F, lineHeight: 1.3, marginBottom: 2 }}>{a.designation}</div>
                <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F, marginBottom: 6 }}>{a.reference} · {a.categorie}</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: status.bg, color: status.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: F }}>{status.label}</span>
                  {isJHC && margeP !== null && (
                    <span style={{ background: marge >= 0 ? C.greenLight : C.redLight, color: marge >= 0 ? C.green : C.red, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: F }}>
                      {fmt(Math.round(marge))} F · {margeP}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isJHC ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 9, fontFamily: F }}>STOCK</div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 800, fontFamily: F }}>{a.stock_actuel} {a.unite}</div>
                  </div>
                  <div>
                    <div style={{ color: C.textMuted, fontSize: 9, fontFamily: F }}>P. REVIENT</div>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 800, fontFamily: F }}>{prixR > 0 ? `${fmt(Math.round(prixR))} F` : '—'}</div>
                  </div>
                  {isJHC && (
                    <div>
                      <div style={{ color: C.textMuted, fontSize: 9, fontFamily: F }}>P. VENTE</div>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 800, fontFamily: F }}>{prixV > 0 ? `${fmt(prixV)} F` : '—'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Modale suppression */}
      {toDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,22,48,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, borderRadius: 16, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(26,22,48,0.2)', fontFamily: F }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 15, textAlign: 'center', marginBottom: 8 }}>Supprimer cet article ?</div>
            <div style={{ color: C.textSub, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              <strong>{toDelete.designation}</strong> sera supprimé définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setToDelete(null)} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 12, background: C.surface, color: C.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 12, background: C.red, color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
