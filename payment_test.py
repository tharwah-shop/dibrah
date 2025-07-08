import requests
import sys

def test_payment_settings():
    """Test the payment settings endpoint"""
    # Get the backend URL from frontend .env file
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                base_url = line.strip().split('=')[1]
                break
    
    print(f"Using backend URL: {base_url}")
    
    print("\n🔍 Testing payment settings endpoint...")
    try:
        response = requests.get(f"{base_url}/api/payments/settings")
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            settings = response.json()
            print(f"✅ Got payment settings: {settings}")
            return True
        else:
            print(f"❌ Failed to get payment settings. Status code: {response.status_code}")
            if response.status_code != 502:
                try:
                    print(f"Error response: {response.json()}")
                except:
                    print(f"Raw response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_payment_settings()
    sys.exit(0 if success else 1)