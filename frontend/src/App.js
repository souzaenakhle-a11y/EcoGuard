import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import '@/index.css';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import AdminHomePage from './pages/AdminHomePage';
import WelcomePage from './pages/WelcomePage';
import UploadPlantaPage from './pages/UploadPlantaPage';
import MapearAreasPage from './pages/MapearAreasPage';
import IniciarInspecaoPage from './pages/IniciarInspecaoPage';
import ChecklistItemPage from './pages/ChecklistItemPage';
import ResultadoInspecaoPage from './pages/ResultadoInspecaoPage';
import DashboardPage from './pages/DashboardPage';
import LicencasPage from './pages/LicencasPage';
import LicencasCadastroPage from './pages/LicencasCadastroPage';
import LicencasIndicadoresPage from './pages/LicencasIndicadoresPage';
import CondicionantesPage from './pages/CondicionantesPage';
import ClientesPage from './pages/ClientesPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetalhesPage from './pages/TicketDetalhesPage';
import { Toaster } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = location.hash;
      if (!hash || !hash.includes('session_id=')) return;

      const sessionId = hash.split('session_id=')[1].split('&')[0];
      
      // Verificar se tem código de convite salvo
      const codigoConvite = localStorage.getItem('codigo_convite');

      try {
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId, codigo_convite: codigoConvite },
          { withCredentials: true }
        );
        
        // Limpar código usado
        localStorage.removeItem('codigo_convite');
        navigate('/home', { state: { user: response.data }, replace: true });
      } catch (error) {
        console.error('Auth error:', error);
        
        if (error.response?.data?.detail === 'CONVITE_NECESSARIO') {
          // Salvar session_id e pedir código
          localStorage.setItem('pending_session_id', sessionId);
          navigate('/login', { state: { needsInvite: true }, replace: true });
        } else if (error.response?.data?.detail === 'CONVITE_INVALIDO') {
          navigate('/login', { state: { error: 'Código de convite inválido' }, replace: true });
        } else if (error.response?.data?.detail === 'CONVITE_EXPIRADO') {
          navigate('/login', { state: { error: 'Código de convite expirado' }, replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }
    };

    processSession();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) {
      setIsAuthenticated(true);
      setUser(location.state.user);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
        setIsAuthenticated(true);
        setUser(response.data);
      } catch (error) {
        setIsAuthenticated(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? React.cloneElement(children, { user }) : null;
}

// Wrapper para detectar gestor e renderizar página correta
function HomeWrapper({ user }) {
  const isGestor = user?.email === 'souzaenakhle@gmail.com';
  return isGestor ? <AdminHomePage user={user} /> : <HomePage user={user} />;
}

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<ProtectedRoute><HomeWrapper /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
      <Route path="/upload-planta" element={<ProtectedRoute><UploadPlantaPage /></ProtectedRoute>} />
      <Route path="/mapear-areas/:plantaId" element={<ProtectedRoute><MapearAreasPage /></ProtectedRoute>} />
      <Route path="/iniciar-inspecao/:empresaId" element={<ProtectedRoute><IniciarInspecaoPage /></ProtectedRoute>} />
      <Route path="/inspecao/:inspecaoId" element={<ProtectedRoute><ChecklistItemPage /></ProtectedRoute>} />
      <Route path="/resultado/:inspecaoId" element={<ProtectedRoute><ResultadoInspecaoPage /></ProtectedRoute>} />
      <Route path="/licencas" element={<ProtectedRoute><LicencasPage /></ProtectedRoute>} />
      <Route path="/licencas/cadastro" element={<ProtectedRoute><LicencasCadastroPage /></ProtectedRoute>} />
      <Route path="/licencas/indicadores" element={<ProtectedRoute><LicencasIndicadoresPage /></ProtectedRoute>} />
      <Route path="/condicionantes" element={<ProtectedRoute><CondicionantesPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
      <Route path="/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
      <Route path="/tickets/:ticketId" element={<ProtectedRoute><TicketDetalhesPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="bottom-left" richColors />
    </div>
  );
}

export default App;