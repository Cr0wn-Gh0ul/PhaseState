import { machine } from '../src/phasestate';

type FetchContext = {
  data: any;
  error: string | null;
  retries: number;
};

const api = machine<FetchContext>('idle', { 
  data: null, 
  error: null, 
  retries: 0 
})
  .when('idle', {
    enter: () => console.log('Ready to fetch'),
    to: ['fetching']
  })
  .when('fetching', {
    enter: async (ctx) => {
      console.log(`Fetching... (attempt ${ctx.retries + 1})`);
      await new Promise(r => setTimeout(r, 500));
    },
    from: ['idle', 'error'],
    to: ['success', 'error'],
    meta: { timeout: 5000 }
  })
  .when('success', {
    enter: (ctx) => console.log('Data loaded:', ctx.data),
    from: ['fetching'],
    to: ['refreshing']
  })
  .when('error', {
    enter: (ctx) => console.log(`Error: ${ctx.error}`),
    from: '*',
    to: ['fetching', 'idle']
  })
  .when('refreshing', {
    enter: async () => {
      console.log('Refreshing...');
      await new Promise(r => setTimeout(r, 300));
    },
    from: ['success'],
    to: ['success', 'error']
  })
  .can('fetching', state => state.context.retries < 3);

// Simulate API call
async function fetchData(shouldFail = false): Promise<any> {
  await new Promise(r => setTimeout(r, 200));
  
  if (shouldFail) {
    throw new Error('Network error');
  }
  
  return { id: 1, name: 'Item 1', value: 42 };
}

async function fetchWithRetry() {
  console.log('\n--- Fetch with Auto-Retry ---\n');
  
  await api.to('fetching');
  
  let success = false;
  while (!success && api.context.retries < 3) {
    try {
      // Simulate occasional failures
      const shouldFail = Math.random() < 0.3;
      const data = await fetchData(shouldFail);
      
      await api.to('success', { data, retries: 0 });
      success = true;
    } catch (err: any) {
      const newRetries = api.context.retries + 1;
      await api.to('error', { 
        error: err.message,
        retries: newRetries
      });
      
      if (newRetries < 3) {
        console.log(`Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
        await api.to('fetching');
      } else {
        console.log('Max retries reached');
      }
    }
  }
}

async function snapshotRestore() {
  console.log('\n--- Snapshot/Restore ---\n');
  
  // Save state before risky operation
  const checkpoint = api.snapshot();
  console.log('Checkpoint saved at state:', checkpoint.state);
  
  await api.to('error', { error: 'Simulated error' });
  console.log('Current state:', api.state);
  
  // Rollback on failure
  api.restore(checkpoint);
  console.log('Restored to state:', api.state);
}

async function demo() {
  await fetchWithRetry();
  
  if (api.is('success')) {
    await snapshotRestore();
  }
  
  console.log('\n--- Final State ---');
  console.log('State:', api.state);
  console.log('Data:', api.context.data);
  console.log('History length:', api.history.length);
}

demo().catch(console.error);
