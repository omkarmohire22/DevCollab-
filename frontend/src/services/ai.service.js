const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export async function chatWithAI(prompt, context = null) {
  return post("/ai/chat", { prompt, context });
}

export async function reviewCode(code, language = "javascript") {
  return post("/ai/review", { code, language });
}

export async function breakdownFeature(feature) {
  return post("/ai/breakdown", { feature });
}

export async function generateSprintPlan(tasks, sprintDays = 14) {
  return post("/ai/sprint-plan", { tasks, sprintDays });
}

export async function getProjectHealth(tasks, members = []) {
  return post("/ai/health", { tasks, members });
}

export async function analyzeWhiteboard(context, annotations = []) {
  return post("/ai/whiteboard", { context, annotations });
}
