import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, FileText, Building } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UploadPlantaPage = ({ user }) => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [plantaNome, setPlantaNome] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API}/empresas`, { withCredentials: true });
      setEmpresas(response.data);
      if (response.data.length > 0) {
        setEmpresaId(response.data[0].empresa_id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching empresas:', error);
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
      
      if (!plantaNome) {
        setPlantaNome(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!empresaId) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    if (!selectedFile || !plantaNome) {
      toast.error('Selecione um arquivo e dê um nome à planta');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('empresa_id', empresaId);
      formData.append('nome', plantaNome);
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/plantas`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      toast.success('Planta enviada com sucesso!');
      navigate(`/mapear-areas/${response.data.planta_id}`);
    } catch (error) {
      console.error('Error uploading planta:', error);
      toast.error('Erro ao enviar planta');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Nenhuma empresa cadastrada</h2>
          <p className="text-muted-foreground mb-6">Cadastre uma empresa antes de fazer upload da planta</p>
          <Button onClick={() => navigate('/clientes')}>
            Cadastrar Empresa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/home')}
          className="mb-6"
          data-testid="home-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Enviar Planta do Estabelecimento</CardTitle>
                <CardDescription>
                  Envie uma planta, layout ou foto aérea do local
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="empresa_select">Selecione a Empresa *</Label>
              <Select value={empresaId} onValueChange={setEmpresaId} required>
                <SelectTrigger data-testid="empresa-select">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(emp => (
                    <SelectItem key={emp.empresa_id} value={emp.empresa_id}>{emp.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-md hover:border-primary/50 transition-colors cursor-pointer bg-secondary/20"
                data-testid="file-upload-area"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-60 object-contain" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-base font-medium mb-2">Arraste o arquivo aqui</p>
                    <p className="text-sm text-muted-foreground mb-1">ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">Formatos: PDF, JPG, PNG</p>
                    <p className="text-xs text-muted-foreground">Tamanho máximo: 10MB</p>
                  </div>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </Label>
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="planta-nome">Nome do arquivo *</Label>
              <Input
                id="planta-nome"
                data-testid="planta-nome-input"
                value={plantaNome}
                onChange={(e) => setPlantaNome(e.target.value)}
                placeholder="Ex: Planta Principal - Setor Industrial"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !plantaNome || uploading || !empresaId}
              className="w-full"
              data-testid="upload-submit-button"
            >
              {uploading ? 'Enviando...' : 'Enviar e Continuar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPlantaPage;