import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8', blue: '#2554A8', blueLight: '#EBF2FB' }
const F = "'Montserrat', sans-serif"
const STATUT_META = { valide: { label: 'Valide', color: C.blue, bg: C.blueLight }, ajuste: { label: 'Ajuste', color: C.orange, bg: C.orangeLight }, confirme: { label: 'Confirme', color: C.green, bg: C.greenLight } }

export default function Livraison() {
  const [bls, setBls] = useState([])
  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [ajusting, setAjusting] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [cmdChoisie, setCmdChoisie] = useState(null)
  const [lignesBl, setLignesBl] = useState([])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: blsData } = await supabase.from('bons_livraison').select('*, lignes_bon_livraison(*,articles(designation,unite))').order('created_at', { ascending: false })
    const { data: cmdsData } = await supabase.from('commandes').select('*, lignes_commande(*)').eq('statut', 'en_attente')
    if (blsData) setBls(blsData)
    if (cmdsData) setCommandes(cmdsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function choisirCommande(cmd) {
    setCmdChoisie(cmd)
    setLignesBl(cmd.lignes_commande.map(l => ({ ...l, quantite_livree: l.quantite_commandee, observation: '' })))
  }

  async function handleCreer() {
    if (!cmdChoisie) return
    setSaving(true); setError(null)
    const numero = `BL-${Date.now().toString().slice(-8)}`
    const { data: bl, error: e1 } = await supabase.from('bons_livraison').insert({ numero, commande_id: cmdChoisie.id, numero_bc: cmdChoisie.numero_bc, date_livraison: cmdChoisie.date_livraison, client: 'Glovo', statut: 'valide' }).select().single()
    if (e1) { setError(e1.message); setSaving(false); return }
    for (const l of lignesBl) {
      const { data: article } = await supabase.from('articles').select('id,stock_actuel').eq('reference', l.sku).single()
      const artId = article?.id || null
      await supabase.from('lignes_bon_livraison').insert({ bon_livraison_id: bl.id, article_id: artId, sku: l.sku, nom_produit: l.nom_produit, quantite_commandee: l.quantite_commandee, quantite_livree: parseFloat(l.quantite_livree) || 0, observation: l.observation || '' })
      if (artId && article) {
        const qte = parseFloat(l.quantite_livree) || 0
        await supabase.from('articles').update({ stock_actuel: Math.max(0, article.stock_actuel - qte) }).eq('id', artId)
        await supabase.from('mouvements_stock').insert({ article_id: artId, type: 'sortie_bl', quantite: qte, reference_document: numero })
      }
    }
    await supabase.from('commandes').update({ statut: 'utilisee', bon_livraison_id: bl.id }).eq('id', cmdChoisie.id)
    setSaving(false); setCreating(false); setCmdChoisie(null); setLignesBl([]); load()
  }

  async function handleAjustement(lignesAjustees) {
    if (!ajusting) return
    setSaving(true)
    for (let i = 0; i < lignesAjustees.length; i++) {
      const l = lignesAjustees[i]
      const orig = ajusting.lignes_bon_livraison[i]
      const ecart = (orig.quantite_livree || 0) - (parseFloat(l.quantite_livree) || 0)
      await supabase.from('lignes_bon_livraison').update({ quantite_livree: parseFloat(l.quantite_livree) || 0, observation: l.observation || '' }).eq('id', orig.id)
      if (ecart > 0 && orig.article_id) {
        const { data: art } = await supabase.from('articles').select('stock_actuel').eq('id', orig.article_id).single()
        await supabase.from('articles').update({ stock_actuel: Math.max(0, (art?.stock_actuel || 0) - ecart) }).eq('id', orig.article_id)
        await supabase.from('mouvements_stock').insert({ article_id: orig.article_id, type: 'casse_bl', quantite: ecart, reference_document: ajusting.numero })
      }
    }
    await supabase.from('bons_livraison').update({ statut: 'ajuste' }).eq('id', ajusting.id)
    setSaving(false); setAjusting(null); load()
  }

  async function confirmer(id) {
    await supabase.from('bons_livraison').update({ statut: 'confirme' }).eq('id', id); load()
  }

  if (viewing) {
    const bl = viewing
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>Apercu BL</h1>
          <button onClick={() => setViewing(null)} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '8px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Retour</button>
        </div>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 28, maxWidth: 600 }}>
          <div style={{ color: C.indigo, fontWeight: 900, fontSize: 18, fontFamily: F, marginBottom: 4 }}>JH Corporation</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginBottom: 20 }}>Bon de livraison</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <div><div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Numero BL</div><div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F }}>{bl.numero}</div></div>
            <div><div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Numero BC</div><div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F }}>{bl.numero_bc}</div></div>
            <div><div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Date livraison</div><div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F }}>{new Date(bl.date_livraison).toLocaleDateString('fr-FR')}</div></div>
            <div><div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>Client</div><div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F }}>{bl.client}</div></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead><tr>
              {['Produit / SKU', 'Commande', 'Livre', 'Observation'].map(h => <th key={h} style={{ textAlign: h === 'Produit / SKU' ? 'left' : 'right', fontSize: 10, color: C.textMuted, fontFamily: F, paddingBottom: 8 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bl.lignes_bon_livraison?.map(l => (
                <tr key={l.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 0', fontSize: 12, color: C.text, fontFamily: F }}>{l.nom_produit}<div style={{ fontSize: 10, color: C.textMuted }}>{l.sku}</div></td>
                  <td style={{ padding: '8px 0', fontSize: 12, color: C.textSub, fontFamily: F, textAlign: 'right' }}>{l.quantite_commandee}</td>
                  <td style={{ padding: '8px 0', fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F, textAlign: 'right' }}>{l.quantite_livree}</td>
                  <td style={{ padding: '8px 0', fontSize: 11, color: C.textSub, fontFamily: F, textAlign: 'right' }}>{l.observation || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => window.print()} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🖨️ Imprimer</button>
        </div>
      </div>
    )
  }

  if (ajusting) {
    const [lignesAj, setLignesAj] = useState(ajusting.lignes_bon_livraison.map(l => ({ ...l })))
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>Ajuster {ajusting.numero}</h1>
          <button onClick={() => setAjusting(null)} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '8px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        </div>
        <div style={{ background: C.orangeLight, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: C.orange, fontFamily: F }}>Tout ecart en moins est traite comme une casse, deduite du stock sans jamais y revenir</div>
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 2, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>PRODUIT</span>
            <span style={{ width: 90, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>QTE LIVREE</span>
            <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>OBSERVATION</span>
          </div>
          {lignesAj.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ flex: 2, fontSize: 12, color: C.text, fontFamily: F }}>{l.nom_produit}</span>
              <input type="number" value={l.quantite_livree} onChange={ev => setLignesAj(prev => prev.map((x, idx) => idx === i ? { ...x, quantite_livree: ev.target.value } : x))} style={{ width: 90, height: 36, border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
              <input value={l.observation || ''} onChange={ev => setLignesAj(prev => prev.map((x, idx) => idx === i ? { ...x, observation: ev.target.value } : x))} style={{ flex: 1, height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
            </div>
          ))}
          <button onClick={() => handleAjustement(lignesAj)} disabled={saving} style={{ width: '100%', marginTop: 12, border: 'none', borderRadius: 10, padding: 13, background: C.orange, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer l\'ajustement'}
          </button>
        </div>
      </div>
    )
  }

  if (creating && !cmdChoisie) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>Nouveau BL — Choisir une commande</h1>
          <button onClick={() => setCreating(false)} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '8px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        </div>
        {commandes.length === 0 && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucune commande en attente. Le comptable doit importer une commande dans l'ecran Commandes.</div>}
        {commandes.map(cmd => (
          <div key={cmd.id} onClick={() => choisirCommande(cmd)} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: '14px 18px', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>{cmd.numero_bc}</div>
            <div style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>Livraison prevue : {new Date(cmd.date_livraison).toLocaleDateString('fr-FR')} · {cmd.lignes_commande?.length} produit(s)</div>
          </div>
        ))}
      </div>
    )
  }

  if (creating && cmdChoisie) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, fontFamily: F, margin: 0 }}>Nouveau BL — {cmdChoisie.numero_bc}</h1>
          <button onClick={() => setCmdChoisie(null)} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '8px 16px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Retour</button>
        </div>
        <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginBottom: 16 }}>Date de livraison : {new Date(cmdChoisie.date_livraison).toLocaleDateString('fr-FR')}</div>
        {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: F }}>{error}</div>}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ flex: 2, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>PRODUIT / SKU</span>
            <span style={{ width: 80, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>COMMANDE</span>
            <span style={{ width: 90, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>LIVREE</span>
            <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>OBSERVATION</span>
          </div>
          {lignesBl.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F }}>{l.nom_produit}</div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: F }}>{l.sku}</div>
              </div>
              <span style={{ width: 80, textAlign: 'center', color: C.textSub, fontSize: 13, fontFamily: F }}>{l.quantite_commandee}</span>
              <input type="number" value={l.quantite_livree} onChange={ev => setLignesBl(prev => prev.map((x, idx) => idx === i ? { ...x, quantite_livree: ev.target.value } : x))} style={{ width: 90, height: 36, border: `2px solid ${C.indigo}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
              <input value={l.observation || ''} onChange={ev => setLignesBl(prev => prev.map((x, idx) => idx === i ? { ...x, observation: ev.target.value } : x))} placeholder="-" style={{ flex: 1, height: 36, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
            </div>
          ))}
          <button onClick={handleCreer} disabled={saving} style={{ width: '100%', marginTop: 12, border: 'none', borderRadius: 10, padding: 13, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creation en cours...' : 'Creer le BL'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Livraison</h1>
        <button onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouveau BL</button>
      </div>
      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {!loading && bls.length === 0 && <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun bon de livraison. Cliquez sur "+ Nouveau BL".</div>}
      {bls.map(bl => {
        const meta = STATUT_META[bl.statut] || STATUT_META.valide
        return (
          <div key={bl.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{bl.numero} · BC {bl.numero_bc}</span>
                  <span style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>{meta.label}</span>
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 15, fontFamily: F, marginTop: 3 }}>{bl.client}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{new Date(bl.date_livraison).toLocaleDateString('fr-FR')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => setViewing(bl)} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 9, padding: '8px 12px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📄 PDF</button>
                {bl.statut === 'valide' && <button onClick={() => setAjusting(bl)} style={{ border: `1.5px solid ${C.orange}`, borderRadius: 9, padding: '8px 12px', background: C.surface, color: C.orange, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✏️ Ajuster</button>}
                {(bl.statut === 'valide' || bl.statut === 'ajuste') && <button onClick={() => confirmer(bl.id)} style={{ border: 'none', borderRadius: 9, padding: '8px 12px', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Confirmer</button>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
