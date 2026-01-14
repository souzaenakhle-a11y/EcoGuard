import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Send, Camera, CheckCircle, XCircle, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TicketDetalhesPage = ({ user }) => {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [fotosPorArea, setFotosPorArea] = useState({});
  const [analisesPorArea, setAnalisesPorArea] = useState({});
  const fileInputRefs = useRef({});

  useEffect(() => {
    fetchTicket();
    checkIfGestor();
  }, [ticketId]);

  const checkIfGestor = () => {
    setIsGestor(user?.email === 'souzaenakhle@gmail.com');
  };

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}`, { withCredentials: true });
      setTicket(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Erro ao carregar ticket');
      setLoading(false);
    }
  };

  const handleEnviarMensagem = async () => {
    if (!mensagem.trim()) return;

    setSending(true);
    try {
      await axios.post(
        `${API}/tickets/${ticketId}/mensagem?mensagem=${encodeURIComponent(mensagem)}&tipo=mensagem`,
        {},
        { withCredentials: true }
      );
      toast.success('Mensagem enviada!');
      setMensagem('');
      fetchTicket();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleChangeStatus = async (newStatus, newEtapa) => {
    try {
      await axios.put(
        `${API}/tickets/${ticketId}/status?status=${newStatus}&etapa=${newEtapa}`,
        {},
        { withCredentials: true }
      );
      toast.success('Status atualizado!');
      fetchTicket();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleMapearAreas = () => {
    navigate(`/mapear-areas/${ticket.planta_id}?ticket=${ticketId}`);
  };

  const handleUploadFoto = async (areaId) => {
    const file = fotosPorArea[areaId];
    if (!file) return;

    const formData = new FormData();
    formData.append('area_id', areaId);
    formData.append('foto', file);

    try {
      await axios.post(`${API}/tickets/${ticketId}/upload-foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      toast.success('Foto enviada!');
      setFotosPorArea({...fotosPorArea, [areaId]: null});
    } catch (error) {
      console.error('Error uploading foto:', error);
      toast.error('Erro ao enviar foto');
    }
  };

  const handleAnalisarArea = async (areaId) => {
    const analise = analisesPorArea[areaId];
    if (!analise?.situacao) {
      toast.error('Selecione a situação encontrada');
      return;
    }

    const formData = new FormData();
    formData.append('area_id', areaId);
    formData.append('situacao', analise.situacao);
    formData.append('observacao', analise.observacao || '');

    try {
      await axios.post(`${API}/tickets/${ticketId}/analise-area`, formData, {
        withCredentials: true
      });
      toast.success('Análise registrada!');
      fetchTicket();
    } catch (error) {
      console.error('Error analyzing area:', error);
      toast.error('Erro ao registrar análise');
    }
  };

  const handleEnviarTodasFotos = async () => {
    const areasComFoto = ticket.areas.filter(a => fotosPorArea[a.area_id]);
    if (areasComFoto.length === 0) {
      toast.error('Envie pelo menos uma foto');
      return;
    }

    for (const area of areasComFoto) {
      await handleUploadFoto(area.area_id);
    }

    await handleChangeStatus('aguardando_analise_gestor', 'analise_gestor');
    toast.success('Todas as fotos foram enviadas para análise!');
  };

  const handleFinalizarAnalise = async () => {
    const todasAnalisadas = ticket.areas.every(a => a.situacao_gestor);
    if (!todasAnalisadas) {
      toast.error('Analise todas as áreas antes de finalizar');
      return;
    }

    await handleChangeStatus('concluido', 'finalizado');
    toast.success('Ticket finalizado! Relatório disponível.');
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Ticket #{ticket.ticket_id.substring(4)}</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
              <Home className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status: {ticket.etapa?.replace(/_/g, ' ').toUpperCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              {isGestor && ticket.etapa === 'mapeamento_gestor' && (
                <Button onClick={handleMapearAreas} className="w-full">
                  Mapear Áreas Críticas
                </Button>
              )}

              {!isGestor && ticket.etapa === 'upload_fotos_cliente' && ticket.areas?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Envie fotos das áreas críticas marcadas:</p>
                  {ticket.areas.map((area) => (
                    <div key={area.area_id} className="p-4 border rounded-md">
                      <p className="font-medium mb-2">{area.nome}</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setFotosPorArea({...fotosPorArea, [area.area_id]: e.target.files[0]})}
                        className="w-full"
                      />
                    </div>
                  ))}
                  <Button onClick={handleEnviarTodasFotos} className="w-full">
                    Enviar Todas as Fotos
                  </Button>
                </div>
              )}

              {isGestor && ticket.etapa === 'analise_gestor' && ticket.areas?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Analise as fotos enviadas:</p>
                  {ticket.areas.map((area) => (
                    <div key={area.area_id} className="p-4 border rounded-md space-y-3">
                      <p className="font-medium">{area.nome}</p>
                      <Select
                        value={analisesPorArea[area.area_id]?.situacao || ''}
                        onValueChange={(v) => setAnalisesPorArea({
                          ...analisesPorArea,
                          [area.area_id]: {...analisesPorArea[area.area_id], situacao: v}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Situação encontrada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conforme">✓ Conforme</SelectItem>
                          <SelectItem value="nao_conforme">✗ Não Conforme</SelectItem>
                          <SelectItem value="nao_aplicavel">— Não Aplicável</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Observações..."
                        value={analisesPorArea[area.area_id]?.observacao || ''}
                        onChange={(e) => setAnalisesPorArea({
                          ...analisesPorArea,
                          [area.area_id]: {...analisesPorArea[area.area_id], observacao: e.target.value}
                        })}
                        rows={2}
                      />
                      <Button onClick={() => handleAnalisarArea(area.area_id)} size="sm" className="w-full">
                        Salvar Análise
                      </Button>
                    </div>
                  ))}
                  <Button onClick={handleFinalizarAnalise} className="w-full">
                    Finalizar e Enviar Relatório
                  </Button>
                </div>
              )}

              {ticket.etapa === 'finalizado' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                  <p className="text-lg font-semibold">Ticket Finalizado</p>
                  <p className="text-sm text-muted-foreground">Relatório completo disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {ticket.mensagens?.map((msg) => (
                  <div key={msg.mensagem_id} className={`p-3 rounded-md ${msg.user_role === 'gestor' ? 'bg-primary/5' : 'bg-secondary/50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={msg.user_role === 'gestor' ? 'default' : 'outline'}>
                        {msg.user_role === 'gestor' ? 'Equipe' : 'Cliente'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm">{msg.mensagem}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleEnviarMensagem} disabled={sending || !mensagem.trim()} className="mt-2 w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Enviando...' : 'Enviar Mensagem'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketDetalhesPage;
