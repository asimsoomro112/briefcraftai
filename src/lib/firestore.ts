import { app, firebaseConfig } from "./firebase";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Firestore,
} from "firebase/firestore";
import { ClientBrief, GeneratedPromptData } from "@/types";

let db: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (typeof window === "undefined") return null;

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
  return typeof window !== "undefined" && getFirestoreDb() !== null;
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
