import { useState } from 'react'
import Layout from './components/Layout'
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

export default function App() {
  const [page, setPage] = useState('dashboard')
  const PageComponent = PAGES[page] || Dashboard

  return (
    <Layout page={page} setPage={setPage}>
      <PageComponent />
    </Layout>
  )
}
