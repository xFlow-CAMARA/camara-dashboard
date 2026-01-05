#!/bin/bash
# CAMARA Dashboard Setup Script

echo "========================================="
echo "  CAMARA Dashboard Installation"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js and npm..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js already installed: $(node --version)"
fi

echo ""
echo "📦 Installing dashboard dependencies..."
cd /home/xflow/camara-dashboard
npm install

echo ""
echo "========================================="
echo "  Installation Complete!"
echo "========================================="
echo ""
echo "To start the dashboard:"
echo "  cd /home/xflow/camara-dashboard"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "Before starting, ensure:"
echo "  ✓ CoreSim is running (ports 8080, 8081)"
echo "  ✓ NEF services are running (ports 8100-8102)"
echo "  ✓ Redis is running (port 6379)"
echo ""
