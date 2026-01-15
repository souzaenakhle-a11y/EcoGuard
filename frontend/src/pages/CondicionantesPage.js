import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Home, ArrowLeft, Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CondicionantesPage = ({ user }) => {
  const navigate = useNavigate();
  const [condicionantes, setCondicionantes] = useState([]);
  const [licencas, setLicencas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCond, setEditingCond] = useState(null);
  const [formData, setFormData] = useState({
    licenca_id: '',
    nome: '',
    data_acompanhamento: '',
    alerta_acompanhamento: '',
    responsavel_nome: '',
    responsavel_email: '',
    descricao: '',
    status: 'em_andamento',
    percentual_conclusao: 0,
    observacoes: '',
    nova_data_acompanhamento: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [condRes, licRes] = await Promise.all([
        axios.get(`${API}/condicionantes`, { withCredentials: true }),
        axios.get(`${API}/licencas`, { withCredentials: true })
      ]);
      setCondicionantes(condRes.data || []);
      setLicencas(licRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCond) {
        await axios.put(`${API}/condicionantes/${editingCond.condicionante_id}`, formData, { withCredentials: true });
        toast.success('Condicionante atualizada!');
      } else {
        await axios.post(`${API}/licencas/${formData.licenca_id}/condicionantes`, formData, { withCredentials: true });
        toast.success('Condicionante criada!');
      }
      fetchData();
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving condicionante:', error);
      toast.error('Erro ao salvar condicionante');
    }
  };

  const handleEdit = (cond) => {
    setEditingCond(cond);
    setFormData({
      licenca_id: cond.licenca_id,
      nome: cond.nome,
      data_acompanhamento: cond.data_acompanhamento?.split('T')[0] || '',
      alerta_acompanhamento: cond.alerta_acompanhamento?.split('T')[0] || '',
      responsavel_nome: cond.responsavel_nome,
      responsavel_email: cond.responsavel_email,
      descricao: cond.descricao,
      status: cond.status || 'em_andamento',
      percentual_conclusao: cond.percentual_conclusao || 0,
      observacoes: cond.observacoes || '',
      nova_data_acompanhamento: cond.nova_data_acompanhamento?.split('T')[0] || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (condId) => {
    if (!window.confirm('Excluir esta condicionante?')) return;
    try {
      await axios.delete(`${API}/condicionantes/${condId}`, { withCredentials: true });
      toast.success('Condicionante excluída!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setEditingCond(null);
    setFormData({
      licenca_id: '',
      nome: '',
      data_acompanhamento: '',
      alerta_acompanhamento: '',
      responsavel_nome: '',
      responsavel_email: '',
      descricao: '',
      status: 'em_andamento',
      percentual_conclusao: 0,
      observacoes: '',
      nova_data_acompanhamento: ''
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
      'concluida': { label: 'Concluída', color: 'bg-green-100 text-green-700' },
      'atrasada': { label: 'Atrasada', color: 'bg-red-100 text-red-700' },
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' }
    };
    const c = config[status] || config['pendente'];
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getLicencaNome = (licencaId) => {
    const lic = licencas.find(l => l.licenca_id === licencaId);
    return lic?.nome_licenca || 'N/A';
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
            <h1 className="text-2xl font-bold">Gestão de Condicionantes</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/licencas')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">{condicionantes.length} condicionantes cadastradas</p>
          <Button onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Condicionante
          </Button>
        </div>

        {condicionantes.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma condicionante cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {condicionantes.map((cond) => (
              <Card key={cond.condicionante_id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{cond.nome}</h3>
                        {getStatusBadge(cond.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Licença: {getLicencaNome(cond.licenca_id)}</p>
                      <p className="text-sm mb-2">{cond.descricao}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Responsável:</span>
                          <p className="font-medium">{cond.responsavel_nome}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data Acompanhamento:</span>
                          <p className="font-medium">{cond.data_acompanhamento ? format(new Date(cond.data_acompanhamento), 'dd/MM/yyyy') : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progresso:</span>
                          <p className="font-medium">{cond.percentual_conclusao || 0}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Alerta:</span>
                          <p className="font-medium">{cond.alerta_acompanhamento ? format(new Date(cond.alerta_acompanhamento), 'dd/MM/yyyy') : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(cond)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDelete(cond.condicionante_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCond ? 'Editar' : 'Nova'} Condicionante</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingCond && (
              <div>
                <Label>Licença *</Label>
                <Select value={formData.licenca_id} onValueChange={(v) => setFormData({...formData, licenca_id: v})} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {licencas.map(l => (
                      <SelectItem key={l.licenca_id} value={l.licenca_id}>{l.nome_licenca}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Nome *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Acompanhamento *</Label>
                <Input type="date" value={formData.data_acompanhamento} onChange={(e) => setFormData({...formData, data_acompanhamento: e.target.value})} required />
              </div>
              <div>
                <Label>Data Alerta *</Label>
                <Input type="date" value={formData.alerta_acompanhamento} onChange={(e) => setFormData({...formData, alerta_acompanhamento: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável *</Label>
                <Input value={formData.responsavel_nome} onChange={(e) => setFormData({...formData, responsavel_nome: e.target.value})} required />
              </div>
              <div>
                <Label>Email Responsável *</Label>
                <Input type="email" value={formData.responsavel_email} onChange={(e) => setFormData({...formData, responsavel_email: e.target.value})} required />
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} required />
            </div>
            {editingCond && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="atrasada">Atrasada</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>% Conclusão</Label>
                    <Input type="number" min="0" max="100" value={formData.percentual_conclusao} onChange={(e) => setFormData({...formData, percentual_conclusao: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit">{editingCond ? 'Salvar' : 'Criar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CondicionantesPage;
