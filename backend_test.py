import requests
import sys
import json
from datetime import datetime, timezone

class StudentGuidanceAPITester:
    def __init__(self, base_url="https://pembinasys.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}  # Store tokens for different users
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        # Add auth token if available
        if self.current_user and self.current_user in self.tokens:
            test_headers['Authorization'] = f'Bearer {self.tokens[self.current_user]}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password, role_name):
        """Test login and store token"""
        print(f"\n🔐 Testing login for {role_name} ({username})")
        success, response = self.run_test(
            f"Login as {role_name}",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and 'access_token' in response:
            self.tokens[username] = response['access_token']
            self.current_user = username
            print(f"✅ Login successful for {role_name}")
            return True, response.get('user', {})
        else:
            print(f"❌ Login failed for {role_name}")
            return False, {}

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get current user info",
            "GET",
            "auth/me",
            200
        )
        return success, response

    def test_dashboard_stats(self):
        """Test dashboard statistics (admin/kepala_sekolah/wakil only)"""
        success, response = self.run_test(
            "Get dashboard statistics",
            "GET",
            "dashboard/stats",
            200
        )
        return success, response

    def test_get_students(self):
        """Test getting all students"""
        success, response = self.run_test(
            "Get all students",
            "GET",
            "siswa",
            200
        )
        return success, response

    def test_search_students(self, query="Ahmad"):
        """Test student search"""
        success, response = self.run_test(
            f"Search students with query: {query}",
            "GET",
            f"siswa/search/{query}",
            200
        )
        return success, response

    def test_create_student(self):
        """Test creating a new student"""
        test_student = {
            "nis": f"TEST{datetime.now().strftime('%H%M%S')}",
            "nama": "Test Student",
            "id_kelas": "10A",
            "angkatan": "2024",
            "jenis_kelamin": "L",
            "aktif": True
        }
        
        success, response = self.run_test(
            "Create new student",
            "POST",
            "siswa",
            200,
            data=test_student
        )
        return success, response

    def test_get_users(self):
        """Test getting all users (admin only)"""
        success, response = self.run_test(
            "Get all users",
            "GET",
            "users",
            200
        )
        return success, response

    def test_create_user(self):
        """Test creating a new user (admin only)"""
        test_user = {
            "username": f"testuser{datetime.now().strftime('%H%M%S')}",
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "testpass123",
            "role": "guru_umum"
        }
        
        success, response = self.run_test(
            "Create new user",
            "POST",
            "users",
            200,
            data=test_user
        )
        return success, response

    def test_get_classes(self):
        """Test getting all classes"""
        success, response = self.run_test(
            "Get all classes",
            "GET",
            "kelas",
            200
        )
        return success, response

    def test_create_class(self):
        """Test creating a new class (admin only)"""
        test_class = {
            "nama_kelas": f"TEST{datetime.now().strftime('%H%M')}",
            "tingkat": "10",
            "tahun_ajaran": "2024/2025"
        }
        
        success, response = self.run_test(
            "Create new class",
            "POST",
            "kelas",
            200,
            data=test_class
        )
        return success, response

    def test_get_violation_types(self):
        """Test getting violation types"""
        success, response = self.run_test(
            "Get violation types",
            "GET",
            "jenis-pelanggaran",
            200
        )
        return success, response

    def test_create_violation_type(self):
        """Test creating violation type (admin only)"""
        test_violation_type = {
            "nama_pelanggaran": f"Test Violation {datetime.now().strftime('%H%M%S')}",
            "kategori": "Ringan",
            "poin": 5,
            "deskripsi": "Test violation for API testing"
        }
        
        success, response = self.run_test(
            "Create violation type",
            "POST",
            "jenis-pelanggaran",
            200,
            data=test_violation_type
        )
        return success, response

    def test_get_violations(self):
        """Test getting violations"""
        success, response = self.run_test(
            "Get violations",
            "GET",
            "pelanggaran",
            200
        )
        return success, response

    def test_create_violation(self):
        """Test creating a violation report"""
        test_violation = {
            "nis_siswa": "20240001",  # Assuming this student exists
            "jenis_pelanggaran_id": "test-violation-id",  # This might fail if no violation types exist
            "waktu_kejadian": datetime.now(timezone.utc).isoformat(),
            "tempat": "Ruang Kelas 10A",
            "detail_kejadian": "Test violation report for API testing"
        }
        
        success, response = self.run_test(
            "Create violation report",
            "POST",
            "pelanggaran",
            200,
            data=test_violation
        )
        return success, response

    def test_get_academic_years(self):
        """Test getting academic years"""
        success, response = self.run_test(
            "Get academic years",
            "GET",
            "tahun-ajaran",
            200
        )
        return success, response

    def test_create_academic_year(self):
        """Test creating academic year (admin only)"""
        test_year = {
            "tahun": "2024/2025",
            "semester": "Ganjil",
            "is_active": False  # Don't make it active to avoid conflicts
        }
        
        success, response = self.run_test(
            "Create academic year",
            "POST",
            "tahun-ajaran",
            200,
            data=test_year
        )
        return success, response

def main():
    print("🚀 Starting Student Guidance Management System API Tests")
    print("=" * 60)
    
    tester = StudentGuidanceAPITester()
    
    # Test credentials from the requirements
    test_users = [
        ("admin", "admin123", "Admin"),
        ("guru1", "guru123", "Guru 1"),
        ("wali1", "wali123", "Wali Kelas 1")
    ]
    
    # Test login for all users
    print("\n📋 PHASE 1: AUTHENTICATION TESTING")
    print("-" * 40)
    
    login_results = {}
    for username, password, role_name in test_users:
        success, user_data = tester.test_login(username, password, role_name)
        login_results[username] = success
        if success:
            # Test auth/me endpoint
            tester.test_auth_me()
    
    # Test with admin user for full functionality
    print("\n📋 PHASE 2: ADMIN FUNCTIONALITY TESTING")
    print("-" * 40)
    
    if login_results.get("admin"):
        tester.current_user = "admin"
        
        # Dashboard stats
        tester.test_dashboard_stats()
        
        # Student management
        tester.test_get_students()
        tester.test_search_students()
        tester.test_create_student()
        
        # User management
        tester.test_get_users()
        tester.test_create_user()
        
        # Class management
        tester.test_get_classes()
        tester.test_create_class()
        
        # Violation type management
        tester.test_get_violation_types()
        tester.test_create_violation_type()
        
        # Academic year management
        tester.test_get_academic_years()
        tester.test_create_academic_year()
        
        # Violation management
        tester.test_get_violations()
        # Note: Creating violation might fail if no violation types exist
        tester.test_create_violation()
    
    # Test with other users for role-based access
    print("\n📋 PHASE 3: ROLE-BASED ACCESS TESTING")
    print("-" * 40)
    
    for username in ["guru1", "wali1"]:
        if login_results.get(username):
            print(f"\n🔄 Testing with {username}")
            tester.current_user = username
            
            # These should work for all authenticated users
            tester.test_get_students()
            tester.test_get_classes()
            tester.test_get_violation_types()
            tester.test_get_violations()
            
            # These should fail for non-admin users
            print(f"\n🚫 Testing restricted endpoints for {username} (should fail)")
            tester.run_test(f"Dashboard stats (should fail for {username})", "GET", "dashboard/stats", 403)
            tester.run_test(f"Create user (should fail for {username})", "POST", "users", 403, 
                          data={"username": "test", "email": "test@test.com", "full_name": "Test", 
                               "password": "test", "role": "guru_umum"})
            tester.run_test(f"Create student (should fail for {username})", "POST", "siswa", 403,
                          data={"nis": "TEST123", "nama": "Test", "id_kelas": "10A", 
                               "angkatan": "2024", "jenis_kelamin": "L"})
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"Total tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
