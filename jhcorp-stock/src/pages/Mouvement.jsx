import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8' }
const F = "'Montserrat', sans-serif"
const inputStyle = { width: '100%', height: 40, border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '0 12px', fontFamily: F, fontSize: 13, boxSizing: 'border-box', background: C.surface }
const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F, display: 'block', marginBottom: 5 }

const MOTIFS_ENTREE = ['Achat fournisseur', 'Retour client', 'Ajustement inventaire', 'Autre']
const MOTIFS_SORTIE = ['Vente', 'Consommation interne', 'Perte / Casse', 'Ajustement inventaire', 'Autre']

export default function Mouvement() {
  const [articles, setArticles] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('entree') // entree | sortie
  const [form, setForm] = useState({ quantite: '', motif: '', note: '', prix_unitaire: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('articles').select('*').order('designation').then(({ data }) => { if (data) setArticles(data) })
  }, [])

  const liste = articles.filter(a =>
    a.designation.toLowerCase().includes(search.toLowerCase()) ||
    a.reference.toLowerCase().includes(search.toLowerCase())
  )

  function selectArticle(a) {
    setSelected(a)
    setSearch(a.designation)
    setForm({ quantite: '', motif: type === 'entree' ? MOTIFS_ENTREE[0] : MOTIFS_SORTIE[0], note: '', prix_unitaire: a.prix_revient ? String(a.prix_revient) : '' })
    setError(null)
    setSuccess(null)
  }

  function switchType(t) {
    setType(t)
    setForm(f => ({ ...f, motif: t === 'entree' ? MOTIFS_ENTREE[0] : MOTIFS_SORTIE[0] }))
  }

  async function handleSave() {
    if (!selected) { setError('Sélectionnez un article'); return }
    const qte = parseFloat(form.quantite)
    if (!qte || qte <= 0) { setError('Quantité invalide'); return }
    if (type === 'sortie' && qte > selected.stock_actuel) { setError(`Stock insuffisant — disponible : ${selected.stock_actuel} ${selected.unite}`); return }

    setSaving(true); setError(null)

    // Calculer nouveau stock
    const delta = type === 'entree' ? qte : -qte
    const nouveauStock = (selected.stock_actuel || 0) + delta

    // Prix moyen pondéré (seulement à l'entrée)
    let nouveauPrix = selected.prix_revient || 0
    if (type === 'entree' && form.prix_unitaire) {
      const prixSaisi = parseFloat(form.prix_unitaire)
      const stockActuel = selected.stock_actuel || 0
      const prixActuel = selected.prix_revient || 0
      if (prixSaisi > 0) {
        nouveauPrix = stockActuel === 0
          ? prixSaisi
          : ((stockActuel * prixActuel) + (qte * prixSaisi)) / (stockActuel + qte)
        nouveauPrix = Math.round(nouveauPrix * 100) / 100
      }
    }

    // 1. Mettre à jour le stock + prix
    const updatePayload = { stock_actuel: nouveauStock }
    if (type === 'entree' && form.prix_unitaire) updatePayload.prix_revient = nouveauPrix

    const { error: e1 } = await supabase.from('articles').update(updatePayload).eq('id', selected.id)
    if (e1) { setError(e1.message); setSaving(false); return }

    // 2. Enregistrer le mouvement
    const { error: e2 } = await supabase.from('mouvements_stock').insert({
      article_id: selected.id,
      type: type === 'entree' ? 'entree' : 'sortie_manuelle',
      quantite: qte,
      date: new Date().toISOString(),
      reference_document: form.motif,
      note: form.note || null,
      prix_unitaire: type === 'entree' && form.prix_unitaire ? parseFloat(form.prix_unitaire) : null,
    })
    if (e2) { setError(e2.message); setSaving(false); return }

    // Reset
    const updatedArticle = { ...selected, stock_actuel: nouveauStock, prix_revient: nouveauPrix }
    setSelected(updatedArticle)
    setArticles(prev => prev.map(a => a.id === selected.id ? updatedArticle : a))
    setForm({ quantite: '', motif: type === 'entree' ? MOTIFS_ENTREE[0] : MOTIFS_SORTIE[0], note: '', prix_unitaire: String(nouveauPrix || '') })
    setSuccess(`✅ ${type === 'entree' ? 'Entrée' : 'Sortie'} de ${qte} ${selected.unite} enregistrée — nouveau stock : ${nouveauStock} ${selected.unite}`)
    setSaving(false)
    setTimeout(() => setSuccess(null), 5000)
  }

  const motifs = type === 'entree' ? MOTIFS_ENTREE : MOTIFS_SORTIE

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 24px' }}>Mouvement de stock</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* COLONNE GAUCHE : Sélection article */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>1. Choisir un article</div>
          <input
            placeholder="Rechercher par nom ou référence..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          {search && !selected && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
              {liste.length === 0 && (
                <div style={{ padding: '12px 14px', color: C.textMuted, fontSize: 12, fontFamily: F }}>Aucun article trouvé</div>
              )}
              {liste.map(a => (
                <div key={a.id} onClick={() => selectArticle(a)}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: F }}>{a.designation}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{a.reference} · {a.categorie}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.indigo, fontFamily: F }}>{a.stock_actuel}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{a.unite}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fiche article sélectionné */}
          {selected && (
            <div style={{ background: C.indigoLight, borderRadius: 12, padding: '14px 16px', marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.indigo, fontFamily: F }}>{selected.designation}</div>
                  <div style={{ fontSize: 11, color: C.textSub, fontFamily: F, marginTop: 2 }}>{selected.reference} · {selected.categorie}</div>
                </div>
                <span onClick={() => { setSelected(null); setSearch('') }} style={{ cursor: 'pointer', color: C.textSub, fontSize: 16 }}>✕</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F }}>STOCK ACTUEL</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.text, fontFamily: F }}>{selected.stock_actuel}</div>
                  <div style={{ fontSize: 10, color: C.textSub, fontFamily: F }}>{selected.unite}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F }}>STOCK MIN</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.orange, fontFamily: F }}>{selected.stock_minimum}</div>
                  <div style={{ fontSize: 10, color: C.textSub, fontFamily: F }}>{selected.unite}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F }}>PRIX REVIENT</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: C.green, fontFamily: F }}>{selected.prix_revient ? `${selected.prix_revient.toLocaleString('fr-FR')}` : '—'}</div>
                  <div style={{ fontSize: 10, color: C.textSub, fontFamily: F }}>FCFA</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : Formulaire mouvement */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>2. Saisir le mouvement</div>

          {/* Type : Entrée / Sortie */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { val: 'entree', label: '⬇️ Entrée', color: C.green, bg: C.greenLight },
              { val: 'sortie', label: '⬆️ Sortie', color: C.red, bg: C.redLight },
            ].map(t => (
              <button key={t.val} onClick={() => switchType(t.val)} style={{
                border: `2px solid ${type === t.val ? t.color : C.border2}`,
                borderRadius: 10, padding: '10px 0', background: type === t.val ? t.bg : C.surface,
                color: type === t.val ? t.color : C.textSub, fontFamily: F, fontWeight: 800, fontSize: 13, cursor: 'pointer'
              }}>{t.label}</button>
            ))}
          </div>

          {/* Quantité */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Quantité *</label>
            <input type="number" min="0.01" step="0.01"
              value={form.quantite}
              onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))}
              onWheel={e => e.target.blur()}
              placeholder={`ex: 10 ${selected?.unite || ''}`}
              style={inputStyle}
            />
          </div>

          {/* Prix unitaire (entrée seulement) */}
          {type === 'entree' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Prix unitaire d'achat (FCFA) — optionnel</label>
              <input type="number" min="0" step="1"
                value={form.prix_unitaire}
                onChange={e => setForm(f => ({ ...f, prix_unitaire: e.target.value }))}
                onWheel={e => e.target.blur()}
                placeholder="ex: 500"
                style={inputStyle}
              />
              {selected?.prix_revient > 0 && (
                <div style={{ fontSize: 10, color: C.textSub, fontFamily: F, marginTop: 4 }}>
                  Prix moyen actuel : {selected.prix_revient.toLocaleString('fr-FR')} FCFA — sera recalculé si vous saisissez un prix
                </div>
              )}
            </div>
          )}

          {/* Motif */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Motif *</label>
            <select value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
              {motifs.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Note libre */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Note (optionnel)</label>
            <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="ex: Facture n°1234, Fournisseur Diallo..." style={inputStyle} />
          </div>

          {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{error}</div>}
          {success && <div style={{ background: C.greenLight, color: C.green, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, fontFamily: F }}>{success}</div>}

          <button onClick={handleSave} disabled={saving || !selected}
            style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: !selected ? C.textMuted : type === 'entree' ? C.green : C.red, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 14, cursor: saving || !selected ? 'default' : 'pointer' }}>
            {saving ? 'Enregistrement...' : type === 'entree' ? '⬇️ Valider l\'entrée' : '⬆️ Valider la sortie'}
          </button>
        </div>
      </div>
    </div>
  )
}
