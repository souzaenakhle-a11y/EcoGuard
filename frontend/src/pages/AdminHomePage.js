import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Factory, LogOut, FileText, CheckCircle, AlertTriangle, 
  Calendar, TrendingUp, Users, Building, Shield, Home as HomeIcon,
  Trash2, Edit, Eye, Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminHomePage = ({ user }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    empresas: [],
    licencas: [],
    condicionantes: [],
    tickets: [],
    documentos: []
  });
  const [stats, setStats] = useState({
    totalEmpresas: 0,
    totalLicencas: 0,
    totalCondicionantes: 0,
    totalTickets: 0,
    licencasVencidas: 0,
    condicionantesAtrasadas: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [empresasRes, licencasRes, condicionantesRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/empresas`, { withCredentials: true }),
        axios.get(`${API}/licencas`, { withCredentials: true }),
        axios.get(`${API}/condicionantes`, { withCredentials: true }),
        axios.get(`${API}/tickets`, { withCredentials: true })
      ]);

      const empresas = empresasRes.data || [];
      const licencas = licencasRes.data || [];
      const condicionantes = condicionantesRes.data || [];
      const tickets = ticketsRes.data || [];

      // Calcular estatísticas
      const hoje = new Date();
      const licencasVencidas = licencas.filter(l => 
        l.data_vencimento && new Date(l.data_vencimento) < hoje
      ).length;
      
      const condicionantesAtrasadas = condicionantes.filter(c => 
        c.data_acompanhamento && new Date(c.data_acompanhamento) < hoje && c.status !== 'concluida'
      ).length;

      setData({
        empresas,
        licencas,
        condicionantes,
        tickets,
        documentos: [] // Implementar depois se necessário
      });

      setStats({
        totalEmpresas: empresas.length,
        totalLicencas: licencas.length,
        totalCondicionantes: condicionantes.length,
        totalTickets: tickets.length,
        licencasVencidas,
        condicionantesAtrasadas
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleDeleteLicenca = async (licencaId) => {
    if (!window.confirm('Excluir esta licença? Esta ação não pode ser desfeita.')) return;
    
    try {
      await axios.delete(`${API}/licencas/${licencaId}`, { withCredentials: true });
      toast.success('Licença excluída com sucesso!');
      fetchAllData();
    } catch (error) {
      console.error('Error deleting licenca:', error);
      toast.error('Erro ao excluir licença');
    }
  };

  const handleDeleteEmpresa = async (empresaId) => {
    if (!window.confirm('Excluir esta empresa? Todas as licenças e dados relacionados serão excluídos.')) return;
    
    try {
      await axios.delete(`${API}/empresas/${empresaId}`, { withCredentials: true });
      toast.success('Empresa excluída com sucesso!');
      fetchAllData();
    } catch (error) {
      console.error('Error deleting empresa:', error);
      toast.error('Erro ao excluir empresa');
    }
  };

  const handleDeleteCondicionante = async (condId) => {
    if (!window.confirm('Excluir esta condicionante?')) return;
    
    try {
      await axios.delete(`${API}/condicionantes/${condId}`, { withCredentials: true });
      toast.success('Condicionante excluída!');
      fetchAllData();
    } catch (error) {
      console.error('Error deleting condicionante:', error);
      toast.error('Erro ao excluir condicionante');
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

  const getStatusBadge = (status, type = 'default') => {
    const configs = {
      licenca: {
        'ativa': { label: 'Ativa', color: 'bg-green-100 text-green-700' },
        'vencida': { label: 'Vencida', color: 'bg-red-100 text-red-700' },
        'a_vencer': { label: 'A Vencer', color: 'bg-yellow-100 text-yellow-700' }
      },
      condicionante: {
        'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
        'concluida': { label: 'Concluída', color: 'bg-green-100 text-green-700' },
        'atrasada': { label: 'Atrasada', color: 'bg-red-100 text-red-700' },
        'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' }
      },
      ticket: {
        'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
        'em_analise': { label: 'Em Análise', color: 'bg-blue-100 text-blue-700' },
        'finalizado': { label: 'Finalizado', color: 'bg-green-100 text-green-700' }
      }
    };
    
    const config = configs[type]?.[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getEmpresaNome = (empresaId) => {
    const empresa = data.empresas.find(e => e.empresa_id === empresaId);
    return empresa?.nome_empresa || 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                <span className="text-xl font-bold">EcoGuard - Administração</span>
                <p className="text-sm text-muted-foreground">Painel de Controle Geral</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Gestor: {user?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Dashboard */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Empresas</p>
                  <p className="text-2xl font-bold">{stats.totalEmpresas}</p>
                </div>
                <Building className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Licenças</p>
                  <p className="text-2xl font-bold">{stats.totalLicencas}</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Condicionantes</p>
                  <p className="text-2xl font-bold">{stats.totalCondicionantes}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Auto-Fiscalizações</p>
                  <p className="text-2xl font-bold">{stats.totalTickets}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Licenças Vencidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.licencasVencidas}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Condic. Atrasadas</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.condicionantesAtrasadas}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para diferentes seções */}
        <Tabs defaultValue="empresas" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="empresas">Empresas ({data.empresas.length})</TabsTrigger>
            <TabsTrigger value="licencas">Licenças ({data.licencas.length})</TabsTrigger>
            <TabsTrigger value="condicionantes">Condicionantes ({data.condicionantes.length})</TabsTrigger>
            <TabsTrigger value="tickets">Auto-Fiscalizações ({data.tickets.length})</TabsTrigger>
          </TabsList>

          {/* Tab Empresas */}
          <TabsContent value="empresas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestão de Empresas</h2>
              <Button onClick={() => navigate('/clientes')}>
                <Building className="w-4 h-4 mr-2" />
                Nova Empresa
              </Button>
            </div>
            
            <div className="grid gap-4">
              {data.empresas.map((empresa) => (
                <Card key={empresa.empresa_id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{empresa.nome_empresa}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">CNPJ:</span>
                            <p className="font-medium">{empresa.cnpj}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cidade:</span>
                            <p className="font-medium">{empresa.cidade}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responsável:</span>
                            <p className="font-medium">{empresa.responsavel_nome}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{empresa.responsavel_email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${empresa.empresa_id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/clientes/${empresa.empresa_id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteEmpresa(empresa.empresa_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab Licenças */}
          <TabsContent value="licencas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestão de Licenças</h2>
              <Button onClick={() => navigate('/licencas')}>
                <Shield className="w-4 h-4 mr-2" />
                Gerenciar Licenças
              </Button>
            </div>
            
            <div className="grid gap-4">
              {data.licencas.map((licenca) => (
                <Card key={licenca.licenca_id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{licenca.nome_licenca}</h3>
                          {getStatusBadge(licenca.status, 'licenca')}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Empresa: {getEmpresaNome(licenca.empresa_id)}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Número:</span>
                            <p className="font-medium">{licenca.numero_licenca}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <p className="font-medium">{licenca.tipo_licenca}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Emissão:</span>
                            <p className="font-medium">{licenca.data_emissao ? format(new Date(licenca.data_emissao), 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vencimento:</span>
                            <p className="font-medium">{licenca.data_vencimento ? format(new Date(licenca.data_vencimento), 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/licencas/${licenca.licenca_id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteLicenca(licenca.licenca_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab Condicionantes */}
          <TabsContent value="condicionantes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gestão de Condicionantes</h2>
              <Button onClick={() => navigate('/condicionantes')}>
                <Calendar className="w-4 h-4 mr-2" />
                Gerenciar Condicionantes
              </Button>
            </div>
            
            <div className="grid gap-4">
              {data.condicionantes.map((cond) => (
                <Card key={cond.condicionante_id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{cond.nome}</h3>
                          {getStatusBadge(cond.status, 'condicionante')}
                        </div>
                        <p className="text-sm mb-2">{cond.descricao}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Responsável:</span>
                            <p className="font-medium">{cond.responsavel_nome}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data Acompanhamento:</span>
                            <p className="font-medium">{cond.data_acompanhamento ? format(new Date(cond.data_acompanhamento), 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Progresso:</span>
                            <p className="font-medium">{cond.percentual_conclusao || 0}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Alerta:</span>
                            <p className="font-medium">{cond.alerta_acompanhamento ? format(new Date(cond.alerta_acompanhamento), 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteCondicionante(cond.condicionante_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab Auto-Fiscalizações */}
          <TabsContent value="tickets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Auto-Fiscalizações</h2>
              <Button onClick={() => navigate('/tickets')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Gerenciar Tickets
              </Button>
            </div>
            
            <div className="grid gap-4">
              {data.tickets.map((ticket) => (
                <Card key={ticket.ticket_id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">Ticket #{ticket.ticket_id}</h3>
                          {getStatusBadge(ticket.etapa, 'ticket')}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Empresa: {getEmpresaNome(ticket.empresa_id)}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Data Criação:</span>
                            <p className="font-medium">{ticket.data_criacao ? format(new Date(ticket.data_criacao), 'dd/MM/yyyy') : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Etapa:</span>
                            <p className="font-medium">{ticket.etapa}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Observações:</span>
                            <p className="font-medium">{ticket.observacoes || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminHomePage;