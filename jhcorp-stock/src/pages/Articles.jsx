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
// Définit quels produits finis peuvent être issus de cette MP
function PanneauDerivesMP({ article, allArticles, onClose }) {
  const [derives, setDerives] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const produitsJHC = allArticles.filter(a => a.reference?.startsWith('JHC'))

  useEffect(() => {
    supabase.from('mp_derives')
      .select('*, produit:produit_id(id, designation, reference, unite)')
      .eq('mp_id', article.id)
      .then(({ data }) => {
        if (data) setDerives(data.map(d => ({ id: d.id, produit_id: d.produit_id, produit: d.produit })))
        setLoading(false)
      })
  }, [article.id])

  function addDerive() { setDerives(p => [...p, { id: null, produit_id: '', produit: null }]) }
  function removeDerive(i) { setDerives(p => p.filter((_, idx) => idx !== i)) }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('articles').delete().eq('id', article.id)
    setDeleting(false)
    if (error) { setError('Impossible de supprimer : ' + error.message); setConfirmDelete(false); return }
    onSaved()
  }

  async function handleSave() {
    setSaving(true)
    const valides = derives.filter(d => d.produit_id)
    await supabase.from('mp_derives').delete().eq('mp_id', article.id)
    if (valides.length > 0) {
      await supabase.from('mp_derives').insert(valides.map(d => ({ mp_id: article.id, produit_id: d.produit_id })))
    }
    setSuccess(`✅ ${valides.length} produit(s) dérivé(s) sauvegardé(s)`)
    setSaving(false)
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 500, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>Produits dérivés</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>{article.designation} ({article.reference})</div>
          <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F, marginTop: 4 }}>Définissez tous les produits finis qui peuvent être obtenus depuis cette MP</div>
        </div>
        <span onClick={onClose} style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }}>✕</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
        {!loading && (
          <>
            {derives.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Autocomplete
                    value={d.produit}
                    articles={produitsJHC.filter(a => !derives.some((dd, di) => di !== i && dd.produit_id === a.id))}
                    onSelect={a => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, produit_id: a.id, produit: a } : dd))}
                    onClear={() => setDerives(p => p.map((dd, idx) => idx === i ? { ...dd, produit_id: '', produit: null } : dd))}
                    placeholder="Rechercher un produit fini JHC..."
                  />
                </div>
                <span onClick={() => removeDerive(i)} style={{ cursor: 'pointer', color: C.red, fontSize: 16, flexShrink: 0 }}>✕</span>
              </div>
            ))}
            <button onClick={addDerive} style={{ width: '100%', border: `1.5px dashed ${C.border2}`, borderRadius: 10, padding: '10px 0', background: 'transparent', color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
              + Ajouter un produit dérivé
            </button>
          </>
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
function ArticleForm({ article, onClose, onSaved, allArticles }) {
  const isEdit = !!article
  const isMP = article?.reference?.startsWith('MP')
  const isJHC = article?.reference?.startsWith('JHC')
  const [form, setForm] = useState({
    reference: '', designation: '', categorie: 'JH Frais', unite: 'Unite',
    stock_minimum: 0, vendable_directement: false, utilise_en_recette: false,
    photo_url: '', prix_vente: '',
    ...(article || {})
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [panneau, setPanneau] = useState(null) // 'derives' | 'composition' | null
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const prixRevient = article?.prix_revient || 0
  const prixVente = parseFloat(form.prix_vente) || 0
  const marge = prixVente - prixRevient
  const margeP = prixVente > 0 ? Math.round((marge / prixVente) * 100) : null

  async function handleSave() {
    if (!form.reference.trim() || !form.designation.trim()) { setError('Référence et Désignation sont obligatoires'); return }
    setSaving(true); setError(null)
    const payload = {
      reference: form.reference.trim(), designation: form.designation.trim(),
      categorie: form.categorie, unite: form.unite,
      stock_minimum: Number(form.stock_minimum) || 0,
      vendable_directement: form.vendable_directement,
      utilise_en_recette: form.utilise_en_recette,
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
        <div style={{ background: C.surface, borderRadius: 16, padding: 24, width: 500, boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ color: C.text, fontSize: 17, fontWeight: 800, fontFamily: F, margin: 0 }}>{isEdit ? 'Modifier article' : 'Nouvel article'}</h3>
            <span style={{ cursor: 'pointer', color: C.textSub, fontSize: 18 }} onClick={onClose}>✕</span>
          </div>
          {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{error}</div>}

          {/* Image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, background: C.bg, borderRadius: 12, padding: '12px 14px' }}>
            <Vignette url={form.photo_url} size={56} />
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>URL de l'image</label>
              <input value={form.photo_url || ''} onChange={ev => setForm({ ...form, photo_url: ev.target.value })} placeholder="https://exemple.com/image.jpg" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Référence *</label>
              <input value={form.reference} onChange={ev => setForm({ ...form, reference: ev.target.value })} placeholder="ex: JHC001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.categorie} onChange={ev => setForm({ ...form, categorie: ev.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Désignation *</label>
            <input value={form.designation} onChange={ev => setForm({ ...form, designation: ev.target.value })} placeholder="ex: Cocktail Papaye & Pastèque 250g" style={inputStyle} />
          </div>

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

          {/* Prix de vente (JHC uniquement) */}
          {isJHC && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Prix de vente (FCFA)</label>
              <input type="number" min="0" value={form.prix_vente || ''} onChange={ev => setForm({ ...form, prix_vente: ev.target.value })} onWheel={e => e.target.blur()} placeholder="ex: 2500" style={inputStyle} />
            </div>
          )}

          {/* Marge */}
          {isEdit && isJHC && prixRevient > 0 && prixVente > 0 && (
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

          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.vendable_directement} onChange={ev => setForm({ ...form, vendable_directement: ev.target.checked })} />
              Vendable
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, fontFamily: F, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.utilise_en_recette} onChange={ev => setForm({ ...form, utilise_en_recette: ev.target.checked })} />
              Utilisé en recette
            </label>
          </div>

          {/* Boutons panneau */}
          {isEdit && (
            <div style={{ display: 'grid', gridTemplateColumns: isMP && isJHC ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 14 }}>
              {isMP && (
                <button onClick={() => setPanneau('derives')}
                  style={{ border: `1.5px solid ${C.green}`, borderRadius: 10, padding: '10px 0', background: C.greenLight, color: C.green, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  🌿 Produits dérivés ({article.reference})
                </button>
              )}
              {isJHC && (
                <button onClick={() => setPanneau('composition')}
                  style={{ border: `1.5px solid ${C.indigo}`, borderRadius: 10, padding: '10px 0', background: C.indigoLight, color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  🧩 Emballage & Composition
                </button>
              )}
            </div>
          )}

          {/* Confirmation suppression */}
          {confirmDelete && (
            <div style={{ background: C.redLight, border: `1.5px solid ${C.red}`, borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ color: C.red, fontWeight: 700, fontSize: 13, fontFamily: F, marginBottom: 10 }}>
                ⚠️ Supprimer "{article?.designation}" ? Cette action est irréversible.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '9px 0', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, border: 'none', borderRadius: 8, padding: '9px 0', background: C.red, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 12, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            {isEdit && !confirmDelete && (
              <button onClick={() => setConfirmDelete(true)} style={{ border: `1.5px solid ${C.red}`, borderRadius: 10, padding: 12, background: C.redLight, color: C.red, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🗑️</button>
            )}
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 12, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </div>
      </div>

      {/* Panneaux latéraux */}
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
    { id: 'jhc', label: 'JHC', match: a => a.reference?.startsWith('JHC') },
    { id: 'mp', label: 'MP', match: a => a.reference?.startsWith('MP') },
    { id: 'conso', label: 'CONSO', match: a => a.reference?.startsWith('CONSO') },
  ]

  const liste = articles.filter(a => {
    const f = filtres.find(f => f.id === filtre)
    const matchFiltre = filtre === 'tous' || (f?.match ? f.match(a) : true)
    const matchSearch = !search || a.designation.toLowerCase().includes(search.toLowerCase()) || a.reference.toLowerCase().includes(search.toLowerCase())
    return matchFiltre && matchSearch
  })

  if (editing || creating) {
    return <ArticleForm article={editing} onClose={() => { setEditing(null); setCreating(false) }} onSaved={() => { setEditing(null); setCreating(false); loadArticles() }} allArticles={articles} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Articles</h1>
        <button onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouveau</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Rechercher..." value={search} onChange={ev => setSearch(ev.target.value)}
          style={{ flex: 1, minWidth: 200, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '0 14px', fontFamily: F, fontSize: 13, boxSizing: 'border-box' }} />
        {filtres.map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{
            border: `1.5px solid ${filtre === f.id ? C.indigo : C.border2}`, borderRadius: 10, padding: '8px 14px',
            background: filtre === f.id ? C.indigo : C.surface, color: filtre === f.id ? '#fff' : C.text,
            fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{f.label}</button>
        ))}
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '12px 16px', fontFamily: F, fontSize: 13 }}>Erreur : {error}</div>}
      {!loading && !error && liste.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun article trouvé.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {liste.map(a => {
          const status = stockStatus(a)
          const isJHC = a.reference?.startsWith('JHC')
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
                    <span style={{ background: marge >= 0 ? C.greenLight : C.redLight, color: marge >= 0 ? C.green : C.red, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: F }}>Marge {margeP}%</span>
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
    </div>
  )
}
