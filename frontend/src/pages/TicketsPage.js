import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Eye, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Trash2, Camera, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TicketsPage = ({ user }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const isGestor = user?.email === 'souzaenakhle@gmail.com';

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/tickets`, { withCredentials: true });
      setTickets(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (e, ticketId) => {
    e.stopPropagation(); // Prevent card click
    
    if (!window.confirm('Tem certeza que deseja excluir este ticket?')) {
      return;
    }
    
    setDeleting(ticketId);
    try {
      await axios.delete(`${API}/tickets/${ticketId}`, { withCredentials: true });
      toast.success('Ticket excluído com sucesso!');
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Erro ao excluir ticket');
    } finally {
      setDeleting(null);
    }
  };

  const getEtapaBadge = (etapa, status) => {
    // Mapear baseado na etapa, não no status
    const etapaConfig = {
      'mapeamento_gestor': { label: 'Aguardando Mapeamento', icon: Clock, color: 'bg-blue-100 text-blue-600' },
      'upload_fotos_cliente': { label: 'Aguardando Fotos', icon: Camera, color: 'bg-yellow-100 text-yellow-600' },
      'analise_gestor': { label: 'Em Análise', icon: Eye, color: 'bg-purple-100 text-purple-600' },
      'finalizado': { label: 'Concluído', icon: CheckCircle, color: 'bg-green-100 text-green-600' }
    };

    const config = etapaConfig[etapa] || etapaConfig['mapeamento_gestor'];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
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
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold">
              {isGestor ? 'Todos os Tickets' : 'Meus Tickets'}
            </h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Home</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Nenhum ticket encontrado</p>
                <p className="text-muted-foreground mb-4">Faça upload de uma planta para criar um ticket</p>
                <Button onClick={() => navigate('/upload-planta')}>
                  Nova Planta
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Card 
                key={ticket.ticket_id} 
                className={`hover:border-primary/30 transition-colors cursor-pointer ${ticket.deleted_by_client ? 'opacity-60 border-red-200' : ''}`}
                onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold">Ticket #{ticket.ticket_id.substring(4)}</h3>
                        {getEtapaBadge(ticket.etapa, ticket.status)}
                        {ticket.deleted_by_client && (
                          <Badge className="bg-red-100 text-red-600 gap-1">
                            <Trash2 className="w-3 h-3" />
                            Excluído pelo Cliente
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <p><span className="font-medium">Empresa:</span> {ticket.empresa?.nome || 'N/A'}</p>
                        <p><span className="font-medium">Planta:</span> {ticket.planta?.nome || 'N/A'}</p>
                        <p><span className="font-medium">Cliente:</span> {ticket.user_email}</p>
                        <p><span className="font-medium">Criado em:</span> {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteTicket(e, ticket.ticket_id)}
                        disabled={deleting === ticket.ticket_id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
