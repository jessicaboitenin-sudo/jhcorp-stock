import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const C = { bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF', text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2', indigo: '#6954C4', indigoLight: '#E8E3FA', green: '#2A7A50', greenLight: '#E6F4ED', red: '#B5273A', redLight: '#FDECEA', orange: '#C2610F', orangeLight: '#FDF0E8' }
const F = "'Montserrat', sans-serif"

export default function Inventaire() {
  const [articles, setArticles] = useState([])
  const [inventaires, setInventaires] = useState([])
  const [comptes, setComptes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [actif, setActif] = useState('liste')

  async function load() {
    setLoading(true)
    const { data: arts } = await supabase.from('articles').select('*').order('designation')
    const { data: invs } = await supabase.from('inventaires').select('*, lignes_inventaire(*, articles(designation,unite))').order('created_at', { ascending: false }).limit(5)
    if (arts) setArticles(arts)
    if (invs) setInventaires(invs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSoumettre() {
    setSaving(true)
    const numero = `INV-${Date.now().toString().slice(-8)}`
    const { data: inv, error } = await supabase.from('inventaires').insert({ numero, statut: 'soumis' }).select().single()
    if (error) { setSaving(false); return }
    const rows = articles.map(a => ({ inventaire_id: inv.id, article_id: a.id, stock_theorique: a.stock_actuel, stock_compte: comptes[a.id] !== undefined ? parseFloat(comptes[a.id]) : null }))
    await supabase.from('lignes_inventaire').insert(rows)
    setSaving(false); setSuccess('Inventaire soumis — en attente de validation par le comptable'); setComptes({}); setActif('liste'); load()
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleValider(invId) {
    const { data: inv } = await supabase.from('inventaires').select('*, lignes_inventaire(*, articles(id,stock_actuel))').eq('id', invId).single()
    if (!inv) return
    for (const l of inv.lignes_inventaire) {
      if (l.stock_compte !== null) {
        await supabase.from('articles').update({ stock_actuel: l.stock_compte }).eq('id', l.article_id)
        const ecart = l.stock_compte - l.stock_theorique
        if (ecart !== 0) await supabase.from('mouvements_stock').insert({ article_id: l.article_id, type: 'ajustement_inventaire', quantite: Math.abs(ecart), reference_document: inv.numero })
      }
    }
    await supabase.from('inventaires').update({ statut: 'valide' }).eq('id', invId)
    load()
  }

  const STATUT = { brouillon: { label: 'Brouillon', color: C.textSub }, soumis: { label: 'Soumis', color: C.orange }, valide: { label: 'Valide', color: C.green } }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: 0 }}>Inventaire</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setActif('nouveau')} style={{ border: 'none', borderRadius: 10, padding: '10px 18px', background: C.indigo, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Nouvel inventaire</button>
        </div>
      </div>

      {success && <div style={{ background: C.greenLight, border: `1px solid ${C.green}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.green, fontWeight: 700, fontSize: 12, fontFamily: F }}>✅ {success}</div>}

      {actif === 'nouveau' && (
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, fontFamily: F }}>Comptage physique</div>
            <button onClick={() => setActif('liste')} style={{ border: `1.5px solid ${C.border2}`, borderRadius: 8, padding: '6px 12px', background: C.surface, color: C.text, fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
          </div>
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px', gap: 8, padding: '10px 0 6px', borderBottom: `1px solid ${C.border}` }}>
              {['Article', 'Theorique', 'Compte', 'Ecart'].map(h => <span key={h} style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, fontFamily: F, textTransform: 'uppercase' }}>{h}</span>)}
            </div>
            {loading ? <div style={{ padding: 20, color: C.textSub, fontFamily: F }}>Chargement...</div> : articles.map(a => {
              const compte = comptes[a.id]
              const ecart = compte !== undefined && compte !== '' ? parseFloat(compte) - a.stock_actuel : null
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 60px', gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div><div style={{ color: C.text, fontSize: 12, fontWeight: 600, fontFamily: F }}>{a.designation}</div><div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>{a.unite}</div></div>
                  <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>{a.stock_actuel}</span>
                  <input type="number" min="0" placeholder="—" value={comptes[a.id] ?? ''} onChange={ev => setComptes(p => ({ ...p, [a.id]: ev.target.value }))} style={{ width: '100%', height: 32, border: `1.5px solid ${comptes[a.id] !== undefined ? C.indigo : C.border2}`, borderRadius: 8, padding: '0 8px', fontFamily: F, fontSize: 12, boxSizing: 'border-box' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, fontFamily: F, color: ecart === null ? C.textMuted : ecart === 0 ? C.green : C.red }}>{ecart === null ? '—' : ecart > 0 ? `+${ecart}` : ecart}</span>
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
          <div key={inv.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: C.indigo, fontSize: 13, fontWeight: 700, fontFamily: F }}>{inv.numero}</span>
                <span style={{ color: meta.color, fontSize: 11, fontWeight: 700, fontFamily: F }}>● {meta.label}</span>
              </div>
              <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{new Date(inv.created_at).toLocaleDateString('fr-FR')} · {inv.lignes_inventaire?.length} article(s)</div>
            </div>
            {inv.statut === 'soumis' && (
              <button onClick={() => handleValider(inv.id)} style={{ border: 'none', borderRadius: 9, padding: '8px 14px', background: C.green, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Valider (comptable)</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
