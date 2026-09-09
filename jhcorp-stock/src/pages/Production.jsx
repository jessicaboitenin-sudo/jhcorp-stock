import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  green: '#2A7A50', greenLight: '#E6F4ED',
  red: '#B5273A', redLight: '#FDECEA',
  orange: '#C2610F', orangeLight: '#FDF0E8',
  blue: '#2554A8', blueLight: '#EBF2FB',
}
const F = "'Montserrat', sans-serif"
const inputStyle = { width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box', background: C.surface }
const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F, display: 'block', marginBottom: 4 }
function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

// ─── Vue : Liste des fiches ───────────────────────────────────────────────
function ListeFiches({ onNouvelleFiche, onNouvelleProduction, onVoirHistorique }) {
  const [fiches, setFiches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('fiches_transformation')
      .select('*, mp:mp_id(designation, reference, unite, prix_revient), lignes_transformation(id)')
      .eq('actif', true)
      .order('nom')
      .then(({ data }) => { if (data) setFiches(data); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Production</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onVoirHistorique} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '9px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🕐 Historique</button>
          <button onClick={onNouvelleFiche} style={{ border: 'none', borderRadius: 10, padding: '9px 16px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouvelle fiche</button>
        </div>
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
      {!loading && fiches.length === 0 && (
        <div style={{ background: C.indigoLight, borderRadius: 14, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏭</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, fontFamily: F, marginBottom: 8 }}>Aucune fiche de transformation</div>
          <div style={{ color: C.textSub, fontSize: 13, fontFamily: F, marginBottom: 16 }}>Créez une fiche pour définir comment une matière première se transforme en produits finis.</div>
          <button onClick={onNouvelleFiche} style={{ border: 'none', borderRadius: 10, padding: '10px 24px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Créer une fiche</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {fiches.map(f => (
          <div key={f.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>{f.nom}</div>
              <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 3 }}>
                MP : {f.mp?.designation} ({f.mp?.reference})
              </div>
              {f.mp?.prix_revient > 0 && (
                <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F }}>Prix actuel : {fmt(Math.round(f.mp.prix_revient))} FCFA/{f.mp.unite}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ background: C.indigoLight, color: C.indigo, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>
                {f.lignes_transformation?.length || 0} produit(s) fini(s)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onNouvelleFiche(f)} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '8px 0', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✏️ Modifier</button>
              <button onClick={() => onNouvelleProduction(f)} style={{ flex: 2, border: 'none', borderRadius: 9, padding: '8px 0', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>▶ Lancer une production</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Vue : Créer/Modifier une fiche ──────────────────────────────────────
function FormFiche({ fiche, onBack, onSaved }) {
  const isEdit = !!fiche?.id
  const [articles, setArticles] = useState([])
  const [nom, setNom] = useState(fiche?.nom || '')
  const [mpId, setMpId] = useState(fiche?.mp_id || '')
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('articles').select('*').order('designation').then(({ data }) => {
      if (data) setArticles(data)
      setLoading(false)
    })
    if (isEdit) {
      supabase.from('lignes_transformation')
        .select('*, produit:produit_id(id, designation, reference, unite)')
        .eq('fiche_id', fiche.id)
        .then(({ data }) => {
          if (data) setLignes(data.map(l => ({
            id: l.id, produit_id: l.produit_id, produit: l.produit,
            pourcentage_cout: l.pourcentage_cout, poids_net_g: l.poids_net_g || '',
            rendement_pct: l.rendement_pct || '', qte_par_unite_mp: l.qte_par_unite_mp || '',
          })))
        })
    }
  }, [])

  const totalPct = lignes.reduce((s, l) => s + (parseFloat(l.pourcentage_cout) || 0), 0)
  const mpArticles = articles.filter(a => a.reference?.startsWith('MP'))
  const produitsFinisDispos = articles.filter(a => a.reference?.startsWith('JHC'))

  function addLigne() {
    setLignes(prev => [...prev, { id: null, produit_id: '', produit: null, pourcentage_cout: '', poids_net_g: '', rendement_pct: '', qte_par_unite_mp: '' }])
  }

  function updateLigne(i, field, val) {
    setLignes(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      if (field === 'produit_id') {
        const found = articles.find(a => a.id === val)
        return { ...l, produit_id: val, produit: found || null }
      }
      return { ...l, [field]: val }
    }))
  }

  function removeLigne(i) {
    setLignes(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!nom.trim()) { setError('Nom de la fiche obligatoire'); return }
    if (!mpId) { setError('Matière première obligatoire'); return }
    if (lignes.length === 0) { setError('Ajoutez au moins un produit fini'); return }
    if (Math.round(totalPct) !== 100) { setError(`Le total des % doit être 100% (actuellement ${Math.round(totalPct)}%)`); return }
    const lignesValides = lignes.filter(l => l.produit_id && parseFloat(l.pourcentage_cout) > 0)
    if (lignesValides.length === 0) { setError('Vérifiez les lignes'); return }

    setSaving(true); setError(null)

    let ficheId = fiche?.id
    if (isEdit) {
      await supabase.from('fiches_transformation').update({ nom: nom.trim(), mp_id: mpId }).eq('id', ficheId)
      await supabase.from('lignes_transformation').delete().eq('fiche_id', ficheId)
    } else {
      const { data, error: e } = await supabase.from('fiches_transformation')
        .insert({ nom: nom.trim(), mp_id: mpId, actif: true }).select().single()
      if (e) { setError(e.message); setSaving(false); return }
      ficheId = data.id
    }

    await supabase.from('lignes_transformation').insert(
      lignesValides.map(l => ({
        fiche_id: ficheId,
        produit_id: l.produit_id,
        pourcentage_cout: parseFloat(l.pourcentage_cout),
        poids_net_g: parseFloat(l.poids_net_g) || null,
        rendement_pct: parseFloat(l.rendement_pct) || null,
        qte_par_unite_mp: parseFloat(l.qte_par_unite_mp) || null,
      }))
    )

    setSaving(false)
    onSaved()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '8px 14px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Retour</button>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>{isEdit ? 'Modifier la fiche' : 'Nouvelle fiche de transformation'}</h1>
      </div>

      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontFamily: F }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
          <label style={labelStyle}>Nom de la fiche *</label>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Découpe Poulet Entier" style={inputStyle} />
        </div>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
          <label style={labelStyle}>Matière première *</label>
          <select value={mpId} onChange={e => setMpId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— Choisir une MP —</option>
            {mpArticles.map(a => <option key={a.id} value={a.id}>{a.designation} ({a.reference})</option>)}
          </select>
        </div>
      </div>

      {/* Lignes produits finis */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F }}>Produits finis</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontFamily: F, color: Math.round(totalPct) === 100 ? C.green : C.red, fontWeight: 700 }}>
              Total : {Math.round(totalPct)}% {Math.round(totalPct) === 100 ? '✅' : '⚠️ doit faire 100%'}
            </div>
            <button onClick={addLigne} style={{ border: 'none', borderRadius: 8, padding: '7px 14px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Ajouter</button>
          </div>
        </div>

        {/* En-têtes */}
        {lignes.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px 28px', gap: 8, marginBottom: 6 }}>
            {['Produit fini', '% coût', 'Qté/unité MP', 'Poids net (g)', 'Rendement %', ''].map(h => (
              <div key={h} style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>{h}</div>
            ))}
          </div>
        )}

        {lignes.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <select value={l.produit_id || ''} onChange={e => updateLigne(i, 'produit_id', e.target.value)}
              style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, cursor: 'pointer' }}>
              <option value="">— Produit —</option>
              {produitsFinisDispos.map(a => <option key={a.id} value={a.id}>{a.designation}</option>)}
            </select>
            {[
              { field: 'pourcentage_cout', placeholder: '0' },
              { field: 'qte_par_unite_mp', placeholder: 'ex: 2' },
              { field: 'poids_net_g', placeholder: 'ex: 175' },
              { field: 'rendement_pct', placeholder: 'ex: 54' },
            ].map(({ field, placeholder }) => (
              <input key={field} type="number" min="0" step="0.01"
                value={l[field] || ''} placeholder={placeholder}
                onChange={e => updateLigne(i, field, e.target.value)}
                onWheel={e => e.target.blur()}
                style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, textAlign: 'right' }} />
            ))}
            <span onClick={() => removeLigne(i)} style={{ cursor: 'pointer', color: C.red, fontSize: 16, textAlign: 'center' }}>✕</span>
          </div>
        ))}

        {lignes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.textMuted, fontSize: 13, fontFamily: F }}>
            Cliquez sur "+ Ajouter" pour définir les produits finis
          </div>
        )}

        <div style={{ background: C.indigoLight, borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 11, color: C.textSub, fontFamily: F }}>
          ℹ️ <strong>% coût</strong> : part du coût MP allouée à ce produit (total = 100%) · <strong>Qté/unité MP</strong> : combien de pièces pour 1 MP (ex: 2 quarts/poulet) · <strong>Poids net</strong> : après désossage (produits au poids) · <strong>Rendement %</strong> : % de chair récupérée
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 13, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : '💾 Sauvegarder la fiche'}
        </button>
      </div>
    </div>
  )
}

// ─── Vue : Lancer une production ─────────────────────────────────────────
function NouvelleProduction({ fiche, onBack, onSaved }) {
  const [lignesFiche, setLignesFiche] = useState([])
  const [qteMp, setQteMp] = useState('')
  const [prixMp, setPrixMp] = useState(fiche.mp?.prix_revient ? String(Math.round(fiche.mp.prix_revient)) : '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [qtesProduites, setQtesProduites] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('lignes_transformation')
      .select('*, produit:produit_id(id, designation, reference, unite, stock_actuel)')
      .eq('fiche_id', fiche.id)
      .then(({ data }) => { if (data) setLignesFiche(data) })
  }, [fiche.id])

  const coutTotal = (parseFloat(qteMp) || 0) * (parseFloat(prixMp) || 0)

  // Calcul prix de revient par produit
  function calcPrixRevient(l) {
    if (!coutTotal || !parseFloat(l.pourcentage_cout)) return null
    const coutPart = coutTotal * (l.pourcentage_cout / 100)
    const qte = parseFloat(qtesProduites[l.produit_id]) || 0
    if (qte === 0) return null

    // Si produit au poids avec rendement
    if (l.poids_net_g && l.rendement_pct) {
      const coutParGramme = coutPart / (parseFloat(qteMp) * (l.rendement_pct / 100) * 1000)
      return Math.round(coutParGramme * l.poids_net_g * 100) / 100
    }
    return Math.round((coutPart / qte) * 100) / 100
  }

  async function handleValider() {
    if (!qteMp || parseFloat(qteMp) <= 0) { setError('Quantité MP obligatoire'); return }
    if (!prixMp || parseFloat(prixMp) <= 0) { setError('Prix d\'achat MP obligatoire'); return }
    const lignesProd = lignesFiche.filter(l => parseFloat(qtesProduites[l.produit_id]) > 0)
    if (lignesProd.length === 0) { setError('Saisissez au moins une quantité produite'); return }

    setSaving(true); setError(null)

    // 1. Créer la session de production
    const { data: prod, error: e1 } = await supabase.from('productions').insert({
      fiche_id: fiche.id,
      date_production: date,
      qte_mp_utilisee: parseFloat(qteMp),
      prix_achat_mp: parseFloat(prixMp),
      note: note || null,
    }).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }

    // 2. Déduire la MP du stock
    await supabase.from('articles')
      .update({ stock_actuel: supabase.rpc ? undefined : undefined }) // handled below
      .eq('id', fiche.mp_id)
    const { data: mpArt } = await supabase.from('articles').select('stock_actuel').eq('id', fiche.mp_id).single()
    if (mpArt) {
      await supabase.from('articles').update({ stock_actuel: (mpArt.stock_actuel || 0) - parseFloat(qteMp) }).eq('id', fiche.mp_id)
    }
    await supabase.from('mouvements_stock').insert({
      article_id: fiche.mp_id,
      type: 'sortie_production',
      quantite: parseFloat(qteMp),
      date: new Date(date).toISOString(),
      reference_document: `Production : ${fiche.nom}`,
      prix_unitaire: parseFloat(prixMp),
    })

    // 3. Ajouter les produits finis au stock + enregistrer mouvements
    for (const l of lignesProd) {
      const qte = parseFloat(qtesProduites[l.produit_id])
      const prix = calcPrixRevient(l)

      // Récupérer stock actuel
      const { data: artData } = await supabase.from('articles').select('stock_actuel, prix_revient').eq('id', l.produit_id).single()
      if (!artData) continue

      const nouveauStock = (artData.stock_actuel || 0) + qte
      const updatePayload = { stock_actuel: nouveauStock }
      if (prix) {
        const pmpActuel = artData.prix_revient || 0
        const stockActuel = artData.stock_actuel || 0
        const nouveauPrix = stockActuel === 0 ? prix : Math.round(((stockActuel * pmpActuel) + (qte * prix)) / (stockActuel + qte) * 100) / 100
        updatePayload.prix_revient = nouveauPrix
      }

      await supabase.from('articles').update(updatePayload).eq('id', l.produit_id)
      await supabase.from('mouvements_stock').insert({
        article_id: l.produit_id,
        type: 'entree',
        quantite: qte,
        date: new Date(date).toISOString(),
        reference_document: `Production : ${fiche.nom}`,
        prix_unitaire: prix || null,
      })
      await supabase.from('lignes_production').insert({
        production_id: prod.id,
        produit_id: l.produit_id,
        qte_produite: qte,
        prix_revient_calcule: prix || null,
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '8px 14px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Retour</button>
        <div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, fontFamily: F, margin: 0 }}>Production — {fiche.nom}</h1>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>MP : {fiche.mp?.designation}</div>
        </div>
      </div>

      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontFamily: F }}>{error}</div>}

      {/* Infos MP */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>1. Matière première utilisée</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Quantité {fiche.mp?.unite} utilisée *</label>
            <input type="number" min="0" step="0.01" value={qteMp} onChange={e => setQteMp(e.target.value)} onWheel={e => e.target.blur()} placeholder="ex: 100" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prix d'achat unitaire (FCFA) *</label>
            <input type="number" min="0" value={prixMp} onChange={e => setPrixMp(e.target.value)} onWheel={e => e.target.blur()} placeholder="ex: 2500" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optionnel" style={inputStyle} />
          </div>
        </div>
        {coutTotal > 0 && (
          <div style={{ marginTop: 12, background: C.indigoLight, borderRadius: 9, padding: '10px 14px', display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>COÛT TOTAL MP</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.indigo, fontFamily: F }}>{fmt(Math.round(coutTotal))} FCFA</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>COÛT / UNITÉ MP</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.indigo, fontFamily: F }}>{fmt(parseFloat(prixMp) || 0)} FCFA</div>
            </div>
          </div>
        )}
      </div>

      {/* Quantités produites */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>2. Quantités produites</div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 120px 120px', gap: 0, background: C.text, borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
          {['Produit fini', 'Stock actuel', 'Qté produite', '% coût', 'Prix revient/u'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: F }}>{h}</div>
          ))}
        </div>

        {lignesFiche.map((l, i) => {
          const qte = parseFloat(qtesProduites[l.produit_id]) || 0
          const prix = qte > 0 ? calcPrixRevient(l) : null
          return (
            <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 100px 120px 120px', gap: 0, padding: '10px 14px', background: i % 2 === 0 ? '#FAFBFF' : '#fff', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F }}>{l.produit?.designation}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{l.produit?.reference}</div>
              </div>
              <div style={{ fontSize: 13, color: C.textSub, fontFamily: F }}>{l.produit?.stock_actuel} {l.produit?.unite}</div>
              <div>
                <input type="number" min="0" step="0.01"
                  value={qtesProduites[l.produit_id] || ''}
                  onChange={e => setQtesProduites(prev => ({ ...prev, [l.produit_id]: e.target.value }))}
                  onWheel={e => e.target.blur()}
                  placeholder="0"
                  style={{ width: 80, height: 34, border: `1.5px solid ${C.border2}`, borderRadius: 7, padding: '0 8px', fontFamily: F, fontSize: 12, textAlign: 'right' }}
                />
              </div>
              <div style={{ fontSize: 12, color: C.indigo, fontWeight: 700, fontFamily: F }}>{l.pourcentage_cout}%</div>
              <div style={{ fontSize: 12, color: prix ? C.green : C.textMuted, fontWeight: prix ? 800 : 400, fontFamily: F }}>
                {prix ? `${fmt(prix)} FCFA` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 13, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        <button onClick={handleValider} disabled={saving}
          style={{ flex: 2, border: 'none', borderRadius: 10, padding: 13, background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : '✅ Valider la production'}
        </button>
      </div>
    </div>
  )
}

// ─── Vue : Historique productions ────────────────────────────────────────
function HistoriqueProductions({ onBack }) {
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('productions')
      .select('*, fiche:fiche_id(nom), lignes_production(id, qte_produite, prix_revient_calcule, produit:produit_id(designation, unite))')
      .order('date_production', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setProds(data); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '8px 14px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Retour</button>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>Historique des productions</h1>
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}
      {!loading && prods.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucune production enregistrée</div>}

      {prods.map(p => (
        <div key={p.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F }}>{p.fiche?.nom}</div>
              <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>
                {new Date(p.date_production).toLocaleDateString('fr-FR')} · {p.qte_mp_utilisee} unités MP · {fmt(p.prix_achat_mp)} FCFA/u
              </div>
            </div>
            <div style={{ background: C.indigoLight, borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>COÛT TOTAL</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.indigo, fontFamily: F }}>{fmt(Math.round(p.cout_total))} FCFA</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {p.lignes_production?.map((l, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: F }}>
                <span style={{ color: C.text, fontWeight: 700 }}>{l.qte_produite} {l.produit?.unite}</span>
                <span style={{ color: C.textSub }}> {l.produit?.designation}</span>
                {l.prix_revient_calcule && <span style={{ color: C.green, marginLeft: 4 }}>({fmt(l.prix_revient_calcule)} F/u)</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────
export default function Production() {
  const [vue, setVue] = useState('liste') // liste | form_fiche | nouvelle_prod | historique
  const [ficheSelectionnee, setFicheSelectionnee] = useState(null)

  if (vue === 'form_fiche') return <FormFiche fiche={ficheSelectionnee} onBack={() => { setVue('liste'); setFicheSelectionnee(null) }} onSaved={() => { setVue('liste'); setFicheSelectionnee(null) }} />
  if (vue === 'nouvelle_prod') return <NouvelleProduction fiche={ficheSelectionnee} onBack={() => setVue('liste')} onSaved={() => setVue('liste')} />
  if (vue === 'historique') return <HistoriqueProductions onBack={() => setVue('liste')} />

  return (
    <ListeFiches
      onNouvelleFiche={(f) => { setFicheSelectionnee(f || null); setVue('form_fiche') }}
      onNouvelleProduction={(f) => { setFicheSelectionnee(f); setVue('nouvelle_prod') }}
      onVoirHistorique={() => setVue('historique')}
    />
  )
}
