## Classes

<dl>
<dt><a href="#Machine">Machine</a></dt>
<dd><p>State machine</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#machine">machine()</a></dt>
<dd><p>Create a state machine</p>
</dd>
</dl>

<a name="Machine"></a>

## Machine
State machine

**Kind**: global class  

* [Machine](#Machine)
    * [.state](#Machine+state)
    * [.context](#Machine+context)
    * [.history](#Machine+history)
    * [.when()](#Machine+when)
    * [.can()](#Machine+can)
    * [.meta()](#Machine+meta)
    * [.transitions()](#Machine+transitions)
    * [.snapshot()](#Machine+snapshot)
    * [.restore()](#Machine+restore)
    * [.to()](#Machine+to)
    * [.back()](#Machine+back)
    * [.set()](#Machine+set)
    * [.is()](#Machine+is)
    * [.on()](#Machine+on)
    * [.steps()](#Machine+steps)
    * [.run()](#Machine+run)
    * [.clearHistory()](#Machine+clearHistory)

<a name="Machine+state"></a>

### machine.state
Get current state

**Kind**: instance property of [<code>Machine</code>](#Machine)  
<a name="Machine+context"></a>

### machine.context
Get current context

**Kind**: instance property of [<code>Machine</code>](#Machine)  
<a name="Machine+history"></a>

### machine.history
Get state history

**Kind**: instance property of [<code>Machine</code>](#Machine)  
<a name="Machine+when"></a>

### machine.when()
Define what happens in a state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+can"></a>

### machine.can()
Add a guard condition for a state transition

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+meta"></a>

### machine.meta()
Get metadata for a state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+transitions"></a>

### machine.transitions()
Get valid transitions from current state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+snapshot"></a>

### machine.snapshot()
Create a snapshot of current state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+restore"></a>

### machine.restore()
Restore from a snapshot

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+to"></a>

### machine.to()
Transition to a new state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+back"></a>

### machine.back()
Go back to previous state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+set"></a>

### machine.set()
Update context without changing state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+is"></a>

### machine.is()
Check current state

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+on"></a>

### machine.on()
Subscribe to changes

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+steps"></a>

### machine.steps()
Step through state transitions manually

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+run"></a>

### machine.run()
Run a sequence of transitions automatically

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="Machine+clearHistory"></a>

### machine.clearHistory()
Clear state history

**Kind**: instance method of [<code>Machine</code>](#Machine)  
<a name="machine"></a>

## machine()
Create a state machine

**Kind**: global function  
