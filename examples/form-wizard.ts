import { machine } from '../src/phasestate';

type FormContext = {
  step: number;
  email: string;
  password: string;
  name: string;
  errors: string[];
  isValid: boolean;
};

const form = machine<FormContext>('step1', { 
  step: 1,
  email: '',
  password: '',
  name: '',
  errors: [],
  isValid: false
})
  .when('step1', {
    enter: () => console.log('Step 1: Enter email'),
    to: ['validatingStep1']
  })
  .when('validatingStep1', {
    enter: (ctx) => {
      const errors: string[] = [];
      if (!ctx.email.includes('@')) {
        errors.push('Invalid email');
      }
    },
    from: ['step1'],
    to: ['step1', 'step2']
  })
  .when('step2', {
    enter: () => console.log('Step 2: Set password'),
    from: ['validatingStep1', 'step3'],
    to: ['validatingStep2', 'step1']
  })
  .when('validatingStep2', {
    enter: (ctx) => {
      const errors: string[] = [];
      if (ctx.password.length < 8) {
        errors.push('Password too short');
      }
    },
    from: ['step2'],
    to: ['step2', 'step3']
  })
  .when('step3', {
    enter: () => console.log('Step 3: Enter name'),
    from: ['validatingStep2'],
    to: ['validatingStep3', 'step2']
  })
  .when('validatingStep3', {
    from: ['step3'],
    to: ['step3', 'submitting']
  })
  .when('submitting', {
    enter: async () => {
      console.log('Submitting form...');
      await new Promise(r => setTimeout(r, 500));
    },
    from: ['validatingStep3'],
    to: ['success', 'error']
  })
  .when('success', {
    enter: () => console.log('Registration complete!'),
    from: ['submitting']
  })
  .when('error', {
    enter: (ctx) => console.log('Errors:', ctx.errors),
    from: '*',
    to: ['step1']
  })
  .can('validatingStep1', s => s.context.email.includes('@'))
  .can('validatingStep2', s => s.context.password.length >= 8)
  .can('submitting', s => s.context.isValid);

// Track all transitions
form.on(event => {
  if ('type' in event && event.type === 'transition') {
    if (event.blocked) {
      console.log(`  Validation failed: ${event.blocked}`);
    }
  }
});

async function fillForm() {
  console.log('\n--- Form Wizard Demo ---\n');
  
  // Step 1: Email
  console.log('\nEntering email...');
  form.set({ email: 'user@example.com' });
  await form.to('validatingStep1');
  
  if (form.transitions().includes('step2')) {
    await form.to('step2');
    
    // Step 2: Password
    console.log('\nEntering password...');
    form.set({ password: 'securepass123' });
    await form.to('validatingStep2');
    await form.to('step3');
    
    // Step 3: Name
    console.log('\nEntering name...');
    form.set({ name: 'John Doe', isValid: true });
    await form.to('validatingStep3');
    
    // Submit
    console.log('\nSubmitting...');
    await form.to('submitting');
    await form.to('success');
  }
  
  console.log('\n--- Form Complete ---');
  console.log('Final state:', form.state);
  console.log('User data:', {
    email: form.context.email,
    name: form.context.name
  });
}

async function demonstrateValidation() {
  console.log('\n--- Validation Demo ---\n');
  
  // Reset form
  const freshForm = machine<FormContext>('step1', { 
    step: 1, email: '', password: '', name: '', errors: [], isValid: false 
  })
    .when('step1', { to: ['validatingStep1'] })
    .when('validatingStep1', { from: ['step1'], to: ['step1', 'step2'] })
    .can('validatingStep1', s => s.context.email.includes('@'));
  
  // Try invalid email
  freshForm.set({ email: 'invalid-email' });
  console.log('Trying invalid email:', freshForm.context.email);
  console.log('Can proceed?', freshForm.transitions().includes('validatingStep1'));
  
  // Fix email
  freshForm.set({ email: 'valid@email.com' });
  console.log('Trying valid email:', freshForm.context.email);
  console.log('Can proceed?', freshForm.transitions().includes('validatingStep1'));
}

async function demo() {
  await fillForm();
  await demonstrateValidation();
}

demo().catch(console.error);
