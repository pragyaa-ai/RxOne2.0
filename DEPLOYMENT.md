# 🚀 GCP VM Deployment Guide - SingleInterface Voice Agent v2.0.0

## 📋 Table of Contents
1. [GCP VM Setup](#gcp-vm-setup)
2. [Audio Libraries Installation](#audio-libraries-installation)
3. [Application Deployment](#application-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SSL/HTTPS Setup](#ssl-https-setup)
6. [Testing & Verification](#testing-verification)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ GCP VM Setup

### 1. Create GCP VM Instance

```bash
# Create VM with recommended specs
gcloud compute instances create singleinterface-voice-agent \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --network-tier=PREMIUM \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --service-account=your-service-account@your-project.iam.gserviceaccount.com \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=singleinterface-voice-agent,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20240319,mode=rw,size=20,type=projects/your-project/zones/us-central1-a/diskTypes/pd-balanced \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=environment=production,app=singleinterface-voice-agent \
    --reservation-affinity=any
```

### 2. Configure Firewall Rules

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-singleinterface-http \
    --allow tcp:80 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow HTTP for SingleInterface Voice Agent"

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-singleinterface-https \
    --allow tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags https-server \
    --description "Allow HTTPS for SingleInterface Voice Agent"

# Allow Next.js development port (if needed)
gcloud compute firewall-rules create allow-singleinterface-dev \
    --allow tcp:3000 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server \
    --description "Allow Next.js dev server for SingleInterface Voice Agent"
```

---

## 🎵 Audio Libraries Installation

### 1. SSH into VM and Update System

```bash
# SSH into the VM
gcloud compute ssh singleinterface-voice-agent --zone=us-central1-a

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### 2. Install Audio System Dependencies

```bash
# Install essential audio libraries
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
    alsa-plugins-extra

# Install additional audio codecs
sudo apt install -y \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools \
    gstreamer1.0-alsa \
    gstreamer1.0-pulseaudio

# Install WebRTC dependencies
sudo apt install -y \
    libwebrtc-audio-processing1 \
    libopus0 \
    libopus-dev \
    libspeex1 \
    libspeex-dev \
    libspeexdsp1 \
    libspeexdsp-dev
```

### 3. Configure Audio System

```bash
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
systemctl --user enable pulseaudio
systemctl --user start pulseaudio

# Test audio system
aplay -l  # List audio devices
pactl info  # Check PulseAudio status
```

---

## 🚀 Application Deployment

### 1. Install Node.js and npm

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x
npm --version   # Should be 9.x or higher

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Clone and Setup Application

```bash
# Clone the repository
git clone https://github.com/pragyaa-ai/singleinterfaceVoiceAgent2.0.git
cd singleinterfaceVoiceAgent2.0

# Install dependencies
npm install

# Install additional audio processing packages for server
npm install --save \
    node-opus \
    @discordjs/opus \
    node-wav \
    audiobuffer-to-wav \
    lamejs
```

### 3. Build the Application

```bash
# Build the Next.js application
npm run build

# Verify build
ls -la .next/  # Should contain built files
```

---

## 🔧 Environment Configuration

### 1. Create Production Environment File

```bash
# Create production environment file
cat > .env.production << 'EOF'
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Audio Configuration
AUDIO_SAMPLE_RATE=24000
AUDIO_CHANNELS=1
AUDIO_ENCODING=linear16

# Security
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-domain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/singleinterface/app.log
EOF

# Secure the environment file
chmod 600 .env.production
```

### 2. Create Logging Directory

```bash
# Create log directory
sudo mkdir -p /var/log/singleinterface
sudo chown $USER:$USER /var/log/singleinterface
```

---

## 🔐 SSL/HTTPS Setup

### 1. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace your-domain.com)
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### 3. Configure Nginx

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/singleinterface << 'EOF'
upstream nextjs_upstream {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/singleinterface /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 Application Startup

### 1. Create PM2 Ecosystem File

```bash
# Create PM2 configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'singleinterface-voice-agent',
    script: 'npm',
    args: 'start',
    cwd: '/home/your-username/singleinterfaceVoiceAgent2.0',
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
    log_file: '/var/log/singleinterface/combined.log',
    out_file: '/var/log/singleinterface/out.log',
    error_file: '/var/log/singleinterface/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

### 2. Start the Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Enable PM2 startup
pm2 startup
# Follow the instructions to run the generated command with sudo

# Check status
pm2 status
pm2 logs singleinterface-voice-agent
```

---

## 🧪 Testing & Verification

### 1. Audio System Testing

```bash
# Test audio libraries
node -e "console.log('Audio test:'); console.log(require('os').platform());"

# Test audio processing (install test script)
cat > test-audio.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('Testing audio capabilities...');

// Test Node.js audio modules
try {
  const opus = require('node-opus');
  console.log('✅ Opus codec available');
} catch (e) {
  console.log('❌ Opus codec not available:', e.message);
}

// Test WAV processing
try {
  const wav = require('node-wav');
  console.log('✅ WAV processing available');
} catch (e) {
  console.log('❌ WAV processing not available:', e.message);
}

console.log('Audio test completed.');
EOF

node test-audio.js
```

### 2. Application Health Check

```bash
# Check if application is running
curl -I http://localhost:3000/

# Check SSL setup
curl -I https://your-domain.com/

# Check WebSocket connectivity
wscat -c wss://your-domain.com/
```

### 3. Performance Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
pm2 monit

# Check logs
pm2 logs singleinterface-voice-agent --lines 50
tail -f /var/log/singleinterface/error.log
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Audio Issues
```bash
# Restart PulseAudio
systemctl --user restart pulseaudio

# Check audio devices
pactl list short sources
pactl list short sinks

# Test audio recording
arecord -d 5 test.wav
aplay test.wav
```

#### 2. WebSocket Connection Issues
```bash
# Check firewall
sudo ufw status
sudo iptables -L

# Test WebSocket from another machine
wscat -c ws://your-vm-ip:3000/
```

#### 3. SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Test SSL configuration
sudo nginx -t
```

#### 4. Performance Issues
```bash
# Check memory usage
free -h
pm2 monit

# Check disk space
df -h

# Check network
netstat -tulpn | grep :3000
```

---

## 📊 Production Checklist

### ✅ Pre-Deployment
- [ ] GCP VM created with appropriate specs
- [ ] Firewall rules configured
- [ ] Domain name pointed to VM IP
- [ ] SSL certificate obtained

### ✅ Audio Setup
- [ ] Audio libraries installed
- [ ] PulseAudio configured
- [ ] Audio codecs available
- [ ] WebRTC dependencies installed

### ✅ Application Setup
- [ ] Node.js 18+ installed
- [ ] Application built successfully
- [ ] Environment variables configured
- [ ] PM2 process manager setup

### ✅ Security & Performance
- [ ] Nginx reverse proxy configured
- [ ] SSL/HTTPS enabled
- [ ] Security headers set
- [ ] Gzip compression enabled
- [ ] Monitoring tools installed

### ✅ Testing
- [ ] Application starts without errors
- [ ] Audio processing works
- [ ] WebSocket connections successful
- [ ] Voice agent responds correctly
- [ ] Data collection features functional

---

## 🚀 Quick Deployment Script

Here's a comprehensive deployment script:

```bash
#!/bin/bash
# Quick deployment script for SingleInterface Voice Agent v2.0.0

set -e

echo "🚀 Starting SingleInterface Voice Agent v2.0.0 deployment..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install audio libraries
sudo apt install -y alsa-utils pulseaudio sox ffmpeg libasound2-dev

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/pragyaa-ai/singleinterfaceVoiceAgent2.0.git
cd singleinterfaceVoiceAgent2.0

# Install dependencies and build
npm install
npm run build

# Setup environment (you'll need to edit this file)
cp .env.example .env.production

echo "✅ Basic deployment completed!"
echo "📝 Next steps:"
echo "1. Edit .env.production with your API keys"
echo "2. Configure SSL with certbot"
echo "3. Setup Nginx reverse proxy"
echo "4. Start with: pm2 start ecosystem.config.js"
```

---

## 📞 Support

For deployment issues:
1. Check the logs: `pm2 logs`
2. Verify audio setup: `pactl info`
3. Test WebSocket: `wscat -c ws://localhost:3000`
4. Review Nginx config: `sudo nginx -t`

**🎯 Your SingleInterface Voice Agent v2.0.0 is now ready for production deployment on GCP!** 