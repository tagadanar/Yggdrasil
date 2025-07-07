#!/bin/bash
# Docker wrapper script to handle permissions

# Check if user is in docker group
if groups $USER | grep -q '\bdocker\b'; then
    # User is in docker group, run command directly
    exec "$@"
else
    # User is not in docker group, add user to docker group first
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER
    
    # Use newgrp to temporarily join docker group and run command
    exec newgrp docker -c "$*"
fi