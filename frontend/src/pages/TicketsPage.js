import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Eye, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TicketsPage = ({ user }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'aberto': { label: 'Aberto', icon: Clock, color: 'bg-blue-100 text-blue-600' },
      'aguardando_cliente': { label: 'Aguardando Cliente', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
      'em_analise': { label: 'Em Análise', icon: Eye, color: 'bg-purple-100 text-purple-600' },
      'fechado': { label: 'Fechado', icon: CheckCircle, color: 'bg-green-100 text-green-600' }
    };

    const config = statusConfig[status] || statusConfig['aberto'];
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Meus Tickets de Auto-Fiscalização</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
              <Home className="w-4 h-4 mr-2" />
              Home
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
              <Card key={ticket.ticket_id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">Ticket #{ticket.ticket_id.substring(4)}</h3>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <p><span className="font-medium">Empresa:</span> {ticket.empresa?.nome}</p>
                        <p><span className="font-medium">Planta:</span> {ticket.planta?.nome}</p>
                        <p><span className="font-medium">Criado em:</span> {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
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
