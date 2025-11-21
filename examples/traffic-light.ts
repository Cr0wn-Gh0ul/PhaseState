import { machine } from '../src/phasestate';

const light = machine('red', { timer: 0 })
  .when('red', { 
    enter: () => console.log('STOP'),
    to: ['green'],
    meta: { duration: 5000, color: 'red' }
  })
  .when('green', { 
    enter: () => console.log('GO'),
    from: ['red'],
    to: ['yellow'],
    meta: { duration: 8000, color: 'green' }
  })
  .when('yellow', { 
    enter: () => console.log('SLOW DOWN'),
    from: ['green'],
    to: ['red'],
    meta: { duration: 2000, color: 'yellow' }
  });

async function manualControl() {
  console.log('\n--- Manual Control ---\n');
  
  await light.to('green');
  console.log('Valid transitions:', light.transitions());
  
  await light.to('yellow');
  await light.to('red');
}

async function automaticSequence() {
  console.log('\n--- Automatic Sequence ---\n');
  
  await light.run([
    { to: 'green', delay: 1000 },
    { to: 'yellow', delay: 1000 },
    { to: 'red', delay: 1000 }
  ]);
  
  console.log('Sequence complete');
}

async function generatorControl() {
  console.log('\n--- Generator Control ---\n');
  
  const cycle = light.steps();
  
  const states = ['green', 'yellow', 'red'];
  cycle.next(); // Initial state
  
  for (let i = 0; i < 3; i++) {
    const result = cycle.next({ to: states[i % states.length] });
    if (result.value) {
      console.log('Current:', result.value.value);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

async function autoCycle(times: number = 3) {
  console.log('\n--- Auto Cycle ---\n');
  
  const states = ['green', 'yellow', 'red'];
  
  for (let i = 0; i < times; i++) {
    for (const state of states) {
      const meta = light.meta(state);
      await new Promise(r => setTimeout(r, 500)); // Shortened for demo
      await light.to(state);
      console.log(`Cycle ${i + 1}: ${state.toUpperCase()}`);
    }
  }
}

async function demo() {
  await manualControl();
  await automaticSequence();
  await generatorControl();
  await autoCycle(2);
}

demo().catch(console.error);
