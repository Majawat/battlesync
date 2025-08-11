import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ArmyImportPage from './pages/ArmyImportPage';
import ArmyListPage from './pages/ArmyListPage';
import ArmyDetailPage from './pages/ArmyDetailPage';
import BattleListPage from './pages/BattleListPage';
import CreateBattlePage from './pages/CreateBattlePage';
import BattlePage from './pages/BattlePage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/armies/import" element={<ArmyImportPage />} />
          <Route path="/armies" element={<ArmyListPage />} />
          <Route path="/armies/:id" element={<ArmyDetailPage />} />
          <Route path="/battles" element={<BattleListPage />} />
          <Route path="/battles/new" element={<CreateBattlePage />} />
          <Route path="/battles/:id" element={<BattlePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;