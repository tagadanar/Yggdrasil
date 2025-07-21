# 🛡️ File Descriptor Prevention Strategy

This document outlines comprehensive measures to prevent file descriptor exhaustion and orphaned process issues in the future.

## 🔍 Problem Analysis

**Root Cause:** Multiple `ts-node-dev` processes with file watchers created hundreds of file descriptors that weren't properly cleaned up, leading to system resource exhaustion.

**Impact:** Tests failing with `EMFILE: too many open files` errors and service startup failures.

## 🛠️ Prevention Infrastructure

### 1. **Automated Cleanup Scripts**

#### `cleanup-orphaned-processes.sh`
- Kills orphaned `ts-node-dev` and Node processes
- Removes temporary files from `/tmp/ts-node-dev-*`
- Cleans service manager lock files
- Reports cleanup status

```bash
# Usage
npm run cleanup
```

#### `process-monitor.js`
- Continuous monitoring of Node processes and file descriptors
- Automatic cleanup when thresholds exceeded
- Configurable limits and intervals
- Logging for debugging

```bash
# Usage
npm run monitor:start    # Start background monitoring
npm run monitor:stop     # Stop monitoring
```

#### `test-environment-health-check.js`
- Pre-test environment validation
- Checks process count, file descriptors, memory, ports
- Auto-fix capabilities
- Detailed health reporting

```bash
# Usage
npm run health:check     # Check environment health
npm run health:fix       # Auto-fix issues and check
```

### 2. **Enhanced Test Scripts**

#### Safe Test Execution
```bash
npm run test:safe        # Health check + test execution
npm run test:single      # Health check + single worker test
```

#### Automatic Pre/Post Hooks
- `pretest`: Runs health check, auto-fixes if needed
- `posttest`: Cleanup after test execution

### 3. **Resource Monitoring**

#### Configurable Thresholds
```javascript
const thresholds = {
  maxProcesses: 15,           // Maximum Node processes
  maxFileDescriptors: 400000, // FD usage warning
  maxMemoryMB: 4096,         // Memory usage warning
  maxTempFiles: 50           // Temporary file limit
};
```

#### Early Warning System
- Monitor resource usage every 30 seconds
- Automatic cleanup when limits exceeded
- Detailed logging for trend analysis

### 4. **Process Lifecycle Management**

#### Enhanced Service Manager (`enhanced-service-manager.js`)
- Resource limits per service (memory, FDs)
- Startup/shutdown timeouts
- Process group management
- Graceful degradation

#### Features:
- **Memory Limits**: 512MB per service
- **Startup Timeout**: 30 seconds
- **Shutdown Timeout**: 10 seconds
- **Resource Monitoring**: Every 5 seconds
- **Lock File Management**: Automatic cleanup

## 📋 Prevention Workflow

### Before Testing
1. **Health Check**: `npm run health:check`
2. **Auto-Fix**: `npm run health:fix` (if needed)
3. **Monitor Start**: `npm run monitor:start` (optional)

### During Development
1. **Use Safe Commands**: `npm run test:safe` instead of raw test commands
2. **Regular Cleanup**: `npm run cleanup` between test sessions
3. **Monitor Resources**: Check health status periodically

### After Testing
1. **Automatic Cleanup**: `posttest` hook runs cleanup
2. **Health Verification**: Ensure clean state for next developer

## 🔧 Integration Points

### Package.json Scripts
```json
{
  "test:safe": "npm run health:check --silent && npm run test:quiet",
  "test:single": "npm run health:check --silent && playwright test --workers=1",
  "health:check": "node scripts/test-environment-health-check.js",
  "health:fix": "node scripts/test-environment-health-check.js --fix",
  "cleanup": "bash scripts/cleanup-orphaned-processes.sh",
  "monitor:start": "node scripts/process-monitor.js &",
  "pretest": "npm run health:check --silent || npm run health:fix",
  "posttest": "npm run cleanup"
}
```

### CI/CD Integration
```bash
# In CI pipeline
- npm run health:check
- npm run test:safe
- npm run cleanup
```

## 📊 Monitoring & Alerting

### Health Check Categories
1. **Process Count**: Monitor Node process proliferation
2. **File Descriptors**: Track FD usage and leaks
3. **Memory Usage**: System memory consumption
4. **Port Availability**: Test port conflicts
5. **Temporary Files**: Cleanup verification
6. **Lock Files**: Service manager state
7. **Database Connection**: MongoDB connectivity

### Alert Levels
- **✅ OK**: All systems normal
- **⚠️ WARNING**: Approaching limits, cleanup recommended
- **❌ ERROR**: Critical issues, tests will likely fail

## 🎯 Best Practices

### For Developers
1. **Always use `npm run test:safe`** instead of direct Playwright commands
2. **Run cleanup between sessions**: `npm run cleanup`
3. **Check health before major test runs**: `npm run health:check`
4. **Monitor background**: `npm run monitor:start` for long development sessions

### For CI/CD
1. **Health check in pipeline**: Fail fast on unhealthy environments
2. **Resource monitoring**: Track trends across builds
3. **Automatic cleanup**: Always cleanup after test runs
4. **Parallel job isolation**: Ensure worker isolation

### For Production
1. **Resource limits**: Set appropriate ulimits
2. **Process monitoring**: Use production monitoring tools
3. **Regular cleanup**: Scheduled cleanup tasks
4. **Health endpoints**: Monitor service health

## 🚀 Future Enhancements

### Planned Improvements
1. **Metrics Collection**: Prometheus/Grafana integration
2. **Advanced Alerting**: Slack/email notifications
3. **Auto-scaling**: Dynamic resource allocation
4. **Predictive Cleanup**: ML-based resource prediction
5. **Resource Pools**: Shared resource management

### Monitoring Dashboard
```
📊 Test Environment Status
├── 🖥️  Process Health: ✅ 8/15 processes
├── 📁 File Descriptors: ✅ 45,231/400,000
├── 💾 Memory Usage: ✅ 2.1GB/4GB
├── 🌐 Port Status: ✅ All available
├── 🗂️  Temporary Files: ✅ 12/50
├── 🔒 Lock Files: ✅ Clean
└── 🗄️  Database: ✅ Connected
```

## 📝 Troubleshooting

### Common Issues
1. **"Too many processes"**: Run `npm run cleanup`
2. **"File descriptor limit"**: Run `npm run health:fix`
3. **"Ports in use"**: Check for hanging services
4. **"Memory usage high"**: Restart development session

### Manual Recovery
```bash
# Emergency cleanup
pkill -f "ts-node-dev"
rm -f /tmp/ts-node-dev-*
rm -f .service-manager*.lock
rm -f .service-manager*.pids

# Verify clean state
npm run health:check
```

This prevention strategy ensures robust, reliable test execution while preventing resource exhaustion issues.