import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Home, Plus, Search, Filter, Download, Edit, Trash2, AlertTriangle, CheckCircle, FileText, Building } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LicencasPage = ({ user }) => {
  const navigate = useNavigate();
  const [licencas, setLicencas] = useState([]);
  const [filteredLicencas, setFilteredLicencas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterLicencas();
  }, [searchTerm, statusFilter, empresaFilter, licencas]);

  const fetchData = async () => {
    try {
      const [licencasRes, empresasRes] = await Promise.all([
        axios.get(`${API}/licencas`, { withCredentials: true }),
        axios.get(`${API}/empresas`, { withCredentials: true })
      ]);
      
      setLicencas(licencasRes.data || []);
      setFilteredLicencas(licencasRes.data || []);
      setEmpresas(empresasRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLicencas([]);
      setFilteredLicencas([]);
      setEmpresas([]);
      setLoading(false);
    }
  };

  const filterLicencas = () => {
    let filtered = [...licencas];

    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.nome_licenca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.numero_licenca?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    if (empresaFilter) {
      filtered = filtered.filter(l => l.empresa_id === empresaFilter);
    }

    setFilteredLicencas(filtered);
  };

  const handleDelete = async (licencaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta licença?')) return;

    try {
      await axios.delete(`${API}/licencas/${licencaId}`, { withCredentials: true });
      toast.success('Licença excluída com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error deleting licença:', error);
      toast.error('Erro ao excluir licença');
    }
  };

  const getStatusBadge = (status, diasRestantes) => {
    if (status === 'vencida') {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Vencida</Badge>;
    }
    if (status === 'a_vencer') {
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3" />A Vencer</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-success text-success"><CheckCircle className="w-3 h-3" />Válida</Badge>;
  };

  const exportData = () => {
    const csv = [
      ['Nome', 'Número', 'Órgão', 'Tipo', 'Emissão', 'Validade', 'Status'].join(','),
      ...filteredLicencas.map(l => [
        l.nome_licenca,
        l.numero_licenca,
        l.orgao_emissor,
        l.tipo,
        format(new Date(l.data_emissao), 'dd/MM/yyyy'),
        format(new Date(l.data_validade), 'dd/MM/yyyy'),
        l.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licencas_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
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
            <h1 className="text-2xl font-bold">Gestão de Licenças</h1>
            <Button variant="ghost" size="sm" onClick={() => navigate('/home')} data-testid="home-button">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {empresas.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</p>
                <p className="text-muted-foreground mb-4">Cadastre uma empresa antes de gerenciar licenças</p>
                <Button onClick={() => navigate('/clientes')}>
                  Cadastrar Empresa
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou número..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-input"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="valida">Válida</SelectItem>
              <SelectItem value="a_vencer">A Vencer</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
            </SelectContent>
          </Select>
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="w-full md:w-[200px]" data-testid="empresa-filter">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {empresas.map(emp => (
                <SelectItem key={emp.empresa_id} value={emp.empresa_id}>{emp.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline" data-testid="export-button">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => navigate('/licencas/cadastro')} data-testid="new-license-button">
            <Plus className="w-4 h-4 mr-2" />
            Nova Licença
          </Button>
        </div>

        <div className="grid gap-4">
          {empresas.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Nenhuma empresa cadastrada</p>
                  <p className="text-muted-foreground mb-4">Cadastre uma empresa antes de gerenciar licenças</p>
                  <Button onClick={() => navigate('/clientes')}>
                    Cadastrar Empresa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredLicencas.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Nenhuma licença cadastrada</p>
                  <p className="text-muted-foreground mb-4">Comece cadastrando sua primeira licença ambiental</p>
                  <Button onClick={() => navigate('/licencas/cadastro')}>
                    Cadastrar Primeira Licença
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredLicencas.map((licenca, index) => {
              const dataValidade = new Date(licenca.data_validade);
              const diasRestantes = Math.floor((dataValidade - new Date()) / (1000 * 60 * 60 * 24));
              
              return (
                <Card key={licenca.licenca_id} className="hover:border-primary/30 transition-colors" data-testid={`license-card-${index}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{licenca.nome_licenca}</h3>
                          {getStatusBadge(licenca.status, diasRestantes)}
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p><span className="font-medium">Número:</span> {licenca.numero_licenca}</p>
                          <p><span className="font-medium">Tipo:</span> {licenca.tipo}</p>
                          <p><span className="font-medium">Órgão:</span> {licenca.orgao_emissor}</p>
                          <p><span className="font-medium">Validade:</span> {format(dataValidade, 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                        {diasRestantes >= 0 && diasRestantes <= 180 && (
                          <p className="text-sm text-yellow-600 mt-2">
                            ⚠️ Vence em {diasRestantes} dias
                          </p>
                        )}
                        {diasRestantes < 0 && (
                          <p className="text-sm text-destructive mt-2">
                            ❌ Vencida há {Math.abs(diasRestantes)} dias
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/licencas/cadastro?edit=${licenca.licenca_id}`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(licenca.licenca_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default LicencasPage;
