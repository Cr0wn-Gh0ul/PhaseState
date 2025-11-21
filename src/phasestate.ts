/**
 * PhaseState - A minimal state machine library
 */

export type State<T = any> = {
  value: string;
  context: T;
};

export type TransitionEvent<T = any> = {
  type: 'transition';
  from: string;
  to: string;
  blocked?: 'guard' | 'constraint' | 'from' | 'to';
  state: State<T>;
};

export type StateEvent<T = any> = State<T> | TransitionEvent<T>;

/**
 * State machine
 */
export class Machine<T = any> {
  private current: State<T>;
  private handlers = new Map<string, {
    enter?: (ctx: T) => void | Promise<void>;
    exit?: (ctx: T) => void | Promise<void>;
    meta?: any;
    to?: string[];
    from?: string[] | '*';
  }>();
  private guards = new Map<string, (state: State<T>) => boolean>();
  private listeners = new Set<(event: StateEvent<T>) => void>();
  private stateHistory: State<T>[] = [];
  private maxHistory = 10;

  constructor(initial: string, context: T) {
    this.current = { value: initial, context };
  }

  /**
   * Define what happens in a state
   */
  when(
    state: string,
    handlers: {
      enter?: (ctx: T) => void | Promise<void>;
      exit?: (ctx: T) => void | Promise<void>;
      meta?: any;
      to?: string[];
      from?: string[] | '*';
    }
  ): this {
    this.handlers.set(state, handlers);
    return this;
  }

  /**
   * Add a guard condition for a state transition
   */
  can(state: string, guard: (current: State<T>) => boolean): this {
    this.guards.set(state, guard);
    return this;
  }

  /**
   * Get metadata for a state
   */
  meta(state: string): any {
    return this.handlers.get(state)?.meta;
  }

  /**
   * Get valid transitions from current state
   */
  transitions(): string[] {
    const currentHandlers = this.handlers.get(this.current.value);
    if (!currentHandlers?.to) {
      // No 'to' constraint, check all states to see which allow 'from' current
      const valid: string[] = [];
      for (const [state, handlers] of this.handlers) {
        if (state === this.current.value) continue;
        
        const from = handlers.from;
        if (from === '*' || !from || from.includes(this.current.value)) {
          const guard = this.guards.get(state);
          if (!guard || guard(this.current)) {
            valid.push(state);
          }
        }
      }
      return valid;
    }

    // Filter 'to' list by 'from' constraints and guards
    return currentHandlers.to.filter(state => {
      const nextHandlers = this.handlers.get(state);
      const from = nextHandlers?.from;
      
      if (from && from !== '*' && !from.includes(this.current.value)) {
        return false;
      }
      
      const guard = this.guards.get(state);
      return !guard || guard(this.current);
    });
  }

  /**
   * Create a snapshot of current state
   */
  snapshot(): { state: string; context: T } {
    return {
      state: this.current.value,
      context: JSON.parse(JSON.stringify(this.current.context))
    };
  }

  /**
   * Restore from a snapshot
   */
  restore(snapshot: { state: string; context: T }): this {
    this.current = {
      value: snapshot.state,
      context: snapshot.context
    };
    this.notify();
    return this;
  }

  /**
   * Transition to a new state
   */
  async to(state: string, update?: Partial<T> | ((ctx: T) => T)): Promise<this> {
    // Check if transition is allowed based on 'to' constraint
    const currentHandlers = this.handlers.get(this.current.value);
    if (currentHandlers?.to && !currentHandlers.to.includes(state)) {
      this.notifyBlocked('to', state);
      return this; // Transition not allowed from current state
    }

    // Check if transition is allowed based on 'from' constraint
    const nextHandlers = this.handlers.get(state);
    const from = nextHandlers?.from;
    if (from && from !== '*' && !from.includes(this.current.value)) {
      this.notifyBlocked('from', state);
      return this; // Transition not allowed to target state from current
    }

    // Check guard
    const guard = this.guards.get(state);
    if (guard && !guard(this.current)) {
      this.notifyBlocked('guard', state);
      return this; // Guard failed, no transition
    }

    // Save to history
    this.stateHistory.push({ ...this.current });
    if (this.stateHistory.length > this.maxHistory) {
      this.stateHistory.shift();
    }

    const prev = this.handlers.get(this.current.value);
    if (prev?.exit) await prev.exit(this.current.context);

    const newContext = update
      ? typeof update === 'function'
        ? update(this.current.context)
        : { ...this.current.context, ...update }
      : this.current.context;

    const fromState = this.current.value;
    this.current = { value: state, context: newContext };

    const next = this.handlers.get(state);
    if (next?.enter) await next.enter(this.current.context);

    this.notifyTransition(fromState, state);
    return this;
  }

  /**
   * Go back to previous state
   */
  async back(): Promise<this> {
    const prev = this.stateHistory.pop();
    if (!prev) return this;

    const currentHandlers = this.handlers.get(this.current.value);
    if (currentHandlers?.exit) await currentHandlers.exit(this.current.context);

    const fromState = this.current.value;
    this.current = prev;

    const prevHandlers = this.handlers.get(prev.value);
    if (prevHandlers?.enter) await prevHandlers.enter(prev.context);

    this.notifyTransition(fromState, prev.value);
    return this;
  }

  /**
   * Update context without changing state
   */
  set(update: Partial<T> | ((ctx: T) => T)): this {
    this.current = {
      ...this.current,
      context: typeof update === 'function'
        ? update(this.current.context)
        : { ...this.current.context, ...update }
    };
    this.notify();
    return this;
  }

  /**
   * Check current state
   */
  is(state: string): boolean {
    return this.current.value === state;
  }

  /**
   * Subscribe to changes
   */
  on(listener: (event: StateEvent<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Step through state transitions manually
   */
  *steps(): Generator<State<T>, void, { to: string; update?: Partial<T> | ((ctx: T) => T) } | undefined> {
    while (true) {
      const input: { to: string; update?: Partial<T> | ((ctx: T) => T) } | undefined = yield this.current;
      
      if (!input) continue;

      this.to(input.to, input.update);
    }
  }

  /**
   * Run a sequence of transitions automatically
   */
  async run(
    sequence: Array<{
      to: string;
      update?: Partial<T> | ((ctx: T) => T);
      delay?: number;
    }>
  ): Promise<void> {
    for (const step of sequence) {
      if (step.delay && typeof setTimeout !== 'undefined') {
        await new Promise<void>(resolve => setTimeout(resolve, step.delay));
      }
      this.to(step.to, step.update);
    }
  }

  /**
   * Get current state
   */
  get state(): string {
    return this.current.value;
  }

  /**
   * Get current context
   */
  get context(): T {
    return this.current.context;
  }

  /**
   * Get state history
   */
  get history(): ReadonlyArray<State<T>> {
    return this.stateHistory;
  }

  /**
   * Clear state history
   */
  clearHistory(): this {
    this.stateHistory = [];
    return this;
  }

  private notifyTransition(from: string, to: string): void {
    const event: TransitionEvent<T> = {
      type: 'transition',
      from,
      to,
      state: this.current
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private notifyBlocked(reason: 'guard' | 'constraint' | 'from' | 'to', to: string): void {
    const event: TransitionEvent<T> = {
      type: 'transition',
      from: this.current.value,
      to,
      blocked: reason,
      state: this.current
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}

/**
 * Create a state machine
 */
export function machine<T = any>(initial: string, context?: T): Machine<T> {
  return new Machine(initial, context ?? ({} as T));
}
