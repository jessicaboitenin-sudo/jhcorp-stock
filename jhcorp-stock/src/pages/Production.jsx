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
const inputStyle = { width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, boxSizing: 'border-box', background: C.surface }
const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F, display: 'block', marginBottom: 4 }
function fmt(n) { return (n || 0).toLocaleString('fr-FR') }

// ─── Liste des MP avec leurs dérivés ─────────────────────────────────────
function ListeMP({ onLancerProduction, onVoirHistorique }) {
  const [mps, setMps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mp_derives')
      .select('mp:mp_id(id, designation, reference, unite, stock_actuel, prix_revient), produit:produit_id(id, designation, reference, unite)')
      .then(({ data }) => {
        if (data) {
          // Regrouper par MP
          const grouped = {}
          data.forEach(d => {
            const mp = d.mp
            if (!mp) return
            if (!grouped[mp.id]) grouped[mp.id] = { ...mp, mp_derives: [] }
            grouped[mp.id].mp_derives.push({ produit: d.produit })
          })
          setMps(Object.values(grouped))
        }
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Production</h1>
        <button onClick={onVoirHistorique} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '9px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🕐 Historique</button>
      </div>

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}

      {!loading && mps.length === 0 && (
        <div style={{ background: C.indigoLight, borderRadius: 14, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏭</div>
          <div style={{ color: C.text, fontWeight: 700, fontSize: 15, fontFamily: F, marginBottom: 8 }}>Aucune MP avec produits dérivés</div>
          <div style={{ color: C.textSub, fontSize: 13, fontFamily: F }}>
            Allez dans <strong>Articles → fiche MP</strong> et cliquez sur <strong>"Produits dérivés"</strong> pour définir les produits issus de cette MP.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {mps.map(mp => (
          <div key={mp.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>{mp.designation}</div>
              <div style={{ color: C.textSub, fontSize: 11, fontFamily: F, marginTop: 2 }}>{mp.reference} · Stock : {mp.stock_actuel} {mp.unite}</div>
              {mp.prix_revient > 0 && <div style={{ color: C.indigo, fontSize: 11, fontFamily: F, fontWeight: 700, marginTop: 2 }}>Prix moyen : {fmt(Math.round(mp.prix_revient))} FCFA/{mp.unite}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {mp.mp_derives?.map(d => (
                <span key={d.id} style={{ background: C.bg, color: C.textSub, fontSize: 10, padding: '3px 8px', borderRadius: 99, fontFamily: F }}>{d.produit?.designation}</span>
              ))}
            </div>
            <button onClick={() => onLancerProduction(mp)}
              style={{ width: '100%', border: 'none', borderRadius: 9, padding: '10px 0', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ▶ Lancer une production
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Saisie production ────────────────────────────────────────────────────
function SaisieProduction({ mp, onBack, onSaved }) {
  const [derives, setDerives] = useState([])
  const [qteMp, setQteMp] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [qtesProduites, setQtesProduites] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mp_derives')
      .select('*, produit:produit_id(id, designation, reference, unite, stock_actuel, prix_revient, cout_composants)')
      .eq('mp_id', mp.id)
      .then(({ data }) => { if (data) setDerives(data); setLoading(false) })
  }, [mp.id])

  const prixMp = mp.prix_revient || 0
  const coutTotal = (parseFloat(qteMp) || 0) * prixMp

  // Calcul prix de revient par produit (répartition au prorata des quantités pondérées par prix de vente)
  function calcPrixRevient(produitId) {
    const qte = parseFloat(qtesProduites[produitId]) || 0
    if (!qte || !coutTotal) return null
    const produit = derives.find(d => d.produit_id === produitId)?.produit
    if (!produit) return null

    // Répartition : coût total MP / total des pièces produites (simple, proportionnel à la quantité)
    const totalQtes = Object.values(qtesProduites).reduce((s, q) => s + (parseFloat(q) || 0), 0)
    if (totalQtes === 0) return null

    const coutMpParPiece = (coutTotal * (qte / totalQtes)) / qte
    const coutComposants = produit.cout_composants || 0
    return Math.round((coutMpParPiece + coutComposants) * 100) / 100
  }

  const lignesAvecQte = derives.filter(d => parseFloat(qtesProduites[d.produit_id]) > 0)

  async function handleValider() {
    if (!qteMp || parseFloat(qteMp) <= 0) { setError('Quantité MP obligatoire'); return }
    if (parseFloat(qteMp) > mp.stock_actuel) { setError(`Stock insuffisant — disponible : ${mp.stock_actuel} ${mp.unite}`); return }
    if (lignesAvecQte.length === 0) { setError('Saisissez au moins une quantité produite'); return }

    setSaving(true); setError(null)
    const qteUsed = parseFloat(qteMp)

    // 1. Créer session production
    const { data: prod, error: e1 } = await supabase.from('productions').insert({
      mp_id: mp.id,
      date_production: date,
      qte_mp_utilisee: qteUsed,
      prix_achat_mp: prixMp,
      note: note || null,
    }).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }

    // 2. Déduire MP du stock
    await supabase.from('articles').update({ stock_actuel: mp.stock_actuel - qteUsed }).eq('id', mp.id)
    await supabase.from('mouvements_stock').insert({
      article_id: mp.id, type: 'sortie_production', quantite: qteUsed,
      date: new Date(date).toISOString(), reference_document: `Production depuis ${mp.designation}`,
      prix_unitaire: prixMp,
    })

    // 3. Ajouter produits finis au stock
    for (const d of lignesAvecQte) {
      const qte = parseFloat(qtesProduites[d.produit_id])
      const prix = calcPrixRevient(d.produit_id)
      const stockActuel = d.produit.stock_actuel || 0
      const prixActuel = d.produit.prix_revient || 0
      const nouveauStock = stockActuel + qte
      const nouveauPrix = prix
        ? (stockActuel === 0 ? prix : Math.round(((stockActuel * prixActuel) + (qte * prix)) / (stockActuel + qte) * 100) / 100)
        : prixActuel

      await supabase.from('articles').update({ stock_actuel: nouveauStock, prix_revient: nouveauPrix }).eq('id', d.produit_id)
      await supabase.from('mouvements_stock').insert({
        article_id: d.produit_id, type: 'entree', quantite: qte,
        date: new Date(date).toISOString(), reference_document: `Production : ${mp.designation}`,
        prix_unitaire: prix || null,
      })
      await supabase.from('lignes_production').insert({
        production_id: prod.id, produit_id: d.produit_id,
        qte_produite: qte, prix_revient_calcule: prix || null,
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
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, fontFamily: F, margin: 0 }}>Production — {mp.designation}</h1>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>Stock disponible : {mp.stock_actuel} {mp.unite} · Prix moyen : {fmt(Math.round(prixMp))} FCFA/{mp.unite}</div>
        </div>
      </div>

      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontFamily: F }}>{error}</div>}

      {/* Infos MP */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>1. Quantité utilisée</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Quantité {mp.unite} utilisée *</label>
            <input type="number" min="0" step="0.01" value={qteMp} onChange={e => setQteMp(e.target.value)}
              onWheel={e => e.target.blur()} placeholder={`max ${mp.stock_actuel}`} style={inputStyle} />
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
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>RÉPARTI SUR</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.indigo, fontFamily: F }}>{lignesAvecQte.length} produit(s)</div>
            </div>
          </div>
        )}
      </div>

      {/* Quantités produites */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>2. Quantités produites aujourd'hui</div>
        <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F, marginBottom: 14 }}>
          Saisissez uniquement ce qui a été produit — laissez vide ce qui n'a pas été fait
        </div>

        {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13 }}>Chargement...</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 90px 120px', gap: 0, background: C.text, borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
          {['Produit fini', 'Stock actuel', 'Qté produite', 'Prix revient/u'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: F }}>{h}</div>
          ))}
        </div>

        {derives.map((d, i) => {
          const qte = parseFloat(qtesProduites[d.produit_id]) || 0
          const prix = qte > 0 ? calcPrixRevient(d.produit_id) : null
          const hasQte = qte > 0
          return (
            <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 90px 120px', gap: 0, padding: '10px 14px', background: hasQte ? C.greenLight : i % 2 === 0 ? '#FAFBFF' : '#fff', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: hasQte ? 700 : 500, color: C.text, fontFamily: F }}>{d.produit?.designation}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{d.produit?.reference}</div>
              </div>
              <div style={{ fontSize: 13, color: C.textSub, fontFamily: F }}>{d.produit?.stock_actuel} {d.produit?.unite}</div>
              <div>
                <input type="number" min="0" step="0.01"
                  value={qtesProduites[d.produit_id] || ''}
                  onChange={e => setQtesProduites(prev => ({ ...prev, [d.produit_id]: e.target.value }))}
                  onWheel={e => e.target.blur()}
                  placeholder="0"
                  style={{ width: 80, height: 34, border: `1.5px solid ${hasQte ? C.green : C.border2}`, borderRadius: 7, padding: '0 8px', fontFamily: F, fontSize: 12, textAlign: 'right' }}
                />
              </div>
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
          {saving ? 'Enregistrement...' : `✅ Valider la production (${lignesAvecQte.length} produit${lignesAvecQte.length > 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}

// ─── Historique ───────────────────────────────────────────────────────────
function HistoriqueProductions({ onBack }) {
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('productions')
      .select('*, mp:mp_id(designation, reference), lignes_production(id, qte_produite, prix_revient_calcule, produit:produit_id(designation, unite))')
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
              <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F }}>{p.mp?.designation}</div>
              <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>
                {new Date(p.date_production).toLocaleDateString('fr-FR')} · {p.qte_mp_utilisee} {p.mp?.reference?.replace(/\d+/, '') || 'u'} utilisée(s)
              </div>
              {p.note && <div style={{ color: C.textMuted, fontSize: 11, fontFamily: F }}>{p.note}</div>}
            </div>
            <div style={{ background: C.indigoLight, borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.textMuted, fontFamily: F, fontWeight: 700 }}>COÛT MP</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.indigo, fontFamily: F }}>{fmt(Math.round(p.qte_mp_utilisee * p.prix_achat_mp))} FCFA</div>
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
  const [vue, setVue] = useState('liste')
  const [mpSelectionnee, setMpSelectionnee] = useState(null)

  if (vue === 'production') return <SaisieProduction mp={mpSelectionnee} onBack={() => setVue('liste')} onSaved={() => setVue('liste')} />
  if (vue === 'historique') return <HistoriqueProductions onBack={() => setVue('liste')} />
  return <ListeMP onLancerProduction={mp => { setMpSelectionnee(mp); setVue('production') }} onVoirHistorique={() => setVue('historique')} />
}
