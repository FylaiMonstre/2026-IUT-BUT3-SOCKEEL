# Guided review — `td/Product.ts`

This is a student worksheet. `Product.ts` contains 25 deliberate code smells.
They are listed here **from the simplest to the most complex**, so that you
build confidence on quick wins before tackling the refactorings that need real
design thinking. Smell #1 (the God class) is the overall goal of the exercise
and comes last: most of the others are stepping stones toward it.

Each entry gives you:

- **The smell** — what it is, in general (not specific to this file).
- **How to detect it** — the questions to ask, the tools to run, the patterns
  to grep for.
- **Hint** — where to look in `Product.ts`. Not the answer.
- **Expected from you** — what a correct fix should achieve, and how you will
  prove it (tests, compiler, review).

Rules of the game:

- `npm run build` (`tsc --noEmit`) must stay green after every fix.
- `npm test` must not get *worse*. Some tests fail on purpose today (see the
  last section); part of the job is to make them pass.
- Do **not** add assertions on Prisma calls or persisted state — tests stay
  in-memory.
- Commit after each smell, with a message naming the smell you fixed.

---

## Tier 1 — Quick wins (naming, syntax, local scope)

These can each be fixed in minutes. They train your eye before the harder ones.

### 11. Cryptic abbreviations

**The smell.** Identifiers shortened until a reader has to *guess* what they
mean. Abbreviations save keystrokes once and cost a mental lookup on every
read, forever. The tell-tale sign is inconsistency: some names spelled out,
others compressed, with no rule you can learn.

**How to detect it.** Read a class's fields out loud. If you hesitate on any
of them, or if two abbreviations could plausibly expand to the same word,
you've found it. Also compare naming across layers: are type names, field
names, and parameter names following the same convention?

**Hint.** Compare the class names in this file to their fields. Then open
`Product.test.ts` and read the *first* `describe` blocks: they are written
against the names the code *should* use, and they fail today with a message
telling you exactly which name is expected. Use them as your checklist.

**Expected from you.** A rename pass with no behavior change. The
naming-discovery tests at the top of `Product.test.ts` go green. Do this
first — every other smell becomes easier to read once names are honest.

---

### 12. Unused variable

**The smell.** A binding that is declared (or destructured) and never read.
Dead names lie: they suggest something is being used when nothing is.

**How to detect it.** The compiler *can* catch this — but only if it is asked
to. Open `tsconfig.json` and look at which strictness flags are on and which
are missing. Then read every `for` loop and every destructuring pattern in
the file and ask, for each bound name, "where is this read?"

**Hint.** Two methods in `Product` iterate over the same `Map` in the same
way. One of them binds a name it never uses; the other doesn't. Spot the
inconsistency between them.

**Expected from you.** Remove the dead binding. Bonus: turn on the compiler
flag that would have caught it, and see what else it flags (some of it is
another smell on this list).

---

### 9. A comment that describes the past, not the code

**The smell.** A comment that explains why the code *used* to be a certain
way, or claims a problem is solved, while the code underneath still has the
same shape of problem. Comments rot faster than code.

**How to detect it.** Read the file-level comment first, then read the code
as if the comment did not exist. Does the code actually deliver what the
comment promises? Look especially for claims like "gone", "removed", "no
longer needed".

**Hint.** The header comment talks about keeping two representations in sync
by hand. Look at `Price` and at every place `Product` touches a `Price` field
and then persists it. Is there still "discipline instead of enforcement"
going on?

**Expected from you.** Either make the comment true (by fixing the code) or
make the comment honest (by rewriting it). Don't leave a comment that
misleads the next reader.

---

### 8. Magic numbers

**The smell.** A literal number in the code whose meaning is not obvious from
context — and whose *reason* is not recorded anywhere. Why 20 and not 25? Who
decided? Can it change?

**How to detect it.** Grep for numeric literals other than `0`, `1`, `100`.
For each hit, ask: "if the business changes this, how many places do I
edit, and how do I find them?"

**Hint.** Look at a constructor that assigns defaults to two percentage
fields.

**Expected from you.** Give each number a name and a home. Then write one
test that would break if someone changed the default silently.

---

### 23. Unused parameter

**The smell.** A parameter that appears in a method's signature but is never
read in its body. Worse than an unused local, because it is part of the
public contract: every caller has to supply a value that does nothing, and
the name *promises* a behavior the method does not deliver.

**How to detect it.** For every method, list the parameters, then grep each
one inside the body. Ask: "if I passed the opposite value, would anything
change?" Also check `tsconfig.json` — there is a flag for this too.

**Hint.** One method in the "catalog" section has a boolean parameter whose
name suggests it controls whether existing data is replaced. Read the body
and decide whether it does.

**Expected from you.** Either make the parameter do what its name says (and
test both values), or remove it and update the callers. Decide which — and
be able to justify your choice in review.

---

### 13. Non-null assertion hiding a real `null`

**The smell.** The `!` operator tells the compiler "trust me, this is never
null". When the type says `T | null` and nothing upstream guarantees a value,
`!` isn't a proof — it's a way to make the error message go away. The crash
still happens, just at runtime, with a useless message.

**How to detect it.** Grep for `!.` and `!)` and `!;`. For each hit, trace
where the value comes from and ask: "what actually prevents this from being
null here?" If the answer is "nothing", it's a smell. Compare with places
in the same file that handle the null case honestly with a check and a
thrown error.

**Hint.** One field is declared as nullable in the constructor. One method
reads a property off it without checking. Another method in the same file
shows the honest way to handle a missing collaborator.

**Expected from you.** Handle the null case explicitly with a
domain-meaningful outcome. Write a test that constructs a `Product` with
that field `null` and calls the method.

---

### 14. Type widening + `as` cast

**The smell.** A cast (`as SomeType`) is a promise to the compiler that you
know better. When the cast exists only because a variable was declared in a
way that lost its precise type, the cast silences a *real* error and defeats
the union type it targets: a typo in the string would now sail through.

**How to detect it.** Grep for ` as `. For each cast, ask: "why doesn't this
type-check without it?" Then try removing the cast and read the compiler
error carefully — it usually names the root cause. Pay attention to `let` vs
`const` and to how TypeScript infers the type of a string literal.

**Hint.** One method assigns a status in two steps where a sibling method
assigns it in one. Compare them. Then delete the cast and read what `tsc`
tells you.

**Expected from you.** No cast, and the union type actually protects you.
Prove it: introduce a typo in the status string and confirm the build fails.

---

## Tier 2 — Method-level restructuring

Each of these lives inside a single method. You will reshape logic without
changing what it does — so write or run the behavior tests *first*.

### 19. Nested `if/else` pyramid instead of guard clauses

**The smell.** Indentation that drifts to the right. A method that could say
"if X, we're done; if Y, we're done; otherwise…" instead wraps the whole body
in `if { … } else { if { … } else { … } }`. Extra depth hides the simple
structure, and sometimes hides a branch that does nothing at all.

**How to detect it.** Look for methods where the deepest line is indented
four or more levels. Count the distinct outcomes; if there are three
outcomes and five branches, some branches are redundant. Look specifically
for an `if/else` whose two arms are identical.

**Hint.** Start with the shortest method in `Product` that computes a
display string. Count outcomes versus branches.

**Expected from you.** A flat method with early returns and no tautological
branch. `getDisplayLabel()`'s behavior tests must still pass unchanged.

---

### 20. Arrow-code with redundant guards

**The smell.** Same shape as #19, but with an extra twist: several of the
conditions are *always true* given the types, and the real business rule is
split across two conditions layered on top of each other. If any of the
"always true" checks were ever false, the method would silently do nothing —
no error, no result.

**How to detect it.** For each `if` in the pyramid, ask: "given the declared
types, can this ever be false?" Then ask: "if it were false, what happens?"
Silent no-ops are the worst possible answer. Also ask whether the two
numeric checks could be one.

**Hint.** The discount-adding method. Contrast its shape with the guard-clause
style used in the stock-selling and supplier-assignment methods of the same
class.

**Expected from you.** Guard clauses at the top, one check per rule, loud
failure on violation. The existing tests for "third discount" and "past
date" must still pass. (You'll come back to this method for #15, #21, #22 —
consider fixing them together.)

---

### 16. Getters and setters that encapsulate nothing

**The smell.** `getX()`/`setX()` pairs on a class whose fields are already
public. They add ceremony without adding protection: no validation, no
computed value, no hidden representation. And if the rest of the code
bypasses them, you now have two ways to do the same mutation.

**How to detect it.** For each getter/setter, ask three questions: Is the
field private? Does the setter validate anything? Does anyone actually call
these? Three "no"s is a smell. Grep the call sites.

**Hint.** One small value-object class near the top of the file. Then look
at how `Product` modifies that object's margin — through the setter, or
around it?

**Expected from you.** Pick a side: either the fields are private and the
accessors *do* something (validate, at minimum), or the accessors go away.
Whatever you choose, there must be exactly one way to mutate each field.

---

### 21. A test that fails sometimes

**The smell.** A flaky test: same code, same inputs, different result on
different runs. The usual culprit is a dependency on something the test
doesn't control — the system clock, the network, random values, timing.
Flaky tests are worse than no tests: people learn to ignore red.

**How to detect it.** Run the suite ten times in a row and watch the
numbers. When you've found the test that flips, resist the urge to "fix the
test". Ask instead: *what does the code under test read that the test does
not control?* Then read the method under test very carefully, including any
"harmless" preparatory work it does before the real check.

**Hint.** The flipping test is in the `addDiscount()` block. The test itself
is short and innocent-looking — the cause is not in the test file. Time how
long the method takes to run.

**Expected from you.** Two things: remove the cause from the production
code, and make the test deterministic by controlling the clock (Vitest has
tools for this). The test must then pass 20/20 runs. Explain in your commit
message what was actually racing what.

---

### 22. Locals promoted to fields

**The smell.** A value that only matters for the duration of one method call
is stored on the object instead of in a local variable. It now looks like
state, survives between calls holding stale data, and has to be typed
`| undefined` because there's no sensible initial value — which is itself a
clue that it was never state.

**How to detect it.** For each field, ask: "is this read by more than one
method? Does it mean anything between calls?" Fields typed `| undefined`
with no initializer deserve extra suspicion. Grep each such field's name and
count the methods that touch it.

**Hint.** Two fields at the bottom of `Product`'s field list. Each is written
and read inside a single method, a few lines apart.

**Expected from you.** Demote them. The class's field list should only
contain things that describe a `Product`.

---

### 7. Generic `Error` for domain violations

**The smell.** `throw new Error("some message")` for a business rule. The
caller can only distinguish "not enough stock" from "database exploded" by
string-matching the message — brittle, untyped, and invisible in signatures.

**How to detect it.** Grep for `throw new Error`. For each one, ask: "is this
a bug, or a rule?" Rules deserve their own error type so callers can
`catch` them specifically and so the message can change without breaking
anyone.

**Hint.** Several throws in this file express business rules. Group them by
what kind of rule they enforce before deciding how many error classes you
need.

**Expected from you.** Domain error classes, and tests that assert on the
error *type*, not just the message text. Keep the messages — they're still
useful for humans.

---

## Tier 3 — Duplication and tangled branching

These span more than one method, or one method that has grown too many
concerns. You'll extract things.

### 3. Duplicated code

**The smell.** The same block of logic appears in two places with a small
variation. Every bug now has to be fixed twice, and the two copies will
drift.

**How to detect it.** Read the two lifecycle methods (`sell`, `deprecate`)
side by side. Highlight what is identical and what differs. If the
difference is just data (two strings), the structure should be shared.

**Hint.** Look at how each of those methods informs the regional suppliers.
Note that a helper already exists to build a single notification — the
duplication is one level up from that.

**Expected from you.** One place that knows how to "tell all suppliers X".
Notification-count tests in `Product.test.ts` must still pass.

---

### 15. Floating promise

**The smell.** An `async` call whose returned promise is neither awaited nor
handled. The method returns before the work is done; if the work fails,
nobody catches it. The compiler does not complain — this is a lint rule, not
a type rule.

**How to detect it.** For every `async` method, check that each call to
another `async` function is `await`ed (or explicitly returned / handled).
Compare siblings: if six methods do it one way and one does it differently,
look at the odd one out. Consider adding ESLint with
`@typescript-eslint/no-floating-promises` to catch this class of bug
mechanically.

**Hint.** All mutators in `Product` persist through Prisma. One of them
doesn't wait for the answer.

**Expected from you.** The fix is tiny. The real deliverable is the
explanation: in your commit message, describe what a caller would observe
before and after, and why the test suite didn't catch it.

---

### 24. Everything wrong with `addImage()` at once

**The smell.** A single method that violates several rules simultaneously:
deep nesting with no early exits, ad hoc string validation instead of a real
check, a loop that silently lets the *last* match win, two different error
paths that throw the same misleading message, and negated conditions where a
positive one would read better.

**How to detect it.** Read `addImage()` top to bottom and, for each line,
name the clean-code rule it bends. You should find at least five distinct
ones. Then look at the tests for it: all green — does that mean the method
is good? What input would surprise the author?

**Hint.** Try calling it with an empty URL and read the error. Try
`"HTTP://..."` in capitals. Try two qualifying suppliers and see which name
you get.

**Expected from you.** A flat method with guard clauses at the top, real
validation (the platform has a `URL` class; email needs at least a regex),
an explicit decision about what happens with multiple suppliers, and honest
error messages. All nine existing tests still pass, plus one new test for
the multi-supplier case that documents the behavior you chose.

---

### 25. Fallbacks that each do *something* — inconsistently

**The smell.** Every `else` branch has behavior, so nothing looks empty — but
the behaviors don't follow a policy. One incomplete record throws; a
differently incomplete record silently degrades; a third reaches into an
unrelated object for a substitute value. A reader can't predict what the
method will do without re-reading every branch.

**How to detect it.** List each fallback branch and write, in one column,
"what condition" and in another, "what happens". If the second column mixes
"throw" and "quietly substitute" for conditions of the same kind, there's no
policy — just accidents.

**Hint.** Same method as #24, the supplier-matching loop. Note which branch
reads a field that has nothing to do with suppliers.

**Expected from you.** A stated policy (in a comment or in the method name),
applied consistently. Tests for each branch must reflect the policy, not the
accident.

---

### 18. Re-implementing a collaborator's formula

**The smell.** Class A computes something by reaching into class B's fields
and applying B's own formula inline — when B already has a method that does
exactly that. Now the formula lives twice and will diverge.

**How to detect it.** When you see arithmetic on `this.x.a`, `this.x.b`,
`this.x.c`, look at class `X` and check whether it already knows how to do
this. Grep for methods with the *same name* in two classes.

**Hint.** Two methods in this file share a name. One calls the other? Check.

**Expected from you.** One formula, one owner. A test on each class that
proves they agree.

---

## Tier 4 — Design and data-flow

Here you will add methods to *other* classes and rethink how data moves.

### 17. "Tell, don't ask" — reaching into collaborators

**The smell.** A method pulls raw fields out of another object and makes
decisions with them, instead of asking that object to do the work (or to
expose the *derived* value). The object with the data should own the
behavior. Symptom: chains like `this.a.b.c`, or `other.field` used to build
something `other` could have built itself.

**How to detect it.** For every `this.<collaborator>.<field>` read in
`Product`, ask: "could `<collaborator>` answer a question instead of handing
over a field?" Count how many different collaborators `Product` reaches
into. Also check whether `Product` bypasses an existing method on the
collaborator (see #16).

**Hint.** At least four places, involving three different collaborator
classes. One of them is also #13. One of them is also #18.

**Expected from you.** New methods on `Supplier`, `Warehouse`, `Price` that
express intent (what to notify, how to describe yourself, what you cost).
`Product` should stop knowing collaborator field names.

---

### 10. In-memory `Map` vs. a relational join table

**The smell.** A field that is persisted through a join table, but held in
memory as a plain `Map` with no loading code in sight. Every read after
construction is only correct if *someone else* populated it correctly —
and nothing here shows who.

**How to detect it.** Follow one field from construction to persistence.
Where does it get filled when a `Product` comes *from* the database? If you
can't find that code, the field is a trap.

**Hint.** Compare the supplier-assignment method's Prisma call with the
other mutators' Prisma calls. Different table. Now find where that table is
*read*.

**Expected from you.** A clear ownership story: either a loader that
hydrates the field, or a different representation that can't be stale. Write
down the invariant you're enforcing.

---

### 4. Primitive obsession — status as a bare string

**The smell.** A concept with rules (a lifecycle with allowed transitions)
represented as a string union. Union types stop typos but say nothing about
*sequence*: nothing prevents going from "deprecated" back to "active", or
selling a deprecated product.

**How to detect it.** List the states. Draw the allowed transitions as
arrows. Then grep every assignment to the status field and every method
that should care about status but doesn't check it. Try writing a test that
does something illegal — does the code stop you?

**Hint.** Write a test that `deprecate()`s a product and then `sell()`s one
unit. What happens? What *should* happen?

**Expected from you.** A place where transitions are defined once and
enforced. Tests for each illegal transition.

---

## Tier 5 — Architecture

These are the reason the exercise exists. Expect to create new files.

### 5. In-memory state and the database disagree on failure

**The smell.** Mutate the object, then persist. If persisting throws, the
object is already lying: stock was "sold" in memory, but not in the
database. No rollback, no transaction, no policy.

**How to detect it.** For each mutator, write down the order of operations:
which line changes memory, which line hits the DB, what happens if the
second throws. Then decide what the caller should be able to assume after
`await product.sell(1)` — and check whether the code delivers it.

**Hint.** Every mutator in `Product` has this shape. Pick `sell()` and trace
it.

**Expected from you.** A stated consistency policy and code that honors it.
A test that simulates a failing write (this is the one place where mocking
Prisma to *throw* is fair game) and asserts the object's state afterward.

---

### 6. An array that grows forever

**The smell.** A collection that is appended to in several places and
drained nowhere. On a long-lived object it is a memory leak; on restart the
contents are lost. Nobody owns its lifecycle.

**How to detect it.** For each array field, grep for `.push(` and then grep
for anything that empties or persists it. If the second grep is empty,
you've found it.

**Hint.** The notifications field. Ask: who is supposed to *send* these, and
when?

**Expected from you.** An owner for the lifecycle — something that flushes,
sends, or persists, and clears. Decide whether that owner is `Product` at
all (see #2).

---

### 2. Feature envy — `Product` builds notifications

**The smell.** A class doing work that belongs to another concept. `Product`
knows email subjects, body templates, and a hardcoded customer address. It
isn't a product's job to know how to write an email; it's a product's job to
say "I was sold" and let something else decide who hears about it.

**How to detect it.** Look at the string literals in a class. Do they belong
to that class's domain? Look at the private helpers: what vocabulary do they
use? If a method would be equally at home in a class named
`NotificationService`, it's envious.

**Hint.** The lifecycle methods and the private helper at the bottom of
`Product`. This is where #3 and #6 both live too — they're symptoms of the
same misplaced responsibility.

**Expected from you.** A separate collaborator that owns notification
building and delivery. `Product` should emit *facts* ("sold 3 units,
stock now 7"), not emails. Tests for the new collaborator should not need a
`Product` at all.

---

### 1. God class — the overall goal

**The smell.** One class that is a domain entity, its own repository, a
notification system, a pricing engine and a stock ledger. Every concern in
the module passes through it. The give-away in this codebase: `Product.test.ts`
has to mock a database client just to construct a `Product` and call a
method on it — a pure domain object should never need that.

**How to detect it.** Count the reasons `Product` could change: a pricing
rule change, a schema change, a notification template change, a stock
policy change… Each is a separate reason. Then look at the imports at the
top of the file — what is a domain entity doing importing a database
client?

**Hint.** You've already done most of the work if you fixed #2, #4, #5, #6,
#17. What remains is moving every `prisma.*` call out of `Product` into
something whose job is persistence, and making `Product` constructible
without any of it.

**Expected from you.** `Product.ts` contains no Prisma import. Persistence
lives in a repository. Notifications live in a service. Status transitions
live in one place. `Product.test.ts` has no `vi.mock` for Prisma, and every
behavior test still passes — that is your proof that the entity is now
independent. Write a short README explaining the new shape.

---

## About `Product.test.ts`

The test file has two halves and both are intentional:

- The **naming-discovery tests** (top of the file) assert on the names the
  code *should* use. They use `as any` so they compile against the current
  abbreviated code and fail at runtime with a descriptive message. All of
  them fail today. They are your checklist for smell #11.
- The **behavior tests** (`// --- Domain behavior ---` onward) pin down what
  each method actually does. They use the current names. They must keep
  passing throughout — they are your safety net for every refactoring on
  this list. One of them is flaky on purpose (#21).

Prisma is stubbed via `vi.mock` so the suite runs without a database. No test
asserts on Prisma calls. Keep it that way until you reach #5 and #1.

## Suggested order of work

1. Tier 1 (11, 12, 9, 8, 23, 13, 14) — one commit each, an hour total.
2. Tier 2 (19, 20, 16, 21, 22, 7) — the three `addDiscount()` smells
   (20, 21, 22) are best done in one sitting.
3. Tier 3 (3, 15, 24, 25, 18) — `addImage()` (24, 25) is one sitting too.
4. Tier 4 (17, 10, 4) — you'll start editing `Supplier`, `Warehouse`, `Price`.
5. Tier 5 (5, 6, 2, 1) — new files, new classes, and the final proof:
   `Product` tested without a mock.
