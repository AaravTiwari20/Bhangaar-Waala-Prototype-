#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Bhangaar Waala Waste Management App
Tests all endpoints including authentication, pickups, chat, stats, and admin functions
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class BhangaarWaalaAPITester:
    def __init__(self, base_url: str = "https://f7e467d3-edac-4bc3-90a4-fe8a10925659.preview.emergentagent.com"):
        self.base_url = base_url
        self.tokens = {}  # Store tokens for different user types
        self.users = {}   # Store user data for different roles
        self.pickups = []  # Store created pickups for testing
        self.tests_run = 0
        self.tests_passed = 0
        
        print(f"🚀 Starting Bhangaar Waala API Tests")
        print(f"📡 Backend URL: {self.base_url}")
        print("=" * 60)

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, token: Optional[str] = None, 
                 params: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   {method} {endpoint}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"   ✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if 'access_token' in response_data:
                        print(f"   🔑 Token received")
                    elif 'message' in response_data:
                        print(f"   💬 Message: {response_data['message']}")
                except:
                    response_data = {}
            else:
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   📝 Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   📝 Response: {response.text[:200]}")
                response_data = {}

            return success, response_data

        except Exception as e:
            print(f"   ❌ FAILED - Network Error: {str(e)}")
            return False, {}

    def test_health_check(self) -> bool:
        """Test health endpoint"""
        success, _ = self.run_test("Health Check", "GET", "health", 200)
        return success

    def test_user_registration(self) -> bool:
        """Test user registration for all roles"""
        print(f"\n📝 TESTING USER REGISTRATION")
        print("-" * 40)
        
        roles = ['household', 'collector', 'admin']
        all_success = True
        
        for role in roles:
            user_data = {
                "email": f"test_{role}@bhangaar.com",
                "password": "TestPass123!",
                "name": f"Test {role.title()}",
                "phone": f"+91987654321{len(role)}",
                "role": role,
                "address": f"Test Address for {role}"
            }
            
            success, response = self.run_test(
                f"Register {role.title()} User",
                "POST", "register", 200, user_data
            )
            
            if success and 'access_token' in response:
                self.tokens[role] = response['access_token']
                self.users[role] = response['user']
                print(f"   🎯 {role.title()} user created with ID: {response['user']['id']}")
            else:
                all_success = False
                
        return all_success

    def test_user_login(self) -> bool:
        """Test user login for all roles"""
        print(f"\n🔐 TESTING USER LOGIN")
        print("-" * 40)
        
        roles = ['household', 'collector', 'admin']
        all_success = True
        
        for role in roles:
            login_data = {
                "email": f"test_{role}@bhangaar.com",
                "password": "TestPass123!"
            }
            
            success, response = self.run_test(
                f"Login {role.title()} User",
                "POST", "login", 200, login_data
            )
            
            if success and 'access_token' in response:
                # Update token (in case registration failed but login works)
                self.tokens[role] = response['access_token']
                self.users[role] = response['user']
            else:
                all_success = False
                
        return all_success

    def test_pickup_creation(self) -> bool:
        """Test pickup creation by household user"""
        print(f"\n📦 TESTING PICKUP CREATION")
        print("-" * 40)
        
        if 'household' not in self.tokens:
            print("   ❌ No household token available")
            return False
            
        waste_types = ['dry', 'wet', 'electronic', 'medical', 'recyclable']
        all_success = True
        
        for i, waste_type in enumerate(waste_types):
            pickup_date = (datetime.now() + timedelta(days=i+1)).isoformat()
            pickup_data = {
                "waste_type": waste_type,
                "pickup_date": pickup_date,
                "pickup_time": f"{10+i}:00",
                "location": f"Test Location {i+1}",
                "address": f"Test Address {i+1}, Test City",
                "notes": f"Test notes for {waste_type} waste"
            }
            
            success, response = self.run_test(
                f"Create {waste_type.title()} Waste Pickup",
                "POST", "pickups", 200, pickup_data, self.tokens['household']
            )
            
            if success and 'pickup_id' in response:
                self.pickups.append(response['pickup_id'])
                print(f"   🎯 Pickup created with ID: {response['pickup_id']}")
            else:
                all_success = False
                
        return all_success

    def test_pickup_retrieval(self) -> bool:
        """Test pickup retrieval for different user roles"""
        print(f"\n📋 TESTING PICKUP RETRIEVAL")
        print("-" * 40)
        
        all_success = True
        
        for role in ['household', 'collector', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.run_test(
                f"Get Pickups as {role.title()}",
                "GET", "pickups", 200, token=self.tokens[role]
            )
            
            if success:
                pickup_count = len(response) if isinstance(response, list) else 0
                print(f"   📊 {role.title()} sees {pickup_count} pickups")
            else:
                all_success = False
                
        return all_success

    def test_pickup_assignment(self) -> bool:
        """Test pickup assignment by collector"""
        print(f"\n👷 TESTING PICKUP ASSIGNMENT")
        print("-" * 40)
        
        if 'collector' not in self.tokens or not self.pickups:
            print("   ❌ No collector token or pickups available")
            return False
            
        pickup_id = self.pickups[0]  # Use first pickup
        success, _ = self.run_test(
            "Assign Pickup to Collector",
            "PUT", f"pickups/{pickup_id}/assign", 200, token=self.tokens['collector']
        )
        
        return success

    def test_pickup_status_updates(self) -> bool:
        """Test pickup status updates"""
        print(f"\n🔄 TESTING PICKUP STATUS UPDATES")
        print("-" * 40)
        
        if 'collector' not in self.tokens or not self.pickups:
            print("   ❌ No collector token or pickups available")
            return False
            
        pickup_id = self.pickups[0]  # Use first pickup
        statuses = ['on_the_way', 'collected']
        all_success = True
        
        for status in statuses:
            success, _ = self.run_test(
                f"Update Status to {status.replace('_', ' ').title()}",
                "PUT", f"pickups/{pickup_id}/status", 200, 
                token=self.tokens['collector'], params={'status': status}
            )
            
            if not success:
                all_success = False
                
        return all_success

    def test_pickup_rating(self) -> bool:
        """Test pickup rating by household user"""
        print(f"\n⭐ TESTING PICKUP RATING")
        print("-" * 40)
        
        if 'household' not in self.tokens or not self.pickups:
            print("   ❌ No household token or pickups available")
            return False
            
        pickup_id = self.pickups[0]  # Use first pickup
        rating_data = {
            "rating": 5,
            "feedback": "Excellent service!"
        }
        
        success, _ = self.run_test(
            "Rate Completed Pickup",
            "POST", f"pickups/{pickup_id}/rate", 200, rating_data, self.tokens['household']
        )
        
        return success

    def test_chat_functionality(self) -> bool:
        """Test chat messaging system"""
        print(f"\n💬 TESTING CHAT FUNCTIONALITY")
        print("-" * 40)
        
        if 'household' not in self.tokens or 'collector' not in self.tokens or not self.pickups:
            print("   ❌ Missing tokens or pickups for chat testing")
            return False
            
        pickup_id = self.pickups[0]  # Use first pickup
        all_success = True
        
        # Send message from household
        success1, _ = self.run_test(
            "Send Message from Household",
            "POST", f"chat/{pickup_id}", 200, 
            {"message": "Hello, when will you arrive?"}, self.tokens['household']
        )
        
        # Send message from collector
        success2, _ = self.run_test(
            "Send Message from Collector",
            "POST", f"chat/{pickup_id}", 200,
            {"message": "I'll be there in 10 minutes!"}, self.tokens['collector']
        )
        
        # Get chat messages
        success3, response = self.run_test(
            "Get Chat Messages",
            "GET", f"chat/{pickup_id}", 200, token=self.tokens['household']
        )
        
        if success3:
            message_count = len(response) if isinstance(response, list) else 0
            print(f"   📊 Found {message_count} chat messages")
        
        return success1 and success2 and success3

    def test_user_stats(self) -> bool:
        """Test user statistics endpoints"""
        print(f"\n📊 TESTING USER STATISTICS")
        print("-" * 40)
        
        all_success = True
        
        for role in ['household', 'collector', 'admin']:
            if role not in self.tokens:
                continue
                
            success, response = self.run_test(
                f"Get {role.title()} Stats",
                "GET", "stats/user", 200, token=self.tokens[role]
            )
            
            if success:
                stats_keys = list(response.keys()) if isinstance(response, dict) else []
                print(f"   📈 {role.title()} stats: {', '.join(stats_keys)}")
            else:
                all_success = False
                
        return all_success

    def test_admin_functionality(self) -> bool:
        """Test admin-specific endpoints"""
        print(f"\n👑 TESTING ADMIN FUNCTIONALITY")
        print("-" * 40)
        
        if 'admin' not in self.tokens:
            print("   ❌ No admin token available")
            return False
            
        all_success = True
        
        # Get all users
        success1, response = self.run_test(
            "Get All Users (Admin)",
            "GET", "admin/users", 200, token=self.tokens['admin']
        )
        
        if success1:
            user_count = len(response) if isinstance(response, list) else 0
            print(f"   👥 Found {user_count} users in system")
            
            # Test user toggle if we have users
            if user_count > 0 and isinstance(response, list):
                user_id = response[0].get('id')
                if user_id:
                    success2, _ = self.run_test(
                        "Toggle User Status (Admin)",
                        "PUT", f"admin/users/{user_id}/toggle", 200, token=self.tokens['admin']
                    )
                    all_success = all_success and success2
        else:
            all_success = False
            
        return all_success

    def test_authentication_errors(self) -> bool:
        """Test authentication error handling"""
        print(f"\n🚫 TESTING AUTHENTICATION ERRORS")
        print("-" * 40)
        
        all_success = True
        
        # Test invalid login
        success1, _ = self.run_test(
            "Invalid Login Credentials",
            "POST", "login", 400, {
                "email": "invalid@test.com",
                "password": "wrongpassword"
            }
        )
        
        # Test duplicate registration
        success2, _ = self.run_test(
            "Duplicate Email Registration",
            "POST", "register", 400, {
                "email": "test_household@bhangaar.com",  # Already exists
                "password": "TestPass123!",
                "name": "Duplicate User",
                "phone": "+919876543210",
                "role": "household"
            }
        )
        
        # Test unauthorized access
        success3, _ = self.run_test(
            "Unauthorized Pickup Access",
            "GET", "pickups", 401
        )
        
        return success1 and success2 and success3

    def run_all_tests(self) -> bool:
        """Run all API tests"""
        print("🧪 STARTING COMPREHENSIVE API TESTING")
        print("=" * 60)
        
        test_results = []
        
        # Core functionality tests
        test_results.append(("Health Check", self.test_health_check()))
        test_results.append(("User Registration", self.test_user_registration()))
        test_results.append(("User Login", self.test_user_login()))
        test_results.append(("Pickup Creation", self.test_pickup_creation()))
        test_results.append(("Pickup Retrieval", self.test_pickup_retrieval()))
        test_results.append(("Pickup Assignment", self.test_pickup_assignment()))
        test_results.append(("Status Updates", self.test_pickup_status_updates()))
        test_results.append(("Pickup Rating", self.test_pickup_rating()))
        test_results.append(("Chat Functionality", self.test_chat_functionality()))
        test_results.append(("User Statistics", self.test_user_stats()))
        test_results.append(("Admin Functions", self.test_admin_functionality()))
        test_results.append(("Auth Error Handling", self.test_authentication_errors()))
        
        # Print final results
        print(f"\n" + "=" * 60)
        print("📋 FINAL TEST RESULTS")
        print("=" * 60)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name:<25} {status}")
        
        passed_tests = sum(1 for _, result in test_results if result)
        total_tests = len(test_results)
        
        print(f"\n📊 SUMMARY:")
        print(f"   Individual Tests: {self.tests_passed}/{self.tests_run}")
        print(f"   Test Categories: {passed_tests}/{total_tests}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if passed_tests == total_tests:
            print(f"\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
            return True
        else:
            print(f"\n⚠️  Some tests failed. Please check the backend implementation.")
            return False

def main():
    """Main test execution"""
    tester = BhangaarWaalaAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())