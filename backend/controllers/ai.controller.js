import { chatCompletion } from "../services/openai.service.js";

/* ─────────────────────────────────────────────
   POST /api/ai/chat
   Body: { prompt: string, context?: object }
   Returns: { reply: string }
 ───────────────────────────────────────────── */
export async function chat(req, res, next) {
  try {
    const { prompt, context } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "prompt is required" });
    }

    // Build a system prompt that gives the AI project context
    const systemPrompt = `You are an AI Project Assistant for DevCollab, a real-time developer collaboration platform.
You help software teams by:
- Summarising project progress and sprint status
- Identifying blockers and at-risk tasks
- Generating daily standup reports
- Breaking down features into actionable subtasks
- Answering questions about the project

${context ? `Current project context:\n${JSON.stringify(context, null, 2)}` : ""}

Keep responses concise, structured, and developer-friendly. Use bullet points and emojis where appropriate.`;

    const reply = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user",   content: prompt },
    ]);

    res.json({ reply });
  } catch (err) {
    next(err);
  }
}

/* ─────────────────────────────────────────────
   POST /api/ai/review
   Body: { code: string, language?: string }
   Returns: { score: number, issues: Array }
 ───────────────────────────────────────────── */
export async function review(req, res, next) {
  try {
    const { code, language = "javascript" } = req.body;

    if (!code?.trim()) {
      return res.status(400).json({ error: "code is required" });
    }

    const systemPrompt = `You are an expert code reviewer. Analyse the provided ${language} code and return a JSON response only — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "score": <number 1-10>,
  "issues": [
    {
      "type": "<bug|perf|security|style>",
      "severity": "<high|medium|low>",
      "text": "<clear description of the issue>"
    }
  ]
}

Scoring guide:
- 9-10: Production ready, minimal issues
- 7-8: Good code, minor improvements needed
- 5-6: Several issues, needs work before merging
- 3-4: Significant problems, major refactor needed
- 1-2: Critical bugs or security vulnerabilities

Be thorough but fair. Return at least 1 issue and at most 8 issues.`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Review this code:\n\`\`\`${language}\n${code}\n\`\`\`` },
      ],
      { temperature: 0.3, max_tokens: 1024 }
    );

    // Parse the JSON response from OpenAI
    const parsed = JSON.parse(raw);

    res.json({
      score: parsed.score,
      issues: parsed.issues,
    });
  } catch (err) {
    // If JSON parse fails, return a structured error
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned an unexpected response. Please try again." });
    }
    next(err);
  }
}

/* ─────────────────────────────────────────────
   POST /api/ai/breakdown
   Body: { feature: string }
   Returns: { tasks: Array }
 ───────────────────────────────────────────── */
export async function breakdown(req, res, next) {
  try {
    const { feature } = req.body;

    if (!feature?.trim()) {
      return res.status(400).json({ error: "feature is required" });
    }

    const systemPrompt = `You are a senior software architect helping a dev team break down features into tasks.
Given a feature description, return a JSON array of subtasks only — no markdown, no explanation outside the JSON.

Return this exact shape:
[
  {
    "title": "<short task title>",
    "description": "<1-2 sentence description>",
    "priority": "<P0|P1|P2>",
    "label": "<Frontend|Backend|AI|Design|DevOps|Docs|Setup>"
  }
]

Priority guide:
- P0: Critical, must be done first (core functionality)
- P1: Important, needed for feature completion
- P2: Nice to have, can be done later

Generate between 4 and 8 subtasks. Be specific and actionable.`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Break down this feature into subtasks: "${feature}"` },
      ],
      { temperature: 0.5, max_tokens: 1024 }
    );

    const tasks = JSON.parse(raw);

    res.json({ tasks });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned an unexpected response. Please try again." });
    }
    next(err);
  }
}

/* ─────────────────────────────────────────────
   POST /api/ai/sprint-plan
   Body: { tasks: Array, sprintDays: number }
   Returns: { plan: Array, summary: string }
 ───────────────────────────────────────────── */
export async function sprintPlan(req, res, next) {
  try {
    const { tasks, sprintDays = 14 } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "tasks array is required" });
    }

    const systemPrompt = `You are an expert agile sprint planner. Given a backlog of tasks and a sprint duration, create an optimised day-by-day sprint plan.

Return a JSON object only — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "summary": "<2-3 sentence overview of the sprint plan>",
  "totalEffort": "<e.g. 34 story points>",
  "plan": [
    {
      "day": <number>,
      "date": "<e.g. Day 1>",
      "focus": "<theme for the day>",
      "tasks": [
        {
          "title": "<task title>",
          "priority": "<P0|P1|P2>",
          "label": "<Frontend|Backend|AI|Design|DevOps|Docs|Setup>",
          "effort": "<1-8 story points>",
          "assignee": "<name>"
        }
      ]
    }
  ]
}

Rules:
- Group P0 tasks in the first half of the sprint
- Balance workload across days (max 3-4 tasks per day)
- Group related tasks on the same day
- Leave the last day for testing and buffer
- Sprint duration is ${sprintDays} days`;

    const taskList = tasks.map((t, i) =>
      `${i + 1}. [${t.priority}] ${t.title} — ${t.label} (assignee: ${t.assignee ?? "unassigned"})`
    ).join("\n");

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Create a ${sprintDays}-day sprint plan for these tasks:\n\n${taskList}` },
      ],
      { temperature: 0.4, max_tokens: 2048 }
    );

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed  = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned an unexpected response. Please try again." });
    }
    next(err);
  }
}

/* ─────────────────────────────────────────────
   POST /api/ai/health
   Body: { tasks: object (columns), members: Array }
   Returns: { healthScore, metrics, insights }
 ───────────────────────────────────────────── */
export async function healthDashboard(req, res, next) {
  try {
    const { tasks, members = [] } = req.body;

    if (!tasks || typeof tasks !== "object") {
      return res.status(400).json({ error: "tasks object is required" });
    }

    // Compute raw metrics from task data
    const allTasks    = Object.entries(tasks).flatMap(([col, list]) => list.map(t => ({ ...t, col })));
    const total       = allTasks.length;
    const done        = (tasks.done ?? []).length;
    const inProgress  = (tasks.inprogress ?? []).length;
    const inReview    = (tasks.review ?? []).length;
    const todo        = (tasks.todo ?? []).length;
    const now         = new Date();
    const overdue     = allTasks.filter(t => t.due && new Date(t.due) < now && t.col !== "done").length;
    const p0Blocked   = allTasks.filter(t => t.priority === "P0" && t.col === "todo").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Member contribution map
    const contributionMap = {};
    allTasks.forEach(t => {
      if (!t.assignee) return;
      if (!contributionMap[t.assignee]) contributionMap[t.assignee] = { total: 0, done: 0 };
      contributionMap[t.assignee].total++;
      if (t.col === "done") contributionMap[t.assignee].done++;
    });

    const memberStats = Object.entries(contributionMap).map(([name, s]) => ({
      name,
      total: s.total,
      done:  s.done,
      completion: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
    }));

    // Calculate actual task velocity over the last 7 days based on real task completion dates
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const velocity = [];
    const nowTime = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(nowTime.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];

      // Filter tasks completed on this specific day
      const count = allTasks.filter(t => {
        if (t.col !== "done") return false;
        const taskDate = t.updated_at ? new Date(t.updated_at) : (t.created_at ? new Date(t.created_at) : nowTime);
        return taskDate.toDateString() === d.toDateString();
      }).length;

      velocity.push({
        day: dayName,
        tasks: count,
      });
    }

    // Ask AI for health score + insights
    const systemPrompt = `You are a project health analyser. Given project metrics, return a JSON health report only — no markdown.

Return this exact shape:
{
  "healthScore": <number 0-100>,
  "status": "<Healthy|At Risk|Critical>",
  "insights": [
    { "type": "<positive|warning|critical>", "text": "<insight text>" }
  ]
}

Return exactly 3-4 insights. Be specific and actionable.`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project metrics:
- Total tasks: ${total}
- Done: ${done} (${completionRate}%)
- In Progress: ${inProgress}
- In Review: ${inReview}
- To Do: ${todo}
- Overdue tasks: ${overdue}
- P0 tasks still in To Do (blocked): ${p0Blocked}
- Team members: ${members.length || memberStats.length}` },
      ],
      { temperature: 0.3, max_tokens: 512 }
    );

    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const aiResult = JSON.parse(cleaned);

    res.json({
      healthScore:     aiResult.healthScore,
      status:          aiResult.status,
      insights:        aiResult.insights,
      metrics: {
        total, done, inProgress, inReview, todo,
        overdue, p0Blocked, completionRate,
      },
      memberStats,
      velocity,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned an unexpected response. Please try again." });
    }
    next(err);
  }
}

/* ─────────────────────────────────────────────
   POST /api/ai/whiteboard
   Body: { context: string, annotations: Array }
   Returns: { title, description, suggestions: Array, tasks: Array }
 ───────────────────────────────────────────── */
export async function whiteboardAnalysis(req, res, next) {
  try {
    const { context = "", annotations = [] } = req.body;

    // Build a rich prompt even if no annotations — use context or fallback to generic analysis
    const hasContent = (annotations && annotations.length > 0) || (context && context.trim());
    const analysisSubject = context?.trim() || (annotations.length > 0 ? annotations.join(", ") : "System Architecture Diagram");

    const systemPrompt = `You are an AI Software Architect assisting a development team.
Analyze the user's software diagram/architecture sketch based on their provided context and text annotations.
Even if annotations are minimal, infer the most likely architecture pattern from the context and provide useful analysis.
Return a JSON response only — no markdown, no explanation outside the JSON.

Return this exact shape:
{
  "title": "<short descriptive title of the architecture, e.g. JWT Auth Flow>",
  "description": "<2-3 sentence overview analysis of the diagram/architecture design>",
  "suggestions": [
    "<specific architecture/design improvement suggestion 1>",
    "<specific architecture/design improvement suggestion 2>",
    "<specific architecture/design improvement suggestion 3>",
    "<specific architecture/design improvement suggestion 4>"
  ],
  "tasks": [
    {
      "title": "<concrete actionable task title>",
      "priority": "<P0|P1|P2>",
      "label": "<Backend|Frontend|DevOps>"
    }
  ]
}

Generate exactly 4 high-quality suggestions and exactly 5 concrete tasks.`;

    const userContent = hasContent
      ? `Diagram context/theme: "${analysisSubject}"\nText annotations drawn on canvas: ${JSON.stringify(annotations)}`
      : `The user has drawn a diagram on the whiteboard. Based on the context "${analysisSubject}", analyze what architecture pattern this likely represents and provide recommendations.`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { temperature: 0.5, max_tokens: 1024 }
    );

    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "AI returned an unexpected response. Please try again." });
    }
    next(err);
  }
}
