import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, FileText, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WelcomePage = ({ user }) => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, {
        withCredentials: true
      });
      setEmpresas(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching empresas:', error);
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
    if (empresas.length === 0) {
      navigate('/upload-planta');
    } else {
      navigate('/dashboard');
    }
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">EcoGuard</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="max-w-2xl mx-auto mt-20">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Bem-vindo ao Sistema de Auto-Fiscalização
            </h1>
            <p className="text-lg text-muted-foreground">
              Evite multas ambientais com inspeções preventivas
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={handleNovaInspecao} data-testid="start-inspection-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Fazer Primeira Inspeção</CardTitle>
                    <CardDescription>Configure sua empresa e inicie uma auto-fiscalização</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {empresas.length > 0 && (
              <Card className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate('/dashboard')} data-testid="dashboard-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-md flex items-center justify-center">
                      <Factory className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle>Ver Dashboard</CardTitle>
                      <CardDescription>Acesse relatórios e histórico de inspeções</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>

          <div className="mt-12 p-6 bg-secondary/50 rounded-md border border-border">
            <h3 className="font-semibold mb-3">Como funciona?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Faça upload da planta do seu estabelecimento</li>
              <li>2. Marque as áreas críticas que precisam de atenção</li>
              <li>3. Responda o checklist e envie fotos de cada área</li>
              <li>4. Receba um relatório completo de conformidade</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;