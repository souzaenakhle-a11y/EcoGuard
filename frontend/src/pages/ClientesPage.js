import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Home, Plus, Building, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const ClientesPage = ({ user }) => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [formData, setFormData] = useState({ 
    nome: '', 
    cnpj: '', 
    endereco: '', 
    responsavel: '', 
    telefone: '', 
    cidade: '', 
    estado: '',
    tipo_estabelecimento: 'matriz'
  });

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, { withCredentials: true });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Verificar se já existe uma matriz
      if (formData.tipo_estabelecimento === 'matriz') {
        const existingMatriz = empresas.find(emp => emp.tipo_estabelecimento === 'matriz');
        if (existingMatriz) {
          toast.error('Já existe uma empresa cadastrada como Matriz. Cadastre como Filial ou exclua a Matriz existente.');
          return;
        }
      }
      
      const empresaData = {
        nome: formData.nome,
        cnpj: formData.cnpj,
        setor: 'Geral',
        tipo_estabelecimento: formData.tipo_estabelecimento,
        endereco: formData.endereco,
        responsavel: formData.responsavel,
        telefone: formData.telefone,
        cidade: formData.cidade,
        estado: formData.estado
      };
      
      await axios.post(`${API}/empresas`, empresaData, { withCredentials: true });
      toast.success('Empresa cadastrada com sucesso!');
      fetchEmpresas();
      setShowDialog(false);
      setFormData({ nome: '', cnpj: '', endereco: '', responsavel: '', telefone: '', cidade: '', estado: '', tipo_estabelecimento: 'matriz' });
    } catch (error) {
      console.error('Error saving empresa:', error);
      toast.error('Erro ao salvar empresa');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja excluir esta empresa?')) return;
    try {
      await axios.delete(`${API}/empresas/${id}`, { withCredentials: true });
      toast.success('Empresa excluída!');
      fetchEmpresas();
    } catch (error) {
      console.error('Error deleting empresa:', error);
      toast.error('Erro ao excluir empresa');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <h1 className="text-lg sm:text-2xl font-bold">Cadastro de Empresas</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => { setEditingEmpresa(null); setFormData({ nome: '', cnpj: '', endereco: '', responsavel: '', telefone: '', cidade: '', estado: '' }); setShowDialog(true); }} className="flex-1 sm:flex-none text-xs sm:text-sm">
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Empresa</span>
                <span className="sm:hidden">Nova</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {empresas.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 sm:py-12">
                <Building className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground mb-4">Nenhuma empresa cadastrada</p>
                <Button onClick={() => setShowDialog(true)} size="sm">
                  Cadastrar Primeira Empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {empresas.map((empresa) => (
              <Card key={empresa.empresa_id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{empresa.nome}</p>
                        <p className="text-sm text-muted-foreground">{empresa.cnpj}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground mb-3">
                    <p>{empresa.endereco}</p>
                    {empresa.telefone && <p>Tel: {empresa.telefone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDelete(empresa.empresa_id)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Empresa/Empreendimento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tipo_estabelecimento">Tipo de Estabelecimento *</Label>
                <Select value={formData.tipo_estabelecimento} onValueChange={(v) => setFormData({...formData, tipo_estabelecimento: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matriz">Matriz</SelectItem>
                    <SelectItem value="filial">Filial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="endereco">Endereço *</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado *</Label>
                  <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="responsavel">Responsável *</Label>
                  <Input
                    id="responsavel"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit">Salvar Empresa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesPage;
