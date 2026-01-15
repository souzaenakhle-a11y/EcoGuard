import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Factory, LogOut, FileText, CheckCircle, AlertTriangle, 
  Calendar, TrendingUp, Users, Building, Shield, Home as HomeIcon
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalInspecoes: 0,
    totalLicencas: 0,
    licencasAVencer: 0,
    condicionantesAVencer: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [empresasRes, licencasRes, ticketsRes, condicionantesRes] = await Promise.all([
        axios.get(`${API}/empresas`, { withCredentials: true }),
        axios.get(`${API}/licencas`, { withCredentials: true }),
        axios.get(`${API}/tickets`, { withCredentials: true }),
        axios.get(`${API}/condicionantes`, { withCredentials: true })
      ]);

      const licencasAVencer = licencasRes.data.filter(l => l.status === 'a_vencer' || l.status === 'vencida').length;
      
      // Contar condicionantes a vencer (próximos 30 dias)
      const hoje = new Date();
      const condicionantesAVencer = condicionantesRes.data.filter(c => {
        if (!c.data_acompanhamento) return false;
        const dataAcomp = new Date(c.data_acompanhamento);
        const diffDias = Math.ceil((dataAcomp - hoje) / (1000 * 60 * 60 * 24));
        return diffDias >= 0 && diffDias <= 30;
      }).length;

      // Contar tickets/inspeções finalizados
      const totalInspecoes = ticketsRes.data.filter(t => t.etapa === 'finalizado').length;

      setStats({
        totalEmpresas: empresasRes.data.length,
        totalInspecoes,
        totalLicencas: licencasRes.data.length,
        licencasAVencer,
        condicionantesAVencer
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const modules = [
    {
      title: 'Cadastro de Empresas',
      description: 'Cadastre e gerencie empreendimentos',
      icon: Building,
      color: 'bg-blue-100 text-blue-600',
      route: '/clientes',
      testId: 'module-empresas',
      priority: true
    },
    {
      title: 'Auto-Fiscalização',
      description: 'Acompanhe tickets e inspeções preventivas',
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
      route: '/tickets',
      testId: 'module-inspecao'
    },
    {
      title: 'Gestão de Licenças',
      description: 'Gerencie licenças ambientais e condicionantes',
      icon: Shield,
      color: 'bg-primary/10 text-primary',
      route: '/licencas',
      testId: 'module-licencas'
    },
    {
      title: 'Indicadores',
      description: 'Visualize dashboards e relatórios completos',
      icon: TrendingUp,
      color: 'bg-accent/10 text-accent-foreground',
      route: '/licencas/indicadores',
      testId: 'module-indicadores'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold">EcoGuard</span>
                <p className="text-sm text-muted-foreground">Sistema de Gestão Ambiental</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Olá, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Bem-vindo ao EcoGuard</h1>
          <p className="text-lg text-muted-foreground">
            Gestão completa de conformidade ambiental em um só lugar
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-12">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Empresas</p>
                  <p className="text-3xl font-bold">{stats.totalEmpresas}</p>
                </div>
                <Building className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inspeções</p>
                  <p className="text-3xl font-bold">{stats.totalInspecoes}</p>
                </div>
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Licenças</p>
                  <p className="text-3xl font-bold">{stats.totalLicencas}</p>
                </div>
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Licenças a Vencer</p>
                  <p className="text-3xl font-bold text-destructive">{stats.licencasAVencer}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Condicionantes a Vencer</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.condicionantesAVencer}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Módulos do Sistema</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Card 
                  key={index}
                  className="hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate(module.route)}
                  data-testid={module.testId}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 ${module.color} rounded-md flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary/5">
                      Acessar →
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Ações Rápidas</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate('/clientes')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Nova Empresa</p>
                    <p className="text-sm text-muted-foreground">Cadastrar empreendimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate('/upload-planta')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-md flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold">Nova Auto-Fiscalização</p>
                    <p className="text-sm text-muted-foreground">Enviar planta para análise</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate('/licencas/cadastro')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Cadastrar Licença</p>
                    <p className="text-sm text-muted-foreground">Adicionar nova licença</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
