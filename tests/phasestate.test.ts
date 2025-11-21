import { machine, Machine, State, TransitionEvent, StateEvent } from '../src/phasestate';

describe('PhaseState', () => {
  describe('machine creation', () => {
    it('should create a machine with initial state', () => {
      const m = machine('idle');
      expect(m.state).toBe('idle');
    });

    it('should create a machine with initial context', () => {
      const m = machine('idle', { count: 0 });
      expect(m.state).toBe('idle');
      expect(m.context).toEqual({ count: 0 });
    });

    it('should work with TypeScript generics', () => {
      type Context = { value: number };
      const m = machine<Context>('start', { value: 42 });
      expect(m.context.value).toBe(42);
    });
  });

  describe('.when() - state handlers', () => {
    it('should define state with enter handler', async () => {
      const enterSpy = jest.fn();
      const m = machine('idle').when('active', { enter: enterSpy });
      
      await m.to('active');
      expect(enterSpy).toHaveBeenCalledTimes(1);
    });

    it('should define state with exit handler', async () => {
      const exitSpy = jest.fn();
      const m = machine('idle').when('idle', { exit: exitSpy });
      
      await m.to('active');
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });

    it('should support async enter/exit handlers', async () => {
      const results: string[] = [];
      const m = machine('idle')
        .when('idle', {
          exit: async () => {
            await new Promise(r => setTimeout(r, 10));
            results.push('exit');
          }
        })
        .when('active', {
          enter: async () => {
            await new Promise(r => setTimeout(r, 10));
            results.push('enter');
          }
        });
      
      await m.to('active');
      expect(results).toEqual(['exit', 'enter']);
    });

    it('should store metadata', () => {
      const m = machine('idle').when('loading', { 
        meta: { timeout: 5000, cancellable: true }
      });
      
      expect(m.meta('loading')).toEqual({ timeout: 5000, cancellable: true });
    });

    it('should define allowed transitions with to', async () => {
      const m = machine('idle')
        .when('idle', { to: ['loading'] });
      
      await m.to('loading');
      expect(m.state).toBe('loading');
    });

    it('should define allowed transitions with from', async () => {
      const m = machine('idle')
        .when('idle', { to: ['loading', 'cancelled'] })
        .when('loading', { from: ['idle'], to: ['success'] });
      
      await m.to('loading');
      expect(m.state).toBe('loading');
      
      // Try to go back to loading from success (not allowed)
      await m.to('success');
      await m.to('loading');
      expect(m.state).toBe('success'); // Blocked
    });

    it('should allow from: "*" to accept any state', async () => {
      const m = machine('idle')
        .when('idle', { to: ['loading', 'error'] })
        .when('loading', { to: ['success', 'error'] })
        .when('success', { from: ['loading'] })
        .when('error', { from: '*' });
      
      await m.to('loading');
      await m.to('error');
      expect(m.state).toBe('error');
      
      await m.to('idle');
      expect(m.state).toBe('idle');
      
      await m.to('error');
      expect(m.state).toBe('error');
    });
  });

  describe('.to() - transitions', () => {
    it('should transition to new state', async () => {
      const m = machine('idle');
      await m.to('loading');
      expect(m.state).toBe('loading');
    });

    it('should update context with partial update', async () => {
      const m = machine('idle', { count: 0, name: 'test' });
      await m.to('active', { count: 5 });
      
      expect(m.context).toEqual({ count: 5, name: 'test' });
    });

    it('should update context with function', async () => {
      const m = machine('idle', { count: 0 });
      await m.to('active', ctx => ({ count: ctx.count + 10 }));
      
      expect(m.context.count).toBe(10);
    });

    it('should return this for chaining', async () => {
      const m = machine('idle');
      const result = await m.to('loading');
      expect(result).toBe(m);
    });

    it('should save to history', async () => {
      const m = machine('idle', { count: 0 });
      await m.to('loading', { count: 1 });
      await m.to('success', { count: 2 });
      
      expect(m.history.length).toBe(2);
      expect(m.history[0]).toEqual({ value: 'idle', context: { count: 0 } });
      expect(m.history[1]).toEqual({ value: 'loading', context: { count: 1 } });
    });

    it('should limit history to 10 items', async () => {
      const m = machine('s0');
      
      for (let i = 1; i <= 15; i++) {
        await m.to(`s${i}`);
      }
      
      expect(m.history.length).toBe(10);
      expect(m.history[0].value).toBe('s5'); // First 5 dropped
    });
  });

  describe('.can() - guards', () => {
    it('should block transition when guard fails', async () => {
      const m = machine('idle', { count: 0 })
        .can('loading', state => state.context.count > 0);
      
      await m.to('loading');
      expect(m.state).toBe('idle'); // Blocked
      
      m.set({ count: 5 });
      await m.to('loading');
      expect(m.state).toBe('loading'); // Allowed
    });

    it('should work with state value guards', async () => {
      const m = machine('idle')
        .can('error', state => state.value !== 'success');
      
      await m.to('error');
      expect(m.state).toBe('error');
      
      await m.to('success');
      await m.to('error');
      expect(m.state).toBe('success'); // Guard blocked
    });
  });

  describe('.back() - undo', () => {
    it('should return to previous state', async () => {
      const m = machine('idle', { count: 0 });
      await m.to('loading', { count: 1 });
      await m.to('success', { count: 2 });
      
      await m.back();
      expect(m.state).toBe('loading');
      expect(m.context.count).toBe(1);
    });

    it('should call exit/enter handlers', async () => {
      const handlers: string[] = [];
      const m = machine('idle')
        .when('idle', { enter: () => { handlers.push('idle:enter'); } })
        .when('loading', { 
          enter: () => { handlers.push('loading:enter'); },
          exit: () => { handlers.push('loading:exit'); }
        });
      
      await m.to('loading');
      handlers.length = 0; // Clear
      
      await m.back();
      expect(handlers).toEqual(['loading:exit', 'idle:enter']);
    });

    it('should do nothing if no history', async () => {
      const m = machine('idle');
      await m.back();
      expect(m.state).toBe('idle');
    });
  });

  describe('.set() - context updates', () => {
    it('should update context with partial', () => {
      const m = machine('idle', { count: 0, name: 'test' });
      m.set({ count: 5 });
      
      expect(m.context).toEqual({ count: 5, name: 'test' });
    });

    it('should update context with function', () => {
      const m = machine('idle', { count: 0 });
      m.set(ctx => ({ count: ctx.count + 1 }));
      
      expect(m.context.count).toBe(1);
    });

    it('should notify listeners', () => {
      const listener = jest.fn();
      const m = machine('idle', { count: 0 });
      m.on(listener);
      
      m.set({ count: 5 });
      expect(listener).toHaveBeenCalledWith({ value: 'idle', context: { count: 5 } });
    });
  });

  describe('.is() - state check', () => {
    it('should return true for current state', () => {
      const m = machine('idle');
      expect(m.is('idle')).toBe(true);
      expect(m.is('loading')).toBe(false);
    });
  });

  describe('.on() - listeners', () => {
    it('should notify on state change', async () => {
      const listener = jest.fn();
      const m = machine('idle');
      m.on(listener);
      
      await m.to('loading');
      
      expect(listener).toHaveBeenCalledWith({
        type: 'transition',
        from: 'idle',
        to: 'loading',
        state: { value: 'loading', context: {} }
      });
    });

    it('should notify on blocked transition', async () => {
      const listener = jest.fn();
      const m = machine('idle')
        .when('idle', { to: ['loading'] });
      
      m.on(listener);
      await m.to('error'); // Blocked by 'to' constraint
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transition',
          from: 'idle',
          to: 'error',
          blocked: 'to'
        })
      );
    });

    it('should notify guard blocks', async () => {
      const listener = jest.fn();
      const m = machine('idle', { ready: false })
        .can('loading', s => s.context.ready);
      
      m.on(listener);
      await m.to('loading');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          blocked: 'guard'
        })
      );
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const m = machine('idle');
      const unsubscribe = m.on(listener);
      
      unsubscribe();
      m.set({ test: true });
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('.transitions() - valid transitions', () => {
    it('should return states from "to" constraint', () => {
      const m = machine('idle')
        .when('idle', { to: ['loading', 'cancelled'] });
      
      expect(m.transitions()).toEqual(['loading', 'cancelled']);
    });

    it('should filter by "from" constraints', () => {
      const m = machine('idle')
        .when('idle', { to: ['loading', 'error'] })
        .when('loading', { from: ['idle'] })
        .when('error', { from: ['loading'] });
      
      expect(m.transitions()).toEqual(['loading']); // error blocked
    });

    it('should filter by guards', () => {
      const m = machine('idle', { ready: false })
        .when('idle', { to: ['loading', 'cancelled'] })
        .can('loading', s => s.context.ready);
      
      expect(m.transitions()).toEqual(['cancelled']);
      
      m.set({ ready: true });
      expect(m.transitions()).toEqual(['loading', 'cancelled']);
    });

    it('should respect from: "*"', () => {
      const m = machine('idle')
        .when('idle', { to: ['loading', 'error'] })
        .when('loading', { from: ['idle'] })
        .when('error', { from: '*' });
      
      expect(m.transitions()).toEqual(['loading', 'error']);
    });

    it('should find all valid when no "to" constraint', () => {
      const m = machine('idle')
        .when('loading', { from: ['idle'] })
        .when('success', { from: ['loading'] })
        .when('error', { from: '*' });
      
      expect(m.transitions()).toEqual(['loading', 'error']);
    });
  });

  describe('.snapshot() and .restore()', () => {
    it('should create snapshot', () => {
      const m = machine('loading', { count: 42, data: 'test' });
      const snap = m.snapshot();
      
      expect(snap).toEqual({
        state: 'loading',
        context: { count: 42, data: 'test' }
      });
    });

    it('should deep copy context', () => {
      const m = machine('idle', { nested: { value: 1 } });
      const snap = m.snapshot();
      
      m.set({ nested: { value: 2 } });
      
      expect(snap.context.nested.value).toBe(1);
    });

    it('should restore state and context', async () => {
      const m = machine('idle', { count: 0 });
      await m.to('loading', { count: 5 });
      
      const snap = m.snapshot();
      
      await m.to('success', { count: 10 });
      m.restore(snap);
      
      expect(m.state).toBe('loading');
      expect(m.context.count).toBe(5);
    });

    it('should notify on restore', () => {
      const listener = jest.fn();
      const m = machine('idle', { count: 0 });
      const snap = m.snapshot();
      
      m.on(listener);
      m.restore(snap);
      
      expect(listener).toHaveBeenCalledWith({ value: 'idle', context: { count: 0 } });
    });
  });

  describe('.history and .clearHistory()', () => {
    it('should expose readonly history', async () => {
      const m = machine('idle');
      await m.to('loading');
      
      expect(m.history).toHaveLength(1);
      expect(m.history[0].value).toBe('idle');
    });

    it('should clear history', async () => {
      const m = machine('idle');
      await m.to('loading');
      await m.to('success');
      
      m.clearHistory();
      expect(m.history).toHaveLength(0);
    });
  });

  describe('.steps() - generator', () => {
    it('should yield current state', () => {
      const m = machine('idle', { count: 0 });
      const gen = m.steps();
      
      const result = gen.next();
      expect(result.value).toEqual({ value: 'idle', context: { count: 0 } });
      expect(result.done).toBe(false);
    });

    it('should transition on next() with input', () => {
      const m = machine('idle', { count: 0 });
      const gen = m.steps();
      
      gen.next();
      gen.next({ to: 'loading', update: { count: 5 } });
      
      expect(m.state).toBe('loading');
      expect(m.context.count).toBe(5);
    });

    it('should continue indefinitely', () => {
      const m = machine('idle');
      const gen = m.steps();
      
      for (let i = 0; i < 100; i++) {
        const result = gen.next({ to: `state${i}` });
        expect(result.done).toBe(false);
      }
    });
  });

  describe('.run() - automatic sequence', () => {
    it('should run sequence of transitions', async () => {
      const m = machine('idle', { count: 0 });
      
      await m.run([
        { to: 'loading' },
        { to: 'success', update: { count: 5 } },
        { to: 'done' }
      ]);
      
      expect(m.state).toBe('done');
      expect(m.context.count).toBe(5);
    });

    it('should support delays', async () => {
      const m = machine('idle');
      const start = Date.now();
      
      await m.run([
        { to: 'loading', delay: 50 },
        { to: 'success', delay: 50 }
      ]);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(98); // Allow small timing variance
    });

    it('should support function updates', async () => {
      const m = machine('idle', { count: 0 });
      
      await m.run([
        { to: 'step1', update: ctx => ({ count: ctx.count + 1 }) },
        { to: 'step2', update: ctx => ({ count: ctx.count + 1 }) }
      ]);
      
      expect(m.context.count).toBe(2);
    });
  });

  describe('integration - complex workflow', () => {
    it('should handle authentication flow', async () => {
      const events: string[] = [];
      
      type AuthContext = { user: string | null; attempts: number };
      
      const auth = machine<AuthContext>('loggedOut', { user: null, attempts: 0 })
        .when('loggedOut', { 
          enter: () => { events.push('logged-out'); },
          to: ['loggingIn']
        })
        .when('loggingIn', {
          enter: () => { events.push('logging-in'); },
          from: ['loggedOut', 'failed'],
          to: ['loggedIn', 'failed']
        })
        .when('loggedIn', {
          enter: () => { events.push('logged-in'); },
          from: ['loggingIn'],
          to: ['loggingOut']
        })
        .when('failed', {
          enter: () => { events.push('failed'); },
          from: ['loggingIn'],
          to: ['loggingIn', 'locked']
        })
        .when('locked', {
          enter: () => { events.push('locked'); },
          from: ['failed']
        })
        .can('loggingIn', s => s.context.attempts < 3);
      
      await auth.to('loggingIn');
      await auth.to('failed', { attempts: 1 });
      await auth.to('loggingIn');
      await auth.to('loggedIn', { user: 'Alice' });
      
      expect(events).toEqual([
        'logging-in',
        'failed',
        'logging-in',
        'logged-in'
      ]);
      expect(auth.context.user).toBe('Alice');
    });

    it('should handle snapshot/restore workflow', async () => {
      const m = machine('editing', { text: '', saved: false })
        .when('editing', { to: ['saving'] })
        .when('saving', { 
          enter: async () => {
            await new Promise(r => setTimeout(r, 10));
          },
          to: ['editing', 'error']
        })
        .when('error', { from: '*', to: ['editing'] });
      
      m.set({ text: 'Hello' });
      const checkpoint = m.snapshot();
      
      await m.to('saving');
      await m.to('error');
      
      m.restore(checkpoint);
      expect(m.state).toBe('editing');
      expect(m.context.text).toBe('Hello');
    });
  });
});
