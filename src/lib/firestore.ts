import { app, firebaseConfig } from "./firebase";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Firestore,
} from "firebase/firestore";
import { ClientBrief, GeneratedPromptData, PipelineJobState } from "@/types";

let db: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (db) return db;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }

  try {
    db = getFirestore(app);
    return db;
  } catch (err) {
    console.warn("Firestore initialization failed, using local offline storage:", err);
    return null;
  }
}

export function isFirestoreConfigured(): boolean {
  return getFirestoreDb() !== null;
}

const LOCAL_STORAGE_CLIENTS_KEY = "briefcraft_clients_v1";
const LOCAL_STORAGE_PROMPTS_KEY = "briefcraft_prompts_v1";

function getLocalClients(): Record<string, ClientBrief> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalClients(data: Record<string, ClientBrief>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage error:", e);
  }
}

function getLocalPrompts(): Record<string, GeneratedPromptData[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROMPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalPrompts(data: Record<string, GeneratedPromptData[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PROMPTS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage error:", e);
  }
}

export async function saveClientBrief(brief: ClientBrief): Promise<void> {
  // Always update local storage for instant access
  const localClients = getLocalClients();
  localClients[brief.id] = brief;
  setLocalClients(localClients);

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const clientDocRef = doc(firestore, "clients", brief.id);
      await setDoc(clientDocRef, brief, { merge: true });
    } catch (err) {
      console.warn("Firestore write failed for client brief:", err);
    }
  }
}

export async function saveGeneratedPrompt(promptData: GeneratedPromptData): Promise<void> {
  // Always update local storage
  const localPrompts = getLocalPrompts();
  if (!localPrompts[promptData.clientId]) {
    localPrompts[promptData.clientId] = [];
  }
  localPrompts[promptData.clientId].unshift(promptData);
  setLocalPrompts(localPrompts);

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const promptDocRef = doc(firestore, `clients/${promptData.clientId}/prompts`, promptData.id);
      await setDoc(promptDocRef, promptData);
    } catch (err) {
      console.warn("Firestore write failed for prompt:", err);
    }
  }
}

export async function getAllClients(): Promise<ClientBrief[]> {
  const localClients = Object.values(getLocalClients()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const firestore = getFirestoreDb();
  if (!firestore) {
    return localClients;
  }

  try {
    const clientsCol = collection(firestore, "clients");
    const snapshot = await getDocs(clientsCol);
    if (snapshot.empty) return localClients;

    const firestoreClients: ClientBrief[] = [];
    snapshot.forEach((d) => {
      firestoreClients.push(d.data() as ClientBrief);
    });

    firestoreClients.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return firestoreClients;
  } catch (err) {
    console.warn("Firestore read failed, using local storage:", err);
    return localClients;
  }
}

export async function getPromptsForClient(clientId: string): Promise<GeneratedPromptData[]> {
  const localPrompts = getLocalPrompts()[clientId] || [];

  const firestore = getFirestoreDb();
  if (!firestore) {
    return localPrompts;
  }

  try {
    const promptsCol = collection(firestore, `clients/${clientId}/prompts`);
    const q = query(promptsCol, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return localPrompts;

    const firestorePrompts: GeneratedPromptData[] = [];
    snapshot.forEach((d) => {
      firestorePrompts.push(d.data() as GeneratedPromptData);
    });

    return firestorePrompts;
  } catch (err) {
    console.warn("Firestore query failed, using local fallback:", err);
    return localPrompts;
  }
}

export async function getLatestPromptForClient(clientId: string): Promise<GeneratedPromptData | null> {
  const list = await getPromptsForClient(clientId);
  return list.length > 0 ? list[0] : null;
}

// ==========================================
// RESUMABLE PIPELINE JOB PERSISTENCE
// ==========================================

const LOCAL_STORAGE_PIPELINE_KEY = "briefcraft_pipeline_jobs_v1";

// In-memory cache for server-side persistence
const inMemoryPipelineJobs = new Map<string, PipelineJobState>();

function getLocalPipelineJobs(): Record<string, PipelineJobState> {
  if (typeof window === "undefined") {
    const result: Record<string, PipelineJobState> = {};
    inMemoryPipelineJobs.forEach((val, key) => {
      result[key] = val;
    });
    return result;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PIPELINE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalPipelineJobs(data: Record<string, PipelineJobState>) {
  if (typeof window === "undefined") {
    Object.entries(data).forEach(([k, v]) => inMemoryPipelineJobs.set(k, v));
    return;
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_PIPELINE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage pipeline error:", e);
  }
}

export async function savePipelineJobState(job: PipelineJobState): Promise<void> {
  // Always update local storage & in-memory cache
  inMemoryPipelineJobs.set(job.briefId, job);
  const localJobs = getLocalPipelineJobs();
  localJobs[job.briefId] = job;
  setLocalPipelineJobs(localJobs);

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const jobDocRef = doc(firestore, "pipeline_jobs", job.briefId);
      await setDoc(jobDocRef, job, { merge: true });
    } catch (err) {
      console.warn("Firestore savePipelineJobState failed, cached locally:", err);
    }
  }
}

export async function getPipelineJobState(briefId: string): Promise<PipelineJobState | null> {
  const inMem = inMemoryPipelineJobs.get(briefId);
  if (inMem) return inMem;

  const localJobs = getLocalPipelineJobs();
  if (localJobs[briefId]) return localJobs[briefId];

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const jobDocRef = doc(firestore, "pipeline_jobs", briefId);
      const snapshot = await getDoc(jobDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as PipelineJobState;
        inMemoryPipelineJobs.set(briefId, data);
        return data;
      }
    } catch (err) {
      console.warn("Firestore getPipelineJobState failed:", err);
    }
  }
  return null;
}

export async function deletePipelineJobState(briefId: string): Promise<void> {
  inMemoryPipelineJobs.delete(briefId);
  const localJobs = getLocalPipelineJobs();
  delete localJobs[briefId];
  setLocalPipelineJobs(localJobs);

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const jobDocRef = doc(firestore, "pipeline_jobs", briefId);
      await deleteDoc(jobDocRef);
    } catch (err) {
      console.warn("Firestore deletePipelineJobState failed:", err);
    }
  }
}

// ==========================================
// DAILY RATE LIMIT DOC PERSISTENCE
// ==========================================

export interface DailyRateLimitDoc {
  date: string; // YYYY-MM-DD in America/Los_Angeles
  model: string;
  keyHash: string;
  callCount: number;
  lastCallTimestamp: number;
  isExhausted: boolean;
  exhaustedUntil?: number; // timestamp
  updatedAt: string;
}

const inMemoryRateLimits = new Map<string, DailyRateLimitDoc>();

export async function getDailyRateLimitDoc(docId: string): Promise<DailyRateLimitDoc | null> {
  const inMem = inMemoryRateLimits.get(docId);
  if (inMem) return inMem;

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const rateDocRef = doc(firestore, "rate_limits", docId);
      const snapshot = await getDoc(rateDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyRateLimitDoc;
        inMemoryRateLimits.set(docId, data);
        return data;
      }
    } catch (err) {
      console.warn("Firestore getDailyRateLimitDoc error:", err);
    }
  }
  return null;
}

export async function saveDailyRateLimitDoc(docId: string, record: DailyRateLimitDoc): Promise<void> {
  inMemoryRateLimits.set(docId, record);

  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const rateDocRef = doc(firestore, "rate_limits", docId);
      await setDoc(rateDocRef, record, { merge: true });
    } catch (err) {
      console.warn("Firestore saveDailyRateLimitDoc error:", err);
    }
  }
}

