import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LicencasIndicadoresPage = ({ user }) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/licencas/indicadores/dashboard`, { withCredentials: true });
      setDashboard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  };

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statusData = [
    { name: 'Válidas', value: dashboard.validas, color: '#22C55E' },
    { name: 'A Vencer', value: dashboard.a_vencer, color: '#EAB308' },
    { name: 'Vencidas', value: dashboard.vencidas, color: '#EF4444' }
  ];

  const tipoData = Object.entries(dashboard.por_tipo).map(([tipo, count]) => ({
    tipo,
    quantidade: count
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Indicadores de Licenças</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">TOTAL</p>
                <p className="text-4xl font-bold">{dashboard.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">VÁLIDAS</p>
                <p className="text-4xl font-bold text-success">{dashboard.validas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">A VENCER</p>
                <p className="text-4xl font-bold text-yellow-600">{dashboard.a_vencer}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">VENCIDAS</p>
                <p className="text-4xl font-bold text-destructive">{dashboard.vencidas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Licenças por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Licenças por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tipoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#1A2E2E" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimentos (180 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.proximos_vencimentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum vencimento próximo</p>
            ) : (
              <div className="space-y-3">
                {dashboard.proximos_vencimentos.map((item, index) => (
                  <div key={index} className="p-4 border rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.nome_licenca}</p>
                      <p className="text-sm text-muted-foreground">Vence em: {new Date(item.data_validade).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.dias_restantes < 30 ? 'bg-destructive/10 text-destructive' :
                      item.dias_restantes < 90 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {item.dias_restantes} dias
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LicencasIndicadoresPage;
