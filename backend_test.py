import requests
import unittest
import json
from datetime import datetime, timedelta
import os
import sys

class DebraLegalAPITester(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(DebraLegalAPITester, self).__init__(*args, **kwargs)
        # Get the backend URL from frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1]
                    break
        
        print(f"Using backend URL: {self.base_url}")
        self.lawyer_id = None
        self.appointment_id = None
        self.consultation_id = None

    def test_01_health_check(self):
        """Test the health check endpoint"""
        print("\n🔍 Testing health check endpoint...")
        response = requests.get(f"{self.base_url}/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        print("✅ Health check passed")

    def test_02_get_lawyers(self):
        """Test getting the list of lawyers"""
        print("\n🔍 Testing get lawyers endpoint...")
        response = requests.get(f"{self.base_url}/api/lawyers")
        self.assertEqual(response.status_code, 200)
        lawyers = response.json()
        self.assertIsInstance(lawyers, list)
        self.assertGreater(len(lawyers), 0)
        # Store a lawyer ID for later tests
        self.lawyer_id = lawyers[0]["id"]
        print(f"✅ Got {len(lawyers)} lawyers")
        return lawyers

    def test_03_get_lawyer_by_id(self):
        """Test getting a specific lawyer by ID"""
        if not self.lawyer_id:
            self.test_02_get_lawyers()
        
        print(f"\n🔍 Testing get lawyer by ID endpoint for ID: {self.lawyer_id}...")
        response = requests.get(f"{self.base_url}/api/lawyers/{self.lawyer_id}")
        self.assertEqual(response.status_code, 200)
        lawyer = response.json()
        self.assertEqual(lawyer["id"], self.lawyer_id)
        print(f"✅ Got lawyer: {lawyer['name']}")

    def test_04_search_lawyers(self):
        """Test searching for lawyers"""
        print("\n🔍 Testing search lawyers endpoint...")
        response = requests.get(f"{self.base_url}/api/search/lawyers?min_rating=4.5")
        self.assertEqual(response.status_code, 200)
        search_results = response.json()
        self.assertIn("lawyers", search_results)
        self.assertIn("count", search_results)
        print(f"✅ Search returned {search_results['count']} lawyers")

    def test_05_get_lawyer_availability(self):
        """Test getting lawyer availability"""
        if not self.lawyer_id:
            self.test_02_get_lawyers()
        
        print(f"\n🔍 Testing get lawyer availability endpoint for ID: {self.lawyer_id}...")
        response = requests.get(f"{self.base_url}/api/lawyers/{self.lawyer_id}/availability")
        self.assertEqual(response.status_code, 200)
        availability = response.json()
        self.assertIn("available_times", availability)
        print(f"✅ Got {len(availability['available_times'])} available time slots")

    def test_06_create_appointment(self):
        """Test creating an appointment"""
        if not self.lawyer_id:
            self.test_02_get_lawyers()
        
        print(f"\n🔍 Testing create appointment endpoint...")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appointment_data = {
            "lawyer_id": self.lawyer_id,
            "client_id": "test_client",
            "date": tomorrow,
            "time": "10:00",
            "consultation_type": "video",
            "notes": "Test appointment created by automated test"
        }
        
        response = requests.post(
            f"{self.base_url}/api/appointments",
            json=appointment_data
        )
        self.assertEqual(response.status_code, 200)
        appointment = response.json()
        self.appointment_id = appointment["id"]
        self.assertEqual(appointment["lawyer_id"], self.lawyer_id)
        self.assertEqual(appointment["date"], tomorrow)
        print(f"✅ Created appointment with ID: {self.appointment_id}")

    def test_07_get_appointments(self):
        """Test getting appointments"""
        print("\n🔍 Testing get appointments endpoint...")
        response = requests.get(f"{self.base_url}/api/appointments?client_id=test_client")
        self.assertEqual(response.status_code, 200)
        appointments = response.json()
        self.assertIsInstance(appointments, list)
        print(f"✅ Got {len(appointments)} appointments")

    def test_08_create_consultation(self):
        """Test creating a consultation"""
        if not self.lawyer_id:
            self.test_02_get_lawyers()
        
        print(f"\n🔍 Testing create consultation endpoint...")
        consultation_data = {
            "lawyer_id": self.lawyer_id,
            "client_id": "test_client",
            "consultation_type": "video"
        }
        
        response = requests.post(
            f"{self.base_url}/api/consultations",
            json=consultation_data
        )
        self.assertEqual(response.status_code, 200)
        consultation = response.json()
        self.consultation_id = consultation["id"]
        self.assertEqual(consultation["lawyer_id"], self.lawyer_id)
        self.assertEqual(consultation["status"], "active")
        print(f"✅ Created consultation with ID: {self.consultation_id}")

    def test_09_get_consultation(self):
        """Test getting a consultation"""
        if not self.consultation_id:
            self.test_08_create_consultation()
        
        print(f"\n🔍 Testing get consultation endpoint for ID: {self.consultation_id}...")
        response = requests.get(f"{self.base_url}/api/consultations/{self.consultation_id}")
        self.assertEqual(response.status_code, 200)
        consultation = response.json()
        self.assertEqual(consultation["id"], self.consultation_id)
        print(f"✅ Got consultation with status: {consultation['status']}")

    def test_10_add_message_to_consultation(self):
        """Test adding a message to a consultation"""
        if not self.consultation_id:
            self.test_08_create_consultation()
        
        print(f"\n🔍 Testing add message to consultation endpoint...")
        message_data = {
            "sender": "client",
            "content": "هذه رسالة اختبار",
            "message_type": "text"
        }
        
        response = requests.post(
            f"{self.base_url}/api/consultations/{self.consultation_id}/messages",
            json=message_data
        )
        self.assertEqual(response.status_code, 200)
        message = response.json()
        self.assertEqual(message["sender"], "client")
        self.assertEqual(message["content"], "هذه رسالة اختبار")
        print(f"✅ Added message to consultation")

    def test_11_update_consultation_status(self):
        """Test updating consultation status"""
        if not self.consultation_id:
            self.test_08_create_consultation()
        
        print(f"\n🔍 Testing update consultation status endpoint...")
        status_data = {
            "status": "completed"
        }
        
        response = requests.put(
            f"{self.base_url}/api/consultations/{self.consultation_id}/status",
            json=status_data
        )
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertIn("message", result)
        print(f"✅ Updated consultation status to completed")

    def test_12_get_platform_stats(self):
        """Test getting platform statistics"""
        print("\n🔍 Testing get platform stats endpoint...")
        response = requests.get(f"{self.base_url}/api/stats")
        self.assertEqual(response.status_code, 200)
        stats = response.json()
        self.assertIn("total_lawyers", stats)
        self.assertIn("total_appointments", stats)
        print(f"✅ Got platform stats: {stats}")

def run_tests():
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add tests in order
    test_cases = [
        'test_01_health_check',
        'test_02_get_lawyers',
        'test_03_get_lawyer_by_id',
        'test_04_search_lawyers',
        'test_05_get_lawyer_availability',
        'test_06_create_appointment',
        'test_07_get_appointments',
        'test_08_create_consultation',
        'test_09_get_consultation',
        'test_10_add_message_to_consultation',
        'test_11_update_consultation_status',
        'test_12_get_platform_stats'
    ]
    
    for test_case in test_cases:
        suite.addTest(DebraLegalAPITester(test_case))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return the number of failures and errors
    return len(result.failures) + len(result.errors)

if __name__ == "__main__":
    print("=" * 80)
    print("دبرة للاستشارات القانونية - اختبار واجهة برمجة التطبيقات")
    print("=" * 80)
    
    exit_code = run_tests()
    sys.exit(exit_code)