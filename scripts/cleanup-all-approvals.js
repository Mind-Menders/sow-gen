/**
 * Script to clean up duplicate approvals across all SOWs
 * Run with: node scripts/cleanup-all-approvals.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function login() {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@test.com', // Change to your admin email
      password: 'admin123',     // Change to your admin password
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function getAllSOWs(cookies) {
  const response = await fetch(`${BASE_URL}/api/sows`, {
    headers: {
      Cookie: cookies,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch SOWs: ${response.statusText}`);
  }

  return await response.json();
}

async function cleanupSOWApprovals(sowId, cookies) {
  const response = await fetch(`${BASE_URL}/api/sows/${sowId}/approvals/cleanup`, {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Cleanup failed for SOW ${sowId}: ${response.statusText}`);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const cookies = await login();
    console.log('✅ Logged in successfully\n');

    console.log('📋 Fetching all SOWs...');
    const sows = await getAllSOWs(cookies);
    console.log(`✅ Found ${sows.length} SOWs\n`);

    let totalDuplicates = 0;
    let totalDeleted = 0;

    for (const sow of sows) {
      console.log(`🔍 Cleaning up SOW: ${sow.sowNumber} - ${sow.title}`);
      
      try {
        const result = await cleanupSOWApprovals(sow.id, cookies);
        
        if (result.duplicates > 0) {
          console.log(`   ✅ Removed ${result.deleted} of ${result.duplicates} duplicates`);
          totalDuplicates += result.duplicates;
          totalDeleted += result.deleted;
        } else {
          console.log(`   ℹ️  No duplicates found`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Total duplicates found: ${totalDuplicates}`);
    console.log(`   Total duplicates removed: ${totalDeleted}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
