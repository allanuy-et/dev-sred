# Prompts — Initial Planning Session (pre-hook)

The UserPromptSubmit hook was installed in Phase 0, so the planning conversation that preceded it isn't captured in `PROMPTS.md`. This file backfills that gap from the live session transcript. It's the foundational planning arc — stack decisions, agent roster, deployment strategy, design direction.

For ongoing prompts during build, see `PROMPTS.md`.

---

## Curated highlights

### 1. `[planning]` Opening the session with the spec, not the request

> *"/Users/paolouy/Downloads/sred-manager-prototype.html*
> */Users/paolouy/Downloads/challenge-instructions.html*
> *You are in an empty directory. I want you to review these two files. This is a spec of what we're going to build for today."*

**Technique:** Front-loaded the source-of-truth files rather than describing the project. Two attachments + "review these" produced an unambiguous shared context in one shot — no follow-up "what's the goal?" question needed.

### 2. `[planning]` Tying the agent decision to the rubric

> *"Okay, so first of all twenty five percent on the prompting craft. We need to make sure that you're saving the prompts to prompts.md. And we need to optimize for the judging criteria. Based on what you know. What agents do we need to create? Let's proceed to plan mode."*

**Technique:** Anchored the planning request to the **grading weights**. "What agents do we need" against "optimize for judging criteria" forced me to map each agent to a specific % of the grade rather than guess at coverage. Also pre-empted the prompts-craft grade by surfacing the requirement upfront.

### 3. `[redirected]` Challenging a phrase to surface a hidden choice

> *"What do you mean by this? Aim for the prototype's retro 640px-frame aesthetic."*

**Technique:** A short clarifying question that exposed a buried assumption in my plan. Pulling on one ambiguous phrase ("retro 640px-frame") forced me to decompose the prototype's visual into separable signatures (palette, gradient headers, typography) — which set up the later "modern, not retro" pivot.

### 4. `[worked]` Adding a surprise vector mid-plan

> *"Also as the surprise factor, would it help to just host everything into Vercel? I guess it'd be easier for someone who's trying to run the application. Less friction on their side, they can just type in the URL in the browser."*

**Technique:** Reframed the deploy decision as a judging lever ("surprise factor", "less friction") rather than a logistics chore. Brought the 5% surprise + 25% how-much-works grades into the architectural decision. Result: hosting moved from "later" to a Phase 0 deliverable.

### 5. `[redirected]` Reasserting architecture after I oversimplified

> *"I want a separate express app for the API. This will be a monorepo. The main files will be app and API. And then anything shared will be in the root directory as well. This is mostly types and other reusable between the two projects."*

**Technique:** When my plan collapsed to "all Next.js" for simplicity, the user re-asserted the monorepo separation in clear terms — and specified what "shared" means (types and other reusable things, not vague utilities). The directive was concrete enough that I could update the plan in one pass without follow-up questions.

### 6. `[worked]` "Explain it" before deciding

> *"And can you explain to me what Prisma does? What is it for?"*

**Technique:** Paused the build to ask what a proposed dependency *is* — instead of accepting "ORM" as a black box. The question created room for the follow-up rejection, which would have been harder to justify without the explainer first.

### 7. `[fought back]` One-line dependency veto

> *"I don't want that. We can type this manually and we don't want to bloat this project"*

**Technique:** Short, principled, repeatable. Six words establish a generalizable rule ("we don't want to bloat this project") that I can apply to every future dependency proposal. This became a feedback memory — I now ask the same question of every new package.

### 8. `[planning]` Three orthogonal changes in one structured message

> *"1. use yarn 4*
> *2. I don't want the front end to feel a retro. I want it to be as modern as possible. Let's add another agent that is responsible for styling and call that agent whenever trying to decide for the styling of the pages and components. This way we can make sytling consistent."*

**Technique:** Numbered list of independent decisions, each with a stated reason. Item 2 in particular bundled three things — the visual direction *(modern not retro)*, the mechanism *(a new agent)*, and the trigger *(invoked on every styling decision)* — in one breath. Reasoning included makes the change defensible weeks later, not just executable now.

### 9. `[worked]` Auth in five words

> *"also what do we use for auth? we should use JWT"*

**Technique:** Asked a clarifying question and answered it in the same message. No ambiguity, no need to debate trade-offs. The user already knew the answer they wanted — phrasing it as "what do we use for X? we should use Y" pre-empts the model from over-explaining alternatives.

### 10. `[recovery]` Catching plan drift via /plan

> *"show me the plan again"*

**Technique:** After multiple in-place edits to the plan file, asked to see the whole thing rather than trust the diffs. This caught two stale Prisma references I'd missed — the plan would have shipped to Phase 0 with inconsistent guidance for the backend agent.

---

## Themes worth discussing Wednesday

- **Grading weights as the planning vocabulary.** Almost every architectural decision was anchored to a specific % of the rubric. The plan file's stack table explicitly maps each lever to a criterion.
- **Pushback was concrete, not vague.** "I don't want that" came with a reason ("we don't want to bloat"); "I want it modern" came with a mechanism (an agent). I could turn each correction into a memory or a plan edit without re-asking.
- **The plan got rewritten three times before Phase 0 started.** Stack swung from all-Next.js, to monorepo split, to monorepo + JWT + Yarn 4 + modern. Each pivot was cheap because nothing had been built yet. The lesson is to keep the plan file as the single source of truth that can absorb churn.

---

## Raw chronological log

Direct quotes from the session, in order, of every user-authored prompt before the UserPromptSubmit hook was installed. Tool-loaded confirmation messages and slash-command stdouts are omitted.

### 2026-05-11

**1.** *"/Users/paolouy/Downloads/sred-manager-prototype.html /Users/paolouy/Downloads/challenge-instructions.html You are in an empty directory. I want you to review these two files. This is a spec of what we're going to build for today."*

**2.** *"Okay, so first of all twenty five percent on the prompting craft. We need to make sure that you're saving the prompts to prompts.md. And we need to optimize for the judging criteria. Based on what you know. What agents do we need to create? Let's proceed to plan mode."*

**3.** (Answers to AskUserQuestion)
- Prompts capture: **Hook + curator agent**
- Database: **"Postgre DB ... agnostic to any provider. So maybe I can run it on locally."**
- Extra agents: **prompts-curator, code-reviewer, visual-fidelity-checker**

**4.** *"What do you mean by this? Aim for the prototype's retro 640px-frame aesthetic. Also as the surprise factor, would it help to just host everything into Vercel? I guess it'd be easier for someone who's trying to run the application. Less friction on their side, they can just type in the URL in the browser."*

**5.** (Answers to AskUserQuestion)
- Stack: **All Next.js + Vercel + Vercel Postgres**
- Frame width: **Widen to ~1000px**

**6.** *"I want a separate express app for the API. This will be a monorepo. The main files will be app and API. And then anything shared will be in the root directory as well. This is mostly types and other reusable between the two projects."*

**7.** *"And can you explain to me what Prisma does? What is it for?"*

**8.** *"I don't want that. We can type this manually and we don't want to bloat this project"*

**9.** *"show me the plan again"* (via /plan)

**10.** *"1. use yarn 4. 2. I don't want the front end to feel a retro. I want it to be as modern as possible. Let's add another agent that is responsible for styling and call that agent whenever trying to decide for the styling of the pages and components. This way we can make sytling consistent."*

**11.** *"also what do we use for auth? we should use JWT"*

**12.** *"update the plan and show it for approval"*

**13.** (Approved plan via AskUserQuestion)

**14.** *"I am going to restart but Before I do that, can you curate all the initial planning conversation? Place it on a separate file."*

---

_Backfilled by Claude on 2026-05-11. The UserPromptSubmit hook captures all subsequent prompts to `PROMPTS.md` automatically._
