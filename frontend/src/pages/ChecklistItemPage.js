import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Camera, Upload, CheckCircle, XCircle, Minus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChecklistItemPage = ({ user }) => {
  const navigate = useNavigate();
  const { inspecaoId } = useParams();
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resposta, setResposta] = useState('');
  const [observacao, setObservacao] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchItems();
  }, [inspecaoId]);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/inspecoes/${inspecaoId}/items`, {
        withCredentials: true
      });
      setItems(response.data);
      
      const firstUnanswered = response.data.findIndex(item => !item.resposta);
      if (firstUnanswered !== -1) {
        setCurrentIndex(firstUnanswered);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar itens');
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!resposta) {
      toast.error('Selecione uma resposta');
      return;
    }

    if (!foto) {
      toast.error('A foto é obrigatória');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('resposta', resposta);
      formData.append('observacao', observacao || '');
      formData.append('foto', foto);

      const currentItem = items[currentIndex];
      await axios.put(
        `${API}/inspecoes/${inspecaoId}/items/${currentItem.item_inspecao_id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        }
      );

      toast.success('Resposta salva!');
      
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setResposta('');
        setObservacao('');
        setFoto(null);
        setFotoPreview(null);
      } else {
        await axios.post(
          `${API}/inspecoes/${inspecaoId}/complete`,
          {},
          { withCredentials: true }
        );
        navigate(`/resultado/${inspecaoId}`);
      }
    } catch (error) {
      console.error('Error submitting item:', error);
      toast.error('Erro ao salvar resposta');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setResposta('');
      setObservacao('');
      setFoto(null);
      setFotoPreview(null);
    }
  };

  if (loading || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;
  const answeredCount = items.filter(i => i.resposta).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/home')}
              data-testid="home-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
            <span className="text-sm font-medium" data-testid="progress-text">
              {answeredCount}/{items.length} itens
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="p-6">
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3">
              {currentItem.area?.nome}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Categoria: {currentItem.checklist_item?.categoria}
            </div>
            
            <h2 className="text-xl font-bold mb-4" data-testid="question-text">
              {currentItem.checklist_item?.pergunta}
            </h2>

            <div className="p-4 bg-accent/10 rounded-md border border-accent/20 mb-6">
              <p className="text-sm font-medium mb-2">Orientação para a foto:</p>
              <p className="text-sm text-muted-foreground">
                {currentItem.checklist_item?.orientacao_foto}
              </p>
            </div>

            {currentItem.checklist_item?.fundamentacao_legal && (
              <div className="text-xs text-muted-foreground mb-6">
                Base legal: {currentItem.checklist_item.fundamentacao_legal}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">Enviar Foto (Obrigatório)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                data-testid="photo-upload-area"
              >
                {fotoPreview ? (
                  <div className="relative">
                    <img src={fotoPreview} alt="Preview" className="max-h-64 mx-auto rounded-md" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFoto(null);
                        setFotoPreview(null);
                      }}
                    >
                      Trocar Foto
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-base font-medium mb-1">Clique para enviar foto</p>
                    <p className="text-sm text-muted-foreground">(Foto obrigatória)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Situação encontrada:</Label>
              <div className="space-y-2">
                <button
                  onClick={() => setResposta('conforme')}
                  className={`w-full p-4 rounded-md border-2 text-left transition-all ${
                    resposta === 'conforme'
                      ? 'border-success bg-success/10'
                      : 'border-border hover:border-success/50'
                  }`}
                  data-testid="response-conforme"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`w-5 h-5 ${
                      resposta === 'conforme' ? 'text-success' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-medium">Conforme</div>
                      <div className="text-sm text-muted-foreground">Está correto</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setResposta('nao_conforme')}
                  className={`w-full p-4 rounded-md border-2 text-left transition-all ${
                    resposta === 'nao_conforme'
                      ? 'border-destructive bg-destructive/10'
                      : 'border-border hover:border-destructive/50'
                  }`}
                  data-testid="response-nao-conforme"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className={`w-5 h-5 ${
                      resposta === 'nao_conforme' ? 'text-destructive' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-medium">Não Conforme</div>
                      <div className="text-sm text-muted-foreground">Há problemas</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setResposta('nao_aplicavel')}
                  className={`w-full p-4 rounded-md border-2 text-left transition-all ${
                    resposta === 'nao_aplicavel'
                      ? 'border-muted bg-muted/10'
                      : 'border-border hover:border-muted/50'
                  }`}
                  data-testid="response-nao-aplicavel"
                >
                  <div className="flex items-center gap-3">
                    <Minus className={`w-5 h-5 ${
                      resposta === 'nao_aplicavel' ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-medium">Não Aplicável</div>
                      <div className="text-sm text-muted-foreground">Não se aplica a esta área</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="observacao">Observações (opcional)</Label>
              <Textarea
                id="observacao"
                data-testid="observacao-textarea"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Adicione detalhes ou observações..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              {currentIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1"
                  data-testid="previous-button"
                >
                  Anterior
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!resposta || !foto || submitting}
                className="flex-1"
                data-testid="next-button"
              >
                {submitting ? 'Salvando...' : (currentIndex === items.length - 1 ? 'Finalizar' : 'Próximo Item')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChecklistItemPage;