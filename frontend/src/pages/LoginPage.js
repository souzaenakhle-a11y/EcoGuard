import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.needsInvite) {
      setShowInviteInput(true);
    }
    if (location.state?.error) {
      toast.error(location.state.error);
    }
  }, [location.state]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/home';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmitInvite = async () => {
    if (!codigoConvite.trim()) {
      toast.error('Digite o código de convite');
      return;
    }

    // Salvar código e fazer login com Google
    localStorage.setItem('codigo_convite', codigoConvite.toUpperCase());
    handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(rgba(26, 46, 46, 0.7), rgba(26, 46, 46, 0.7)), url('https://images.unsplash.com/photo-1659353587228-5dbbebb5d98f?crop=entropy&cs=srgb&fm=jpg&q=85')`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-8 lg:p-12">
          <div className="text-white max-w-md">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 lg:mb-6">Sistema de Auto-Fiscalização Ambiental</h1>
            <p className="text-base lg:text-lg text-gray-200">Evite multas e garanta conformidade com inspeções preventivas</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-md mb-3 sm:mb-4">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">EcoGuard</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {showInviteInput ? 'Digite seu código de convite' : 'Faça login para continuar'}
            </p>
          </div>

          {showInviteInput ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Para acessar o sistema, você precisa de um código de convite fornecido pelo administrador.
                  </p>
                </div>
                <div>
                  <Label htmlFor="codigo">Código de Convite</Label>
                  <Input
                    id="codigo"
                    placeholder="Ex: ABC12345"
                    value={codigoConvite}
                    onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest"
                    maxLength={8}
                  />
                </div>
                <Button 
                  onClick={handleSubmitInvite} 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? 'Validando...' : 'Continuar'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowInviteInput(false);
                    localStorage.removeItem('pending_session_id');
                  }}
                  className="w-full"
                >
                  Voltar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Button 
                data-testid="google-login-button"
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </Button>

              <div className="text-center">
                <button 
                  onClick={() => setShowInviteInput(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Tenho um código de convite
                </button>
              </div>

              <div className="text-center text-sm text-muted-foreground mt-6">
                <p>Ao continuar, você concorda com nossos</p>
                <p>Termos de Uso e Política de Privacidade</p>
              </div>
            </div>
          )}

          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-primary">100%</div>
                <div className="text-xs text-muted-foreground mt-1">Conformidade</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground mt-1">Suporte</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-primary">-80%</div>
                <div className="text-xs text-muted-foreground mt-1">Multas</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
