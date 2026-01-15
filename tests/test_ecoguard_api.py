"""
EcoGuard API Tests - Environmental Compliance Management System
Tests for: Auth, Empresas, Licenças, Condicionantes, Tickets
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://green-monitor-10.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1768439506634')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_auth_me_with_valid_token(self):
        """Test /api/auth/me returns user data with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Auth/me returned user: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me correctly returns 401 without token")
    
    def test_auth_me_with_invalid_token(self):
        """Test /api/auth/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401
        print("✓ Auth/me correctly returns 401 with invalid token")


class TestEmpresas:
    """Empresa (Company) CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    def test_get_empresas_empty(self, auth_headers):
        """Test GET /api/empresas returns list"""
        response = requests.get(f"{BASE_URL}/api/empresas", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET empresas returned {len(response.json())} items")
    
    def test_create_empresa_matriz(self, auth_headers):
        """Test POST /api/empresas creates a Matriz company"""
        empresa_data = {
            "nome": "TEST_Empresa Matriz",
            "cnpj": "12345678000199",
            "setor": "Industria",
            "tipo_estabelecimento": "matriz",
            "endereco": "Rua Teste, 123",
            "responsavel": "João Teste",
            "telefone": "11999999999",
            "cidade": "São Paulo",
            "estado": "SP"
        }
        response = requests.post(
            f"{BASE_URL}/api/empresas",
            json=empresa_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "empresa_id" in data
        assert data["nome"] == empresa_data["nome"]
        assert data["tipo_estabelecimento"] == "matriz"
        print(f"✓ Created empresa matriz: {data['empresa_id']}")
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/empresas/{data['empresa_id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["nome"] == empresa_data["nome"]
        print(f"✓ Verified empresa persistence")
        
        return data["empresa_id"]
    
    def test_create_empresa_filial(self, auth_headers):
        """Test POST /api/empresas creates a Filial company"""
        empresa_data = {
            "nome": "TEST_Empresa Filial",
            "cnpj": "12345678000288",
            "setor": "Comercio",
            "tipo_estabelecimento": "filial",
            "endereco": "Av Filial, 456",
            "responsavel": "Maria Teste",
            "telefone": "11888888888",
            "cidade": "Rio de Janeiro",
            "estado": "RJ"
        }
        response = requests.post(
            f"{BASE_URL}/api/empresas",
            json=empresa_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tipo_estabelecimento"] == "filial"
        print(f"✓ Created empresa filial: {data['empresa_id']}")
        return data["empresa_id"]
    
    def test_delete_empresa(self, auth_headers):
        """Test DELETE /api/empresas/{id}"""
        # First create an empresa to delete
        empresa_data = {
            "nome": "TEST_Empresa Para Deletar",
            "cnpj": "99999999000199",
            "setor": "Teste"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/empresas",
            json=empresa_data,
            headers=auth_headers
        )
        empresa_id = create_response.json()["empresa_id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/empresas/{empresa_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted empresa: {empresa_id}")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/empresas/{empresa_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("✓ Verified empresa deletion (404)")


class TestLicencas:
    """Licença (License) CRUD tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    @pytest.fixture
    def test_empresa(self, auth_headers):
        """Create a test empresa for license tests"""
        empresa_data = {
            "nome": "TEST_Empresa Para Licencas",
            "cnpj": "11111111000111",
            "setor": "Industria"
        }
        response = requests.post(
            f"{BASE_URL}/api/empresas",
            json=empresa_data,
            headers=auth_headers
        )
        return response.json()["empresa_id"]
    
    def test_get_licencas_empty(self, auth_headers):
        """Test GET /api/licencas returns list"""
        response = requests.get(f"{BASE_URL}/api/licencas", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET licencas returned {len(response.json())} items")
    
    def test_create_licenca(self, auth_headers, test_empresa):
        """Test POST /api/licencas creates a license"""
        licenca_data = {
            "empresa_id": test_empresa,
            "nome_licenca": "TEST_Licença Operação",
            "numero_licenca": "LO-2025-001",
            "tipo": "LO",
            "orgao_emissor": "IBAMA",
            "data_emissao": "2025-01-01",
            "data_validade": "2026-01-01",
            "dias_alerta_vencimento": 30,
            "observacoes": "Licença de teste"
        }
        response = requests.post(
            f"{BASE_URL}/api/licencas",
            json=licenca_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "licenca_id" in data
        assert data["nome_licenca"] == licenca_data["nome_licenca"]
        assert data["numero_licenca"] == licenca_data["numero_licenca"]
        print(f"✓ Created licenca: {data['licenca_id']}")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/licencas/{data['licenca_id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["nome_licenca"] == licenca_data["nome_licenca"]
        print("✓ Verified licenca persistence")
        
        return data["licenca_id"]
    
    def test_update_licenca(self, auth_headers, test_empresa):
        """Test PUT /api/licencas/{id} updates a license"""
        # Create first
        licenca_data = {
            "empresa_id": test_empresa,
            "nome_licenca": "TEST_Licença Original",
            "numero_licenca": "LO-2025-002",
            "tipo": "LO",
            "orgao_emissor": "IBAMA",
            "data_emissao": "2025-01-01",
            "data_validade": "2026-01-01"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/licencas",
            json=licenca_data,
            headers=auth_headers
        )
        licenca_id = create_response.json()["licenca_id"]
        
        # Update
        update_data = {
            "nome_licenca": "TEST_Licença Atualizada",
            "observacoes": "Atualizado via teste"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/licencas/{licenca_id}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["nome_licenca"] == "TEST_Licença Atualizada"
        print(f"✓ Updated licenca: {licenca_id}")
        
        # Verify update persisted
        get_response = requests.get(
            f"{BASE_URL}/api/licencas/{licenca_id}",
            headers=auth_headers
        )
        assert get_response.json()["nome_licenca"] == "TEST_Licença Atualizada"
        print("✓ Verified licenca update persistence")
    
    def test_delete_licenca(self, auth_headers, test_empresa):
        """Test DELETE /api/licencas/{id}"""
        # Create first
        licenca_data = {
            "empresa_id": test_empresa,
            "nome_licenca": "TEST_Licença Para Deletar",
            "numero_licenca": "LO-2025-DEL",
            "tipo": "LO",
            "orgao_emissor": "IBAMA",
            "data_emissao": "2025-01-01",
            "data_validade": "2026-01-01"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/licencas",
            json=licenca_data,
            headers=auth_headers
        )
        licenca_id = create_response.json()["licenca_id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/licencas/{licenca_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Deleted licenca: {licenca_id}")
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/licencas/{licenca_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("✓ Verified licenca deletion (404)")
    
    def test_licencas_indicadores_dashboard(self, auth_headers):
        """Test GET /api/licencas/indicadores/dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/licencas/indicadores/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "validas" in data
        assert "a_vencer" in data
        assert "vencidas" in data
        print(f"✓ Indicadores dashboard: total={data['total']}, validas={data['validas']}, a_vencer={data['a_vencer']}, vencidas={data['vencidas']}")


class TestCondicionantes:
    """Condicionante (License Conditions) tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    @pytest.fixture
    def test_licenca(self, auth_headers):
        """Create a test empresa and licenca for condicionante tests"""
        # Create empresa
        empresa_data = {
            "nome": "TEST_Empresa Para Condicionantes",
            "cnpj": "22222222000122",
            "setor": "Industria"
        }
        emp_response = requests.post(
            f"{BASE_URL}/api/empresas",
            json=empresa_data,
            headers=auth_headers
        )
        empresa_id = emp_response.json()["empresa_id"]
        
        # Create licenca
        licenca_data = {
            "empresa_id": empresa_id,
            "nome_licenca": "TEST_Licença Com Condicionantes",
            "numero_licenca": "LO-COND-001",
            "tipo": "LO",
            "orgao_emissor": "IBAMA",
            "data_emissao": "2025-01-01",
            "data_validade": "2026-01-01"
        }
        lic_response = requests.post(
            f"{BASE_URL}/api/licencas",
            json=licenca_data,
            headers=auth_headers
        )
        return lic_response.json()["licenca_id"]
    
    def test_create_condicionante(self, auth_headers, test_licenca):
        """Test POST /api/licencas/{id}/condicionantes"""
        cond_data = {
            "nome": "TEST_Condicionante Monitoramento",
            "data_acompanhamento": "2025-06-01",
            "alerta_acompanhamento": "2025-05-15",
            "responsavel_nome": "Carlos Responsável",
            "responsavel_email": "carlos@teste.com",
            "descricao": "Realizar monitoramento trimestral"
        }
        response = requests.post(
            f"{BASE_URL}/api/licencas/{test_licenca}/condicionantes",
            json=cond_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "condicionante_id" in data
        assert data["nome"] == cond_data["nome"]
        print(f"✓ Created condicionante: {data['condicionante_id']}")
        return data["condicionante_id"]
    
    def test_get_condicionantes(self, auth_headers, test_licenca):
        """Test GET /api/condicionantes?licenca_id={id}"""
        # Create a condicionante first
        cond_data = {
            "nome": "TEST_Condicionante Lista",
            "data_acompanhamento": "2025-07-01",
            "alerta_acompanhamento": "2025-06-15",
            "responsavel_nome": "Ana Lista",
            "responsavel_email": "ana@teste.com",
            "descricao": "Condicionante para teste de listagem"
        }
        requests.post(
            f"{BASE_URL}/api/licencas/{test_licenca}/condicionantes",
            json=cond_data,
            headers=auth_headers
        )
        
        # Get condicionantes
        response = requests.get(
            f"{BASE_URL}/api/condicionantes?licenca_id={test_licenca}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ GET condicionantes returned {len(data)} items")


class TestTickets:
    """Ticket (Inspection Workflow) tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    def test_get_tickets(self, auth_headers):
        """Test GET /api/tickets returns list"""
        response = requests.get(f"{BASE_URL}/api/tickets", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET tickets returned {len(data)} items")
        
        # Check ticket structure if any exist
        if len(data) > 0:
            ticket = data[0]
            assert "ticket_id" in ticket
            assert "status" in ticket
            # Note: etapa field may be missing in older tickets
            print(f"✓ Ticket structure verified: {ticket['ticket_id']}")
    
    def test_get_ticket_details(self, auth_headers):
        """Test GET /api/tickets/{id} returns ticket with messages"""
        # First get list of tickets
        list_response = requests.get(f"{BASE_URL}/api/tickets", headers=auth_headers)
        tickets = list_response.json()
        
        if len(tickets) > 0:
            ticket_id = tickets[0]["ticket_id"]
            response = requests.get(
                f"{BASE_URL}/api/tickets/{ticket_id}",
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "ticket_id" in data
            assert "mensagens" in data
            assert "areas" in data
            print(f"✓ GET ticket details: {ticket_id}, mensagens={len(data.get('mensagens', []))}")
        else:
            print("⚠ No tickets to test details")


class TestClientes:
    """Cliente (Client) tests"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    def test_get_clientes(self, auth_headers):
        """Test GET /api/clientes returns list"""
        response = requests.get(f"{BASE_URL}/api/clientes", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET clientes returned {len(response.json())} items")
    
    def test_create_cliente(self, auth_headers):
        """Test POST /api/clientes creates a client"""
        cliente_data = {
            "nome": "TEST_Cliente Novo",
            "email": "cliente.teste@example.com",
            "telefone": "11777777777"
        }
        response = requests.post(
            f"{BASE_URL}/api/clientes",
            json=cliente_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "cliente_id" in data
        assert data["nome"] == cliente_data["nome"]
        print(f"✓ Created cliente: {data['cliente_id']}")


# Cleanup fixture to remove test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    
    headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
    
    # Cleanup empresas
    try:
        empresas = requests.get(f"{BASE_URL}/api/empresas", headers=headers).json()
        for emp in empresas:
            if emp.get("nome", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/empresas/{emp['empresa_id']}", headers=headers)
                print(f"Cleaned up empresa: {emp['empresa_id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
    
    # Cleanup licencas
    try:
        licencas = requests.get(f"{BASE_URL}/api/licencas", headers=headers).json()
        for lic in licencas:
            if lic.get("nome_licenca", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/licencas/{lic['licenca_id']}", headers=headers)
                print(f"Cleaned up licenca: {lic['licenca_id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
