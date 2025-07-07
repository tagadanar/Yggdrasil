#!/bin/bash

echo "🐳 Setting up Docker permissions for development..."

# Check if user is already in docker group
if groups $USER | grep -q '\bdocker\b'; then
    echo "✅ User is already in docker group"
else
    echo "➕ Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "✅ User added to docker group"
fi

echo ""
echo "🔄 You need to log out and log back in for the changes to take effect."
echo "Or run the following command to apply changes in current session:"
echo "    newgrp docker"
echo ""
echo "After that, you can run: npm run dev"