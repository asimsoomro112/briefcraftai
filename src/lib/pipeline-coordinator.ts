import {
  ClientBrief,
  GeneratedPromptData,
  PipelineJobState,
  PipelineStepId,
  PipelineStepOutput,
  ResearchNotes,
  GeminiModelId,
} from "@/types";
import {
  savePipelineJobState,
  getPipelineJobState,
  saveGeneratedPrompt,
} from "./firestore";
import {
  runResearchBatch1,
  runResearchBatch2,
  runSynthesis,
  ResearchBatch1Result,
  PipelineProgressCallback,
} from "./gemini";
import { QuotaWallError } from "./gemini-scheduler";

export interface PipelineStreamEvent {
  type: "progress" | "step_complete" | "waiting" | "quota_wall" | "complete" | "error";
  stepId?: PipelineStepId;
  stepNumber?: number;
  totalSteps?: number;
  message?: string;
  progressPercent?: number;
  waitSecondsRemaining?: number;
  quotaWallResetPacific?: string;
  quotaWallRemainingFormatted?: string;
  modelUsed?: string;
  keyMask?: string;
  data?: unknown;
  error?: string;
}

export type StreamEmitter = (event: PipelineStreamEvent) => Promise<void>;

export async function executeResumablePipeline(
  brief: ClientBrief,
  options: {
    customApiKey?: string;
    preferredModel?: GeminiModelId;
    emit: StreamEmitter;
  }
): Promise<GeneratedPromptData> {
  const briefId = brief.id;
  const clientId = brief.id;

  // 1. Check if an existing checkpoint exists in Firestore / Local cache
  let jobState: PipelineJobState | null = await getPipelineJobState(briefId);

  if (!jobState) {
    jobState = {
      briefId,
      clientId,
      status: "running",
      currentStep: "research-dimension-batch-1",
      currentStepIndex: 0,
      totalSteps: 3,
      stepOutputs: {},
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await savePipelineJobState(jobState);
  } else {
    // If resuming from paused state
    jobState.status = "running";
    jobState.updatedAt = new Date().toISOString();
    await savePipelineJobState(jobState);
  }

  const forwardProgress = async (update: Parameters<PipelineProgressCallback>[0]) => {
    await options.emit({
      type: update.isWaiting ? "waiting" : "progress",
      stepId: update.stepId,
      stepNumber: update.stepNumber,
      totalSteps: update.totalSteps,
      message: update.message,
      progressPercent: update.progressPercent,
      waitSecondsRemaining: update.waitSecondsRemaining,
      modelUsed: update.modelUsed,
      keyMask: update.keyMask,
    });
  };

  try {
    // =========================================================================
    // STEP 1: research-dimension-batch-1 (Dimensions 1–5)
    // =========================================================================
    let batch1Output: ResearchBatch1Result;

    if (jobState.stepOutputs["research-dimension-batch-1"]) {
      console.info(`[Pipeline] Resuming: Step 1 (batch 1) already completed for brief ${briefId}. Skipping.`);
      batch1Output = jobState.stepOutputs["research-dimension-batch-1"].data as ResearchBatch1Result;
      await options.emit({
        type: "progress",
        stepId: "research-dimension-batch-1",
        stepNumber: 1,
        totalSteps: 3,
        message: "Step 1/3: Creative dimensions loaded from checkpoint (cached).",
        progressPercent: 30,
      });
    } else {
      batch1Output = await runResearchBatch1(brief, {
        customApiKey: options.customApiKey,
        preferredModel: options.preferredModel,
        onProgress: forwardProgress,
      });

      const step1Record: PipelineStepOutput = {
        stepId: "research-dimension-batch-1",
        completedAt: new Date().toISOString(),
        data: batch1Output,
        modelUsed: batch1Output.modelUsed,
        keyIndexUsed: batch1Output.keyIndexUsed,
      };

      jobState.stepOutputs["research-dimension-batch-1"] = step1Record;
      jobState.currentStep = "research-dimension-batch-2";
      jobState.currentStepIndex = 1;
      jobState.updatedAt = new Date().toISOString();
      await savePipelineJobState(jobState);

      await options.emit({
        type: "step_complete",
        stepId: "research-dimension-batch-1",
        stepNumber: 1,
        totalSteps: 3,
        message: "Step 1/3 Complete: Creative dimensions researched & saved.",
        progressPercent: 35,
        modelUsed: batch1Output.modelUsed,
        keyMask: batch1Output.keyMaskUsed,
      });
    }

    // =========================================================================
    // STEP 2: research-dimension-batch-2 (Dimensions 6–10)
    // =========================================================================
    let researchNotes: ResearchNotes;

    if (jobState.stepOutputs["research-dimension-batch-2"]) {
      console.info(`[Pipeline] Resuming: Step 2 (batch 2) already completed for brief ${briefId}. Skipping.`);
      researchNotes = jobState.stepOutputs["research-dimension-batch-2"].data as ResearchNotes;
      await options.emit({
        type: "progress",
        stepId: "research-dimension-batch-2",
        stepNumber: 2,
        totalSteps: 3,
        message: "Step 2/3: Technical benchmarks loaded from checkpoint (cached).",
        progressPercent: 65,
      });
    } else {
      researchNotes = await runResearchBatch2(brief, batch1Output, {
        customApiKey: options.customApiKey,
        preferredModel: options.preferredModel,
        onProgress: forwardProgress,
      });

      const step2Record: PipelineStepOutput = {
        stepId: "research-dimension-batch-2",
        completedAt: new Date().toISOString(),
        data: researchNotes,
        modelUsed: researchNotes.fallbackModelUsed || batch1Output.modelUsed,
      };

      jobState.stepOutputs["research-dimension-batch-2"] = step2Record;
      jobState.currentStep = "synthesis";
      jobState.currentStepIndex = 2;
      jobState.updatedAt = new Date().toISOString();
      await savePipelineJobState(jobState);

      await options.emit({
        type: "step_complete",
        stepId: "research-dimension-batch-2",
        stepNumber: 2,
        totalSteps: 3,
        message: "Step 2/3 Complete: Technical benchmarks & stack synthesized.",
        progressPercent: 70,
      });
    }

    // =========================================================================
    // STEP 3: synthesis (Stage B: Master Build Prompt)
    // =========================================================================
    let synthesisResult: Omit<GeneratedPromptData, "id" | "clientId" | "createdAt">;

    if (jobState.stepOutputs["synthesis"]) {
      console.info(`[Pipeline] Resuming: Step 3 (synthesis) already completed for brief ${briefId}.`);
      synthesisResult = jobState.stepOutputs["synthesis"].data as Omit<
        GeneratedPromptData,
        "id" | "clientId" | "createdAt"
      >;
    } else {
      synthesisResult = await runSynthesis(brief, researchNotes, {
        customApiKey: options.customApiKey,
        preferredModel: options.preferredModel,
        onProgress: forwardProgress,
      });

      const step3Record: PipelineStepOutput = {
        stepId: "synthesis",
        completedAt: new Date().toISOString(),
        data: synthesisResult,
        modelUsed: synthesisResult.modelUsed,
        keyIndexUsed: synthesisResult.keyIndexUsed,
      };

      jobState.stepOutputs["synthesis"] = step3Record;
      jobState.status = "completed";
      jobState.updatedAt = new Date().toISOString();
      await savePipelineJobState(jobState);
    }

    // Construct final prompt data
    const promptId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullPromptData: GeneratedPromptData = {
      id: promptId,
      clientId: brief.id,
      ...synthesisResult,
      createdAt: new Date().toISOString(),
    };

    // Persist to prompt collections
    await saveGeneratedPrompt(fullPromptData);

    await options.emit({
      type: "complete",
      stepNumber: 3,
      totalSteps: 3,
      message: "Pipeline completed! Master build prompt generated successfully.",
      progressPercent: 100,
      data: fullPromptData,
    });

    return fullPromptData;
  } catch (err: unknown) {
    if (err instanceof QuotaWallError) {
      jobState.status = "paused_quota_wall";
      jobState.pauseReason = err.message;
      jobState.resumeAt = err.resetIsoString;
      jobState.quotaWallResetPacific = err.resetTimePacific;
      jobState.quotaWallRemainingFormatted = err.formattedRemaining;
      jobState.updatedAt = new Date().toISOString();
      await savePipelineJobState(jobState);

      await options.emit({
        type: "quota_wall",
        stepNumber: jobState.currentStepIndex + 1,
        totalSteps: 3,
        message: err.message,
        quotaWallResetPacific: err.resetTimePacific,
        quotaWallRemainingFormatted: err.formattedRemaining,
        progressPercent: Math.round(((jobState.currentStepIndex) / 3) * 100),
      });

      throw err;
    }

    // General error: mark job error and rethrow
    const errMsg = err instanceof Error ? err.message : "Unexpected pipeline failure.";
    jobState.status = "error";
    jobState.errorMessage = errMsg;
    jobState.updatedAt = new Date().toISOString();
    await savePipelineJobState(jobState);

    await options.emit({
      type: "error",
      error: errMsg,
    });

    throw err;
  }
}
