import { Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar, MobileNav } from '@/components/Sidebar';
import Dashboard from '@/pages/Dashboard';
import Influenciadores from '@/pages/Influenciadores';
import InfluenciadorDetalhe from '@/pages/InfluenciadorDetalhe';
import Ranking from '@/pages/Ranking';
import Configuracoes from '@/pages/Configuracoes';

export default function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileNav />
      <main className="pb-24 lg:pb-8 lg:pl-64">
        <div key={location.pathname} className="mx-auto max-w-7xl animate-fade-in px-4 py-6 sm:px-8 sm:py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/influenciadores" element={<Influenciadores />} />
            <Route path="/influenciadores/:id" element={<InfluenciadorDetalhe />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
