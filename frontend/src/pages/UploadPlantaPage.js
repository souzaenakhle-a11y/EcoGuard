import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UploadPlantaPage = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [empresaData, setEmpresaData] = useState({
    nome: '',
    cnpj: '',
    setor: '',
    endereco: ''
  });
  const [empresaId, setEmpresaId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [plantaNome, setPlantaNome] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleEmpresaSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/empresas`, empresaData, {
        withCredentials: true
      });
      setEmpresaId(response.data.empresa_id);
      setStep(2);
      toast.success('Empresa cadastrada com sucesso!');
    } catch (error) {
      console.error('Error creating empresa:', error);
      toast.error('Erro ao cadastrar empresa');
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

        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Cadastro da Empresa</CardTitle>
              <CardDescription>
                Primeiro, precisamos de algumas informações sobre sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmpresaSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Empresa *</Label>
                  <Input
                    id="nome"
                    data-testid="empresa-nome-input"
                    value={empresaData.nome}
                    onChange={(e) => setEmpresaData({...empresaData, nome: e.target.value})}
                    required
                    placeholder="Ex: SN Engenharia Ltda"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    data-testid="empresa-cnpj-input"
                    value={empresaData.cnpj}
                    onChange={(e) => setEmpresaData({...empresaData, cnpj: e.target.value})}
                    required
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="setor">Setor *</Label>
                  <Select 
                    value={empresaData.setor} 
                    onValueChange={(value) => setEmpresaData({...empresaData, setor: value})}
                    required
                  >
                    <SelectTrigger data-testid="empresa-setor-select">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industria">Indústria</SelectItem>
                      <SelectItem value="construcao_civil">Construção Civil</SelectItem>
                      <SelectItem value="comercio">Comércio</SelectItem>
                      <SelectItem value="servicos">Serviços</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    data-testid="empresa-endereco-input"
                    value={empresaData.endereco}
                    onChange={(e) => setEmpresaData({...empresaData, endereco: e.target.value})}
                    placeholder="Endereço completo"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="empresa-submit-button">
                  Continuar para Upload da Planta
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">Passo 1: Envie a Planta do Estabelecimento</CardTitle>
                  <CardDescription>
                    Envie uma planta, layout ou foto aérea do local para identificarmos as áreas críticas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                      <p className="text-xs text-muted-foreground">Formatos aceitos: PDF, JPG, PNG, DWG</p>
                      <p className="text-xs text-muted-foreground">Tamanho máximo: 10MB</p>
                    </div>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.dwg"
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
                disabled={!selectedFile || !plantaNome || uploading}
                className="w-full"
                data-testid="upload-submit-button"
              >
                {uploading ? 'Enviando...' : 'Enviar e Continuar'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UploadPlantaPage;