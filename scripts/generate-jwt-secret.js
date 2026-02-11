#!/usr/bin/env node

/**
 * JWT Secret Generator
 * 
 * This script generates a strong, secure JWT secret for your application
 * Run with: node scripts/generate-jwt-secret.js
 */

import crypto from 'crypto';

function generateJWTSecret() {
  console.log('🔐 Generating JWT Secret...');
  console.log('============================');
  
  // Generate a strong random secret
  const secret = crypto.randomBytes(64).toString('base64');
  
  console.log('✅ Generated JWT Secret:');
  console.log('=======================');
  console.log(secret);
  console.log('');
  
  console.log('📋 Next steps:');
  console.log('1. Copy the secret above');
  console.log('2. Update your .env.local file:');
  console.log(`   JWT_SECRET=${secret}`);
  console.log('3. Add to Vercel environment variables');
  console.log('4. Never share this secret publicly!');
  console.log('');
  
  console.log('🔒 Security Notes:');
  console.log('- This secret is used to sign and verify JWT tokens');
  console.log('- Keep it secure and never commit to git');
  console.log('- Use different secrets for development and production');
  
  return secret;
}

// Generate multiple secrets for different environments
function generateMultipleSecrets() {
  console.log('🔐 Generating JWT Secrets for Different Environments...');
  console.log('=======================================================');
  
  const secrets = {
    development: crypto.randomBytes(64).toString('base64'),
    staging: crypto.randomBytes(64).toString('base64'),
    production: crypto.randomBytes(64).toString('base64')
  };
  
  console.log('📋 Environment Secrets:');
  console.log('======================');
  
  Object.entries(secrets).forEach(([env, secret]) => {
    console.log(`\n${env.toUpperCase()}:`);
    console.log(`JWT_SECRET=${secret}`);
  });
  
  console.log('\n🔒 Security Reminder:');
  console.log('- Use different secrets for each environment');
  console.log('- Never use the same secret across environments');
  console.log('- Keep production secrets extra secure');
  
  return secrets;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--multiple') || args.includes('-m')) {
    generateMultipleSecrets();
  } else {
    generateJWTSecret();
  }
}

export { generateJWTSecret, generateMultipleSecrets };
