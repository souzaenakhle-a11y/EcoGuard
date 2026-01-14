import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Home, Plus, Building, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientesPage = ({ user }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${API}/clientes`, { withCredentials: true });
      setClientes(response.data);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await axios.put(`${API}/clientes/${editingCliente.cliente_id}`, formData, { withCredentials: true });
        toast.success('Cliente atualizado!');
      } else {
        await axios.post(`${API}/clientes`, formData, { withCredentials: true });
        toast.success('Cliente cadastrado!');
      }
      fetchClientes();
      setShowDialog(false);
      setFormData({ nome: '', email: '', telefone: '' });
      setEditingCliente(null);
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir este cliente?')) return;
    try {
      await axios.delete(`${API}/clientes/${id}`, { withCredentials: true });
      toast.success('Cliente excluído!');
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const openEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({ nome: cliente.nome, email: cliente.email, telefone: cliente.telefone || '' });
    setShowDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
            <div className="flex gap-2">
              <Button onClick={() => { setEditingCliente(null); setFormData({ nome: '', email: '', telefone: '' }); setShowDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
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
        {clientes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Nenhum cliente cadastrado</p>
                <Button onClick={() => setShowDialog(true)}>
                  Cadastrar Primeiro Cliente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((cliente) => (
              <Card key={cliente.cliente_id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                        <Building className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{cliente.nome}</p>
                        <p className="text-sm text-muted-foreground">{cliente.email}</p>
                      </div>
                    </div>
                  </div>
                  {cliente.telefone && (
                    <p className="text-sm text-muted-foreground mb-3">Tel: {cliente.telefone}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(cliente)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(cliente.cliente_id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCliente ? 'Editar' : 'Novo'} Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="nome">Nome do Cliente *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesPage;
