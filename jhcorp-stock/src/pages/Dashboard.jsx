import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F6F4FD', surface: '#FFFFFF', border: '#E8E3FA', border2: '#D0C5EF',
  text: '#1A1630', textSub: '#7B72A8', textMuted: '#B5A6E2',
  indigo: '#6954C4', indigoLight: '#E8E3FA', indigoMid: '#B5A6E2',
  green: '#2A7A50', greenLight: '#E6F4ED',
  orange: '#C2610F', orangeLight: '#FDF0E8',
  red: '#B5273A', redLight: '#FDECEA',
}
const F = "'Montserrat', sans-serif"

function Vignette({ url, size = 36 }) {
  const [err, setErr] = useState(false)
  if (!url || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, background: C.indigoLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.45 }}>
        📦
      </div>
    )
  }
  return <img src={url} alt="" onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${C.border}` }} />
}

function telechargerCSV(articles, nomFichier) {
  const entetes = ['reference', 'designation', 'categorie', 'unite', 'stock_actuel', 'stock_minimum']
  const lignes = articles.map(a => [
    a.reference,
    `"${a.designation}"`,
    a.categorie || '',
    a.unite,
    a.stock_actuel,
    a.stock_minimum,
  ])
  const contenu = [entetes.join(','), ...lignes.map(l => l.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(url)
}

function PanneauDetail({ titre, articles, couleur, bg, nomFichier, onClose, onVoirArticle }) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: C.surface, boxShadow: '-4px 0 24px rgba(26,22,48,0.12)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16, fontFamily: F }}>{titre}</div>
          <div style={{ color: C.textSub, fontSize: 12, fontFamily: F, marginTop: 2 }}>{articles.length} article(s)</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: C.bg, borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: C.textSub }}>✕</button>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {articles.length === 0 && (
          <div style={{ color: C.textMuted, fontFamily: F, fontSize: 13, textAlign: 'center', padding: 40 }}>Aucun article</div>
        )}
        {articles.map(a => (
          <div key={a.id} onClick={() => onVoirArticle(a)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <Vignette url={a.photo_url} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13, fontFamily: F, marginBottom: 2 }}>{a.designation}</div>
              <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>{a.reference} · {a.categorie || 'Sans categorie'}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: couleur, fontSize: 16, fontWeight: 900, fontFamily: F }}>{a.stock_actuel}</div>
              <div style={{ color: C.textMuted, fontSize: 10, fontFamily: F }}>/ min {a.stock_minimum} {a.unite}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer avec bouton télécharger */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
        <button onClick={() => telechargerCSV(articles, nomFichier)}
          style={{ flex: 1, border: `1.5px solid ${couleur}`, borderRadius: 10, padding: '11px', background: C.surface, color: couleur, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          ⬇️ Telecharger la liste
        </button>
        <button onClick={onClose}
          style={{ flex: 1, border: 'none', borderRadius: 10, padding: '11px', background: couleur, color: '#fff', fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [articles, setArticles] = useState([])
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [panneau, setPanneau] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: arts } = await supabase.from('articles').select('*').order('designation')
      const { data: mvts } = await supabase.from('mouvements_stock').select('*, articles(designation)').order('date', { ascending: false }).limit(10)
      if (arts) setArticles(arts)
      if (mvts) setMouvements(mvts)
      setLoading(false)
    }
    load()
  }, [])

  const articulesRupture = articles.filter(a => a.stock_actuel === 0)
  const articlesBas = articles.filter(a => a.stock_actuel > 0 && a.stock_actuel <= a.stock_minimum)
  const vendables = articles.filter(a => a.vendable_directement).length
  const ingredients = articles.filter(a => a.utilise_en_recette).length

  const MOUV_META = {
    entree: { label: 'Entree', color: C.green, bg: C.greenLight, signe: '+' },
    sortie_production: { label: 'Sortie prod', color: C.red, bg: C.redLight, signe: '-' },
    sortie_bl: { label: 'Sortie BL', color: C.red, bg: C.redLight, signe: '-' },
    casse_bl: { label: 'Casse BL', color: C.orange, bg: C.orangeLight, signe: '-' },
    ajustement_inventaire: { label: 'Ajustement', color: C.indigo, bg: C.indigoLight, signe: '±' },
  }

  const cards = [
    { label: 'Articles', value: articles.length, sub: `${vendables} vendables · ${ingredients} ingredients`, icon: '📦', couleur: C.indigo, clickable: false },
    { label: 'Ruptures', value: articulesRupture.length, sub: 'Cliquer pour le detail', icon: '🔴', couleur: C.red, clickable: true, key: 'rupture' },
    { label: 'Stock bas', value: articlesBas.length, sub: 'Cliquer pour le detail', icon: '🟠', couleur: C.orange, clickable: true, key: 'bas' },
  ]

  return (
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, fontFamily: F, margin: '0 0 20px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => c.clickable && setPanneau(c.key)} style={{
            background: C.surface, borderRadius: 14, padding: '16px 18px',
            border: panneau === c.key ? `2px solid ${c.couleur}` : `1px solid ${C.border}`,
            cursor: c.clickable ? 'pointer' : 'default',
            boxShadow: c.clickable ? '0 2px 8px rgba(26,22,48,0.06)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ color: C.textSub, fontSize: 12, fontFamily: F }}>{c.label}</span>
              {c.clickable && <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: 11 }}>↗</span>}
            </div>
            <div style={{ color: loading ? C.textMuted : c.couleur, fontSize: 32, fontWeight: 900, fontFamily: F }}>{loading ? '...' : c.value}</div>
            <div style={{ color: c.clickable ? c.couleur : C.textMuted, fontSize: 11, fontFamily: F, marginTop: 4, opacity: 0.8 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {(articulesRupture.length > 0 || articlesBas.length > 0) && (
        <div style={{ background: C.orangeLight, border: `1.5px solid ${C.orange}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: C.orange, fontWeight: 800, fontSize: 13, fontFamily: F, marginBottom: 4 }}>⚠️ Alertes stock</div>
            {articulesRupture.length > 0 && <div style={{ color: C.red, fontSize: 12, fontFamily: F }}>{articulesRupture.length} article(s) en rupture</div>}
            {articlesBas.length > 0 && <div style={{ color: C.orange, fontSize: 12, fontFamily: F }}>{articlesBas.length} article(s) sous le seuil minimum</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {articulesRupture.length > 0 && (
              <button onClick={() => setPanneau('rupture')} style={{ border: `1.5px solid ${C.red}`, borderRadius: 8, padding: '6px 12px', background: C.surface, color: C.red, fontFamily: F, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Voir ruptures</button>
            )}
            {articlesBas.length > 0 && (
              <button onClick={() => setPanneau('bas')} style={{ border: `1.5px solid ${C.orange}`, borderRadius: 8, padding: '6px 12px', background: C.surface, color: C.orange, fontFamily: F, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Voir stock bas</button>
            )}
          </div>
        </div>
      )}

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 8px' }}>
          <span style={{ color: C.textSub, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: F }}>Mouvements recents</span>
        </div>
        {loading && <div style={{ padding: 16, color: C.textSub, fontSize: 13, fontFamily: F }}>Chargement...</div>}
        {!loading && mouvements.length === 0 && <div style={{ padding: 16, color: C.textMuted, fontSize: 13, fontFamily: F, textAlign: 'center' }}>Aucun mouvement enregistre</div>}
        {mouvements.map((m, i) => {
          const meta = MOUV_META[m.type] || { label: m.type, color: C.textSub, bg: C.bg, signe: '' }
          return (
            <div key={m.id || i} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: F }}>{m.articles?.designation || '—'}</div>
                <div style={{ color: C.textSub, fontSize: 11, fontFamily: F }}>{meta.label} · {new Date(m.date).toLocaleDateString('fr-FR')}</div>
              </div>
              <span style={{ background: meta.bg, color: meta.color, fontSize: 13, fontWeight: 800, padding: '3px 10px', borderRadius: 99, fontFamily: F }}>
                {meta.signe}{m.quantite}
              </span>
            </div>
          )
        })}
      </div>

      {panneau === 'rupture' && (
        <PanneauDetail
          titre="Articles en rupture de stock"
          articles={articulesRupture}
          couleur={C.red}
          bg={C.redLight}
          nomFichier={`ruptures_${new Date().toISOString().slice(0,10)}.csv`}
          onClose={() => setPanneau(null)}
          onVoirArticle={(a) => { setPanneau(null); onNavigate && onNavigate('articles', a) }}
        />
      )}

      {panneau === 'bas' && (
        <PanneauDetail
          titre="Articles avec stock bas"
          articles={articlesBas}
          couleur={C.orange}
          bg={C.orangeLight}
          nomFichier={`stock_bas_${new Date().toISOString().slice(0,10)}.csv`}
          onClose={() => setPanneau(null)}
          onVoirArticle={(a) => { setPanneau(null); onNavigate && onNavigate('articles', a) }}
        />
      )}

      {panneau && (
        <div onClick={() => setPanneau(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,22,48,0.2)', zIndex: 99 }} />
      )}
    </div>
  )
}
