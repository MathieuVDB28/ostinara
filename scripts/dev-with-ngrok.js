#!/usr/bin/env node

/**
 * Starts the Next.js dev server and creates an ngrok tunnel
 * for testing PWA on mobile devices
 */

const { spawn } = require('child_process');
const ngrok = require('ngrok');

const PORT = 3000;

console.log('🚀 Starting development server with ngrok tunnel...\n');

// Start Next.js dev server
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for the server to start
setTimeout(async () => {
  try {
    console.log('\n📡 Creating ngrok tunnel...');

    // Kill any existing tunnels first
    await ngrok.kill();

    const url = await ngrok.connect({
      addr: PORT,
      region: 'eu', // European servers (faster from France/Belgium)
      onStatusChange: (status) => console.log('🔄 Ngrok status:', status),
      onLogEvent: (log) => {
        if (log.lvl === 'error') {
          console.error('❌ Ngrok error:', log.msg);
        }
      }
    });

    console.log('\n✅ Ngrok tunnel established!');
    console.log('━'.repeat(60));
    console.log(`🌍 Public URL: ${url}`);
    console.log(`📱 Use this URL on your mobile device to test the PWA`);
    console.log('━'.repeat(60));
    console.log('\n💡 Tips:');
    console.log('  - The URL works on any device connected to the internet');
    console.log('  - Perfect for testing push notifications on mobile');
    console.log('  - Press Ctrl+C to stop both server and tunnel\n');

  } catch (error) {
    console.error('❌ Failed to create ngrok tunnel:', error.message || error);
    if (error.body) {
      console.error('Details:', error.body);
    }
    console.log('\n💡 Troubleshooting:');
    console.log('  - Make sure no other ngrok tunnel is running');
    console.log('  - Check if ngrok is properly configured');
    console.log('  - Try running: npx ngrok http 3000 manually\n');
  }
}, 5000); // Wait 5 seconds for Next.js to start

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');

  try {
    await ngrok.kill();
    console.log('✅ Ngrok tunnel closed');
  } catch (error) {
    // Ignore errors during cleanup
  }

  nextProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await ngrok.kill();
  } catch (error) {
    // Ignore errors during cleanup
  }
  nextProcess.kill('SIGTERM');
  process.exit(0);
});
