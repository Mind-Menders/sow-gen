import fetch from 'node-fetch';

async function testPasswordFlow() {
  try {
    console.log('=== Step 1: Login ===');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'harry.viswa@gmail.com',
        password: 'admin'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }

    // Extract session cookie from Set-Cookie header
    const cookies = loginResponse.headers.raw()['set-cookie'];
    console.log('\nCookies received:', cookies ? cookies.length : 0);
    
    if (!cookies || cookies.length === 0) {
      console.error('No session cookie received');
      return;
    }

    const sessionCookie = cookies[0];
    console.log('Session cookie:', sessionCookie.substring(0, 50) + '...');

    console.log('\n=== Step 2: Change Password ===');
    // Now change password
    const changeResponse = await fetch('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        newPassword: 'newpassword123'
      })
    });

    const changeData = await changeResponse.json();
    console.log('Change password response status:', changeResponse.status);
    console.log('Change password response:', JSON.stringify(changeData, null, 2));

    if (!changeResponse.ok) {
      console.error('Password change failed');
      return;
    }

    console.log('\n=== Step 3: Check User State ===');
    // Check user state after password change
    const meResponse = await fetch('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });

    const meData = await meResponse.json();
    console.log('Get user response status:', meResponse.status);
    console.log('Get user response:', JSON.stringify(meData, null, 2));

    if (meData.mustChangePassword) {
      console.error('\n❌ FAILED: mustChangePassword is still true after password change');
    } else {
      console.log('\n✅ SUCCESS: mustChangePassword is now false');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPasswordFlow();
