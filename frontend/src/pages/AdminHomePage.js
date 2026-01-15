import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, LogOut, CheckCircle, AlertTriangle, Calendar, Building, Shield, Trash2, Edit, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminHomePage = ({ user }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({ empresas: [], licencas: [], condicionantes: [], tickets: [] });
  const [stats, setStats] = useState({ totalEmpresas: 0, totalLicencas: 0, totalCondicionantes: 0, totalTickets: 0, licencasVencidas: 0, condicionantesAtrasadas: 0 });
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

      const hoje = new Date();
      const licencasVencidas = licencas.filter(l => l.data_vencimento && new Date(l.data_vencimento) < hoje).length;
      const condicionantesAtrasadas = condicionantes.filter(c => c.data_acompanhamento && new Date(c.data_acompanhamento) < hoje && c.status !== 'concluida').length;

      setData({ empresas, licencas, condicionantes, tickets });
      setStats({ totalEmpresas: empresas.length, totalLicencas: licencas.length, totalCondicionantes: condicionantes.length, totalTickets: tickets.length, licencasVencidas, condicionantesAtrasadas });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleDeleteLicenca = async (licencaId) => {
    if (!window.confirm('Excluir esta licença?')) return;
    try {
      await axios.delete(`${API}/licencas/${licencaId}`, { withCredentials: true });
      toast.success('Licença excluída!');
      fetchAllData();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleDeleteEmpresa = async (empresaId) => {
    if (!window.confirm('Excluir empresa e todos os dados relacionados?')) return;
    try {
      await axios.delete(`${API}/empresas/${empresaId}`, { withCredentials: true });
      toast.success('Empresa excluída!');
      fetchAllData();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleDeleteCondicionante = async (condId) => {
    if (!window.confirm('Excluir condicionante?')) return;
    try {
      await axios.delete(`${API}/condicionantes/${condId}`, { withCredentials: true });
      toast.success('Condicionante excluída!');
      fetchAllData();
    } catch (error) {
      toast.error('Erro ao excluir');
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

  const getEmpresaNome = (empresaId) => data.empresas.find(e => e.empresa_id === empresaId)?.nome || 'N/A';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold">EcoGuard - Administração</span>
                <p className="text-sm text-muted-foreground">Painel de Controle</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/tickets')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Auto-Fiscalização
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Empresas</p><p className="text-2xl font-bold">{stats.totalEmpresas}</p></div><Building className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Licenças</p><p className="text-2xl font-bold">{stats.totalLicencas}</p></div><Shield className="w-8 h-8 text-green-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Condicionantes</p><p className="text-2xl font-bold">{stats.totalCondicionantes}</p></div><Calendar className="w-8 h-8 text-purple-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tickets</p><p className="text-2xl font-bold">{stats.totalTickets}</p></div><CheckCircle className="w-8 h-8 text-indigo-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Licenças Vencidas</p><p className="text-2xl font-bold text-red-600">{stats.licencasVencidas}</p></div><AlertTriangle className="w-8 h-8 text-red-600" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cond. Atrasadas</p><p className="text-2xl font-bold text-orange-600">{stats.condicionantesAtrasadas}</p></div><AlertTriangle className="w-8 h-8 text-orange-600" /></div></CardContent></Card>
        </div>

        <Tabs defaultValue="empresas" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="empresas">Empresas ({data.empresas.length})</TabsTrigger>
            <TabsTrigger value="licencas">Licenças ({data.licencas.length})</TabsTrigger>
            <TabsTrigger value="condicionantes">Condicionantes ({data.condicionantes.length})</TabsTrigger>
            <TabsTrigger value="tickets">Tickets ({data.tickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="empresas" className="mt-6">
            <div className="grid gap-4">
              {data.empresas.map(e => (
                <Card key={e.empresa_id}>
                  <CardContent className="pt-6 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{e.nome}</h3>
                      <p className="text-sm text-muted-foreground">CNPJ: {e.cnpj} | {e.endereco}</p>
                      <p className="text-sm text-muted-foreground">Responsável: {e.responsavel} ({e.email})</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/clientes`)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteEmpresa(e.empresa_id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="licencas" className="mt-6">
            <div className="grid gap-4">
              {data.licencas.map(l => (
                <Card key={l.licenca_id}>
                  <CardContent className="pt-6 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{l.nome_licenca}</h3>
                        <Badge className={l.status === 'ativa' ? 'bg-green-100 text-green-700' : l.status === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{l.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Empresa: {getEmpresaNome(l.empresa_id)} | Nº: {l.numero_licenca}</p>
                      <p className="text-sm text-muted-foreground">Vencimento: {l.data_vencimento ? format(new Date(l.data_vencimento), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/licencas/cadastro?edit=${l.licenca_id}`)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteLicenca(l.licenca_id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="condicionantes" className="mt-6">
            <div className="grid gap-4">
              {data.condicionantes.map(c => {
                const atrasada = c.data_acompanhamento && new Date(c.data_acompanhamento) < new Date() && c.status !== 'concluida';
                return (
                  <Card key={c.condicionante_id}>
                    <CardContent className="pt-6 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{c.nome}</h3>
                          <Badge className={atrasada ? 'bg-red-100 text-red-700' : c.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{atrasada ? 'Atrasada' : c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Responsável: {c.responsavel_nome} | Acompanhamento: {c.data_acompanhamento ? format(new Date(c.data_acompanhamento), 'dd/MM/yyyy') : 'N/A'}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate('/condicionantes')}><Edit className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteCondicionante(c.condicionante_id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <div className="grid gap-4">
              {data.tickets.map(t => (
                <Card key={t.ticket_id}>
                  <CardContent className="pt-6 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">Ticket #{t.ticket_id.substring(4)}</h3>
                        <Badge className={t.etapa === 'finalizado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{t.etapa?.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Cliente: {t.user_email} | Criado: {t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tickets/${t.ticket_id}`)}><Eye className="w-4 h-4 mr-2" />Ver</Button>
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
