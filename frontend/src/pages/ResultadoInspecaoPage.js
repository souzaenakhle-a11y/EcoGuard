import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResultadoInspecaoPage = ({ user }) => {
  const navigate = useNavigate();
  const { inspecaoId } = useParams();
  const [inspecao, setInspecao] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspecao();
  }, [inspecaoId]);

  const fetchInspecao = async () => {
    try {
      const response = await axios.get(`${API}/inspecoes/${inspecaoId}`, {
        withCredentials: true
      });
      setInspecao(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inspecao:', error);
      toast.error('Erro ao carregar resultado');
      setLoading(false);
    }
  };

  if (loading || !inspecao) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRiscoColor = (nivel) => {
    switch (nivel) {
      case 'baixo': return 'text-success';
      case 'medio': return 'text-yellow-600';
      case 'alto': return 'text-orange-600';
      case 'critico': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRiscoIcon = (nivel) => {
    if (nivel === 'baixo') return CheckCircle;
    return AlertTriangle;
  };

  const Icon = getRiscoIcon(inspecao.nivel_risco);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Inspeção Concluída!</h1>
          <p className="text-muted-foreground">Seu relatório de conformidade está pronto</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="inline-block p-8 bg-secondary/50 rounded-lg">
                <div className="text-5xl font-bold mb-2" data-testid="score-value">
                  {inspecao.score_final}/100
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Icon className={`w-5 h-5 ${getRiscoColor(inspecao.nivel_risco)}`} />
                  <span className={`font-semibold ${getRiscoColor(inspecao.nivel_risco)}`} data-testid="risk-level">
                    Risco: {inspecao.nivel_risco?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-success/10 rounded-md">
                <div className="text-2xl font-bold text-success" data-testid="conformes-count">
                  {inspecao.itens_conformes}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Itens Conformes</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-md">
                <div className="text-2xl font-bold text-destructive" data-testid="nao-conformes-count">
                  {inspecao.itens_nao_conformes}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Não Conformes</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-md">
                <div className="text-2xl font-bold" data-testid="nao-aplicaveis-count">
                  {inspecao.total_itens - inspecao.itens_conformes - inspecao.itens_nao_conformes}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Não Aplicáveis</div>
              </div>
            </div>

            {inspecao.itens_nao_conformes > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">Risco estimado em multas</p>
                    <p className="text-2xl font-bold text-destructive">
                      R$ {(inspecao.itens_nao_conformes * 12500).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Baseado em {inspecao.itens_nao_conformes} não conformidade(s) detectada(s)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full py-6"
            data-testid="dashboard-button"
          >
            Ver Dashboard Completo
          </Button>
          <Button
            variant="outline"
            className="w-full py-6"
            onClick={() => toast.info('Funcionalidade de download em desenvolvimento')}
            data-testid="download-button"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Baixar Relatório PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultadoInspecaoPage;
