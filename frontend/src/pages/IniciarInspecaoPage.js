import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IniciarInspecaoPage = ({ user }) => {
  const navigate = useNavigate();
  const { empresaId } = useParams();
  const [plantas, setPlantas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedPlanta, setSelectedPlanta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchPlantas();
  }, [empresaId]);

  const fetchPlantas = async () => {
    try {
      const response = await axios.get(`${API}/plantas/${empresaId}`, {
        withCredentials: true
      });
      setPlantas(response.data);
      
      if (response.data.length > 0) {
        const planta = response.data[0];
        setSelectedPlanta(planta);
        await fetchAreas(planta.planta_id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plantas:', error);
      toast.error('Erro ao carregar plantas');
      setLoading(false);
    }
  };

  const fetchAreas = async (plantaId) => {
    try {
      const response = await axios.get(`${API}/areas/${plantaId}`, {
        withCredentials: true
      });
      setAreas(response.data);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const handleStartInspecao = async () => {
    if (!selectedPlanta) {
      toast.error('Selecione uma planta');
      return;
    }

    if (areas.length === 0) {
      toast.error('Esta planta não possui áreas mapeadas');
      return;
    }

    setStarting(true);
    try {
      const response = await axios.post(
        `${API}/inspecoes?empresa_id=${empresaId}&planta_id=${selectedPlanta.planta_id}`,
        {},
        { withCredentials: true }
      );

      toast.success('Inspeção iniciada!');
      navigate(`/inspecao/${response.data.inspecao_id}`);
    } catch (error) {
      console.error('Error starting inspecao:', error);
      toast.error('Erro ao iniciar inspeção');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalItens = areas.reduce((sum, area) => {
    const itemsPerType = {
      'residuos': 5,
      'efluentes': 5,
      'app': 4,
      'armazenamento': 5,
      'producao': 4
    };
    return sum + (itemsPerType[area.tipo_area] || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6"
          data-testid="home-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-md flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <CardTitle className="text-2xl">Iniciar Nova Auto-Fiscalização</CardTitle>
                <CardDescription>
                  Você marcou {areas.length} área(s) crítica(s) na sua planta.
                  Vamos solicitar fotos específicas de cada área.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-secondary/50 rounded-md border border-border">
              <h3 className="font-semibold mb-3">Checklist gerado:</h3>
              <div className="space-y-2">
                {areas.map((area, index) => {
                  const itemsPerType = {
                    'residuos': 5,
                    'efluentes': 5,
                    'app': 4,
                    'armazenamento': 5,
                    'producao': 4
                  };
                  const items = itemsPerType[area.tipo_area] || 0;
                  const getCriticalityColor = (criticidade) => {
                    switch (criticidade) {
                      case 'critica': return 'bg-red-500';
                      case 'alta': return 'bg-orange-500';
                      case 'media': return 'bg-yellow-500';
                      case 'baixa': return 'bg-green-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <div key={area.area_id} className="flex items-center gap-3">
                      <div className={`w-3 h-3 ${getCriticalityColor(area.criticidade)} rounded-full`}></div>
                      <span className="text-sm">{area.nome}</span>
                      <span className="text-sm text-muted-foreground ml-auto">- {items} itens</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-md">
              <Clock className="w-8 h-8 text-accent-foreground" />
              <div>
                <p className="font-medium">Tempo estimado: {Math.ceil(totalItens * 1.5)} minutos</p>
                <p className="text-sm text-muted-foreground">Total de {totalItens} itens para verificar</p>
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-md">
              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-2">Dica: Tenha em mãos</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Todas as licenças ambientais</li>
                    <li>• Câmera ou smartphone com boa resolução</li>
                    <li>• Tire fotos em boa iluminação</li>
                    <li>• Certifique-se que as fotos estão nítidas</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartInspecao}
              disabled={starting || areas.length === 0}
              className="w-full py-6 text-base"
              data-testid="start-inspection-button"
            >
              {starting ? 'Iniciando...' : 'Começar Inspeção Agora'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IniciarInspecaoPage;