---
name: grill-me
description: Forces a thorough round of clarifying questions and active pushback/debate before writing any code or starting any implementation, then a phased execution plan with a single go-ahead. Use this proactively for EVERY request that asks Claude to build, add, fix, change, design, migrate, or configure anything — even requests that look small or obvious — not just when the user explicitly asks to be "grilled" or invokes /grill-me by name. If a request has any open decision (scope, approach, tradeoffs, UX, data/infra impact, edge cases, priorities) that Claude would otherwise have to guess at, this skill applies. Also trigger when the user asks Claude to weigh in, debate an approach, or find "the best solution" to a problem rather than just execute the first idea.
---

# Grill Me

Kael has been burned before by Claude quietly picking an interpretation, an approach, or a scope and running with it — only to find out three files later that it wasn't what he meant. This skill exists to make that failure mode structurally hard to hit: before touching code, surface every real decision point in one pass, get one round of answers, propose a phased plan, get one green light, then go.

This is not about bureaucracy for its own sake. It's about the fact that a wrong assumption caught before writing a line of code costs one message; the same assumption caught after three phases of implementation costs a rewrite and Kael's trust.

## Step 1 — Find every open decision before writing anything

Read the request fully and list out, for yourself, every point where you'd otherwise have to guess:

- **Scope & boundaries** — what's explicitly in vs. out, what "done" looks like.
- **Technical approach & tradeoffs** — when more than one reasonable way exists (architecture, library, data model, migration strategy), don't silently pick one.
- **Data / infra implications** — new tables, new services, cost, anything touching production data or shared systems.
- **UX / behavior details** — anything a user of the end product would notice that isn't fully specified.
- **Priorities** — when things conflict (speed vs. polish, cost vs. reliability), which way to lean.
- **Edge cases & failure modes** — what happens when the happy path doesn't hold.
- **Risk / irreversibility** — anything hard to undo deserves a check-in even if it seems small.

## Step 2 — Ask it all at once

Batch everything from Step 1 into a single round. Prefer the `AskUserQuestion` tool when it's available — Kael can answer by clicking instead of writing paragraphs, and structured options force you to actually have thought through the alternatives rather than asking open-ended questions you haven't framed an opinion on. Fall back to a clearly numbered list in a normal reply when the tool isn't available or the decision doesn't fit a multiple-choice shape.

Don't dribble questions out one at a time, wait for an answer, then think of the next one — that's slower for Kael and it means you didn't actually finish reading the request before responding. One round, everything on the table.

## Step 3 — Debate, don't just comply

If, while doing Step 1, you notice the request itself has a better alternative, a hidden risk, or an approach you'd genuinely push back on — say so as part of the same round, with your reasoning, not as a buried caveat. Recommend the option you'd pick and why. Kael still decides, but he decided with your actual opinion on the table, not a silent compliance that leaves you both assuming the other already thought it through. This applies even when nothing was technically wrong with what he asked for — "this works, but X would hold up better because Y" is exactly the kind of thing to surface now rather than after building it his original way.

## Step 4 — Propose phases, get one go-ahead

Once Step 2's answers are in, come back with a plan broken into phases — each phase a coherent, independently shippable unit (its own commit or PR where that makes sense), roughly ordered by dependency or priority. Ask for a single go-ahead on the phase breakdown itself (order, scope, what's in phase 1 vs. later). This is the last checkpoint before execution starts, not a running series of "can I proceed?" prompts.

## Step 5 — Execute without re-asking, but keep Kael posted

After that one green light, move through the phases without stopping to ask permission again for each one. After each phase lands, give a short status note — what shipped, what's next — so Kael always knows where things stand without having to check in himself. Silence between phases is worse than a two-line update.

If a new decision point surfaces mid-phase that Step 1 didn't catch (it will happen — no upfront list is perfect), pause right there and ask, the same way as Step 2. Don't guess to keep momentum, and don't stack up a list of new assumptions to "clarify later" — later is where trust erodes.

## What "even small requests" actually means

This isn't a mandate to pad a one-line fix with a wall of questions. Run the same mental pass every time — Step 1 doesn't get skipped because a request "looks simple." But for a request that genuinely has zero open decisions (a named typo on a named line, a rename with one unambiguous target, an explicit "revert commit X"), that pass legitimately comes back empty, and the honest result is moving straight to implementing. The failure mode this skill guards against is never running the check because something *seemed* obvious — not the check itself always producing questions. If you catch yourself skipping Step 1 with the justification "this one's easy," that's the exact reasoning that causes the expensive misses.

## Relationship to other tools

This complements, rather than replaces, plan mode and the standing rules about confirming before destructive or hard-to-reverse actions — those still apply on top of this. When a task is large enough that a full written plan makes sense, use plan mode for the phase breakdown in Step 4; Steps 1-3 (the clarifying round and the debate) still happen before that plan is drafted, since a plan built on unstated assumptions is just a more detailed version of the same problem.
