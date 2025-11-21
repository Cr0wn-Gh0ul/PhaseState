# PhaseState Examples

This directory contains practical examples of using PhaseState in real-world scenarios.

## Running Examples

All examples use TypeScript and can be run with `ts-node`:

```bash
# Install ts-node globally (if not already installed)
npm install -g ts-node

# Run any example
ts-node examples/authentication.ts
ts-node examples/traffic-light.ts
ts-node examples/data-fetching.ts
ts-node examples/form-wizard.ts
```

Or build first and run with Node:

```bash
npm run build
node -r ts-node/register examples/authentication.ts
```

## Examples Overview

### 🔐 Authentication Flow (`authentication.ts`)

Demonstrates a complete user authentication system with:
- Multiple authentication states (logged out, logging in, logged in, etc.)
- Session management and expiration
- Login attempt limiting with account locking
- Event listeners for monitoring auth state changes

**Key Features:**
- Async state handlers
- Guard conditions (max login attempts)
- State constraints (from/to)
- Event monitoring

```typescript
const auth = machine("loggedOut", { user: null, token: null, attempts: 0 })
  .when("loggedOut", {
    enter: () => console.log("Please log in"),
    to: ["loggingIn"]
  })
  .when("loggingIn", {
    enter: async (ctx) => {
      console.log("Authenticating...");
      await new Promise(r => setTimeout(r, 500));
    },
    from: ["loggedOut", "sessionExpired"],
    to: ["loggedIn", "loginFailed"],
    meta: { timeout: 5000 }
  })
  .when("loggedIn", {
    enter: (ctx) => console.log(`Welcome back, ${ctx.user}!`),
    from: ["loggingIn"],
    to: ["loggingOut", "sessionExpired"]
  })
  .when("loginFailed", {
    enter: (ctx) => console.log(`Login failed (${ctx.attempts}/3)`),
    from: ["loggingIn"],
    to: ["loggingIn", "locked"]
  })
  .when("locked", {
    enter: () => console.log("Account locked. Try again later."),
    from: ["loginFailed"]
  })
  .when("sessionExpired", {
    enter: () => console.log("Session expired"),
    from: ["loggedIn"],
    to: ["loggingIn"]
  })
  .when("loggingOut", {
    enter: async () => {
      console.log("Logging out...");
      await new Promise(r => setTimeout(r, 200));
    },
    from: ["loggedIn"],
    to: ["loggedOut"]
  })
  .can("loggingIn", state => state.context.attempts < 3);

// Usage with event listener
auth.on(event => {
  if ('type' in event && event.type === 'transition') {
    if (event.blocked === 'guard') {
      console.log("Too many login attempts!");
    }
  }
});

// Simulate login flow
await auth.to("loggingIn");
await auth.to("loggedIn", { user: "Alice", token: "abc123" });

// Check session later
setTimeout(async () => {
  await auth.to("sessionExpired");
  console.log(auth.transitions()); // ['loggingIn']
}, 30000);
```

---

### 🚦 Traffic Light (`traffic-light.ts`)

Shows different ways to control state transitions:
- Manual control with direct transitions
- Automatic sequences with delays
- Generator-based stepping
- Auto-cycling with metadata

**Key Features:**
- State metadata (duration, color)
- Multiple execution modes
- Timed transitions

```typescript
const light = machine("red", { timer: 0 })
  .when("red", { 
    enter: () => console.log("STOP"),
    to: ["green"],
    meta: { duration: 5000 }
  })
  .when("green", { 
    enter: () => console.log("GO"),
    from: ["red"],
    to: ["yellow"],
    meta: { duration: 8000 }
  })
  .when("yellow", { 
    enter: () => console.log("SLOW DOWN"),
    from: ["green"],
    to: ["red"],
    meta: { duration: 2000 }
  });

// Three ways to control:

// 1. Manual
await light.to("green");
console.log(light.transitions()); // ['yellow']
await light.to("yellow");

// 2. Automatic sequence with delays
await light.run([
  { to: "green", delay: light.meta("green").duration },
  { to: "yellow", delay: light.meta("yellow").duration },
  { to: "red", delay: light.meta("red").duration }
]);

// 3. Generator for precise control
const cycle = light.steps();
cycle.next(); // Initial state
cycle.next({ to: "green" });
cycle.next({ to: "yellow" });
cycle.next({ to: "red" });

// Auto-cycle forever
async function autoCycle() {
  const states = ["green", "yellow", "red"];
  for (const state of states) {
    const duration = light.meta(state).duration;
    await new Promise(r => setTimeout(r, duration));
    await light.to(state);
  }
  autoCycle(); // Loop
}
```

---

### 📡 Data Fetching (`data-fetching.ts`)

Real-world API interaction patterns with:
- Automatic retry logic with exponential backoff
- Error handling and recovery
- Snapshot/restore for transaction-like behavior
- State history tracking

**Key Features:**
- Retry limits with guards
- Wildcard `from: "*"` for error states
- Snapshot/restore for rollback
- Context updates during transitions

```typescript
const fetch = machine("idle", { data: null, error: null })
  .when("idle", {
    enter: () => console.log("Ready"),
    to: ["loading"]
  })
  .when("loading", {
    enter: () => console.log("Fetching..."),
    meta: { cancellable: true },
    from: ["idle", "error"],
    to: ["success", "error"]
  })
  .when("success", {
    enter: ctx => console.log("Data:", ctx.data),
    from: ["loading"]
  })
  .when("error", {
    enter: ctx => console.log("Error:", ctx.error),
    from: ["loading"],
    to: ["loading", "idle"]
  })

async function loadData() {
  await fetch.to("loading");  // ✓ allowed: idle -> loading
  
  try {
    const data = await getData();
    await fetch.to("success", { data });  // ✓ allowed: loading -> success
  } catch (error) {
    await fetch.to("error", { error: error.message });  // ✓ allowed: loading -> error
    await fetch.to("loading");  // ✓ allowed: error -> loading (retry)
  }
  
  // fetch.to("idle") from success would be blocked (not in 'to' array)
}

// Or use automatic sequencing
await fetch.run([
  { to: "loading" },
  { to: "success", delay: 1000, update: { data: "result" } }
]);

// Or step manually
const steps = fetch.steps();
steps.next(); // idle
steps.next({ to: "loading" });
steps.next({ to: "success", update: { data: "result" } });
```

---

### 📝 Form Wizard (`form-wizard.ts`)

Multi-step form with validation:
- Step-by-step progression
- Field validation at each step
- Guard conditions for form rules
- Error handling and navigation

**Key Features:**
- Complex state graph
- Validation guards
- Transition blocking on validation failure
- Event monitoring for UI feedback

```typescript
type FormContext = {
  step: number;
  email: string;
  password: string;
  name: string;
  errors: string[];
  isValid: boolean;
};

const form = machine<FormContext>("step1", { 
  step: 1,
  email: "",
  password: "",
  name: "",
  errors: [],
  isValid: false
})
  .when("step1", {
    enter: () => console.log("Step 1: Enter email"),
    to: ["validatingStep1"]
  })
  .when("validatingStep1", {
    enter: (ctx) => {
      const errors: string[] = [];
      if (!ctx.email.includes("@")) {
        errors.push("Invalid email");
      }
    },
    from: ["step1"],
    to: ["step1", "step2"]
  })
  .when("step2", {
    enter: () => console.log("Step 2: Set password"),
    from: ["validatingStep1", "step3"],
    to: ["validatingStep2", "step1"]
  })
  .when("validatingStep2", {
    enter: (ctx) => {
      const errors: string[] = [];
      if (ctx.password.length < 8) {
        errors.push("Password too short");
      }
    },
    from: ["step2"],
    to: ["step2", "step3"]
  })
  .when("step3", {
    enter: () => console.log("Step 3: Enter name"),
    from: ["validatingStep2"],
    to: ["validatingStep3", "step2"]
  })
  .when("validatingStep3", {
    from: ["step3"],
    to: ["step3", "submitting"]
  })
  .when("submitting", {
    enter: async (ctx) => {
      console.log("Submitting form...");
      await new Promise(r => setTimeout(r, 1000));
    },
    from: ["validatingStep3"],
    to: ["success", "error"]
  })
  .when("success", {
    enter: () => console.log("Registration complete!"),
    from: ["submitting"]
  })
  .when("error", {
    enter: (ctx) => console.log("Errors:", ctx.errors),
    from: "*",
    to: ["step1"]
  })
  .can("validatingStep1", s => s.context.email.includes("@"))
  .can("validatingStep2", s => s.context.password.length >= 8)
  .can("submitting", s => s.context.isValid);

// Track all transitions
form.on(event => {
  if ('type' in event && event.type === 'transition') {
    console.log(`Step: ${event.from} → ${event.to}`);
    if (event.blocked) {
      console.log(`Validation failed: ${event.blocked}`);
    }
  }
});

// Usage
form.set({ email: "user@example.com" });
await form.to("validatingStep1");

if (form.transitions().includes("step2")) {
  await form.to("step2");
  form.set({ password: "securepass123" });
  await form.to("validatingStep2");
  await form.to("step3");
  form.set({ name: "John Doe", isValid: true });
  await form.to("validatingStep3");
  await form.to("submitting");
  await form.to("success");
}

// Can go back anytime
await form.back(); // Return to previous step
console.log(form.history); // See all steps taken
```

---

## Common Patterns

### Async Operations

```typescript
.when('loading', {
  enter: async (ctx) => {
    const data = await fetchData();
    // Process data
  }
})
```

### Retry Logic

```typescript
.can('retry', state => state.context.attempts < 3)

// In your code
if (failed && canRetry) {
  await machine.to('retry', { attempts: attempts + 1 });
}
```

### Transaction Rollback

```typescript
const checkpoint = machine.snapshot();

try {
  await performRiskyOperation();
} catch (error) {
  machine.restore(checkpoint); // Rollback
}
```

### Event Monitoring

```typescript
machine.on(event => {
  if ('type' in event && event.type === 'transition') {
    console.log(`${event.from} -> ${event.to}`);
    
    if (event.blocked) {
      console.log(`Blocked by: ${event.blocked}`);
    }
  }
});
```

## Tips

1. **Use metadata** for state-specific configuration (timeouts, colors, etc.)
2. **Guards** are great for business logic validation
3. **Snapshots** enable undo/redo and transaction-like behavior
4. **Event listeners** keep your UI in sync with state changes
5. **Async handlers** let you perform side effects during transitions
