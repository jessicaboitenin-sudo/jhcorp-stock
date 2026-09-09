import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Articles from './pages/Articles'
import Mouvement from './pages/Mouvement'
import Production from './pages/Production'
import Historique from './pages/Historique'
import Parametres from './pages/Parametres'

const PAGES = {
  dashboard: Dashboard,
  articles: Articles,
  mouvement: Mouvement,
  production: Production,
  historique: Historique,
  parametres: Parametres,
}

const ROLE_PAGES = {
  admin:      ['dashboard','articles','mouvement','production','historique','parametres'],
  comptable:  ['dashboard','articles','mouvement','production','historique'],
  magasinier: ['dashboard','articles','mouvement','production','historique'],
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }

  const handleSetPage = (newPage) => {
    const allowed = ROLE_PAGES[profile?.role] || []
    if (allowed.includes(newPage)) setPage(newPage)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F4FD', fontFamily: "'Montserrat',sans-serif", color: '#7B72A8', fontSize: 14 }}>
      Chargement...
    </div>
  )

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
