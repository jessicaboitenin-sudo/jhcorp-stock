import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA',
  green: '#2A7A50', greenLight: '#E6F4ED',
  red: '#B5273A', redLight: '#FDECEA',
  orange: '#C2610F', orangeLight: '#FDF0E8',
}
const F = "'Montserrat', sans-serif"

function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

const MOTIFS = ['Achat fournisseur', 'Vente', 'Consommation interne', 'Perte / Casse', 'Ajustement inventaire', 'Autre']

export default function Mouvement() {
  const [articles, setArticles] = useState([])
  const [lignes, setLignes] = useState({}) // { [article_id]: { entree, sortie, prix, motif } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [motifGlobal, setMotifGlobal] = useState('')

  useEffect(() => {
    supabase.from('articles').select('*').order('designation')
      .then(({ data }) => { if (data) setArticles(data); setLoading(false) })
  }, [])

  function updateLigne(id, field, val) {
    setLignes(prev => {
      const current = prev[id] || { entree: '', sortie: '', prix: '', motif: '' }
      const updated = { ...current, [field]: val }
      // Si on saisit une entrée, vider la sortie et vice versa
      if (field === 'entree' && val) updated.sortie = ''
      if (field === 'sortie' && val) { updated.entree = ''; updated.prix = '' }
      return { ...prev, [id]: updated }
    })
  }

  const filtres = [
    { id: 'tous', label: 'Tous' },
    { id: 'jhc', label: 'JHC', match: a => a.reference?.startsWith('JHC') },
    { id: 'mp', label: 'MP', match: a => a.reference?.startsWith('MP') },
    { id: 'conso', label: 'CONSO', match: a => a.reference?.startsWith('CONSO') },
  ]

  const liste = articles.filter(a => {
    const f = filtres.find(f => f.id === filtre)
    const matchFiltre = filtre === 'tous' || (f?.match ? f.match(a) : true)
    const matchSearch = !search ||
      a.designation.toLowerCase().includes(search.toLowerCase()) ||
      a.reference.toLowerCase().includes(search.toLowerCase())
    return matchFiltre && matchSearch
  })

  // Résumé des mouvements saisis
  const mouvementsSaisis = Object.entries(lignes).filter(([_, l]) =>
    (parseFloat(l.entree) > 0) || (parseFloat(l.sortie) > 0)
  )
  const nbEntrees = mouvementsSaisis.filter(([_, l]) => parseFloat(l.entree) > 0).length
  const nbSorties = mouvementsSaisis.filter(([_, l]) => parseFloat(l.sortie) > 0).length

  async function handleValider() {
    if (mouvementsSaisis.length === 0) { setError('Aucun mouvement saisi'); return }
    setSaving(true); setError(null)

    for (const [articleId, l] of mouvementsSaisis) {
      const article = articles.find(a => a.id === articleId)
      if (!article) continue

      const isEntree = parseFloat(l.entree) > 0
      const qte = isEntree ? parseFloat(l.entree) : parseFloat(l.sortie)
      const motif = l.motif || motifGlobal || (isEntree ? 'Achat fournisseur' : 'Sortie')

      // Vérif stock suffisant pour sortie
      if (!isEntree && qte > article.stock_actuel) {
        setError(`Stock insuffisant pour ${article.designation} — disponible : ${article.stock_actuel} ${article.unite}`)
        setSaving(false); return
      }

      // Nouveau stock
      const nouveauStock = isEntree
        ? (article.stock_actuel || 0) + qte
        : (article.stock_actuel || 0) - qte

      // Prix moyen pondéré si entrée avec prix
      const updatePayload = { stock_actuel: nouveauStock }
      if (isEntree && parseFloat(l.prix) > 0) {
        const prixSaisi = parseFloat(l.prix)
        const stockActuel = article.stock_actuel || 0
        const prixActuel = article.prix_revient || 0
        const nouveauPrix = stockActuel === 0
          ? prixSaisi
          : Math.round(((stockActuel * prixActuel) + (qte * prixSaisi)) / (stockActuel + qte) * 100) / 100
        updatePayload.prix_revient = nouveauPrix
      }

      // Mettre à jour stock
      await supabase.from('articles').update(updatePayload).eq('id', articleId)

      // Enregistrer mouvement
      await supabase.from('mouvements_stock').insert({
        article_id: articleId,
        type: isEntree ? 'entree' : 'sortie_manuelle',
        quantite: qte,
        date: new Date(date).toISOString(),
        reference_document: motif,
        prix_unitaire: isEntree && parseFloat(l.prix) > 0 ? parseFloat(l.prix) : null,
      })

      // Mettre à jour l'article localement
      setArticles(prev => prev.map(a => a.id === articleId
        ? { ...a, stock_actuel: nouveauStock, ...(updatePayload.prix_revient ? { prix_revient: updatePayload.prix_revient } : {}) }
        : a
      ))
    }

    setSuccess(`✅ ${mouvementsSaisis.length} mouvement(s) enregistré(s)`)
    setLignes({})
    setSaving(false)
    setTimeout(() => setSuccess(null), 5000)
  }

  const inputNum = (id, field, placeholder, disabled = false) => (
    <input
      type="number" min="0" step="0.01"
      value={lignes[id]?.[field] || ''}
      onChange={e => updateLigne(id, field, e.target.value)}
      onWheel={e => e.target.blur()}
      disabled={disabled}
      placeholder={disabled ? '—' : placeholder}
      style={{
        width: '100%', height: 34, border: `1.5px solid ${disabled ? C.border : C.border2}`,
        borderRadius: 7, padding: '0 8px', fontFamily: F, fontSize: 12,
        textAlign: 'right', boxSizing: 'border-box',
        background: disabled ? C.bg : '#fff',
        color: disabled ? C.textMuted : C.text,
      }}
    />
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Mouvement de stock</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 12px', fontFamily: F, fontSize: 13 }} />
      </div>

      {/* Filtres + recherche + motif global */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 12px', fontFamily: F, fontSize: 12 }} />
        {filtres.map(f => (
          <button key={f.id} onClick={() => setFiltre(f.id)} style={{
            border: `1.5px solid ${filtre === f.id ? C.indigo : C.border2}`, borderRadius: 9, padding: '7px 14px',
            background: filtre === f.id ? C.indigo : C.surface, color: filtre === f.id ? '#fff' : C.text,
            fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}>{f.label}</button>
        ))}
        <select value={motifGlobal} onChange={e => setMotifGlobal(e.target.value)}
          style={{ height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 10px', fontFamily: F, fontSize: 12, cursor: 'pointer', minWidth: 180 }}>
          <option value="">Motif global (optionnel)</option>
          {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
        {/* En-tête */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px 120px 150px', gap: 0, background: C.text, padding: '10px 16px' }}>
          {['Article', 'Stock', 'P. achat', 'Entrée', 'Sortie', 'Prix achat', 'Motif'].map((h, i) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: F, textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
          ))}
        </div>

        {loading && <div style={{ padding: 20, color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}

        {!loading && liste.map((a, i) => {
          const l = lignes[a.id] || {}
          const hasEntree = parseFloat(l.entree) > 0
          const hasSortie = parseFloat(l.sortie) > 0
          const hasAny = hasEntree || hasSortie
          const rowBg = hasEntree ? '#F0FBF5' : hasSortie ? '#FEF2F2' : i % 2 === 0 ? '#FAFBFF' : '#fff'

          return (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 90px 90px 90px 120px 150px', gap: 0, padding: '8px 16px', background: rowBg, borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              {/* Article */}
              <div>
                <div style={{ fontSize: 12, fontWeight: hasAny ? 700 : 500, color: C.text, fontFamily: F }}>{a.designation}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{a.reference}</div>
              </div>

              {/* Stock actuel */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: a.stock_actuel === 0 ? C.red : a.stock_actuel <= a.stock_minimum ? C.orange : C.text, fontFamily: F }}>{a.stock_actuel}</div>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F }}>{a.unite}</div>
              </div>

              {/* Prix actuel */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textSub, fontFamily: F }}>{a.prix_revient > 0 ? fmt(Math.round(a.prix_revient)) + ' F' : '—'}</div>
              </div>

              {/* Entrée */}
              <div style={{ padding: '0 4px' }}>
                {inputNum(a.id, 'entree', '0', hasSortie)}
              </div>

              {/* Sortie */}
              <div style={{ padding: '0 4px' }}>
                {inputNum(a.id, 'sortie', '0', hasEntree)}
              </div>

              {/* Prix achat (actif seulement si entrée) */}
              <div style={{ padding: '0 4px' }}>
                {inputNum(a.id, 'prix', 'FCFA', !hasEntree)}
              </div>

              {/* Motif ligne */}
              <div style={{ padding: '0 4px' }}>
                <select
                  value={l.motif || ''}
                  onChange={e => updateLigne(a.id, 'motif', e.target.value)}
                  disabled={!hasAny}
                  style={{
                    width: '100%', height: 34, border: `1.5px solid ${!hasAny ? C.border : C.border2}`,
                    borderRadius: 7, padding: '0 6px', fontFamily: F, fontSize: 11,
                    cursor: hasAny ? 'pointer' : 'default',
                    background: hasAny ? '#fff' : C.bg, color: hasAny ? C.text : C.textMuted,
                  }}
                >
                  <option value="">— Motif —</option>
                  {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer sticky */}
      <div style={{ position: 'sticky', bottom: 0, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 16px rgba(26,22,48,0.08)' }}>
        <div style={{ fontFamily: F }}>
          {mouvementsSaisis.length === 0
            ? <span style={{ fontSize: 13, color: C.textMuted }}>Aucun mouvement saisi</span>
            : <span style={{ fontSize: 13, color: C.text }}>
                {nbEntrees > 0 && <span style={{ color: C.green, fontWeight: 700 }}>⬇️ {nbEntrees} entrée(s)</span>}
                {nbEntrees > 0 && nbSorties > 0 && <span style={{ color: C.textMuted }}> · </span>}
                {nbSorties > 0 && <span style={{ color: C.red, fontWeight: 700 }}>⬆️ {nbSorties} sortie(s)</span>}
              </span>
          }
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</div>}
          {success && <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>{success}</div>}
        </div>
        <button
          onClick={handleValider}
          disabled={saving || mouvementsSaisis.length === 0}
          style={{
            border: 'none', borderRadius: 10, padding: '12px 28px',
            background: mouvementsSaisis.length === 0 ? C.textMuted : C.indigo,
            color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14,
            cursor: saving || mouvementsSaisis.length === 0 ? 'default' : 'pointer'
          }}
        >
          {saving ? 'Enregistrement...' : `✅ Valider ${mouvementsSaisis.length > 0 ? `(${mouvementsSaisis.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
