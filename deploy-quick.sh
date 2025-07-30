#!/bin/bash
# Quick deployment script for SingleInterface Voice Agent v2.0.0
# Run this script on your GCP VM after SSH'ing in

set -e

echo "🚀 Starting RxOne Voice Agent v2.0.0 deployment..."
echo "⏰ This will take about 10-15 minutes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing essential audio libraries..."
sudo apt install -y \
    alsa-utils \
    pulseaudio \
    pulseaudio-utils \
    sox \
    libsox-fmt-all \
    ffmpeg \
    libasound2-dev \
    libpulse-dev \
    libportaudio2 \
    portaudio19-dev \
    libasound2-plugins \
    alsa-plugins-extra \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools \
    gstreamer1.0-alsa \
    gstreamer1.0-pulseaudio \
    libwebrtc-audio-processing1 \
    libopus0 \
    libopus-dev \
    curl \
    git \
    build-essential

print_success "Audio libraries installed successfully!"

print_status "Configuring audio system..."
# Configure ALSA
sudo usermod -a -G audio $USER

# Create ALSA configuration
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type pulse
}
ctl.!default {
    type pulse
}
EOF

# Start and enable PulseAudio
systemctl --user enable pulseaudio 2>/dev/null || true
systemctl --user start pulseaudio 2>/dev/null || true

print_success "Audio system configured!"

print_status "Installing Node.js 18.x (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installed: $NODE_VERSION, npm: $NPM_VERSION"

print_status "Installing PM2 process manager..."
sudo npm install -g pm2

print_status "Installing additional tools..."
sudo apt install -y nginx htop iotop nethogs
sudo npm install -g wscat

print_status "Cloning Voice Agent repository..."
if [ -d "singleinterfaceVoiceAgent2.0" ]; then
    print_warning "Repository directory already exists. Removing..."
    rm -rf singleinterfaceVoiceAgent2.0
fi

git clone https://github.com/pragyaa-ai/RxOne2.0.git
cd RxOne2.0

print_status "Installing Node.js dependencies..."
npm install

print_status "Installing additional audio processing packages..."
npm install --save \
    node-opus \
    @discordjs/opus \
    node-wav \
    audiobuffer-to-wav \
    lamejs 2>/dev/null || print_warning "Some audio packages may not install - this is usually fine"

print_status "Building the application..."
npm run build

print_success "Application built successfully!"

print_status "Creating environment configuration..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
NODE_ENV=production
PORT=3000

# Audio Configuration
AUDIO_SAMPLE_RATE=24000
AUDIO_CHANNELS=1
AUDIO_ENCODING=linear16

# Security (generate your own secret)
NEXTAUTH_SECRET=your_nextauth_secret_here

# Logging
LOG_LEVEL=info
EOF
    chmod 600 .env
    print_warning "Created .env file - YOU MUST EDIT IT with your OpenAI API key!"
else
    print_warning ".env file already exists - skipping creation"
fi

print_status "Creating PM2 ecosystem configuration..."
USERNAME=$(whoami)
CURRENT_DIR=$(pwd)

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'singleinterface-voice-agent',
    script: 'npm',
    args: 'start',
    cwd: '$CURRENT_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

print_status "Creating audio test script..."
cat > test-audio.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🎵 Testing audio capabilities...');

// Test Node.js audio modules
try {
  require('node-opus');
  console.log('✅ Opus codec available');
} catch (e) {
  console.log('❌ Opus codec not available:', e.message);
}

try {
  require('node-wav');
  console.log('✅ WAV processing available');
} catch (e) {
  console.log('❌ WAV processing not available:', e.message);
}

try {
  require('@discordjs/opus');
  console.log('✅ Discord Opus available');
} catch (e) {
  console.log('❌ Discord Opus not available:', e.message);
}

console.log('🎵 Audio test completed.');
EOF

print_status "Testing audio setup..."
node test-audio.js

print_status "Creating basic Nginx configuration..."
sudo tee /etc/nginx/sites-available/singleinterface > /dev/null << 'EOF'
upstream nextjs_upstream {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;

    # WebSocket support
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Audio streaming optimizations
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://nextjs_upstream;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/singleinterface /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

print_success "Basic Nginx configuration created!"

print_success "🎉 Deployment completed successfully!"
echo ""
echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1️⃣  EDIT YOUR API KEY:"
echo "   nano .env"
echo "   (Add your OpenAI API key)"
echo ""
echo "2️⃣  START THE APPLICATION:"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo "   pm2 startup  # Follow the instructions"
echo ""
echo "3️⃣  START NGINX:"
echo "   sudo systemctl start nginx"
echo "   sudo systemctl enable nginx"
echo ""
echo "4️⃣  TEST THE APPLICATION:"
echo "   curl http://localhost:3000"
echo "   # Or visit: http://$(curl -s ifconfig.me):3000"
echo ""
echo "5️⃣  OPTIONAL - SETUP SSL:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d your-domain.com"
echo ""
echo "📊 MONITORING COMMANDS:"
echo "   pm2 status          # Check app status"
echo "   pm2 logs            # View logs"
echo "   pm2 monit           # Real-time monitoring"
echo "   sudo nginx -t       # Test nginx config"
echo ""
echo "🎵 AUDIO TESTING:"
echo "   pactl info          # Check PulseAudio"
echo "   aplay -l            # List audio devices"
echo "   node test-audio.js  # Test Node.js audio modules"
echo ""
echo "📂 Current directory: $(pwd)"
echo "🏠 Application will run on: http://$(curl -s ifconfig.me):3000"
echo ""
print_success "Ready to deploy! 🚀"
