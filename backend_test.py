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
BACKEND_URL = "https://ticket-alerts-1.preview.emergentagent.com/api"

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