#!/usr/bin/env node

/**
 * FundFlow Configuration Verification Script
 * Checks all environment variables and configurations
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 FundFlow Configuration Verification\n');
console.log('═'.repeat(60));

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
  console.log('✅ .env.local file found');
} else {
  console.log('❌ .env.local file not found!');
  process.exit(1);
}

console.log('\n📋 Required Environment Variables:\n');

const requiredVars = {
  'NEXT_PUBLIC_PRIVY_APP_ID': 'Privy Authentication',
  'NEXT_PUBLIC_FIREBASE_API_KEY': 'Firebase API Key',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': 'Firebase Auth Domain',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': 'Firebase Project ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL': 'Firebase Database URL',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET': 'Firebase Storage Bucket',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': 'Firebase Messaging ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID': 'Firebase App ID',
  'NEXT_PUBLIC_SOLANA_RPC_URL': 'Solana RPC URL'
};

let allPresent = true;

Object.entries(requiredVars).forEach(([key, description]) => {
  const value = envVars[key];
  const isPresent = value && value.length > 0;

  if (isPresent) {
    // Mask sensitive values
    const displayValue = key.includes('KEY') || key.includes('ID')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value;
    console.log(`  ✅ ${description.padEnd(30)} ${displayValue}`);
  } else {
    console.log(`  ❌ ${description.padEnd(30)} MISSING`);
    allPresent = false;
  }
});

console.log('\n' + '═'.repeat(60));

// Verify Firebase Database URL format
const dbUrl = envVars['NEXT_PUBLIC_FIREBASE_DATABASE_URL'];
if (dbUrl && dbUrl.includes('firebasedatabase.app')) {
  console.log('✅ Firebase Database URL format is correct');
} else {
  console.log('⚠️  Firebase Database URL may be incorrect');
}

// Verify Privy App ID format
const privyAppId = envVars['NEXT_PUBLIC_PRIVY_APP_ID'];
if (privyAppId && privyAppId.length > 20) {
  console.log('✅ Privy App ID format looks correct');
} else if (privyAppId) {
  console.log('⚠️  Privy App ID may be too short');
} else {
  console.log('❌ Privy App ID is missing');
}

console.log('\n' + '═'.repeat(60));

if (allPresent) {
  console.log('\n✅ All required environment variables are present!');
  console.log('\n📝 Summary:');
  console.log('   • Privy authentication configured');
  console.log('   • Firebase Realtime Database configured');
  console.log('   • Solana RPC endpoint configured');
  console.log('\n🚀 Your application should run without configuration errors.');
  process.exit(0);
} else {
  console.log('\n❌ Some environment variables are missing!');
  console.log('\n📝 Please check your .env.local file and add the missing variables.');
  process.exit(1);
}
