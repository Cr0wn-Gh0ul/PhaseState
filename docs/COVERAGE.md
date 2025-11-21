# PhaseState - Test Coverage Report

## Summary

✅ **All tests passing!**

- **Test Suites:** 1 passed, 1 total
- **Tests:** 48 passed, 48 total
- **Time:** ~1.5s

## Coverage

| Metric      | Coverage | Passed/Total |
|-------------|----------|--------------|
| Statements  | 98.13%   | 105/107      |
| Branches    | 93.22%   | 55/59        |
| Functions   | 100%     | 25/25        |
| Lines       | 100%     | 98/98        |

## Test Categories

### Machine Creation (3 tests)
- ✓ Create with initial state
- ✓ Create with context
- ✓ TypeScript generics support

### State Handlers `.when()` (7 tests)
- ✓ Enter handlers
- ✓ Exit handlers
- ✓ Async handlers
- ✓ Metadata storage
- ✓ Transition constraints (`to`, `from`)
- ✓ Wildcard `from: "*"`

### Transitions `.to()` (6 tests)
- ✓ Basic transitions
- ✓ Context updates (partial & function)
- ✓ Method chaining
- ✓ History tracking (max 10)

### Guards `.can()` (2 tests)
- ✓ Block invalid transitions
- ✓ State-based guards

### Undo `.back()` (3 tests)
- ✓ Return to previous state
- ✓ Call exit/enter handlers
- ✓ No-op when no history

### Context Updates `.set()` (3 tests)
- ✓ Partial updates
- ✓ Function updates
- ✓ Notify listeners

### State Check `.is()` (1 test)
- ✓ Current state verification

### Event Listeners `.on()` (4 tests)
- ✓ Transition events
- ✓ Blocked transition events
- ✓ Guard failure events
- ✓ Unsubscribe functionality

### Valid Transitions `.transitions()` (5 tests)
- ✓ Respect `to` constraints
- ✓ Respect `from` constraints
- ✓ Filter by guards
- ✓ Wildcard support
- ✓ Auto-discovery when unconstrained

### Snapshot/Restore (4 tests)
- ✓ Create snapshots
- ✓ Deep copy context
- ✓ Restore state
- ✓ Notify on restore

### History Management (2 tests)
- ✓ Readonly history access
- ✓ Clear history

### Generator `.steps()` (3 tests)
- ✓ Yield current state
- ✓ Manual stepping
- ✓ Infinite iteration

### Automatic Sequence `.run()` (3 tests)
- ✓ Sequential transitions
- ✓ Delayed transitions
- ✓ Function-based updates

### Integration Tests (2 tests)
- ✓ Authentication flow
- ✓ Snapshot/restore workflow

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Files

- **Source:** `src/phasestate.ts` (main implementation)
- **Tests:** `tests/phasestate.test.ts` (48 test cases)
- **Config:** `jest.config.js`
