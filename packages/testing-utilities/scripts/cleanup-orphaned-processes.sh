#!/bin/bash
# Cleanup script for orphaned Node processes and resources

echo "🧹 Starting comprehensive cleanup..."

# Kill orphaned ts-node-dev processes
echo "📝 Cleaning up orphaned ts-node-dev processes..."
pkill -f "ts-node-dev" 2>/dev/null || true

# Kill orphaned Node processes with src/index.ts
echo "📝 Cleaning up orphaned Node service processes..."
ps aux | grep -E "node.*src/index.ts" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Clean up temporary files
echo "📝 Cleaning up temporary files..."
rm -f /tmp/ts-node-dev-* 2>/dev/null || true

# Clean up service manager files
echo "📝 Cleaning up service manager lock files..."
find /home/tagada/Desktop/Yggdrasil/packages/testing-utilities -name ".service-manager*.lock" -delete 2>/dev/null || true
find /home/tagada/Desktop/Yggdrasil/packages/testing-utilities -name ".service-manager*.pids" -delete 2>/dev/null || true

# Check file descriptor usage
echo "📊 Current file descriptor usage:"
echo "Open files: $(lsof | wc -l)"
echo "File descriptor limit: $(ulimit -n)"

# Check for remaining Node processes
remaining=$(ps aux | grep -E "(ts-node-dev|node.*src/index.ts)" | grep -v grep | wc -l)
echo "📊 Remaining Node processes: $remaining"

if [ $remaining -eq 0 ]; then
    echo "✅ Cleanup completed successfully!"
else
    echo "⚠️  Warning: $remaining Node processes still running"
    ps aux | grep -E "(ts-node-dev|node.*src/index.ts)" | grep -v grep
fi