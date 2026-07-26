import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Articles from './pages/Articles'
import Recettes from './pages/Recettes'
import Commandes from './pages/Commandes'
import Entree from './pages/Entree'
import Production from './pages/Production'
import Livraison from './pages/Livraison'
import Inventaire from './pages/Inventaire'
import Historique from './pages/Historique'
import Parametres from './pages/Parametres'

const PAGES = {
  dashboard: Dashboard,
  articles: Articles,
  recettes: Recettes,
  commandes: Commandes,
  entree: Entree,
  production: Production,
  livraison: Livraison,
  inventaire: Inventaire,
  historique: Historique,
  parametres: Parametres,
}

// Pages accessibles par rôle
const ROLE_PAGES = {
  admin: ['dashboard','articles','recettes','commandes','entree','production','livraison','inventaire','historique','parametres'],
  comptable: ['dashboard','articles','recettes','commandes','entree','production','livraison','inventaire','historique'],
  magasinier: ['dashboard','articles','recettes','commandes','entree','production','livraison','inventaire','historique'],
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    // Récupérer la session courante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }

  // Navigation sécurisée : vérifier que la page est accessible pour le rôle
  const handleSetPage = (newPage) => {
    const allowed = ROLE_PAGES[profile?.role] || []
    if (allowed.includes(newPage)) setPage(newPage)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F6F4FD', fontFamily: "'Montserrat', sans-serif", color: '#7B72A8', fontSize: 14
      }}>
        Chargement...
      </div>
    )
  }

  if (!session || !profile) return <Login />

  const allowedPages = ROLE_PAGES[profile.role] || []
  const currentPage = allowedPages.includes(page) ? page : 'dashboard'
  const PageComponent = PAGES[currentPage] || Dashboard

  return (
    <Layout page={currentPage} setPage={handleSetPage} profile={profile}>
      <PageComponent />
    </Layout>
  )
}
