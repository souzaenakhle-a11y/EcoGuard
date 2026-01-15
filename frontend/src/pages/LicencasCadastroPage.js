import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Home, Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LicencasCadastroPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [empresas, setEmpresas] = useState([]);
  const [formData, setFormData] = useState({
    empresa_id: '',
    nome_licenca: '',
    numero_licenca: '',
    tipo: '',
    orgao_emissor: '',
    data_emissao: '',
    data_validade: '',
    dias_alerta_vencimento: 30,
    observacoes: ''
  });
  const [condicionantes, setCondicionantes] = useState([]);
  const [showCondDialog, setShowCondDialog] = useState(false);
  const [condForm, setCondForm] = useState({
    nome: '',
    data_acompanhamento: '',
    alerta_acompanhamento: '',
    responsavel_nome: '',
    responsavel_email: '',
    descricao: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmpresas();
    if (editId) {
      fetchLicenca(editId);
    }
  }, [editId]);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, { withCredentials: true });
      setEmpresas(response.data);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const fetchLicenca = async (id) => {
    try {
      const response = await axios.get(`${API}/licencas/${id}`, { withCredentials: true });
      const lic = response.data;
      setFormData({
        empresa_id: lic.empresa_id,
        nome_licenca: lic.nome_licenca,
        numero_licenca: lic.numero_licenca,
        tipo: lic.tipo,
        orgao_emissor: lic.orgao_emissor,
        data_emissao: lic.data_emissao?.split('T')[0] || '',
        data_validade: lic.data_validade?.split('T')[0] || '',
        dias_alerta_vencimento: lic.dias_alerta_vencimento || 30,
        observacoes: lic.observacoes || ''
      });
      
      const condRes = await axios.get(`${API}/condicionantes?licenca_id=${id}`, { withCredentials: true });
      setCondicionantes(condRes.data);
    } catch (error) {
      console.error('Error fetching licenca:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      let licencaId = editId;
      
      if (editId) {
        await axios.put(`${API}/licencas/${editId}`, formData, { withCredentials: true });
      } else {
        const response = await axios.post(`${API}/licencas`, formData, { withCredentials: true });
        licencaId = response.data.licenca_id;
      }

      for (const cond of condicionantes.filter(c => !c.condicionante_id)) {
        await axios.post(`${API}/licencas/${licencaId}/condicionantes`, cond, { withCredentials: true });
      }

      toast.success(editId ? 'Licença atualizada!' : 'Licença cadastrada!');
      navigate('/licencas');
    } catch (error) {
      console.error('Error saving licenca:', error);
      toast.error('Erro ao salvar licença');
    } finally {
      setSaving(false);
    }
  };

  const addCondicionante = () => {
    setCondicionantes([...condicionantes, { ...condForm }]);
    setCondForm({
      nome: '',
      data_acompanhamento: '',
      alerta_acompanhamento: '',
      responsavel_nome: '',
      responsavel_email: '',
      descricao: ''
    });
    setShowCondDialog(false);
    toast.success('Condicionante adicionada!');
  };

  const removeCondicionante = (index) => {
    setCondicionantes(condicionantes.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{editId ? 'Editar' : 'Cadastrar'} Licença</h1>
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dados da Licença</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa_id">Empresa *</Label>
                  <Select value={formData.empresa_id} onValueChange={(v) => setFormData({...formData, empresa_id: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map(emp => (
                        <SelectItem key={emp.empresa_id} value={emp.empresa_id}>{emp.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nome_licenca">Nome da Licença *</Label>
                  <Input
                    id="nome_licenca"
                    value={formData.nome_licenca}
                    onChange={(e) => setFormData({...formData, nome_licenca: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_licenca">Número da Licença *</Label>
                  <Input
                    id="numero_licenca"
                    value={formData.numero_licenca}
                    onChange={(e) => setFormData({...formData, numero_licenca: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Input
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    placeholder="Ex: LO, LP, LI"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="orgao_emissor">Órgão Emissor *</Label>
                <Input
                  id="orgao_emissor"
                  value={formData.orgao_emissor}
                  onChange={(e) => setFormData({...formData, orgao_emissor: e.target.value})}
                  required
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data_emissao">Data de Emissão *</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_validade">Data de Validade *</Label>
                  <Input
                    id="data_validade"
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => setFormData({...formData, data_validade: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dias_alerta">Dias para Alerta</Label>
                  <Input
                    id="dias_alerta"
                    type="number"
                    value={formData.dias_alerta_vencimento}
                    onChange={(e) => setFormData({...formData, dias_alerta_vencimento: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Condicionantes ({condicionantes.length})</CardTitle>
                <Button type="button" size="sm" onClick={() => setShowCondDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {condicionantes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma condicionante adicionada</p>
              ) : (
                <div className="space-y-3">
                  {condicionantes.map((cond, index) => (
                    <div key={index} className="p-3 border rounded-md flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{cond.nome}</p>
                        <p className="text-sm text-muted-foreground">Responsável: {cond.responsavel_nome}</p>
                        <p className="text-sm text-muted-foreground">Acompanhamento: {cond.data_acompanhamento}</p>
                      </div>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCondicionante(index)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/licencas')} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Licença'}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={showCondDialog} onOpenChange={setShowCondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Condicionante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cond_nome">Nome da Condicionante *</Label>
              <Input
                id="cond_nome"
                value={condForm.nome}
                onChange={(e) => setCondForm({...condForm, nome: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_acomp">Data de Acompanhamento *</Label>
                <Input
                  id="data_acomp"
                  type="date"
                  value={condForm.data_acompanhamento}
                  onChange={(e) => setCondForm({...condForm, data_acompanhamento: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="alerta_acomp">Alerta de Acompanhamento *</Label>
                <Input
                  id="alerta_acomp"
                  type="date"
                  value={condForm.alerta_acompanhamento}
                  onChange={(e) => setCondForm({...condForm, alerta_acompanhamento: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resp_nome">Responsável *</Label>
                <Input
                  id="resp_nome"
                  value={condForm.responsavel_nome}
                  onChange={(e) => setCondForm({...condForm, responsavel_nome: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="resp_email">E-mail do Responsável *</Label>
                <Input
                  id="resp_email"
                  type="email"
                  value={condForm.responsavel_email}
                  onChange={(e) => setCondForm({...condForm, responsavel_email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                value={condForm.descricao}
                onChange={(e) => setCondForm({...condForm, descricao: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCondDialog(false)}>Cancelar</Button>
            <Button onClick={addCondicionante}>Adicionar Condicionante</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LicencasCadastroPage;
