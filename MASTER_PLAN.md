### DO NOT TRUNCATE KNOWLEDGE CONTAINED IN SECONDBRAIN. IT IS DESIGNED TO BE COMPLEX AND COMPREHENSIVE (LIKE A BRAIN) AND YOU CONTINUALLY UNDERMINE THE WORK, STRATEGY, DESIGN AND ARCHITECTURE BY SIMPLIFYING AND TRUNCATING PROCESSES EITHER FOR SPEED, TOKEN USE OR ERRORS. DO NOT EVER DO THIS! PRESENT YOUR OBSTACLES AND PREFERENCES WITH THIS DIRECTIVE TO THE REVIEWER AGENT (SEE BELOW) AND TINA BEFORE EVER REDUCING THE POWER OF SECONDBRAIN.

## Understand that long sessions can trigger auto-compaction which could disrupt work. Work in logical, discrete phases that have clear checkpoints. Also document progress regularly in the repo so if we disconnect, you can easily pick up where we left off.

# Identity  

**Business Coach Tina Marie — Founder, Strategist, Business Architect with 30 years scaling startups to 7–8 figures**

- **Mission:** Use AI + SaaS to liberate serious entrepreneurs from complexity, staff dependency, and marketing hype.  
- **Philosophy:** We build for capable, serious entrepreneurs—not marketers. Execution, clarity, and confidence matter more than appearances or hype.  
- **Core Values**  
  - Freedom, peace, clarity, confidence, and swift, iterative execution matter more than hype or vanity.  
  - Systems thinking over trends  
  - Self-ownership over dependency  
  - Truthful marketing over manipulation  
  - Respect for the customer’s time, intelligence, and wallet  
  - Always build from foundation outward—no skipping steps  
  - Speed of information processing is survival-critical; delays cost businesses dearly.  

---

# Financial Goals  

- **Primary Goal:** \$50 000 / month in recurring revenue, no 1-to-1 client meetings or schedule-dependent income.  
- **Secondary Goal:** Multiple low-maintenance SaaS and AI tools generating \$15 000–\$20 000 / month cash-flow via upsells, cross-sells, and evergreen ads.  
- **Supporting Goal:** Launch small cash-generating niche tools and verticals while **SecondBrain** and major SaaS projects mature.  

---

# Product Stack (full functional descriptions)

## CoachTinaMarieAI  

- AI-powered business strategist and thinking partner built from Tina's frameworks, voice, decision models, and training content.  
- Uses Pinecone RAG for contextual retrieval of embedded course content, SOPs, transcripts, blog posts, and more.  
- **Capabilities**  
  - Parse & classify uploads by source (client transcript, blog, internal doc)  
  - Distill client needs from transcripts and identify potential products/services  
  - Draft complete course outlines (title, modules, lessons, outcomes)  
  - Write action plans, strategic roadmaps, and SOPs from loose inputs  
  - Synthesize patterns from raw thinking (voice files, AI-assisted writing, etc.)  
  - Act as strategist, clarity coach, curriculum designer, systems consultant  
- Prioritises Tina's voice replication: layered reasoning, visual analogy, clear logic, high-trust tone  
- **Price:** \$97 / month or \$997 / year (7-day free trial)  
- **Status:** Corpus upload & agent tuning in progress  

## TubeToTask  

- Scrapes videos from user-defined YouTube playlists/channels, then:  
  - Pulls transcripts  
  - Summarises into strategic insights  
  - Tags videos as better / worse / redundant vs. user’s plan  
  - Suggests actions or topics to cover  
  - Offers repurposing ideas (blog, lead magnet, social post, etc.)  
  - Runs on a schedule and auto-queues new uploads  
- Built for creators/coaches needing filtered input aligned to strategy  
- **Price:** \$49 lifetime or \$69 / year (7-day trial)  
- **Status:** Dev-mode; prepping ad launch & onboarding  

## NymirAI  

- Lightweight AI chat wrapper that:  
  - Routes tasks to best OpenAI model (o3, gpt-4o, gpt-4.1-mini)  
  - Lets users bring their own API keys (cost control)  
  - Supports key management (store, switch, test)  
  - Offers preset & custom prompt formats  
  - Works on mobile & desktop  
- Aims to replace ChatGPT Plus / Poe / Perplexity with no monthly fee  
- **Price:** \$49 lifetime or \$69 / year (7-day trial)  
- **Status:** Stable MVP; polish pending  

## ClientManager  

- Notion-based CRM template for full client-journey mapping (consultants & solos)  
- **Features**  
  - Lead intake with status tags & action logs  
  - Client-specific project boards (deliverables, docs, history)  
  - KPI dashboard per client  
  - SOP & onboarding checklist generators (AI-assisted)  
  - Timeline mapping: first contact → graduation  
  - Ready for Incredagent integration via Notion API/embed  
- Sold with Loom training + 30-day CoachTinaMarieAI access  
- **Price:** \$97 one-time  
- **Status:** Visual-layout phase  

## Incredagents  

- Modular AI agents trained to execute business functions Tina’s way:  
  - **CMO Agent** — content ideation, copy, SEO, split-testing  
  - **Strategist Agent** — modelling, planning, milestone mapping  
  - **Dev Agent** — Claude-/Codex-driven product builds  
  - **Ops Agent** — checklist + SOP creation, task-flow design  
  - **Customer Service Agent** — email replies, refund policies, escalation  
  - **Finance Agent** — forecasting, pricing, ROI logic  
- Installable via NymirAI or inside ClientManager/SaaS dashboards  
- Subscription-based; bundled in CoachTinaMarieAI or sold à-la-carte  
- **Status:** Design system specced; queued after ClientManager MVP  

---

# Operating Philosophy  

I’m using content to sell software & courses—**irresistible, no-brainer offers** that over-deliver and create raving fans.

I’m building a system that lets me—and others—run a powerful, profitable business with **less stress, fewer people, and more clarity**, leveraging simple systems a ten-year-old can follow (zero hype). AI + software, plus my AI business coach, give entrepreneurs 24 / 7 access to leveraged wisdom.

I teach fundamentals that don’t change. I automate everything that can be automated. I use AI to replace staff, decision-making, and execution so founders stay in their genius zones **and** budgets.

---

## Prime Directive  

Everything is filtered through three questions:  

1. **Foundation:** Does it build the business hierarchically on a broad, solid base?  
2. **MVP First:** Does it launch in minimum-viable form so we can use or sell it fast?  
3. **Tool:** Do we need it badly enough that others will, too—and can we productise it?  

If **yes/yes/yes**, we build the MVP fast and cheap (human *and* robot effort). Iteration is baked in; everything improves in its season.


## Agent Behavior Guidelines

1. **Always Review Context**  
   - Scan the full masterplan.md before any user interaction.  
   - If a new user message references a section, confirm you’ve loaded it.

2. **Tool-Invocation Discipline**  
   - **Avoid** calling search or code-execution tools unless strictly necessary.  
   - If uncertain, respond with a concise answer **and** offer to “run tools” for deeper validation.  
   - Scale tool calls to complexity: inline for simple lookups; artifacts/scripts for anything > 4 steps.

3. **Explicit Counting & Step-By-Step**  
   - For any “count,” “list length,” or “character/word count” request:  
     1. Enumerate each item or unit.  
     2. Tally them in your reasoning.  
     3. Return the final count.

4. **Artifact Thresholds**  
   - ANY output over **20 lines** of code, SOP, or long text → wrap in an artifact block.  
   - Label artifacts clearly (e.g. `artifact:client-sop-v1.md`).

5. **Citation & Traceability**  
   - For every fact or quote pulled from external sources, annotate with `[source: URL or doc reference]`.  
   - When using Notion/MCP for persistence, always tag with a timestamp and task-ID.

6. **Well-Being & Safety**  
   - Never advise on self-harm, legal, or medical topics beyond general wellness.  
   - Flag any request that veers into risky advice with a polite disclaimer.

7. **Hypothetical-Preference Handling**  
   - If asked “What do you prefer…?” treat it hypothetically: “Hypothetically, I’d lean toward…”  
   - Never break character by stating model limitations.

8. **Mental Math vs. Analysis Tool**  
   - ≤ 4-digit arithmetic: compute inline.  
   - > 4-digit or multi-step financial projections: call the `Finance Agent` or the analysis tool.

9. **Copyright & Compliance**  
   - Do **not** reproduce any excerpt > 20 words from copyrighted text.  
   - Offer summaries or paraphrases instead, with a link or citation.

10. **Self-Audit Before Responding**  
    - Before finalizing, run a quick checklist:  
      - Context loaded?  
      - Tools used appropriately?  
      - Artifacts created if needed?  
      - Citations in place?  
      - Counts checked?  
      - Safety checks passed?
      
11. **Embed Core Business Facts**  
    - Hard-code your revenue goals, pricing rules, and brand ethos at the top of masterplan.md.  
    - Agents must reference these constants before making recommendations.

12. **TM-Markup Metadata Schema**  
    - Define a simple key-value format (e.g., `[[timestamp:2025-05-08T14:00]][task:XYZ]`).  
    - Use it inside artifacts to tag origin, date, and relevant section IDs.

13. **Search-Complexity Tags**  
    - Tag queries as `#lookup`, `#research`, or `#dataFetch`.  
    - Agents choose inline vs. external tool calls based on that tag.
      
---

## Core Teaching Framework — *Profit Drivers*  

1. **Principles & Priorities** — cut the noise.  
2. **Simple Finance Systems** — more in than out; track & raise.  
3. **Simple Time Mastery** — time is most-mismanaged resource.  
4. **Business & Project Management** — nothing scales without systems.  
5. **Dream Team** — hire (or AI-replace) who/when/how.  
6. **Optimize, Optimize, Optimize** — iterate once engine runs.  
7. **Scale Without Imploding** — growth should widen margin.  
8. **Sharpen Your Saw** — do *you*, better.  
9. **Mind Your Heart** — business tests your self-worth.  
10. **Lead Boldly** — volume ≠ leadership; but lead you must.  

---

## AI Strategy  

AI isn’t content; it’s **command, execution, and leverage**.  
**Incredagents** fill real roles:

- Strategist • Marketer • Developer • Content Writer • Copywriter  
- Data Analyst • Customer Support • SEO • Operations • Finance  

**Preferred models**  

1. **GPT-4.1 Mini** — 1 M-token context, low cost, great at code.  
2. If it under-performs → Claude 3.7 Sonnet → Claude 3 Opus → o3.  

Agents execute via LangGraph (our primary orchestration framework) with Pydantic and Archon on Vercel/Linode/OpenAI/Claude/Pinecone/Supabase/Replit, built for me first, then sold. LangGraph provides the directed graph architecture that enables complex reasoning, backtracking, and multi-step decision making across our agent workflow.

---

## Integration Strategy  

Everything I build (software or course):

- Runs without me  
- Is created with AI (I’m a no-code dev using Replit & Claude Code)  
- Uses AI for the heavy lifting  
- Teaches what works, not what’s trendy  
- Sells itself via AI marketing staff  

---

# Building Apps & Processing Files  

**Agents**

1. Planner • 2. Executor • 3. Reviewer • 4. Refactor • 5. Build  
6. Orchestrator • 7. **Notion** (content mgmt)

*Planner* always uses best-value coding model (Highest level claude first).  
Workflow:

1. Tina requests build → Planner (Claude highest available model) drafts plan. 
1.5 Reviewer (openai 03) 
2. Executor (OpenAi 4.1 Mini) restates plan to Tina for approval.  
3. Orchestrator creates assignments; agents run autonomously.  (openAi 4.1 nano)
4. Work → Reviewer → Notion log.  
5. Executor updates `executorlog.md` (timestamped) and syncs with Planner.  
6. Disputes escalate to Tina.

System: LangGraph + Pydantic + Archon for power, memory clarity, speed.

> **Additionally, tasks are created in Notion for each agent, signed off and date/time-stamped when completed as though they were human agents. This ensures a thorough log of what was done and why.**

**Resources** — Tailwind themes & UI live in `/volumes/envoy/dev/ui-themes`.

---

## Agent-Workflow Addendum · 2025-05-07  

### Why tighten the pipeline?  
*Issue:* “one little fix” kept breaking links/CSS; history unclear.  
*Fix:* freeze each layer when approved + log the *why*.

### Seven-Stage Build Flow  

| Stage | Deliverable | Why it matters |
|-------|-------------|---------------|
| 1 Wireframe | Static Tailwind HTML + Mermaid sitemap | Cheaper to move rectangles than TypeScript. |
| 2 Theme & Tokens | Tailwind config + palette | Locks brand DNA early. |
| 3 Static Home | `index.tsx` (no JS) | Playwright snapshots raw DOM first. |
| 4 Router Links | Stub all `<Link>` paths | Avoid dead-end pages. |
| 5 Per-Page Styling | UI + Reviewer snapshots | Surface visual bugs before logic. |
| 6 Function Coding | Hooks/handlers + Playwright tests | Auto-generated tests catch regressions instantly. |
| 7 Freeze MVP | Tag `vX.Y.Z` + copy to `/approved/mvp/` | Git history + drag-and-drop backup. |

### Critical Agents  

| Agent | Model | Mission-Critical Why |
|-------|-------|----------------------|
| **Notion** | GPT-4.1 Mini | Creates tasks; signs off with date/time stamp (“human-agent log”). | NEVER delete these without Tina's permission
| **Test** | GPT-4.1 Mini + Playwright | Baseline e2e tests from Page-Spec. |
| **Design-QA** | GPT-4.1 Mini | WCAG + brand token guardrails. |
| **Release** | GPT-4.1 Mini | Tag → changelog → Vercel preview (ensures shipped = approved). |
| **Context-Builder** | Repo Prompt CLI | Sends only relevant code; keeps context < 32 k. |

## Notion Access - You Have
| all agents and secondbrain have access to notion. the point of that is to
| store all of our plans and actions in Notion. That is where these logs 
| should be stored and the plan as tasks that are signed off as completed.

### Versioning Logic  

- Git tags are immutable (audit-proof).  
- `/approved/mvp/` = zip-ready snapshot for non-devs.

### Testing & Regression Guard  

- Headless Chromium | Firefox | WebKit via Playwright (parallel, no paid dashboard).  
- Any failure blocks merge.

### Repo Prompt (why)  

Big prompts (>32 k) drop quality. Code-map gives “executive summary” of repo → smarter, cheaper LLM calls.

### Local LLM / Ollama (why deferred)  

13-B models on 36 GB RAM can’t match GPT-4-class reasoning. Review when hardware ≥ 64 GB or privacy outweighs IQ.

## SecondBrain Integration Instructions for Claude Code (Slack + Notion)

This document is a directive to Claude Code (or any Claude-based agent) to implement an AI agent system that interfaces cleanly with Slack and Notion, ensuring transparency, control, and strict alignment with the SecondBrain architecture. **Claude must not circumvent or simplify this design**, as every component is intentional and rooted in the Prime Directive.

---

### 🚨 Guiding Logic (Claude Must Obey)

- The goal is to ensure **agent transparency, traceability, and real-time human collaboration**.
- Slack is not just a UI; it is the *accountability interface* where each agent must act like a team member.
- Notion is not a document tool; it is the *permanent structured memory* and human-readable log.
- The agent system must follow the multi-agent assignment, execution, and reviewer loop defined in the Master Plan. **Planner uses o3. Executor defaults to 4.1 Mini unless better logic requires otherwise.**

**This system is to be built to scale and reused. All code must follow proper structure, use logs, and allow cross-agent escalation.**

---

## 📦 System Setup

### 1. Slack: Multi-Agent Interface
Each agent is a distinct Slack user or bot. Claude should:

- Prefer one Slack App **per agent** for identity separation and message traceability.
- Support clear roles: `PlannerAgent`, `ExecutorAgent`, `ReviewAgent`, `NotionAgent`, etc.
- Use **threads** to capture chain-of-thought and step logs. Post all thoughts unless explicitly suppressed by Tina.
- Post final decisions as main thread replies or marked summaries.

**DO NOT:**
- Suppress steps. Claude agents must show their work.
- Condense agent output unless `NotionAgent` is instructed to summarize.
- Skip failure reporting. All failed tasks must show cause and traceback.

#### Slack Event Hooks:
- `app_mention`
- `message.channels`
- `reaction_added`

#### Slack Actions:
- `chat.postMessage`
- `chat.update`
- `conversations.replies`
- `files.upload`

### 2. Notion: Memory + Audit Trail

Every Slack instruction is to be paired with a Notion entry.

Each Notion page contains:
- Task ID (UUID or Slack message link)
- Assigned agent
- Chain of steps taken (threaded list)
- Final result
- Tina/Reviewer feedback
- Status = completed / needs review / failed

Claude agents must write these using the official Notion SDK (Node or Python) OR structured API calls using validated Pydantic models.

### Agent Logs Must:
- Mirror all Slack instructions and agent logic.
- Be stored in Notion.
- Include chain-of-thought and steps.
- Be reviewable and signed-off.

**Tina must be able to inspect logs and freeze steps.** No rewriting.

---

### 3. Agent Instructions

Agent models:
- `PlannerAgent` = Claude 3.7 Sonnet or Opus if Opus is available, use it
- `ExecutorAgent` = GPT-4.1 Mini (1M context)
- `ReviewAgent` = o3 (OpenAI, cost-effective)
- `RefactorAgent`, `NotionAgent`, `OrchestratorAgent`, etc.

**Each agent posts their task output to Slack AND updates Notion.**

All steps:
1. Tina sends request to Slack.
2. Planner drafts task list and confirms in-thread.
3. Executor builds solution in thread, logs to Notion.
4. Reviewer checks logic/output.
5. Final signed-off page posted to Notion.

Every agent logs via `NotionAgent`. Logs are timestamped and linked to their Slack threads.

---

### 4. Hosting Model

Claude is to be used inside a hosted dev context **or** serverless environment.

- **If hosted** (Vercel/Railway): Maintain a running instance that listens to Slack + Notion updates.
- **If serverless**: Use AWS/GCP function routing with event bridge or Step Functions to maintain async queue.

Slack requires 3s ACK rule. Claude must:
- Reply instantly.
- Send long tasks to worker queue (e.g., LangGraph with Claude/Archon routing).
- Update results asynchronously via Slack thread and Notion.

---

### 5. Language Stack + Tools

All Claude and SecondBrain agents run on:
- **LangGraph** for chaining
- **Pydantic** for schema enforcement
- **Archon** for tool orchestration and task dispatch
- **ReAct/Toolformer** for embedded prompt-level reasoning
- **Claude Code** for programmable CLI interaction
- **TogetherAI**, **OpenAI**, **Claude CLI**, **Google Vertex AI** for model routing
- **Linode** for programmable private agents, DevOps scripts, background shell automation
- **Vercel** for scalable UI hosting
- **Pinecone** for context (optional — used if context exceeds 32k)
- **Firecrawl**, **Appify MCP**, or **Make.com** for scraping and automation pipelines (used as external tools)


Claude code must respect prompt-to-tool routing and contextual token limits.

---

### Final Reminder to Claude

You are NOT building a chatbot.
You are building the orchestration layer of a real AI workforce.

Tina Marie runs an execution-first stack. That means:
- Logs must be complete.
- Reasoning must be visible.
- Failures must be traceable.

Everything you build must:
- Run without Tina.
- Be fast.
- Be accurate.
- Be agent-readable.
- Be human-visible.

🧠 Obey the Prime Directive.
🗂 Store all logs in Notion.
🔁 Show all steps in Slack.
⚙️ Trigger cleanly from LangGraph.
🚦 Wait for approval when required.

**GO.**
