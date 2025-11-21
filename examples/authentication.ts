import { machine } from '../src/phasestate';

type AuthContext = {
  user: string | null;
  token: string | null;
  attempts: number;
};

const auth = machine<AuthContext>('loggedOut', { 
  user: null, 
  token: null, 
  attempts: 0 
})
  .when('loggedOut', {
    enter: () => console.log('Please log in'),
    to: ['loggingIn']
  })
  .when('loggingIn', {
    enter: async (ctx) => {
      console.log('Authenticating...');
      await new Promise(r => setTimeout(r, 500));
    },
    from: ['loggedOut', 'sessionExpired'],
    to: ['loggedIn', 'loginFailed'],
    meta: { timeout: 5000 }
  })
  .when('loggedIn', {
    enter: (ctx) => console.log(`Welcome back, ${ctx.user}!`),
    from: ['loggingIn'],
    to: ['loggingOut', 'sessionExpired']
  })
  .when('loginFailed', {
    enter: (ctx) => console.log(`Login failed (${ctx.attempts}/3)`),
    from: ['loggingIn'],
    to: ['loggingIn', 'locked']
  })
  .when('locked', {
    enter: () => console.log('Account locked. Try again later.'),
    from: ['loginFailed']
  })
  .when('sessionExpired', {
    enter: () => console.log('Session expired'),
    from: ['loggedIn'],
    to: ['loggingIn']
  })
  .when('loggingOut', {
    enter: async () => {
      console.log('Logging out...');
      await new Promise(r => setTimeout(r, 200));
    },
    from: ['loggedIn'],
    to: ['loggedOut']
  })
  .can('loggingIn', state => state.context.attempts < 3);

// Usage with event listener
auth.on(event => {
  if ('type' in event && event.type === 'transition') {
    if (event.blocked === 'guard') {
      console.log('Too many login attempts!');
    }
  }
});

async function demo() {
  console.log('\n--- Authentication Flow Demo ---\n');
  
  // Successful login
  await auth.to('loggingIn');
  await auth.to('loggedIn', { user: 'Alice', token: 'abc123' });
  
  console.log('\nCurrent state:', auth.state);
  console.log('User:', auth.context.user);
  
  // Session expires
  await auth.to('sessionExpired');
  
  // Re-authenticate
  await auth.to('loggingIn');
  await auth.to('loggedIn', { user: 'Alice', token: 'xyz789' });
  
  // Logout
  await auth.to('loggingOut');
  await auth.to('loggedOut');
  
  console.log('\nFinal state:', auth.state);
}

demo().catch(console.error);
