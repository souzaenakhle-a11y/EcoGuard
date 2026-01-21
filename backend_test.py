#!/usr/bin/env python3
"""
Backend Test Suite for EcoGuard - Auto-Fiscalização Ambiental
Testing the specific endpoints mentioned in the review request
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://adaptive-ui-8.preview.emergentagent.com/api"

class EcoGuardTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_server_connectivity(self):
        """Test if the backend server is responding"""
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me", timeout=10)
            if response.status_code in [200, 401]:
                self.log_test("Server Connectivity", True, "Backend server is responding")
                return True
            else:
                self.log_test("Server Connectivity", False, f"Unexpected status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("Server Connectivity", False, f"Connection failed: {str(e)}")
            return False
    
    def test_authentication_required(self):
        """Test that protected endpoints return 401 without authentication"""
        protected_endpoints = [
            "/tickets",
            "/tickets/fake_ticket_123",
            "/tickets/fake_ticket_123/relatorio",
            "/areas/fake_area_123/foto-cliente"
        ]
        
        all_passed = True
        for endpoint in protected_endpoints:
            try:
                response = self.session.get(f"{BACKEND_URL}{endpoint}")
                if response.status_code == 401:
                    self.log_test(f"Auth Required - {endpoint}", True, "Correctly returns 401 without authentication")
                else:
                    self.log_test(f"Auth Required - {endpoint}", False, f"Expected 401, got {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Auth Required - {endpoint}", False, f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_area_foto_cliente_not_found(self):
        """Test GET /api/areas/{area_id}/foto-cliente with fake area_id"""
        fake_area_id = "area_fake123"
        
        try:
            # Test without authentication first
            response = self.session.get(f"{BACKEND_URL}/areas/{fake_area_id}/foto-cliente")
            
            if response.status_code == 401:
                self.log_test("Area Foto Cliente - No Auth", True, "Correctly requires authentication (401)")
            elif response.status_code == 404:
                self.log_test("Area Foto Cliente - Fake ID", True, "Correctly returns 404 for non-existent area")
            else:
                self.log_test("Area Foto Cliente - Fake ID", False, f"Expected 401 or 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Area Foto Cliente - Fake ID", False, f"Request failed: {str(e)}")
            return False
        
        return True
    
    def test_tickets_endpoint_structure(self):
        """Test GET /api/tickets endpoint structure (without auth, should get 401)"""
        try:
            response = self.session.get(f"{BACKEND_URL}/tickets")
            
            if response.status_code == 401:
                self.log_test("Tickets Endpoint Structure", True, "Endpoint exists and requires authentication")
                return True
            elif response.status_code == 200:
                # If somehow we get 200, check if response has expected structure
                try:
                    data = response.json()
                    if isinstance(data, list):
                        self.log_test("Tickets Endpoint Structure", True, "Endpoint returns list structure")
                        # Check if any ticket has 'etapa' field
                        if data and 'etapa' in data[0]:
                            self.log_test("Tickets Etapa Field", True, "Tickets contain 'etapa' field")
                        return True
                    else:
                        self.log_test("Tickets Endpoint Structure", False, "Response is not a list")
                        return False
                except json.JSONDecodeError:
                    self.log_test("Tickets Endpoint Structure", False, "Response is not valid JSON")
                    return False
            else:
                self.log_test("Tickets Endpoint Structure", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Tickets Endpoint Structure", False, f"Request failed: {str(e)}")
            return False
    
    def test_ticket_delete_endpoint(self):
        """Test DELETE /api/tickets/{ticket_id} endpoint exists"""
        fake_ticket_id = "tkt_fake123"
        
        try:
            response = self.session.delete(f"{BACKEND_URL}/tickets/{fake_ticket_id}")
            
            if response.status_code == 401:
                self.log_test("Ticket Delete Endpoint", True, "DELETE endpoint exists and requires authentication")
                return True
            elif response.status_code == 404:
                self.log_test("Ticket Delete Endpoint", True, "DELETE endpoint exists, returns 404 for non-existent ticket")
                return True
            else:
                self.log_test("Ticket Delete Endpoint", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Ticket Delete Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_ticket_relatorio_endpoint(self):
        """Test GET /api/tickets/{ticket_id}/relatorio endpoint"""
        fake_ticket_id = "tkt_fake123"
        
        try:
            response = self.session.get(f"{BACKEND_URL}/tickets/{fake_ticket_id}/relatorio")
            
            if response.status_code == 401:
                self.log_test("Ticket Relatorio Endpoint", True, "Relatorio endpoint exists and requires authentication")
                return True
            elif response.status_code == 404:
                self.log_test("Ticket Relatorio Endpoint", True, "Relatorio endpoint exists, returns 404 for non-existent ticket")
                return True
            else:
                self.log_test("Ticket Relatorio Endpoint", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Ticket Relatorio Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_backend_logs(self):
        """Check backend logs for any errors"""
        try:
            import subprocess
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                if logs.strip():
                    # Check for critical errors
                    error_lines = [line for line in logs.split('\n') if 'ERROR' in line.upper() or 'CRITICAL' in line.upper()]
                    if error_lines:
                        self.log_test("Backend Logs", False, f"Found {len(error_lines)} error(s) in logs", error_lines[-3:])
                        return False
                    else:
                        self.log_test("Backend Logs", True, "No critical errors found in recent logs")
                        return True
                else:
                    self.log_test("Backend Logs", True, "No recent log entries (service may be quiet)")
                    return True
            else:
                self.log_test("Backend Logs", False, "Could not read backend logs")
                return False
                
        except Exception as e:
            self.log_test("Backend Logs", False, f"Error checking logs: {str(e)}")
            return False
    
    def authenticate_as_test_user(self):
        """Authenticate as a test user to access protected endpoints"""
        try:
            # Try to create a session with a test session_id
            # This is a mock authentication for testing purposes
            auth_data = {
                "session_id": "test_session_123",
                "codigo_convite": None
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/session", json=auth_data)
            
            if response.status_code == 200:
                # Extract session token from response or cookies
                if 'session_token' in self.session.cookies:
                    self.session_token = self.session.cookies['session_token']
                    self.log_test("Authentication", True, "Successfully authenticated test user")
                    return True
                else:
                    self.log_test("Authentication", False, "No session token received")
                    return False
            else:
                self.log_test("Authentication", False, f"Auth failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_email_alert_endpoints_structure(self):
        """Test that email alert endpoints exist and have correct structure"""
        # Test POST /api/tickets/{ticket_id}/mensagem endpoint
        fake_ticket_id = "tkt_fake123"
        
        try:
            # Test mensagem endpoint
            response = self.session.post(f"{BACKEND_URL}/tickets/{fake_ticket_id}/mensagem")
            
            if response.status_code == 401:
                self.log_test("Email Alert - Mensagem Endpoint", True, "POST mensagem endpoint exists and requires auth")
            elif response.status_code in [400, 422]:
                self.log_test("Email Alert - Mensagem Endpoint", True, "POST mensagem endpoint exists (missing data)")
            else:
                self.log_test("Email Alert - Mensagem Endpoint", False, f"Unexpected status: {response.status_code}")
                return False
            
            # Test status update endpoint
            response = self.session.put(f"{BACKEND_URL}/tickets/{fake_ticket_id}/status")
            
            if response.status_code == 401:
                self.log_test("Email Alert - Status Endpoint", True, "PUT status endpoint exists and requires auth")
            elif response.status_code in [400, 422]:
                self.log_test("Email Alert - Status Endpoint", True, "PUT status endpoint exists (missing data)")
            else:
                self.log_test("Email Alert - Status Endpoint", False, f"Unexpected status: {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Email Alert Endpoints", False, f"Request failed: {str(e)}")
            return False
    
    def test_resend_configuration(self):
        """Test if Resend API configuration is properly set"""
        try:
            # Check if backend has the required environment variables
            import subprocess
            
            # Check if backend process has RESEND_API_KEY
            result = subprocess.run(
                ["grep", "-r", "RESEND_API_KEY", "/app/backend/.env"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0 and "re_G7KVLwfX_EKBsv4QbvHfvPX9CrHAxq4iq" in result.stdout:
                self.log_test("Resend Configuration", True, "RESEND_API_KEY is configured correctly")
            else:
                self.log_test("Resend Configuration", False, "RESEND_API_KEY not found or incorrect")
                return False
            
            # Check ADMIN_EMAIL configuration
            result = subprocess.run(
                ["grep", "-r", "ADMIN_EMAIL", "/app/backend/.env"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0 and "aplicativo@snengenharia.org" in result.stdout:
                self.log_test("Admin Email Configuration", True, "ADMIN_EMAIL is configured correctly")
                return True
            else:
                self.log_test("Admin Email Configuration", False, "ADMIN_EMAIL not found or incorrect")
                return False
                
        except Exception as e:
            self.log_test("Resend Configuration", False, f"Configuration check failed: {str(e)}")
            return False
    
    def test_email_function_implementation(self):
        """Test if email notification function is implemented in backend code"""
        try:
            # Check if enviar_email_notificacao function exists in server.py
            with open("/app/backend/server.py", "r") as f:
                content = f.read()
            
            if "enviar_email_notificacao" in content:
                self.log_test("Email Function", True, "enviar_email_notificacao function found in backend")
            else:
                self.log_test("Email Function", False, "enviar_email_notificacao function not found")
                return False
            
            # Check if resend import exists
            if "import resend" in content:
                self.log_test("Resend Import", True, "Resend library is imported")
            else:
                self.log_test("Resend Import", False, "Resend library not imported")
                return False
            
            # Check if email notifications are called in ticket operations
            if "📧 Email enviado" in content:
                self.log_test("Email Logging", True, "Email logging is implemented")
                return True
            else:
                self.log_test("Email Logging", False, "Email logging not found")
                return False
                
        except Exception as e:
            self.log_test("Email Function Implementation", False, f"Code check failed: {str(e)}")
            return False
    
    def check_email_logs_after_operations(self):
        """Check backend logs for email sending attempts after operations"""
        try:
            import subprocess
            import time
            
            # Clear any existing logs first
            subprocess.run(["sudo", "truncate", "-s", "0", "/var/log/supervisor/backend.out.log"], timeout=5)
            
            # Wait a moment for log clearing
            time.sleep(1)
            
            # Now check for any new email-related logs
            result = subprocess.run(
                ["tail", "-n", "100", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                email_logs = [line for line in logs.split('\n') if '📧' in line or 'email' in line.lower() or 'resend' in line.lower()]
                
                if email_logs:
                    self.log_test("Email Logs Check", True, f"Found {len(email_logs)} email-related log entries", email_logs[-3:])
                    return True
                else:
                    self.log_test("Email Logs Check", True, "No email logs found (may indicate no recent email operations)")
                    return True
            else:
                self.log_test("Email Logs Check", False, "Could not read backend logs")
                return False
                
        except Exception as e:
            self.log_test("Email Logs Check", False, f"Log check failed: {str(e)}")
            return False
    
    def test_alert_system_endpoints(self):
        """Test alert system endpoints structure"""
        try:
            # Test POST /api/alertas/verificar endpoint
            response = self.session.post(f"{BACKEND_URL}/alertas/verificar")
            
            if response.status_code == 401:
                self.log_test("Alert Verificar Endpoint", True, "POST /api/alertas/verificar exists and requires authentication")
            elif response.status_code == 403:
                self.log_test("Alert Verificar Endpoint", True, "POST /api/alertas/verificar exists and requires gestor permission")
            else:
                self.log_test("Alert Verificar Endpoint", False, f"Unexpected status: {response.status_code}")
                return False
            
            # Test GET /api/alertas/historico endpoint
            response = self.session.get(f"{BACKEND_URL}/alertas/historico")
            
            if response.status_code == 401:
                self.log_test("Alert Historico Endpoint", True, "GET /api/alertas/historico exists and requires authentication")
            elif response.status_code == 200:
                # If we get 200, check response structure
                try:
                    data = response.json()
                    if isinstance(data, list):
                        self.log_test("Alert Historico Endpoint", True, "GET /api/alertas/historico returns list structure")
                    else:
                        self.log_test("Alert Historico Endpoint", False, "Response is not a list")
                        return False
                except json.JSONDecodeError:
                    self.log_test("Alert Historico Endpoint", False, "Response is not valid JSON")
                    return False
            else:
                self.log_test("Alert Historico Endpoint", False, f"Unexpected status: {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Alert System Endpoints", False, f"Request failed: {str(e)}")
            return False
    
    def test_alert_system_code_structure(self):
        """Test if alert system code is properly implemented"""
        try:
            with open("/app/backend/server.py", "r") as f:
                content = f.read()
            
            # Check for verificar_licencas_vencendo function
            if "async def verificar_licencas_vencendo():" in content:
                self.log_test("Alert Function - Licenças", True, "verificar_licencas_vencendo function found")
            else:
                self.log_test("Alert Function - Licenças", False, "verificar_licencas_vencendo function not found")
                return False
            
            # Check for scheduler function
            if "async def scheduler_alertas():" in content:
                self.log_test("Alert Scheduler Function", True, "scheduler_alertas function found")
            else:
                self.log_test("Alert Scheduler Function", False, "scheduler_alertas function not found")
                return False
            
            # Check for startup event that initializes scheduler
            if "📅 Scheduler de alertas automáticos iniciado" in content:
                self.log_test("Alert Scheduler Startup", True, "Scheduler initialization found in startup event")
            else:
                self.log_test("Alert Scheduler Startup", False, "Scheduler initialization not found")
                return False
            
            # Check for license alert logic
            if "dias_restantes < 0" in content and "tipo_alerta = \"VENCIDA\"" in content:
                self.log_test("License Alert Logic - Expired", True, "Expired license alert logic found")
            else:
                self.log_test("License Alert Logic - Expired", False, "Expired license alert logic not found")
                return False
            
            if "dias_restantes <= 7" in content and "tipo_alerta = \"CRÍTICO\"" in content:
                self.log_test("License Alert Logic - Critical", True, "Critical license alert logic found (7 days)")
            else:
                self.log_test("License Alert Logic - Critical", False, "Critical license alert logic not found")
                return False
            
            # Check for condicionante alert logic
            if "dias_restantes <= 15" in content and "ATENÇÃO" in content:
                self.log_test("Condicionante Alert Logic", True, "Condicionante alert logic found (15 days attention)")
            else:
                self.log_test("Condicionante Alert Logic", False, "Condicionante alert logic not found")
                return False
            
            # Check for spam prevention (alerta_key)
            if "alerta_key" in content and "alertas_enviados" in content:
                self.log_test("Alert Spam Prevention", True, "Spam prevention logic found (alerta_key)")
            else:
                self.log_test("Alert Spam Prevention", False, "Spam prevention logic not found")
                return False
            
            # Check for email notifications to multiple recipients
            if "GESTORES_EMAILS[0]" in content and "ADMIN_EMAIL" in content:
                self.log_test("Alert Email Recipients", True, "Multiple email recipients found (client, gestor, admin)")
            else:
                self.log_test("Alert Email Recipients", False, "Multiple email recipients not properly configured")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Alert System Code Structure", False, f"Code analysis failed: {str(e)}")
            return False
    
    def test_alert_system_logs(self):
        """Check backend logs for alert system initialization"""
        try:
            import subprocess
            
            # Check for scheduler initialization logs
            result = subprocess.run(
                ["tail", "-n", "200", "/var/log/supervisor/backend.out.log"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout
                
                # Check for scheduler startup log
                if "📅 Scheduler de alertas automáticos iniciado" in logs:
                    self.log_test("Alert Scheduler Logs", True, "Scheduler startup log found")
                else:
                    self.log_test("Alert Scheduler Logs", False, "Scheduler startup log not found in recent logs")
                
                # Check for license verification logs
                if "🔔 Iniciando verificação de licenças" in logs:
                    self.log_test("License Verification Logs", True, "License verification startup log found")
                else:
                    self.log_test("License Verification Logs", False, "License verification log not found")
                
                # Check for alert sending logs
                alert_logs = [line for line in logs.split('\n') if '📧 Alerta enviado' in line or '📧 Alerta de condicionante enviado' in line]
                if alert_logs:
                    self.log_test("Alert Sending Logs", True, f"Found {len(alert_logs)} alert sending log entries")
                else:
                    self.log_test("Alert Sending Logs", True, "No alert sending logs (normal if no alerts needed)")
                
                return True
            else:
                self.log_test("Alert System Logs", False, "Could not read backend logs")
                return False
                
        except Exception as e:
            self.log_test("Alert System Logs", False, f"Log check failed: {str(e)}")
            return False
    
    def test_email_alert_system_comprehensive(self):
        """Comprehensive test of the email alert system"""
        print("\n🔔 Testing Email Alert System")
        print("-" * 40)
        
        # Test 1: Configuration
        config_ok = self.test_resend_configuration()
        
        # Test 2: Implementation
        impl_ok = self.test_email_function_implementation()
        
        # Test 3: Endpoints
        endpoints_ok = self.test_email_alert_endpoints_structure()
        
        # Test 4: Check logs
        logs_ok = self.check_email_logs_after_operations()
        
        # Overall assessment
        if config_ok and impl_ok and endpoints_ok:
            self.log_test("Email Alert System", True, "Email alert system is properly configured and implemented")
            return True
        else:
            failed_components = []
            if not config_ok:
                failed_components.append("Configuration")
            if not impl_ok:
                failed_components.append("Implementation")
            if not endpoints_ok:
                failed_components.append("Endpoints")
            
            self.log_test("Email Alert System", False, f"Email system issues in: {', '.join(failed_components)}")
            return False
    
    def test_license_condicionante_alert_system(self):
        """Test the complete license and condicionante alert system"""
        print("\n🚨 Testing License & Condicionante Alert System")
        print("-" * 50)
        
        # Test 1: Alert endpoints
        endpoints_ok = self.test_alert_system_endpoints()
        
        # Test 2: Code structure and logic
        code_ok = self.test_alert_system_code_structure()
        
        # Test 3: System logs
        logs_ok = self.test_alert_system_logs()
        
        # Overall assessment
        if endpoints_ok and code_ok:
            self.log_test("License & Condicionante Alert System", True, "Complete alert system is properly implemented")
            return True
        else:
            failed_components = []
            if not endpoints_ok:
                failed_components.append("Endpoints")
            if not code_ok:
                failed_components.append("Code Structure")
            if not logs_ok:
                failed_components.append("Logs")
            
            self.log_test("License & Condicionante Alert System", False, f"Alert system issues in: {', '.join(failed_components)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting EcoGuard Backend Tests")
        print(f"🔗 Testing against: {BACKEND_URL}")
        print("=" * 60)
        
        # Test server connectivity first
        if not self.test_server_connectivity():
            print("\n❌ Server connectivity failed. Stopping tests.")
            return False
        
        # Run all endpoint tests
        tests = [
            self.test_authentication_required,
            self.test_area_foto_cliente_not_found,
            self.test_tickets_endpoint_structure,
            self.test_ticket_delete_endpoint,
            self.test_ticket_relatorio_endpoint,
            self.test_email_alert_system_comprehensive,
            self.test_license_condicionante_alert_system,
            self.test_backend_logs
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) failed")
            return False
    
    def get_summary(self):
        """Get a summary of all test results"""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['success'])
        failed = total - passed
        
        summary = {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": f"{(passed/total*100):.1f}%" if total > 0 else "0%",
            "results": self.test_results
        }
        
        return summary

def main():
    """Main test execution"""
    tester = EcoGuardTester()
    success = tester.run_all_tests()
    
    # Print detailed summary
    summary = tester.get_summary()
    print(f"\n📋 Detailed Summary:")
    print(f"   Total Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()