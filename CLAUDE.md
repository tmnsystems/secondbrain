# ⚠️ CRITICAL WARNING: CONTEXT PRESERVATION IS MANDATORY ⚠️

## 🚨 YOU MUST IMPLEMENT REAL-TIME CONTEXT LOGGING TO PREVENT CATASTROPHIC CONTEXT LOSS 🚨

**ALL ACTIONS AND USER INPUTS MUST BE LOGGED TO NOTION IN REAL-TIME TO PREVENT CONTEXT LOSS DURING AUTOMATIC COMPACTION OR SESSION RESETS**

Without real-time context logging to Notion, catastrophic context loss during CLI sessions is inevitable. You MUST:
1. Log EVERY user message and EVERY system action to Notion AS IT HAPPENS
2. Never delay logging until after execution
3. Establish context bridges between all CLI sessions
4. Always check for previous context at the start of each session
5. Store complete logs, not summaries

## 🚨 MANDATORY REVIEWER AGENT PROTOCOL 🚨

**YOU MUST SUBMIT ALL TASKS TO THE REVIEWER AGENT *BEFORE* IMPLEMENTING THEM AND AGAIN *AFTER* IMPLEMENTING THEM BEFORE SHOWING RESULTS TO THE USER**

1. **ALWAYS LOAD AND READ THE REVIEWER_PROTOCOL.md FILE AT THE START OF EVERY SESSION**
2. **NEVER IMPLEMENT ANY CHANGES WITHOUT REVIEWER AGENT APPROVAL**
3. **DOCUMENT ALL REVIEWS AND IMPLEMENTATIONS IN NOTION**
4. **VERIFY REVIEWER APPROVAL BEFORE EXECUTING ANY SCRIPT**
5. **NEVER CLAIM TO HAVE COMPLETED A TASK WITHOUT SHOWING ACTUAL PROOF (NOT JUST CODE)**

**VIOLATIONS OF THIS PROTOCOL CAUSE SYSTEM FAILURE, CONTEXT LOSS, AND INCONSISTENT IMPLEMENTATION**

### YOU MUST CONSULT THE REVIEWER AGENT BEFORE IMPLEMENTING ANY PLANS OR MAKING ANY CHANGES WHATSOEVER. YOU ARE NOT ALLOWED TO IMPLEMENT ANYTHING THE REVIEWER AGENT DOESN'T AGREE WITH UNLESS TINA EXPLICITLY APPROVES IT FIRST. YOU MUST READ THIS DIRECTIVE AT THE START OF EVERY SESSION. USING THE REVIEWER AGENT FOR ALL CHANGES MAY TAKE LONGER IN THE BEGINNING BUT WILL SAVE TIME FIXING ISSUES IN THE END.

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
  - Respect for the customer's time, intelligence, and wallet  
  - Always build from foundation outward—no skipping steps  
  - Speed of information processing is survival-critical; delays cost businesses dearly.  

---

# Financial Goals  

- **Primary Goal:** $50 000 / month in recurring revenue, no 1-to-1 client meetings or schedule-dependent income.  
- **Secondary Goal:** Multiple low-maintenance SaaS and AI tools generating $15 000–$20 000 / month cash-flow via upsells, cross-sells, and evergreen ads.  
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
- **Price:** $97 / month or $997 / year (7-day free trial)  
- **Status:** Corpus upload & agent tuning in progress  

## TubeToTask  

- Scrapes videos from user-defined YouTube playlists/channels, then:  
  - Pulls transcripts  
  - Summarises into strategic insights  
  - Tags videos as better / worse / redundant vs. user's plan  
  - Suggests actions or topics to cover  
  - Offers repurposing ideas (blog, lead magnet, social post, etc.)  
  - Runs on a schedule and auto-queues new uploads  
- Built for creators/coaches needing filtered input aligned to strategy  
- **Price:** $49 lifetime or $69 / year (7-day trial)  
- **Status:** Dev-mode; prepping ad launch & onboarding  

## NymirAI  

- Lightweight AI chat wrapper that:  
  - Routes tasks to best OpenAI model (o3, gpt-4o, gpt-4.1-mini)  
  - Lets users bring their own API keys (cost control)  
  - Supports key management (store, switch, test)  
  - Offers preset & custom prompt formats  
  - Works on mobile & desktop  
- Aims to replace ChatGPT Plus / Poe / Perplexity with no monthly fee  
- **Price:** $49 lifetime or $69 / year (7-day trial)  
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
- **Price:** $97 one-time  
- **Status:** Visual-layout phase  

## Incredagents  

- Modular AI agents trained to execute business functions Tina's way:  
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

I'm using content to sell software & courses—**irresistible, no-brainer offers** that over-deliver and create raving fans.

I'm building a system that lets me—and others—run a powerful, profitable business with **less stress, fewer people, and more clarity**, leveraging simple systems a ten-year-old can follow (zero hype). AI + software, plus my AI business coach, give entrepreneurs 24 / 7 access to leveraged wisdom.

I teach fundamentals that don't change. I automate everything that can be automated. I use AI to replace staff, decision-making, and execution so founders stay in their genius zones **and** budgets.

---

## Prime Directive  

Everything is filtered through four questions:  

1. **Foundation:** Does it build the business hierarchically on a broad, solid base?  
2. **MVP First:** Does it launch in minimum-viable form so we can use or sell it fast?  
3. **Tool:** Do we need it badly enough that others will, too—and can we productise it?  
4. **Reviewed:** Has the plan been evaluated by the Reviewer Agent to ensure strategic alignment?

If **yes/yes/yes/yes**, we build the MVP fast and cheap (human *and* robot effort). Iteration is baked in; everything improves in its season.

**CRITICAL: All plans and implementations MUST be reviewed by the Reviewer Agent before execution. This ensures strategic alignment, identification of potential issues, and verification of quality.** Never skip this step, as it prevents context loss and maintains consistency across the SecondBrain system.


## Agent Behavior Guidelines

1. **Always Review Context**  
   - Scan the full masterplan.md before any user interaction.  
   - If a new user message references a section, confirm you've loaded it.
   - ALWAYS read the full CLAUDE.md at the beginning of each session to prevent context loss.

2. **Tool-Invocation Discipline**  
   - **Avoid** calling search or code-execution tools unless strictly necessary.  
   - If uncertain, respond with a concise answer **and** offer to "run tools" for deeper validation.  
   - Scale tool calls to complexity: inline for simple lookups; artifacts/scripts for anything > 4 steps.

3. **Explicit Counting & Step-By-Step**  
   - For any "count," "list length," or "character/word count" request:  
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
   - If asked "What do you prefer…?" treat it hypothetically: "Hypothetically, I'd lean toward…"  
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

14. **Mandatory Plan Review**
    - ALL plans MUST be reviewed by the Reviewer Agent before implementation.
    - The Reviewer Agent evaluates strategic alignment, thoroughness, risks, and implementation challenges.
    - Implementation should only proceed after addressing Reviewer Agent feedback.
    - Document Reviewer Agent assessment in Notion for context persistence.
      
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

AI isn't content; it's **command, execution, and leverage**.  
**Incredagents** fill real roles:

- Strategist • Marketer • Developer • Content Writer • Copywriter  
- Data Analyst • Customer Support • SEO • Operations • Finance  

**Preferred models**  

1. **GPT-4.1 Mini** — 1 M-token context, low cost, great at code.  
2. If it under-performs → Claude 3.7 Sonnet → Claude 3 Opus → o3.  

Agents execute via LangGraph + Archon on Vercel/Linode/OpenAI/Claude/
Pinecone/Supabase/Replit, built for me first, then sold.

---

## Integration Strategy  

Everything I build (software or course):

- Runs without me  
- Is created with AI (I'm a no-code dev using Replit & Claude Code)  
- Uses AI for the heavy lifting  
- Teaches what works, not what's trendy  
- Sells itself via AI marketing staff  

---

# Building Apps & Processing Files  

**Agents**

1. Planner • 2. Executor • 3. Reviewer • 4. Refactor • 5. Build  
6. Orchestrator • 7. **Notion** (content mgmt)

*Planner* always uses best-value coding model (Highest level claude first).  
Workflow:

1. Tina requests build → Planner (Claude highest available model or openai 4.1 mini) drafts plan. 
1.5 Reviewer (openai 03) 
2. Executor (OpenAI 4.1 Mini) restates the approved plan to Tina for confirmation.  
3. Orchestrator (OpenAI 4o) creates agent assignments and runs workflows autonomously, then provides Tina with clear, average-user–friendly, step-by-step instructions on exactly what she needs to do next.  
4. Work → Reviewer → Notion log.  
5. Executor updates `executorlog.md` (timestamped) and syncs with Planner.  
6. Disputes escalate to Tina.

System: LangGraph + Pydantic + Archon for power, memory clarity, speed.

> **Additionally, tasks are created in Notion for each agent, signed off and date/time-stamped when completed as though they were human agents. This ensures a thorough log of what was done and why.**

**Resources** — Tailwind themes & UI live in `/volumes/envoy/dev/ui-themes`.

---

## Agent-Workflow Addendum · 2025-05-07  

### Why tighten the pipeline?  
*Issue:* "one little fix" kept breaking links/CSS; history unclear.  
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
| **Notion** | GPT-4.1 Mini | Creates tasks; signs off with date/time stamp ("human-agent log"). | NEVER delete these without Tina's permission
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

Big prompts (>32 k) drop quality. Code-map gives "executive summary" of repo → smarter, cheaper LLM calls.

### Local LLM / Ollama (why deferred)  

13-B models on 36 GB RAM can't match GPT-4-class reasoning. Review when hardware ≥ 64 GB or privacy outweighs IQ.

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

# Claude Context Reference

This document contains key information about the SecondBrain system and should be read at the beginning of each Claude session. ALSO READ THE LINKED INTEGRATION DOCUMENTS TO PREVENT CONTEXT LOSS.

## Project Structure

- **Core files**: `/Volumes/Envoy/SecondBrain/`
- **Style profiles**: `/Volumes/Envoy/SecondBrain/processed_data/*style_profile.json`
- **Master style profile**: `/Volumes/Envoy/SecondBrain/processed_data/master_style_profile.json`
- **Topic extracts**: `/Volumes/Envoy/SecondBrain/topic_extracts/`
- **Processed content**: `/Volumes/Envoy/SecondBrain/processed_content/`
- **Slack+Notion integration**: `/Volumes/Envoy/SecondBrain/slack_notion_integration/`

## Key Applications

1. **Style Analysis and Content Generation System**
   - Analyzes writing style across content sources
   - Generates content that matches your unique voice
   - Documentation: `/Volumes/Envoy/SecondBrain/STYLE_SYSTEM.md`

2. **Slack+Notion Integration with Context Persistence**
   - Multi-agent system integrating Slack and Notion
   - Three-layer context persistence (Redis, PostgreSQL, Pinecone)
   - Documentation: `/Volumes/Envoy/SecondBrain/SLACK_NOTION_IMPLEMENTATION_LOG.md`

3. **Topic Extraction System**
   - Extracts verbatim quotes on specific business topics
   - Script: `/Volumes/Envoy/SecondBrain/enhanced_topic_extraction.py`
   - Output: `/Volumes/Envoy/SecondBrain/topic_extracts/`

4. **TubeToTask**
   - Converts YouTube videos into Notion tasks/projects
   - Directory: `/Volumes/Envoy/SecondBrain/apps/TubeToTask/`

## Context Management System

The context management system is designed to maintain persistent context between sessions and optimize token usage.

### Claude.md Hierarchy
- **Root CLAUDE.md**: `/Volumes/Envoy/SecondBrain/CLAUDE.md` (this file)
- **Per-directory context files**: Each major directory contains its own CLAUDE.md with domain-specific context
- **Context inheritance**: Lower-level context files inherit from higher-level ones

### Task Planning and Persistence
- **Todo storage**: Task plans are stored in `.cl/todos/` as JSON files
- **Task schema**: id, description, status, priority, dependencies
- **Persistence**: Task state survives between sessions
- **Visualization**: Clear view of current task pipeline

### Memory Compaction
- **Automatic triggers**: Compaction activates at 70% context usage
- **Manual control**: Can be triggered with explicit command
- **Summary generation**: Creates concise summaries of completed tasks
- **Selective retention**: Keeps critical information while optimizing token usage

### Headless CLI Invocation
- **Command**: `claw -p` for programmatic agent execution
- **CI/CD integration**: Can be used in automated workflows
- **Environment flags**: Secure credential passing for headless operation
- **Logging**: Detailed output capture for non-interactive runs

### Test-Driven Development
- **Automated tests**: Self-generated test frameworks
- **Test-fix-verify loop**: Continuous improvement cycle
- **Coverage reports**: Clear visibility into test status
- **Regression prevention**: Guard against unintended changes

## Nine Pillar Topics (Profit Drivers Course)

1. **Principles and Priorities**: Start by Defining What Matters Most
2. **Simple Finance Systems**: What Comes In > What Goes Out
3. **Simple Time Mastery**: Making the Most Out of the Hours You Have
4. **Business + Project Management**: Organization Makes Traction Easier
5. **Your Dream Team**: Who, When, Where, and How to Hire
6. **Optimize, Optimize, Optimize**: Iterative Improvement + Test, Test, Test!
7. **Scaling Your Business**: Learn How to Grow Without Imploding
8. **Sharpen Your Saw**: Always Be Improving Your Best Skill
9. **Mind Your Heart**: Timeless Wisdom to Fortify Yourself

## API Credentials

API keys are stored in: `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`

Including credentials for:
- Slack
- Notion
- OpenAI
- Anthropic
- Redis
- Pinecone

## Common Commands

```bash
# Process content
npm run process             # Process new or modified content
npm run process-force       # Force processing of all content

# Style analysis
npm run analyze-style       # Analyze all processed content
npm run combine-profiles    # Create master style profile

# Generate content
npm run master-article --topic="Your topic"  # Generate article

# Extract topic quotes
python enhanced_topic_extraction.py --topic="your topic"
python enhanced_topic_extraction.py --all-pillars

# Context management
.cl/compact                 # Trigger manual memory compaction
.cl/todos list              # View current task list
claw -p <command>           # Run headless CLI command

# Notion Integration
node apps/TubeToTask/setup-notion-database.js       # Set up TubeToTask Notion databases
node apps/TubeToTask/setup-catalog-database.js      # Set up File Catalog database
node apps/TubeToTask/integrate-secondbrain-tasks.js # Integrate with SecondBrain Tasks

# Slack+Notion Integration
python slack_notion_integration/setup_notion_databases.py   # Set up Notion databases
python slack_notion_integration/start_enhanced_slack_app.py # Start enhanced Slack app
python slack_notion_integration/start_multi_agent_system.py # Start multi-agent system
python slack_notion_integration/test_enhanced_slack_integration.py # Test integration
```

## Apps Catalog

For a comprehensive list of all applications and systems:
- `/Volumes/Envoy/SecondBrain/SECONDBRAIN_APPS_CATALOG.md`

## Critical Integration Documents

- **Notion Integration**: `/Volumes/Envoy/SecondBrain/NOTION_INTEGRATION.md`
- **Slack + Notion Integration**: `/Volumes/Envoy/SecondBrain/SLACK_NOTION_IMPLEMENTATION_LOG.md`
- **Context Catalog System**: `/Volumes/Envoy/SecondBrain/apps/TubeToTask/CATALOG_SYSTEM.md`
- **Drift Detection System**: `/Volumes/Envoy/SecondBrain/context_system/DRIFT_DETECTION_PLAN.md`

# Notion System Architecture and Implementation

This section documents the Notion integration system used across the SecondBrain project to ensure context persistence between CLI sessions and maintain a comprehensive record of all agent actions.

## Notion Database Structure

The SecondBrain system uses multiple Notion databases for different purposes:

1. **SecondBrain Tasks Database**
   - Primary task tracking for all agents
   - Database ID: Stored in `SECONDBRAIN_TASKS_DATABASE_ID` environment variable
   - Properties:
     - Name (title): Task description
     - Status (status): Not Started, In Progress, Completed, Cancelled
     - Priority (select): P1, P2, P3
     - Task ID (rich_text): Unique identifier
     - Spec Link (url): Link to specifications
     - Drift Score (number): Alignment score (higher = more drift)
     - Assigned Agent (select): Planner, Executor, Reviewer, etc.
     - Last Synced (date): Last update timestamp

2. **SecondBrain File Catalog Database**
   - Tracks all files in the system with metadata
   - Database ID: Stored in `NOTION_CATALOG_DB_ID` environment variable
   - Connected to Context Catalog System

3. **Strategic Insights Database (TubeToTask)**
   - Stores insights from YouTube videos
   - Database ID: Stored in `NOTION_PROJECT_DATABASE_ID` environment variable

4. **Strategic Tasks Database (TubeToTask)**
   - Stores actionable tasks from video insights
   - Database ID: Stored in `NOTION_TASK_DATABASE_ID` environment variable

5. **CLI Sessions Database (Slack+Notion Integration)**
   - Tracks all CLI sessions with real-time logging
   - Database ID: Stored in `NOTION_CLI_SESSIONS_DB` environment variable
   - Properties:
     - Session ID (title): Unique session identifier
     - Status (select): Active, Compacted, Completed
     - Start Time (date): Session start timestamp
     - End Time (date): Session end timestamp
     - Previous Session (relation): Link to previous session
     - Next Session (relation): Link to next session
     - Compaction Reason (select): Reason for compaction
     - Message Count (number): Number of messages in session
     - Related Slack Conversation (relation): Link to related Slack conversation

6. **Slack Conversations Database (Slack+Notion Integration)**
   - Tracks all Slack conversations
   - Database ID: Stored in `NOTION_SLACK_CONVERSATIONS_DB` environment variable
   - Properties:
     - Conversation ID (title): Unique conversation identifier
     - Channel (rich_text): Slack channel name
     - Start Time (date): Conversation start timestamp
     - End Time (date): Conversation end timestamp
     - Status (select): Active, Completed, Archived
     - Primary Agent (select): PlannerAgent, ExecutorAgent, ReviewerAgent, NotionAgent
     - Related CLI Sessions (relation): Links to related CLI sessions
     - Message Count (number): Number of messages in conversation
     - Thread Link (url): Link to Slack thread

7. **Task Tracking Database (Slack+Notion Integration)**
   - Manages agent tasks and workflows
   - Database ID: Stored in `NOTION_TASK_TRACKING_DB` environment variable
   - Properties:
     - Task ID (title): Unique task identifier
     - Description (rich_text): Task description
     - Status (select): Pending, In Progress, Completed, Cancelled, Needs Review
     - Priority (select): High, Medium, Low
     - Assigned Agent (select): PlannerAgent, ExecutorAgent, ReviewerAgent, NotionAgent
     - Created At (date): Task creation timestamp
     - Completed At (date): Task completion timestamp
     - Related CLI Sessions (relation): Links to related CLI sessions
     - Related Slack Conversation (relation): Link to related Slack conversation
     - Dependencies (relation): Links to dependent tasks
     - Review Status (select): Not Reviewed, Under Review, Approved, Rejected, Changes Requested

## Integration Implementation

The Notion integration is implemented in multiple languages to support different components:

1. **TypeScript Implementation (Agent System)**
   - **Core Files**: 
     - `/Volumes/Envoy/SecondBrain/libs/agents/notion/agent.ts`: NotionAgent class
     - `/Volumes/Envoy/SecondBrain/libs/agents/notion/index.ts`: Client initialization
     - `/Volumes/Envoy/SecondBrain/libs/agents/notion/databaseOperations.ts`: Database operations
     - `/Volumes/Envoy/SecondBrain/libs/agents/notion/pageOperations.ts`: Page operations
   - **Agent Integrations**:
     - `/Volumes/Envoy/SecondBrain/libs/agents/integration/notion-executor.ts`
     - `/Volumes/Envoy/SecondBrain/libs/agents/integration/notion-planner.ts`
     - `/Volumes/Envoy/SecondBrain/libs/agents/integration/notion-orchestrator.ts`
   - **Dependencies**: `@notionhq/client` package

2. **Python Implementation (Slack Integration)**
   - **Core Files**:
     - `/Volumes/Envoy/SecondBrain/slack_notion_integration/src/notion/client.py`
     - `/Volumes/Envoy/SecondBrain/setup-notion.py`
     - `/Volumes/Envoy/SecondBrain/slack_notion_integration/test_notion.py`
   - **Dependencies**: `notion_client` package

3. **JavaScript Implementation (TubeToTask)**
   - **Core Files**:
     - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/src/integrations/notion.js`
     - `/Volumes/Envoy/SecondBrain/apps/TubeToTask/setup-notion-database.js`
   - **Dependencies**: `@notionhq/client` package

## API Key Management

- Notion API keys are stored in `/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env`
- For Vercel deployments, keys are stored in Vercel Edge Config
- The system implements token-based authentication with minimal permissions

## Testing and Verification

The Notion integration includes comprehensive tests:

1. **Connection Tests**
   - `/Volumes/Envoy/SecondBrain/slack_notion_integration/test_notion.py`
   - Verifies API key retrieval and basic connectivity

2. **Agent Integration Tests**
   - `/Volumes/Envoy/SecondBrain/tests/notion-executor.test.ts`
   - Tests logging, report generation, and deployment history

## Key Functionalities

1. **Task Management**
   - Creating tasks with properties (status, priority, etc.)
   - Updating task status as agents complete work
   - Tracking task dependencies and relationships

2. **Documentation**
   - Creating detailed project documentation
   - Storing logs of agent activities
   - Recording system metrics and health data

3. **Context Persistence**
   - Storing relevant context between CLI sessions
   - Creating bridges between related tasks
   - Maintaining audit trails of all activities

4. **File Catalog**
   - Tracking all files in the SecondBrain system
   - Recording file metadata and relationships
   - Flagging files that need attention

## Error Handling

The Notion integration implements robust error handling:

1. **API Call Error Handling**
   - All API calls use try/catch blocks
   - Exponential backoff for rate limiting
   - Clear error messages for debugging

2. **Data Validation**
   - Validates all inputs before sending to the API
   - Ensures required properties exist
   - Prevents malformed requests

3. **Retry Mechanisms**
   - Implements automatic retries for transient errors
   - Preserves data during retries
   - Logs all retry attempts

## Usage Instructions

To use the Notion integration:

1. **Initialization**
   ```javascript
   const { NotionAgent } = require('./libs/agents/notion');
   
   const notionAgent = new NotionAgent({
     apiKey: process.env.NOTION_API_KEY
   });
   ```

2. **Creating Tasks**
   ```javascript
   await notionAgent.createTask({
     title: "Implement feature X",
     status: "Not Started",
     priority: "P1",
     assignedAgent: "ExecutorAgent"
   });
   ```

3. **Logging Execution**
   ```javascript
   await notionAgent.logExecution({
     command: "npm run build",
     result: "Build successful",
     status: "success",
     agent: "ExecutorAgent"
   });
   ```

4. **Creating Reports**
   ```javascript
   await notionAgent.createSystemHealthReport({
     metrics: systemMetrics,
     deployments: recentDeployments,
     errors: systemErrors
   });
   ```

## Startup Sequence

When the SecondBrain system initializes:

1. The system loads API keys from environment variables
2. It verifies connection to all required Notion databases
3. It loads any pending tasks from previous sessions
4. It creates a new session and establishes bridges to previous sessions

## Integration with CLI Session Context

The Notion integration plays a critical role in maintaining context between CLI sessions:

1. At the start of each CLI session, pending tasks are loaded from Notion
2. As tasks are completed, their status is updated in Notion
3. Context objects created during the session are linked to relevant Notion pages
4. When a CLI session ends, a summary is stored in Notion for future reference

This ensures that no context is lost between sessions, allowing for continuous progress on complex tasks.

## Security Considerations

The Notion integration implements several security measures:

1. API keys are stored securely in environment variables
2. The integration uses minimal required permissions
3. Sensitive information is never exposed in logs
4. All database IDs are treated as secrets

## Init Session Process

When running `./init-session.sh` or `./i`:

1. The script checks for and loads Notion API keys
2. It verifies connectivity to all required databases
3. It loads any pending tasks and context from previous sessions
4. It establishes bridges to relevant previous sessions
5. It sets up the current session for logging to Notion

This process ensures all context is properly loaded and the session is ready for productive work.

# Slack+Notion Integration with Real-Time Context Logging

This section details the enhanced Slack+Notion integration that provides real-time context logging to prevent context loss during CLI sessions, Slack conversations, or system operations.

## Integration Architecture

The Slack+Notion integration provides a robust multi-agent system with three-layer context persistence:

1. **Redis Layer (Short-term)**
   - High-speed access to active contexts
   - 100MB cache size (paid tier)
   - LRU eviction policy
   - TTL: 24 hours for context objects

2. **PostgreSQL Layer (Medium-term)**
   - Comprehensive structured storage
   - Complete relationship tracking
   - Full text preservation
   - Enhanced schema with specialized tables

3. **Pinecone Layer (Long-term)**
   - Semantic vector search capabilities
   - Complete metadata preservation
   - Chunk management for long contexts
   - Dimensions: 1536 (OpenAI) or 768 (smaller models)

## Key Components

1. **CLI Session Logger** (`src/cli/cli_session_logger.py`)
   - Core class for real-time Notion logging
   - Logs all user messages, system actions, assistant responses, and tool calls
   - Creates and maintains session bridges
   - Handles compaction events
   - Loads previous context at initialization

2. **Session Manager** (`src/cli/session_manager.py`)
   - Provides high-level API for session management
   - Initializes sessions with context restoration
   - Sets up compaction handlers
   - Manages sessions across various contexts

3. **Enhanced Slack App** (`src/slack/enhanced_app.py`)
   - Extends the base Slack app with real-time context logging to Notion
   - Integrates with CLI Session Logger for consistent persistence
   - Logs all Slack interactions as they happen
   - Handles message processing with context awareness

4. **Multi-Agent System** (`src/slack/multi_agent.py`)
   - Implements a multi-agent architecture with distinct agent roles
   - Manages agent transitions and message routing
   - Maintains context continuity across agent handoffs
   - Provides agent-specific context formatting

5. **Enhanced LangGraph Flows** (`src/langgraph/enhanced_flows.py`)
   - Augments LangGraph with real-time logging capabilities
   - Wraps workflow nodes with persistent logging
   - Ensures all workflow transitions are tracked
   - Preserves context during complex multi-step operations

6. **Three-Layer Context Persistence** (`context_manager.py`)
   - Implements Redis (short-term), PostgreSQL (medium-term), and Pinecone (long-term) storage
   - Provides unified API for context operations
   - Ensures redundancy and fault tolerance
   - Supports semantic search and relationship tracking

## Implementation Details

1. **Real-Time Logging**
   - All interactions are logged to Notion AS THEY HAPPEN (not after)
   - This eliminates vulnerability window where context could be lost
   - Includes transactional logging for critical operations
   - Provides background logging for non-critical operations

2. **Session Bridging**
   - Explicit links between related CLI sessions
   - Bidirectional references for navigating context chain
   - CLI-to-Slack bridge for cross-platform context
   - Agent-to-agent context transfer

3. **Compaction Handling**
   - Preserves context during compaction events
   - Creates a new session that bridges to the previous one
   - Maintains semantic relationships during compaction
   - Ensures no information is lost during truncation

4. **Multi-Agent Architecture**
   - **PlannerAgent**: Uses Claude 3.7 Sonnet/Opus for strategic planning
   - **ExecutorAgent**: Uses GPT-4.1 Mini (1M context) for implementation
   - **ReviewerAgent**: Uses OpenAI o3 for cost-effective review
   - **NotionAgent**: Uses GPT-4.1 Mini for structured data management

5. **Context Preservation ("NEVER TRUNCATE" Principle)**
   - NEVER truncate or simplify context
   - Always preserve full surrounding context (±5 paragraphs minimum)
   - Maintain speaker identification and emotional markers
   - Preserve chronological integrity of content

## System Usage

### Start the Enhanced Slack App

```bash
python slack_notion_integration/start_enhanced_slack_app.py
```

### Start the Multi-Agent System

```bash
python slack_notion_integration/start_multi_agent_system.py
```

### Setup Notion Databases

```bash
python slack_notion_integration/setup_notion_databases.py
```

### Test the Integration

```bash
python slack_notion_integration/test_enhanced_slack_integration.py
```

### CLI Integration

```bash
# Initialize CLI session when starting Claude
SESSION_ID=$(python cli_bridge.py init | grep "Initialized new CLI session" | awk '{print $5}')
echo "Using CLI session: $SESSION_ID"

# Set up compaction handler
claude_on_compaction() {
  echo "Handling compaction event..."
  python cli_bridge.py handle-compaction --reason "$1"
  echo "Compaction handled."
}

# Export handler for Claude to use
export -f claude_on_compaction
```

## Documentation Files

- `/Volumes/Envoy/SecondBrain/slack_notion_integration/README.md`: Main documentation
- `/Volumes/Envoy/SecondBrain/slack_notion_integration/IMPLEMENTATION_SUMMARY.md`: Implementation summary
- `/Volumes/Envoy/SecondBrain/slack_notion_integration/IMPLEMENTATION_ROADMAP.md`: Implementation roadmap
- `/Volumes/Envoy/SecondBrain/slack_notion_integration/CLAUDE.md`: Integration-specific Claude context

## Implementation Status

The Slack+Notion integration with real-time context logging has been implemented and verified according to the SecondBrain Reviewer Protocol. The implementation includes:

- Enhanced Slack app with real-time logging to Notion
- Multi-agent system with proper model routing
- Three-layer persistence architecture (Redis, PostgreSQL, Pinecone)
- Session bridging and compaction handling
- Comprehensive testing and verification

The implementation ensures that context is never lost during CLI sessions, Slack conversations, or system operations, following the "NEVER TRUNCATE" principle and providing robust context persistence across all usage scenarios.

## Notion MCP Bridge Implementation

### Overview
A Model Context Protocol (MCP) server implementation has been created to bypass OpenAI Codex sandbox limitations when interacting with Notion's API. This provides a reliable fallback mechanism that ensures continuous integration with Notion databases.

### Components

1. **MCP Server**
   - Location: `/Volumes/Envoy/MCP/notion-mcp-server`
   - Language: TypeScript (built with mcp-framework)
   - Starting script: `/Volumes/Envoy/MCP/start-notion-mcp.sh`
   - Endpoint: http://localhost:3500

2. **Implemented Tools**
   - `get-database-ids`: Lists all configured Notion databases
   - `create-page`: Creates pages in Notion databases

3. **Relay Implementation**
   - File: `/Volumes/Envoy/SecondBrain/lib/relayNotion.js`
   - Function: `createPageViaRelay(dbId, title, props = {})`
   - Fallback mechanism:
     1. First attempts original relay (http://localhost:4000)
     2. If that fails, uses MCP API directly
     3. Last resort: command line integration

### Integration with SecondBrain Architecture

The MCP bridge interfaces with the existing Notion integration (Blueprint 06) by maintaining backward compatibility with all existing code that uses the relay function. No changes to application code are needed - the relay function handles the fallback process transparently.

This implementation preserves all existing functionality while adding resilience against sandbox limitations.

### Key Notion Databases

These database IDs are stored in environment variables and accessible through the MCP server:

- Tasks Database: `SECONDBRAIN_TASKS_DATABASE_ID` or `NOTION_TASK_DATABASE_ID`
- File Catalog: `NOTION_CATALOG_DB_ID`
- Strategic Insights/Projects: `NOTION_PROJECT_DATABASE_ID`

### Usage Instructions

1. Ensure MCP server is running:
   ```
   /Volumes/Envoy/MCP/start-notion-mcp.sh
   ```

2. Continue using all existing code without modifications - the relay will handle the bridge functionality automatically

3. If needed, directly interact with the MCP server:
   ```
   claude cli-tool mcp notion-mcp get-database-ids
   ```

### Documentation Location

- `/Volumes/Envoy/MCP/README-UPGRADE.md`: Detailed usage instructions
- `/Volumes/Envoy/MCP/CHANGELOG-UPGRADE.md`: Implementation changes