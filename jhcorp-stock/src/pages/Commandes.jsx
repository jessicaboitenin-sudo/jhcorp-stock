import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', blue: '#2554A8', blueLight: '#EBF2FB', orange: '#C2610F', orangeLight: '#FDF0E8' }
const F = "'Montserrat', sans-serif"

const STATUT = {
  en_attente: { label: 'En attente', color: C.blue, bg: C.blueLight },
  utilisee: { label: 'Utilisee', color: C.textSub, bg: C.bg },
  annulee: { label: 'Annulee', color: C.red, bg: C.redLight }
}

function ReconciliationPanel({ commande, articles, recettes, onClose }) {
  const lignes = commande.lignes_commande || []

  // Pour chaque ligne de commande, calculer la situation
  const analyse = lignes.map(ligne => {
    const article = articles.find(a => a.reference === ligne.sku)
    if (!article) return {
      sku: ligne.sku, nom: ligne.nom_produit, qteCommandee: ligne.quantite_commandee,
      trouve: false, stockFini: 0, aProduire: 0, achatsNecessaires: [], statut: 'inconnu'
    }

    const qteCommandee = ligne.quantite_commandee
    const stockFini = article.stock_actuel

    // Niveau 1 : stock fini suffit ?
    if (stockFini >= qteCommandee) {
      return { sku: ligne.sku, nom: article.designation, qteCommandee, trouve: true, stockFini, aProduire: 0, achatsNecessaires: [], statut: 'ok' }
    }

    const manqueFini = qteCommandee - stockFini
    const recetteArticle = recettes.filter(r => r.article_id === article.id)

    // Pas de recette — achat direct nécessaire
    if (recetteArticle.length === 0) {
      return {
        sku: ligne.sku, nom: article.designation, qteCommandee, trouve: true, stockFini,
        aProduire: 0,
        achatsNecessaires: [{ nom: article.designation, reference: article.reference, manque: manqueFini, unite: article.unite }],
        statut: 'achat_direct'
      }
    }

    // Niveau 2 : vérifier les ingrédients pour produire la différence
    const achatsNecessaires = []
    recetteArticle.forEach(r => {
      const ingredient = articles.find(a => a.id === r.ingredient_id)
      if (!ingredient) return
      const qteIngredientNecessaire = Math.ceil(manqueFini * r.quantite_par_unite)
      const stockIngredient = ingredient.stock_actuel
      if (stockIngredient < qteIngredientNecessaire) {
        achatsNecessaires.push({
          nom: ingredient.designation,
          reference: ingredient.reference,
          manque: qteIngredientNecessaire - stockIngredient,
          stockActuel: stockIngredient,
          necessaire: qteIngredientNecessaire,
          unite: ingredient.unite,
        })
      }
    })

    return {
      sku: ligne.sku, nom: article.designation, qteCommandee, trouve: true, stockFini,
      aProduire: manqueFini,
      achatsNecessaires,
      statut: achatsNecessaires.length === 0 ? 'produire_possible' : 'achat_ingredients'
    }
  })

  const totalAchats = analyse.filter(a => a.achatsNecessaires.length > 0)
  const totalOk = analyse.filter(a => a.statut === 'ok')
  const totalProduire = analyse.filter(a => a.statut === 'produire_possible')

  const statusMeta = {
    ok: { label: 'Stock OK', color: C.green, bg: C.greenLight, icon: '✅' },
    produire_possible: { label: 'A produire', color: C.indigo, bg: C.indigoLight, icon: '🏭' },
    achat_direct: { label: 'Achat necessaire', color: C.red, bg: C.redLight, icon: '🛒' },
    achat_ingredients: { label: 'Achats ingredients', color: C.orange, bg: C.orangeLight, icon: '⚠️' },
    inconnu: { label: 'SKU inconnu', color: C.textSub, bg: C.bg, icon: '❓' },
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 520, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16, fontFamily: F }}>Reconciliation — {commande.numero_bc}</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>
            {totalOk.length} OK · {totalProduire.length} a produire · {totalAchats.length} achat(s) necessaire(s)
          </div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: C.bg, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
        {analyse.map((a, i) => {
          const meta = statusMeta[a.statut]
          return (
            <div key={i} style={{ background: meta.bg, borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: `1.5px solid ${meta.color}22` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: a.achatsNecessaires.length > 0 ? 10 : 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 16 }}>{meta.icon}</span>
                    <span style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F }}>{a.nom}</span>
                  </div>
                  <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{a.sku}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ background: meta.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>{meta.label}</span>
                  <div style={{ color: C.textSub, fontSize: 11, fontFamily: F, marginTop: 4 }}>
                    Commandé {a.qteCommandee} · Stock {a.stockFini}
                    {a.aProduire > 0 && <span style={{ color: C.indigo }}> · A produire {a.aProduire}</span>}
                  </div>
                </div>
              </div>

              {/* Détail achats nécessaires */}
              {a.achatsNecessaires.length > 0 && (
                <div style={{ borderTop: `1px solid ${meta.color}33`, paddingTop: 10 }}>
                  <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, fontFamily: F, textTransform: 'uppercase', marginBottom: 6 }}>Achats necessaires</div>
                  {a.achatsNecessaires.map((ac, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, fontFamily: F }}>
                      <span style={{ color: C.text }}>{ac.nom} <span style={{ color: C.textMuted }}>({ac.reference})</span></span>
                      <span style={{ color: C.red, fontWeight: 800 }}>−{ac.manque} {ac.unite}</span>
                    </div>
                  ))}
                </div>
              )}

              {!a.trouve && (
                <div style={{ color: C.red, fontSize: 11, fontFamily: F, marginTop: 4 }}>
                  ⚠️ Ce SKU n'existe pas dans votre catalogue articles
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ width: '100%', border: 'none', borderRadius: 10, padding: 12, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Fermer</button>
      </div>
    </div>
  )
}

export default function Commandes() {
  const [commandes, setCommandes] = useState([])
  const [articles, setArticles] = useState([])
  const [recettes, setRecettes] = useState([])
  const [loading, setLoading] = useState(true)
  const [manuelle, setManuelle] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [reconciliation, setReconciliation] = useState(null)
  const [form, setForm] = useState({ numeroBC: '', dateLivraison: '', lignes: [{ sku: '', nom_produit: '', quantite_commandee: '' }] })
  const fileRef = useRef()

  async function load() {
    setLoading(true)
    const { data: cmds } = await supabase.from('commandes').select('*, lignes_commande(*)').order('created_at', { ascending: false })
    const { data: arts } = await supabase.from('articles').select('*')
    const { data: recs } = await supabase.from('recettes').select('*')
    if (cmds) setCommandes(cmds)
    if (arts) setArticles(arts)
    if (recs) setRecettes(recs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleFileExcel(ev) {
    const file = ev.target.files[0]
    if (!file) return
    setParsing(true); setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (rows.length === 0) { setError('Fichier vide ou format incorrect'); setParsing(false); return }

      const groupes = {}
      rows.forEach(row => {
        const po = (row['po_number'] || row['PO Number'] || '').toString().trim()
        const sku = (row['sku_id'] || row['SKU'] || row['sku'] || '').toString().trim()
        const nom = (row['product_name'] || row['Product Name'] || '').toString().trim()
        const qte = parseFloat(row['ordered_qty'] || row['Quantity'] || 0)
        const dateRaw = row['po_expected_delivery_at'] || row['delivery_date'] || ''
        let date = ''
        if (dateRaw) { const d = new Date(dateRaw); if (!isNaN(d)) date = d.toISOString().slice(0, 10) }
        if (!po) return
        if (!groupes[po]) groupes[po] = { numeroBC: po, dateLivraison: date, lignes: [] }
        if (sku && nom) groupes[po].lignes.push({ sku, nom_produit: nom, quantite_commandee: qte })
      })

      const cmds = Object.values(groupes)
      if (cmds.length === 0) { setError('Aucune commande trouvee. Colonnes attendues : po_number, sku_id, product_name, ordered_qty, po_expected_delivery_at'); setParsing(false); return }

      for (const cmd of cmds) {
        const { data: c, error: e1 } = await supabase.from('commandes').insert({ numero_bc: cmd.numeroBC, date_livraison: cmd.dateLivraison || new Date().toISOString().slice(0, 10), statut: 'en_attente' }).select().single()
        if (e1) continue
        if (cmd.lignes.length > 0) {
          await supabase.from('lignes_commande').insert(cmd.lignes.map(l => ({ commande_id: c.id, sku: l.sku, nom_produit: l.nom_produit, quantite_commandee: l.quantite_commandee })))
        }
      }
      setSuccess(`${cmds.length} commande(s) importee(s)`)
      load(); setTimeout(() => setSuccess(null), 4000)
    } catch (e) { setError('Erreur lecture fichier : ' + e.message) }
    setParsing(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function updateLigne(i, field, val) {
    setForm(p => ({ ...p, lignes: p.lignes.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }))
  }

  async function handleImportManuel() {
    if (!form.numeroBC || !form.dateLivraison) { setError('Numero BC et date de livraison sont obligatoires'); return }
    const lignesValides = form.lignes.filter(l => l.sku && l.nom_produit && l.quantite_commandee)
    if (lignesValides.length === 0) { setError('Ajoutez au moins une ligne'); return }
    setError(null)
    const { data: cmd, error: e1 } = await supabase.from('commandes').insert({ numero_bc: form.numeroBC, date_livraison: form.dateLivraison, statut: 'en_attente' }).select().single()
    if (e1) { setError(e1.message); return }
    await supabase.from('lignes_commande').insert(lignesValides.map(l => ({ commande_id: cmd.id, sku: l.sku, nom_produit: l.nom_produit, quantite_commandee: parseFloat(l.quantite_commandee) })))
    setSuccess('Commande importee'); setManuelle(false)
    setForm({ numeroBC: '', dateLivraison: '', lignes: [{ sku: '', nom_produit: '', quantite_commandee: '' }] })
    load(); setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Commandes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📊 Importer un fichier commande
          </button>
          <button onClick={() => setManuelle(true)}
            style={{ border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: '10px 18px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Saisie manuelle
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileExcel} style={{ display: 'none' }} />

      {parsing && <div style={{ background: C.indigoLight, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.indigo, fontWeight: 700, fontSize: 12, fontFamily: F }}>⏳ Lecture du fichier en cours...</div>}
      {success && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ {success}</div>}
      {error && <div style={{ background: C.redLight, color: C.red, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: F }}>{error}</div>}

      <div style={{ background: C.indigoLight, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: C.indigo, fontFamily: F, lineHeight: 1.6 }}>
        ℹ️ Colonnes attendues dans le fichier Excel : <strong>po_number</strong>, <strong>sku_id</strong>, <strong>product_name</strong>, <strong>ordered_qty</strong>, <strong>po_expected_delivery_at</strong> — le SKU doit correspondre a la reference de l'article dans votre catalogue
      </div>

      {manuelle && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F, marginBottom: 14 }}>Nouvelle commande</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Numero BC *</label>
              <input value={form.numeroBC} onChange={ev => setForm(p => ({ ...p, numeroBC: ev.target.value }))} placeholder="ex: PO019606"
                style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: C.textSub, fontWeight: 700, fontFamily: F }}>Date de livraison *</label>
              <input type="date" value={form.dateLivraison} onChange={ev => setForm(p => ({ ...p, dateLivraison: ev.target.value }))}
                style={{ width: '100%', height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13, marginTop: 4, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>SKU / REFERENCE</span>
            <span style={{ flex: 2, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>NOM PRODUIT</span>
            <span style={{ width: 100, fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F }}>QTE</span>
            <span style={{ width: 20 }} />
          </div>
          {form.lignes.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={l.sku} onChange={ev => updateLigne(i, 'sku', ev.target.value)} placeholder="ex: ANANAS-001"
                style={{ flex: 1, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
              <input value={l.nom_produit} onChange={ev => updateLigne(i, 'nom_produit', ev.target.value)} placeholder="Nom du produit"
                style={{ flex: 2, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 12 }} />
              <input type="number" value={l.quantite_commandee} onChange={ev => updateLigne(i, 'quantite_commandee', ev.target.value)}
                onWheel={ev => ev.target.blur()} placeholder="0"
                style={{ width: 100, height: 38, border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '0 10px', fontFamily: F, fontSize: 13 }} />
              <span onClick={() => setForm(p => ({ ...p, lignes: p.lignes.filter((_, idx) => idx !== i) }))} style={{ alignSelf: 'center', cursor: 'pointer', color: C.red }}>✕</span>
            </div>
          ))}
          <div onClick={() => setForm(p => ({ ...p, lignes: [...p.lignes, { sku: '', nom_produit: '', quantite_commandee: '' }] }))}
            style={{ color: C.indigo, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer', marginBottom: 16 }}>+ Ajouter une ligne</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setManuelle(false)} style={{ flex: 1, border: `1.5px solid ${C.border2}`, borderRadius: 10, padding: 11, background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button onClick={handleImportManuel} style={{ flex: 1, border: 'none', borderRadius: 10, padding: 11, background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Importer</button>
          </div>
        </div>
      )}

      {loading && <div style={{ color: C.textSub, fontFamily: F, fontSize: 13, padding: 20 }}>Chargement...</div>}
      {!loading && commandes.length === 0 && (
        <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>
          Aucune commande. Importez un fichier Excel ou faites une saisie manuelle.
        </div>
      )}

      {commandes.map(cmd => {
        const meta = STATUT[cmd.statut] || STATUT.en_attente
        return (
          <div key={cmd.id} style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: C.text, fontWeight: 800, fontSize: 15, fontFamily: F }}>{cmd.numero_bc}</span>
                  <span style={{ background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>{meta.label}</span>
                </div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F, marginTop: 3 }}>
                  Livraison : {cmd.date_livraison ? new Date(cmd.date_livraison).toLocaleDateString('fr-FR') : '—'} · {cmd.lignes_commande?.length || 0} produit(s)
                </div>
              </div>
              <button onClick={() => setReconciliation(cmd)}
                style={{ border: `1.5px solid ${C.indigo}`, borderRadius: 9, padding: '8px 14px', background: C.indigoLight, color: C.indigo, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                🔍 Reconciliation
              </button>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              {cmd.lignes_commande?.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, fontFamily: F }}>
                  <span style={{ color: C.text }}>{l.nom_produit} <span style={{ color: C.textMuted }}>({l.sku})</span></span>
                  <span style={{ color: C.text, fontWeight: 700 }}>{l.quantite_commandee}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {reconciliation && (
        <>
          <div onClick={() => setReconciliation(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,22,48,0.2)', zIndex: 99 }} />
          <ReconciliationPanel
            commande={reconciliation}
            articles={articles}
            recettes={recettes}
            onClose={() => setReconciliation(null)}
          />
        </>
      )}
    </div>
  )
}
