# Service Coordinator & Health Monitor Integration Guide

## Overview

The Service Coordinator provides robust synchronization between the health monitor and test execution, ensuring tests only run when services are healthy and properly wait during service recovery periods.

## Key Components

### 1. **Service Coordinator** (`service-coordinator.js`)
- Singleton class managing shared service state
- Inter-process communication via state file
- Coordinates between health monitor and test runner
- Tracks restart progress and completion

### 2. **Enhanced Health Monitor** (`service-health-monitor.js`)
- Monitors service health every 5 seconds
- Requires 2 consecutive failures before triggering restart
- Requires 3 consecutive healthy checks after restart
- 10-second stabilization period after successful restart
- Integrated with coordinator for state management

### 3. **Test Lifecycle Integration** (`test-lifecycle.ts`)
- Tests wait for services before execution
- Automatic test skipping if services unavailable
- Enhanced monitoring in critical zones (test #25+)
- Removed conflicting restart logic

### 4. **Service Wait Helper** (`service-wait-helper.ts`)
- Utility class for tests to wait for services
- Exponential backoff support
- Integration with Playwright test hooks

## How It Works

### Service Health Monitoring Flow:
1. Health monitor checks all services every 5 seconds
2. If unhealthy, increments failure counter
3. After 2 consecutive failures, triggers restart
4. Coordinator sets `restartInProgress = true` and `testsPaused = true`
5. Services stop → wait 5s → services start
6. Wait for 3 consecutive healthy checks
7. 10-second stabilization period
8. Coordinator sets `restartInProgress = false` and `testsPaused = false`

### Test Execution Flow:
1. Before each test, check coordinator state
2. If `canRunTests()` returns false, wait up to 60 seconds
3. If services not ready after timeout, skip test
4. If ready, proceed with test execution

## Usage Examples

### In Test Files:

```typescript
import { ServiceWaitHelper } from './helpers/service-wait-helper';

test.beforeEach(async ({ }, testInfo) => {
  // Automatically wait for services and skip if unavailable
  const ready = await ServiceWaitHelper.beforeTest(testInfo);
  if (!ready) return;
  
  // Test code continues...
});
```

### Manual Service Check:

```typescript
// Quick check without waiting
if (!ServiceWaitHelper.isReady()) {
  console.log('Services not ready');
}

// Wait for services with timeout
const ready = await ServiceWaitHelper.waitForServices('MyTest', 30000);
```

### CLI Commands:

```bash
# Check coordinator status
node service-coordinator.js status

# Reset coordinator state
node service-coordinator.js reset

# Manually pause/resume tests
node service-coordinator.js pause
node service-coordinator.js resume

# Check health monitor
node service-health-monitor.js check
```

## Configuration

### Health Monitor Settings:
- **Health check interval**: 5 seconds
- **Failure threshold**: 2 consecutive failures
- **Success threshold**: 3 consecutive healthy checks
- **Response time threshold**: 1500ms (services considered slow if >1000ms)
- **Stabilization period**: 10 seconds after restart

### Coordinator Settings:
- **Default wait timeout**: 60 seconds
- **State file**: `.service-coordinator-state.json`
- **Max listeners**: 100 (for multiple test processes)

## Benefits

1. **Prevents test failures** from running during service restarts
2. **Reduces flakiness** by ensuring services are stable before tests
3. **Better debugging** with clear state tracking and logging
4. **Automatic recovery** from service failures
5. **No test code changes** required for existing tests

## Troubleshooting

### Tests hanging/waiting indefinitely:
- Check coordinator status: `node service-coordinator.js status`
- Verify services are running: `node service-manager.js health`
- Reset coordinator if stuck: `node service-coordinator.js reset`

### Services repeatedly restarting:
- Check for persistent failures in service logs
- Increase failure threshold if services are slow but functional
- Check system resources (memory, CPU)

### Tests skipped unexpectedly:
- Verify services are healthy before test run
- Check coordinator state file for issues
- Ensure health monitor is running

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Test Runner    │────▶│  Coordinator     │◀────│   Health    │
│                 │     │                  │     │   Monitor   │
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                        │                       │
        │                        ▼                       │
        │              ┌──────────────────┐             │
        │              │   State File     │             │
        │              │  (.json IPC)     │             │
        │              └──────────────────┘             │
        │                                                │
        └────────────────────────────────────────────────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │ Service Manager  │
                      │   (Start/Stop)   │
                      └──────────────────┘
```

## Future Improvements

1. **Metrics collection**: Track restart frequency, recovery times
2. **Predictive restart**: Restart before complete failure based on degradation
3. **Service-specific thresholds**: Different tolerance for different services
4. **WebSocket integration**: Real-time status updates to test runners
5. **Dashboard**: Visual monitoring of service health and test execution