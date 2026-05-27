import { Router } from "express";
import { chat, review, breakdown, sprintPlan, healthDashboard, whiteboardAnalysis } from "../controllers/ai.controller.js";

const router = Router();

// POST /api/ai/chat          — AI project assistant chat
router.post("/chat", chat);

// POST /api/ai/review        — AI code reviewer
router.post("/review", review);

// POST /api/ai/breakdown     — AI feature → subtasks breakdown
router.post("/breakdown", breakdown);

// POST /api/ai/sprint-plan   — AI sprint planner
router.post("/sprint-plan", sprintPlan);

// POST /api/ai/health        — Live project health dashboard data
router.post("/health", healthDashboard);

// POST /api/ai/whiteboard    - AI whiteboard diagram analysis
router.post("/whiteboard", whiteboardAnalysis);

export default router;
