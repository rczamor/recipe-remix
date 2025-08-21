import requests
from bs4 import BeautifulSoup
import random
import string

# Generate random test user data
random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
test_username = f'testuser_{random_suffix}'
test_email = f'test_{random_suffix}@example.com'
test_password = 'TestPass123!'
test_family = 'Test Family'

print(f"Testing signup with username: {test_username}")

# Start a session to maintain cookies
session = requests.Session()

# First, GET the signup page to get the CSRF token
signup_url = 'http://localhost:8000/signup/'
response = session.get(signup_url)

if response.status_code != 200:
    print(f"Failed to get signup page: {response.status_code}")
    exit(1)

# Parse the HTML to extract the CSRF token
soup = BeautifulSoup(response.text, 'html.parser')
csrf_token = soup.find('input', {'name': 'csrfmiddlewaretoken'})

if not csrf_token:
    print("CSRF token not found in signup page")
    exit(1)

csrf_token = csrf_token.get('value')
print(f"Got CSRF token: {csrf_token[:20]}...")

# Prepare the form data
form_data = {
    'csrfmiddlewaretoken': csrf_token,
    'username': test_username,
    'email': test_email,
    'password1': test_password,
    'password2': test_password,
    'family_name': test_family
}

# Submit the form
print("Submitting signup form...")
response = session.post(signup_url, data=form_data, allow_redirects=False)

print(f"Response status code: {response.status_code}")
print(f"Response headers: {dict(response.headers)}")

if response.status_code == 302:
    print(f"Redirect to: {response.headers.get('Location')}")
    # Follow the redirect
    redirect_url = response.headers.get('Location')
    if redirect_url:
        if not redirect_url.startswith('http'):
            redirect_url = f'http://localhost:8000{redirect_url}'
        final_response = session.get(redirect_url)
        print(f"Final page status: {final_response.status_code}")
        print(f"Final URL: {final_response.url}")
        
        # Check if we ended up on the home page (successful registration)
        if '/login' in final_response.url:
            print("ERROR: Redirected to login page - registration may have failed")
        elif final_response.status_code == 200:
            print("SUCCESS: User registration appears successful!")
        else:
            print(f"Unexpected final status: {final_response.status_code}")
else:
    # Check for error messages in the response
    soup = BeautifulSoup(response.text, 'html.parser')
    error_divs = soup.find_all('div', class_='bg-red-100')
    if error_divs:
        print("Errors found:")
        for error in error_divs:
            print(f"  - {error.text.strip()}")
    else:
        print("No visible errors, but form didn't redirect")
        # Save the response to debug
        with open('signup_response.html', 'w') as f:
            f.write(response.text)
        print("Response saved to signup_response.html for debugging")