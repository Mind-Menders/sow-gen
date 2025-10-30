import fetch from 'node-fetch';

async function testPasswordChange() {
  try {
    // First, login to get session
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'harry.viswa@gmail.com',
        password: 'admin' // Current password
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.error('Login failed');
      return;
    }

    // Extract session cookie
    const cookie = loginResponse.headers.get('set-cookie');
    console.log('Session cookie:', cookie);

    // Now change password
    const changeResponse = await fetch('http://localhost:3000/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({
        newPassword: 'newpassword123'
      })
    });

    const changeData = await changeResponse.json();
    console.log('Change password response:', changeData);

    if (changeResponse.ok) {
      console.log('Password change successful!');
    } else {
      console.error('Password change failed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testPasswordChange();