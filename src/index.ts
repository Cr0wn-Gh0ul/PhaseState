/**
 * PhaseState - A minimal finite state machine library for TypeScript
 * 
 * @example
 * ```typescript
 * import { machine } from 'phasestate';
 * 
 * const m = machine("idle", { count: 0 })
 *   .when("idle", { 
 *     enter: () => console.log("Ready") 
 *   })
 *   .when("loading", { 
 *     enter: () => console.log("Loading...") 
 *   })
 *   .when("done", { 
 *     enter: ctx => console.log("Count:", ctx.count) 
 *   });
 * 
 * // Direct control
 * m.to("loading");
 * m.to("done", { count: 42 });
 * 
 * // Step-by-step
 * const steps = m.steps();
 * steps.next(); // initial state
 * steps.next({ to: "loading" });
 * steps.next({ to: "done", update: { count: 42 } });
 * 
 * // Automatic sequence
 * await m.run([
 *   { to: "loading" },
 *   { to: "done", delay: 1000, update: { count: 42 } }
 * ]);
 * ```
 */

export { machine, Machine, State, TransitionEvent, StateEvent } from './phasestate';
