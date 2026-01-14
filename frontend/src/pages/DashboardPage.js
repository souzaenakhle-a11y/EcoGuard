import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, LogOut, Plus, AlertTriangle, CheckCircle, FileText, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = ({ user }) => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresa) {
      fetchDashboard();
    }
  }, [selectedEmpresa]);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        withCredentials: true
      });
      setEmpresas(response.data);
      if (response.data.length > 0) {
        setSelectedEmpresa(response.data[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching empresas:', error);
      toast.error('Erro ao carregar empresas');
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/${selectedEmpresa.empresa_id}`, {
        withCredentials: true
      });
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erro ao carregar dashboard');
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

  const handleNovaInspecao = () => {
    if (selectedEmpresa) {
      navigate(`/iniciar-inspecao/${selectedEmpresa.empresa_id}`);
    } else {
      navigate('/upload-planta');
    }
  };

  const getRiscoColor = (nivel) => {
    switch (nivel) {
      case 'baixo': return 'text-success';
      case 'medio': return 'text-yellow-600';
      case 'alto': return 'text-orange-600';
      case 'critico': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getGravidadeColor = (gravidade) => {
    switch (gravidade) {
      case 'critica': return 'border-red-500 bg-red-50';
      case 'alta': return 'border-orange-500 bg-orange-50';
      case 'media': return 'border-yellow-500 bg-yellow-50';
      case 'baixa': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getGravidadeIcon = (gravidade) => {
    if (gravidade === 'baixa') return CheckCircle;
    return AlertTriangle;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Factory className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma empresa cadastrada</h2>
          <p className="text-muted-foreground mb-6">Comece cadastrando sua primeira empresa</p>
          <Button onClick={() => navigate('/upload-planta')} data-testid="start-button">
            Começar Agora
          </Button>
        </div>
      </div>
    );
  }

  const ultimaInspecao = dashboardData?.ultima_inspecao;
  const alertas = dashboardData?.alertas || [];
  const licencas = dashboardData?.licencas || [];
  const inspecoesHistorico = dashboardData?.inspecoes_historico || [];

  const chartData = inspecoesHistorico.slice(0, 6).reverse().map(insp => ({
    data: format(new Date(insp.data_inspecao), 'dd/MM', { locale: ptBR }),
    score: insp.score_final || 0
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold">EcoGuard Pro</span>
                <p className="text-sm text-muted-foreground">{selectedEmpresa?.nome}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">SCORE ATUAL</p>
                <div className="text-4xl font-bold mb-2" data-testid="current-score">
                  {ultimaInspecao?.score_final || '-'}/100
                </div>
                {ultimaInspecao && (
                  <span className={`text-sm font-medium ${getRiscoColor(ultimaInspecao.nivel_risco)}`}>
                    Risco {ultimaInspecao.nivel_risco}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">ÚLTIMA INSP.</p>
                <div className="text-2xl font-bold mb-2">
                  {ultimaInspecao ? format(new Date(ultimaInspecao.data_inspecao), 'dd/MM/yyyy') : '-'}
                </div>
                <span className="text-sm text-muted-foreground">
                  {inspecoesHistorico.length} inspeções realizadas
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">ALERTAS</p>
                <div className="text-4xl font-bold mb-2" data-testid="alerts-count">
                  {alertas.length}
                </div>
                <span className="text-sm text-muted-foreground">Pendentes</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">LICENÇAS</p>
                <div className="text-4xl font-bold mb-2">
                  {licencas.filter(l => l.status === 'valida').length}
                </div>
                <span className="text-sm text-muted-foreground">
                  de {licencas.length} válidas
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {alertas.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alertas Prioritários ({alertas.length})</CardTitle>
                <Button variant="outline" size="sm">Ver todos</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertas.slice(0, 5).map((alerta, index) => {
                  const Icon = getGravidadeIcon(alerta.gravidade);
                  return (
                    <div
                      key={alerta.alerta_id}
                      className={`p-4 rounded-md border-l-4 ${getGravidadeColor(alerta.gravidade)}`}
                      data-testid={`alert-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-semibold text-sm uppercase">{alerta.gravidade}</span>
                          </div>
                          <p className="font-medium mb-1">{alerta.descricao}</p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Categoria: {alerta.tipo_alerta}
                          </p>
                          {alerta.valor_multa_estimado && (
                            <p className="text-sm font-medium">
                              Multa estimada: R$ {alerta.valor_multa_estimado.toLocaleString('pt-BR')}
                            </p>
                          )}
                          {alerta.prazo_sugerido_dias && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Corrigir em: {alerta.prazo_sugerido_dias} dias
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {licencas.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Status de Licenças e Documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {licencas.map((licenca, index) => {
                  const isVencida = licenca.status === 'vencida';
                  const isVencendo = licenca.status === 'vencendo_30dias';
                  
                  return (
                    <div
                      key={licenca.licenca_id}
                      className={`p-4 rounded-md border ${
                        isVencida ? 'border-destructive bg-destructive/5' :
                        isVencendo ? 'border-yellow-500 bg-yellow-50' :
                        'border-success bg-success/5'
                      }`}
                      data-testid={`license-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isVencida ? (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            ) : isVencendo ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                            <span className="font-medium">{licenca.tipo.replace('_', ' ').toUpperCase()}</span>
                          </div>
                          {licenca.numero && (
                            <p className="text-sm text-muted-foreground">
                              Nº {licenca.numero} - {licenca.orgao_emissor}
                            </p>
                          )}
                          {licenca.data_validade && (
                            <p className="text-sm text-muted-foreground">
                              {isVencida ? 'Vencida em' : 'Válida até'}: {format(new Date(licenca.data_validade), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                        {(isVencida || isVencendo) && (
                          <Button size="sm" variant="outline">
                            Renovar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {chartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Evolução do Score</CardTitle>
              <CardDescription>Histórico das últimas inspeções</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#1A2E2E" 
                    strokeWidth={2}
                    dot={{ fill: '#1A2E2E', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={handleNovaInspecao} className="flex-1" data-testid="new-inspection-button">
            <Plus className="w-4 h-4 mr-2" />
            Nova Inspeção
          </Button>
          <Button variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            Ver Histórico
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
