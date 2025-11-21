# PhaseState 

![NPM Version](https://img.shields.io/npm/v/phasestate)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/Cr0wn-Gh0ul/PhaseState/actions/workflows/ci.yml/badge.svg)](https://github.com/Cr0wn-Gh0ul/PhaseState/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-48%20passed-brightgreen.svg)]()
[![Coverage](https://img.shields.io/badge/coverage-98%25-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A minimal, powerful state machine library for TypeScript

## ✨ Features

- 🎯 **Simple** - Intuitive API with minimal boilerplate
- 🔒 **Type-safe** - Full TypeScript support with optional generics
- 🚀 **Zero dependencies** - Tiny bundle size
- 🌐 **Universal** - Works in Node.js and browsers
- ⚡ **Async-first** - Built-in support for async handlers
- 🎭 **Flexible** - Manual, automatic, or step-by-step execution
- 🔍 **Debuggable** - Transition events, guards, and history tracking
- 💾 **Serializable** - Snapshot and restore state

## 📦 Installation

```bash
npm install phasestate
```

## 🚀 Quick Start

```typescript
import { machine } from 'phasestate';

// Create a state machine
const fsm = machine("idle", { count: 0 })
  .when("idle", {
    enter: () => console.log("Ready"),
    to: ["active"]
  })
  .when("active", {
    enter: async (ctx) => {
      console.log("Processing...");
      await doWork();
    },
    from: ["idle"],
    to: ["complete", "error"]
  })
  .when("complete", {
    enter: (ctx) => console.log("Done!", ctx.count),
    from: ["active"]
  })
  .when("error", {
    from: "*",
    to: ["idle"]
  })
  .can("active", state => state.context.count < 100);

// Use it
await fsm.to("active");
fsm.set({ count: 5 });

// Check available transitions
console.log(fsm.transitions()); // ['complete', 'error']

// Listen to transitions
fsm.on(event => {
  if ('type' in event && event.type === 'transition') {
    console.log(`${event.from} → ${event.to}`);
  }
});
```

## 📚 API

### `machine(initialState, context?)`

Create a state machine.

```typescript
const m = machine("idle");
const m2 = machine("idle", { count: 0 });
const m3 = machine<MyContext>("idle", { data: null });
```

### `.when(state, { enter?, exit?, meta?, to?, from? })`

Define state handlers, metadata, and allowed transitions. Returns `this` for chaining.

```typescript
m.when("loading", {
  enter: async ctx => {
    console.log("Started loading");
    await fetchData();
  },
  exit: async ctx => console.log("Stopped loading"),
  meta: { cancellable: true, timeout: 5000 },
  to: ["success", "error"],      // can only transition to these states
  from: ["idle", "error"]         // can only be entered from these states
  // from: "*"                    // can be entered from any state
});
```

The `to` and `from` define valid transitions:
- `to`: States this state can transition to
- `from`: States that can transition to this state (array or `"*"` for any). **Defaults to all states if omitted**.
- `enter`/`exit`: Can be async functions
- `meta`: Any metadata you want to attach to the state

### `.to(state, update?)`

Transition to a new state. Optionally update context. Checks guards and constraints before transitioning. Returns a Promise.

```typescript
// Simple transition
await m.to("loading");

// With context update (partial)
await m.to("done", { count: 42 });

// With context update (function)
await m.to("done", ctx => ({ ...ctx, count: ctx.count + 1 }));
```

### `.can(state, guard)`

Add a guard condition that must pass for a transition to occur. Returns `this` for chaining.

```typescript
// Only allow loading if not already done
m.can("loading", state => state.value !== "done");

// Guard based on context
m.can("submit", state => state.context.isValid === true);

// Multiple guards can be added
m.can("premium", state => state.context.isPaid && state.context.verified);
```

### `.back()`

Return to the previous state. Maintains a history of the last 10 states. Returns a Promise.

```typescript
await m.to("loading");
await m.to("error");
await m.back(); // returns to "loading"
```

### `.transitions()`

Get valid transitions from the current state. Respects `to`/`from` constraints and guards.

```typescript
const valid = m.transitions(); // ['loading', 'cancelled']
console.log(valid); // states that can be transitioned to right now

// Example
m.when("idle", { to: ["loading", "cancelled"] })
  .can("loading", s => s.context.ready);

m.set({ ready: false });
console.log(m.transitions()); // ['cancelled'] - loading blocked by guard
m.set({ ready: true });
console.log(m.transitions()); // ['loading', 'cancelled'] - all allowed
```

### `.snapshot()`

Create a deep copy snapshot of the current state and context.

```typescript
const snapshot = m.snapshot();
// { state: 'loading', context: { count: 42 } }

// Safe to mutate original without affecting snapshot
m.set({ count: 100 });
console.log(snapshot.context.count); // Still 42
```

### `.restore(snapshot)`

Restore state and context from a snapshot. Returns `this` for chaining.

```typescript
const snapshot = m.snapshot();
// ... do some transitions ...
m.restore(snapshot); // back to saved state
```

### `.meta(state)`

Get metadata for a state.

```typescript
const meta = m.meta("loading");
console.log(meta.timeout); // 5000
```

### `.set(update)`

Update context without changing state.

```typescript
// Partial update
m.set({ count: 5 });

// Function update
m.set(ctx => ({ ...ctx, count: ctx.count + 1 }));
```

### `.is(state)`

Check current state.

```typescript
if (m.is("loading")) {
  console.log("Loading...");
}
```

### `.on(listener)`

Subscribe to state changes and transition events. Returns unsubscribe function.

```typescript
const unsubscribe = m.on(event => {
  if ('type' in event && event.type === 'transition') {
    // Transition event
    console.log(`${event.from} -> ${event.to}`);
    if (event.blocked) {
      console.log(`Blocked by: ${event.blocked}`);
    }
  } else {
    // State update event
    console.log("State:", event.value);
    console.log("Context:", event.context);
  }
});
```

### `.steps()`

Get a generator to step through transitions manually.

```typescript
const steps = m.steps();
steps.next(); // get initial state
steps.next({ to: "loading" });
steps.next({ to: "done", update: { count: 42 } });
steps.next({ to: "idle", update: ctx => ({ ...ctx, count: 0 }) });
```

### `.run(sequence)`

Run a sequence of transitions automatically. Returns a Promise.

```typescript
await m.run([
  { to: "loading" },
  { to: "success", delay: 1000 },
  { to: "idle", update: { count: 0 } }
]);
```

Each step can have:
- `to` - Target state
- `update` - Context update (partial or function)
- `delay` - Optional delay in milliseconds before this transition

### Properties

- `.state` - Current state name (string)
- `.context` - Current context object
- `.history` - Array of previous states (max 10, readonly)

### `.clearHistory()`

Clear the state history. Returns `this` for chaining.

```typescript
console.log(m.history.length); // 5
m.clearHistory();
console.log(m.history.length); // 0
```

## 💡 Examples

See the [`examples/`](./examples) directory for complete, runnable examples:

- **🔐 Authentication Flow** - Login/logout with session management and locking
- **🚦 Traffic Light** - Auto-cycling with multiple control modes
- **📡 Data Fetching** - API calls with retry logic and snapshots
- **📝 Form Wizard** - Multi-step form with validation

Each example demonstrates different features and patterns. [View all examples →](./examples)

## 🎯 TypeScript

Add types for better autocomplete and type safety:

```typescript
type UserContext = {
  id: string;
  name: string;
  role: 'admin' | 'user';
  isAuthenticated: boolean;
};

const user = machine<UserContext>("guest", { 
  id: "",
  name: "Guest",
  role: "user",
  isAuthenticated: false
});

// TypeScript will enforce context shape
user.set({ 
  name: "Alice",
  role: "admin" 
}); // ✓ Valid

// TypeScript error:
// user.set({ age: 25 }); // Error: 'age' doesn't exist on UserContext
```


