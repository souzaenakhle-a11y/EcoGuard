import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MapearAreasPage = ({ user }) => {
  const navigate = useNavigate();
  const { plantaId } = useParams();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticket');
  const [planta, setPlanta] = useState(null);
  const [plantaUrl, setPlantaUrl] = useState(null);
  const [areas, setAreas] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentArea, setCurrentArea] = useState(null);
  const [areaForm, setAreaForm] = useState({
    nome: '',
    tipo_area: '',
    posicao_x: 0,
    posicao_y: 0,
    descricao: '',
    criticidade: 'media'
  });
  const canvasRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    fetchPlanta();
    fetchAreas();
  }, [plantaId]);

  const fetchPlanta = async () => {
    try {
      const response = await axios.get(`${API}/plantas/${plantaId}/file`, {
        withCredentials: true,
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setPlantaUrl(url);
    } catch (error) {
      console.error('Error fetching planta:', error);
      toast.error('Erro ao carregar planta');
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await axios.get(`${API}/areas/${plantaId}`, {
        withCredentials: true
      });
      setAreas(response.data);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const handleImageLoad = (e) => {
    setImageDimensions({
      width: e.target.offsetWidth,
      height: e.target.offsetHeight
    });
  };

  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setAreaForm({
      ...areaForm,
      posicao_x: x,
      posicao_y: y
    });
    setCurrentArea(null);
    setShowDialog(true);
  };

  const handleSaveArea = async () => {
    if (!areaForm.nome || !areaForm.tipo_area) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await axios.post(`${API}/areas/${plantaId}`, areaForm, {
        withCredentials: true
      });
      toast.success('Área adicionada com sucesso!');
      fetchAreas();
      setShowDialog(false);
      setAreaForm({
        nome: '',
        tipo_area: '',
        posicao_x: 0,
        posicao_y: 0,
        descricao: '',
        criticidade: 'media'
      });
    } catch (error) {
      console.error('Error saving area:', error);
      toast.error('Erro ao salvar área');
    }
  };

  const handleDeleteArea = async (areaId) => {
    try {
      await axios.delete(`${API}/areas/${areaId}`, {
        withCredentials: true
      });
      toast.success('Área removida com sucesso!');
      fetchAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
      toast.error('Erro ao remover área');
    }
  };

  const handleContinue = async () => {
    if (areas.length === 0) {
      toast.error('Adicione pelo menos uma área crítica');
      return;
    }
    
    try {
      await axios.put(
        `${API}/plantas/${plantaId}`,
        { status: 'mapeada' },
        { withCredentials: true }
      );
      
      // Se vier de um ticket, atualizar o status do ticket
      if (ticketId) {
        await axios.put(
          `${API}/tickets/${ticketId}/status?status=aguardando_fotos_cliente&etapa=upload_fotos_cliente`,
          {},
          { withCredentials: true }
        );
        toast.success('Áreas mapeadas! Cliente notificado para enviar fotos.');
        navigate(`/tickets/${ticketId}`);
      } else {
        const plantaDoc = await axios.get(`${API}/plantas/${plantaId}`, { withCredentials: true });
        const empresaId = plantaDoc.data.empresa_id;
        
        if (empresaId) {
          navigate(`/iniciar-inspecao/${empresaId}`);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error updating planta:', error);
      toast.error('Erro ao salvar mapeamento');
    }
  };

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            data-testid="home-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button
            onClick={handleContinue}
            disabled={areas.length === 0}
            data-testid="continue-button"
          >
            Salvar e Continuar
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Passo 2: Marque as Áreas Críticas</h1>
          <p className="text-muted-foreground">
            Clique sobre a planta para marcar os locais que precisam de atenção ambiental. Cada marcação virará um checklist.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div 
                ref={canvasRef}
                className="relative w-full bg-secondary/20 rounded-md overflow-hidden cursor-crosshair border-2 border-border"
                onClick={handleCanvasClick}
                data-testid="map-canvas"
                style={{ minHeight: '500px' }}
              >
                {plantaUrl && (
                  <img 
                    src={plantaUrl} 
                    alt="Planta" 
                    className="w-full h-auto"
                    onLoad={handleImageLoad}
                  />
                )}
                {areas.map((area, index) => (
                  <div
                    key={area.area_id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${area.posicao_x}%`,
                      top: `${area.posicao_y}%`
                    }}
                  >
                    <div className={`w-8 h-8 ${getCriticalityColor(area.criticidade)} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold`}>
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Áreas Marcadas ({areas.length})</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDialog(true)}
                  data-testid="add-area-button"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {areas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma área marcada ainda.
                    Clique na planta para adicionar.
                  </p>
                ) : (
                  areas.map((area, index) => (
                    <div
                      key={area.area_id}
                      className="p-3 border border-border rounded-md hover:border-primary/30 transition-colors"
                      data-testid={`area-card-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 ${getCriticalityColor(area.criticidade)} rounded-full`}></div>
                            <span className="font-medium text-sm">{index + 1}. {area.nome}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Tipo: {area.tipo_area.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criticidade: {area.criticidade}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteArea(area.area_id)}
                          data-testid={`delete-area-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="area-dialog">
          <DialogHeader>
            <DialogTitle>Nova Área Crítica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="area-nome">Nome da Área *</Label>
              <Input
                id="area-nome"
                data-testid="area-nome-input"
                value={areaForm.nome}
                onChange={(e) => setAreaForm({...areaForm, nome: e.target.value})}
                placeholder="Ex: Área de Resíduos Setor Norte"
              />
            </div>
            <div>
              <Label htmlFor="tipo-area">Tipo de Área *</Label>
              <Select
                value={areaForm.tipo_area}
                onValueChange={(value) => setAreaForm({...areaForm, tipo_area: value})}
              >
                <SelectTrigger data-testid="tipo-area-select">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residuos">Resíduos Sólidos</SelectItem>
                  <SelectItem value="efluentes">Efluentes Líquidos</SelectItem>
                  <SelectItem value="app">APP - Área de Preservação</SelectItem>
                  <SelectItem value="armazenamento">Armazenamento de Produtos</SelectItem>
                  <SelectItem value="producao">Área de Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="criticidade">Criticidade *</Label>
              <Select
                value={areaForm.criticidade}
                onValueChange={(value) => setAreaForm({...areaForm, criticidade: value})}
              >
                <SelectTrigger data-testid="criticidade-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                data-testid="descricao-textarea"
                value={areaForm.descricao}
                onChange={(e) => setAreaForm({...areaForm, descricao: e.target.value})}
                placeholder="Detalhes sobre esta área..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveArea} data-testid="save-area-button">Salvar Área</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapearAreasPage;