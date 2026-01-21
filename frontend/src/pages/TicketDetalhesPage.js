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
import { ArrowLeft, Home, Send, Camera, CheckCircle, XCircle, Minus, Download, Image, FileText, Eye } from 'lucide-react';
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
  const [fotosPreview, setFotosPreview] = useState({});
  const [downloadingReport, setDownloadingReport] = useState(false);
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
      setFotosPreview({...fotosPreview, [areaId]: null});
      fetchTicket();
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

  const handleFileChange = (areaId, file) => {
    setFotosPorArea({...fotosPorArea, [areaId]: file});
    
    // Create preview
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFotosPreview({...fotosPreview, [areaId]: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadRelatorio = async () => {
    setDownloadingReport(true);
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}/relatorio`, {
        withCredentials: true,
        responseType: 'text'
      });
      
      // Criar blob do HTML recebido
      const blob = new Blob([response.data], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      
      // Download do arquivo
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_ticket_${ticketId.substring(4)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      toast.success('Relatório baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Erro ao baixar relatório');
    } finally {
      setDownloadingReport(false);
    }
  };

  const viewFotoCliente = (areaId) => {
    window.open(`${API}/areas/${areaId}/foto-cliente`, '_blank');
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
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold">Ticket #{ticket.ticket_id.substring(4)}</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')}>
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Status: {(ticket.etapa || ticket.status || 'pendente')?.replace(/_/g, ' ').toUpperCase()}</span>
                {ticket.etapa === 'finalizado' && (
                  <Button 
                    onClick={handleDownloadRelatorio} 
                    disabled={downloadingReport}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingReport ? 'Baixando...' : 'Baixar Relatório'}
                  </Button>
                )}
              </CardTitle>
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
                      <p className="text-sm text-muted-foreground mb-2">Tipo: {area.tipo_area} | Criticidade: {area.criticidade}</p>
                      
                      {fotosPreview[area.area_id] && (
                        <div className="mb-3">
                          <img 
                            src={fotosPreview[area.area_id]} 
                            alt="Preview" 
                            className="max-h-32 rounded-md border"
                          />
                        </div>
                      )}
                      
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileChange(area.area_id, e.target.files[0])}
                        className="w-full"
                      />
                      
                      {area.foto_cliente_id && (
                        <Badge className="mt-2 bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" /> Foto já enviada
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button onClick={handleEnviarTodasFotos} className="w-full">
                    Enviar Todas as Fotos
                  </Button>
                </div>
              )}

              {isGestor && ticket.etapa === 'analise_gestor' && ticket.areas?.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Analise as fotos enviadas pelo cliente:</p>
                  {ticket.areas.map((area) => (
                    <div key={area.area_id} className="p-4 border rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{area.nome}</p>
                        <Badge variant="outline">{area.tipo_area}</Badge>
                      </div>
                      
                      {/* Mostrar foto do cliente */}
                      {area.foto_cliente_id ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Foto enviada pelo cliente:</p>
                          <div className="relative">
                            <img 
                              src={`${API}/areas/${area.area_id}/foto-cliente`}
                              alt={`Foto de ${area.nome}`}
                              className="max-h-64 w-full object-contain rounded-md border bg-gray-50 cursor-pointer"
                              onClick={() => viewFotoCliente(area.area_id)}
                            />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="absolute top-2 right-2"
                              onClick={() => viewFotoCliente(area.area_id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ampliar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                          <Image className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                          <p className="text-sm text-yellow-700">Cliente ainda não enviou foto desta área</p>
                        </div>
                      )}
                      
                      {/* Análise já feita */}
                      {area.situacao_gestor ? (
                        <div className={`p-3 rounded-md ${
                          area.situacao_gestor === 'conforme' ? 'bg-green-50 border-green-200' :
                          area.situacao_gestor === 'nao_conforme' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        } border`}>
                          <div className="flex items-center gap-2 mb-1">
                            {area.situacao_gestor === 'conforme' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {area.situacao_gestor === 'nao_conforme' && <XCircle className="w-4 h-4 text-red-600" />}
                            {area.situacao_gestor === 'nao_aplicavel' && <Minus className="w-4 h-4 text-gray-600" />}
                            <span className="font-medium">
                              {area.situacao_gestor === 'conforme' ? 'Conforme' :
                               area.situacao_gestor === 'nao_conforme' ? 'Não Conforme' : 'Não Aplicável'}
                            </span>
                          </div>
                          {area.observacao_gestor && (
                            <p className="text-sm mt-1">{area.observacao_gestor}</p>
                          )}
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  ))}
                  <Button onClick={handleFinalizarAnalise} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalizar e Enviar Relatório
                  </Button>
                </div>
              )}

              {ticket.etapa === 'finalizado' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold">Ticket Finalizado</p>
                  <p className="text-sm text-muted-foreground mb-4">Relatório completo disponível</p>
                  
                  {/* Resumo das análises */}
                  {ticket.areas?.length > 0 && (
                    <div className="mt-6 space-y-2 text-left">
                      <p className="font-medium text-center mb-4">Resumo das Análises:</p>
                      {ticket.areas.map((area) => (
                        <div key={area.area_id} className={`p-3 rounded-md flex items-center justify-between ${
                          area.situacao_gestor === 'conforme' ? 'bg-green-50' :
                          area.situacao_gestor === 'nao_conforme' ? 'bg-red-50' :
                          'bg-gray-50'
                        }`}>
                          <span>{area.nome}</span>
                          <Badge className={
                            area.situacao_gestor === 'conforme' ? 'bg-green-100 text-green-700' :
                            area.situacao_gestor === 'nao_conforme' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {area.situacao_gestor === 'conforme' ? '✓ Conforme' :
                             area.situacao_gestor === 'nao_conforme' ? '✗ Não Conforme' : '— N/A'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
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
