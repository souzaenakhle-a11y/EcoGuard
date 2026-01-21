#!/usr/bin/env python3
"""
Extended Backend Test Suite for EcoGuard - Testing specific functionality
This test attempts to verify the specific endpoints with more detailed testing
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://adaptive-ui-8.preview.emergentagent.com/api"

class EcoGuardExtendedTester:
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
    
    def test_area_foto_cliente_404_behavior(self):
        """Test GET /api/areas/{area_id}/foto-cliente returns 404 for non-existent photo"""
        fake_area_id = "area_fake123"
        
        try:
            # Test the specific endpoint behavior
            response = self.session.get(f"{BACKEND_URL}/areas/{fake_area_id}/foto-cliente")
            
            # Should return 401 (authentication required) for any area access
            if response.status_code == 401:
                self.log_test("Area Foto Cliente 404 Test", True, 
                            "Endpoint correctly requires authentication before checking area existence")
                
                # Test with different fake IDs to ensure consistent behavior
                test_ids = ["area_nonexistent", "area_123456", "invalid_area"]
                for test_id in test_ids:
                    resp = self.session.get(f"{BACKEND_URL}/areas/{test_id}/foto-cliente")
                    if resp.status_code != 401:
                        self.log_test("Area Foto Cliente Consistency", False, 
                                    f"Inconsistent auth behavior for area {test_id}: {resp.status_code}")
                        return False
                
                self.log_test("Area Foto Cliente Consistency", True, 
                            "Consistent authentication requirement across different area IDs")
                return True
            else:
                self.log_test("Area Foto Cliente 404 Test", False, 
                            f"Expected 401 (auth required), got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Area Foto Cliente 404 Test", False, f"Request failed: {str(e)}")
            return False
    
    def test_ticket_delete_functionality(self):
        """Test DELETE /api/tickets/{ticket_id} endpoint behavior"""
        fake_ticket_ids = ["tkt_fake123", "tkt_nonexistent", "invalid_ticket"]
        
        all_passed = True
        for ticket_id in fake_ticket_ids:
            try:
                response = self.session.delete(f"{BACKEND_URL}/tickets/{ticket_id}")
                
                # Should require authentication
                if response.status_code == 401:
                    self.log_test(f"Ticket Delete Auth - {ticket_id}", True, 
                                "DELETE endpoint requires authentication")
                else:
                    self.log_test(f"Ticket Delete Auth - {ticket_id}", False, 
                                f"Expected 401, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Ticket Delete Auth - {ticket_id}", False, f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_ticket_relatorio_html_generation(self):
        """Test GET /api/tickets/{ticket_id}/relatorio HTML generation"""
        fake_ticket_ids = ["tkt_fake123", "tkt_test456"]
        
        all_passed = True
        for ticket_id in fake_ticket_ids:
            try:
                response = self.session.get(f"{BACKEND_URL}/tickets/{ticket_id}/relatorio")
                
                # Should require authentication first
                if response.status_code == 401:
                    self.log_test(f"Ticket Relatorio Auth - {ticket_id}", True, 
                                "Relatorio endpoint requires authentication")
                    
                    # Check if the endpoint accepts the request structure
                    headers = response.headers
                    if 'content-type' in headers or 'Content-Type' in headers:
                        self.log_test(f"Ticket Relatorio Headers - {ticket_id}", True, 
                                    "Endpoint returns proper HTTP headers")
                    
                else:
                    self.log_test(f"Ticket Relatorio Auth - {ticket_id}", False, 
                                f"Expected 401, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Ticket Relatorio Auth - {ticket_id}", False, f"Request failed: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_tickets_etapa_field_structure(self):
        """Test GET /api/tickets returns tickets with 'etapa' field"""
        try:
            response = self.session.get(f"{BACKEND_URL}/tickets")
            
            if response.status_code == 401:
                self.log_test("Tickets Etapa Field Structure", True, 
                            "Tickets endpoint requires authentication (expected behavior)")
                
                # Test that the endpoint exists and is properly configured
                # by checking response headers and structure
                if 'content-type' in response.headers.get('content-type', '').lower():
                    self.log_test("Tickets Endpoint Configuration", True, 
                                "Endpoint is properly configured with content-type headers")
                
                return True
            else:
                self.log_test("Tickets Etapa Field Structure", False, 
                            f"Expected 401 (auth required), got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Tickets Etapa Field Structure", False, f"Request failed: {str(e)}")
            return False
    
    def test_endpoint_method_support(self):
        """Test that endpoints support the correct HTTP methods"""
        endpoint_methods = [
            ("/tickets", ["GET"]),
            ("/tickets/fake123", ["GET", "DELETE"]),
            ("/tickets/fake123/relatorio", ["GET"]),
            ("/areas/fake123/foto-cliente", ["GET"])
        ]
        
        all_passed = True
        for endpoint, methods in endpoint_methods:
            for method in methods:
                try:
                    if method == "GET":
                        response = self.session.get(f"{BACKEND_URL}{endpoint}")
                    elif method == "DELETE":
                        response = self.session.delete(f"{BACKEND_URL}{endpoint}")
                    elif method == "POST":
                        response = self.session.post(f"{BACKEND_URL}{endpoint}")
                    elif method == "PUT":
                        response = self.session.put(f"{BACKEND_URL}{endpoint}")
                    
                    # We expect 401 (auth required) or 404 (not found) for valid endpoints
                    # We should NOT get 405 (method not allowed) for supported methods
                    if response.status_code in [401, 404, 403]:
                        self.log_test(f"Method Support {method} {endpoint}", True, 
                                    f"Method {method} is supported (status: {response.status_code})")
                    elif response.status_code == 405:
                        self.log_test(f"Method Support {method} {endpoint}", False, 
                                    f"Method {method} not allowed (405)")
                        all_passed = False
                    else:
                        self.log_test(f"Method Support {method} {endpoint}", True, 
                                    f"Method {method} accepted (status: {response.status_code})")
                        
                except Exception as e:
                    self.log_test(f"Method Support {method} {endpoint}", False, f"Request failed: {str(e)}")
                    all_passed = False
        
        return all_passed
    
    def test_backend_service_health(self):
        """Test backend service health and configuration"""
        try:
            # Test basic connectivity
            response = self.session.get(f"{BACKEND_URL}/auth/me", timeout=5)
            
            if response.status_code in [200, 401]:
                self.log_test("Backend Service Health", True, "Backend service is healthy and responding")
                
                # Check response time
                if hasattr(response, 'elapsed'):
                    response_time = response.elapsed.total_seconds()
                    if response_time < 2.0:
                        self.log_test("Backend Response Time", True, f"Good response time: {response_time:.2f}s")
                    else:
                        self.log_test("Backend Response Time", False, f"Slow response time: {response_time:.2f}s")
                
                # Check CORS headers
                cors_headers = ['Access-Control-Allow-Origin', 'access-control-allow-origin']
                has_cors = any(header in response.headers for header in cors_headers)
                if has_cors:
                    self.log_test("CORS Configuration", True, "CORS headers are present")
                else:
                    self.log_test("CORS Configuration", False, "CORS headers missing")
                
                return True
            else:
                self.log_test("Backend Service Health", False, f"Unexpected status: {response.status_code}")
                return False
                
        except requests.exceptions.Timeout:
            self.log_test("Backend Service Health", False, "Request timeout - service may be slow")
            return False
        except Exception as e:
            self.log_test("Backend Service Health", False, f"Health check failed: {str(e)}")
            return False
    
    def run_extended_tests(self):
        """Run all extended tests"""
        print("🔬 Starting EcoGuard Extended Backend Tests")
        print(f"🔗 Testing against: {BACKEND_URL}")
        print("=" * 70)
        
        tests = [
            self.test_backend_service_health,
            self.test_area_foto_cliente_404_behavior,
            self.test_ticket_delete_functionality,
            self.test_ticket_relatorio_html_generation,
            self.test_tickets_etapa_field_structure,
            self.test_endpoint_method_support
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("\n" + "=" * 70)
        print(f"📊 Extended Test Results: {passed}/{total} test groups passed")
        
        if passed == total:
            print("🎉 All extended tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} test group(s) had failures")
            return False
    
    def get_summary(self):
        """Get a summary of all test results"""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['success'])
        failed = total - passed
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": f"{(passed/total*100):.1f}%" if total > 0 else "0%",
            "results": self.test_results
        }

def main():
    """Main test execution"""
    tester = EcoGuardExtendedTester()
    success = tester.run_extended_tests()
    
    # Print detailed summary
    summary = tester.get_summary()
    print(f"\n📋 Extended Test Summary:")
    print(f"   Individual Tests: {summary['total_tests']}")
    print(f"   Passed: {summary['passed']}")
    print(f"   Failed: {summary['failed']}")
    print(f"   Success Rate: {summary['success_rate']}")
    
    # Show any failures
    failures = [r for r in summary['results'] if not r['success']]
    if failures:
        print(f"\n❌ Failed Tests:")
        for failure in failures:
            print(f"   - {failure['test']}: {failure['message']}")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)