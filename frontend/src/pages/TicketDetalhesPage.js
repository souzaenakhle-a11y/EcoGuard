import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Home, Send } from 'lucide-react';
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

  const handleChangeStatus = async (newStatus) => {
    try {
      await axios.put(
        `${API}/tickets/${ticketId}/status?status=${newStatus}`,
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
              <CardTitle>Informações do Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{ticket.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{ticket.empresa?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Planta</p>
                  <p className="font-medium">{ticket.planta?.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>

              {isGestor && ticket.status === 'aberto' && (
                <div className="mt-6">
                  <Button onClick={handleMapearAreas} className="w-full">
                    Mapear Áreas Críticas
                  </Button>
                </div>
              )}

              {isGestor && ticket.status === 'em_analise' && ticket.areas?.length > 0 && (
                <div className="mt-6 flex gap-3">
                  <Button onClick={() => handleChangeStatus('aguardando_cliente')} className="flex-1">
                    Enviar para Cliente
                  </Button>
                  <Button onClick={() => handleChangeStatus('fechado')} variant="outline" className="flex-1">
                    Fechar Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mensagens</CardTitle>
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
