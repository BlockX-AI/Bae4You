import { config } from "../config";

const DIMENSIONS = 18;

export const TRAIT_KEYS = [
  "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism",
  "adventurousness", "intellect", "emotionality", "assertiveness", "enthusiasm",
  "compassion", "politeness", "industriousness", "orderliness", "volatility",
  "withdrawal", "creativity", "ambition",
] as const;

export type PersonalityObject = Partial<Record<typeof TRAIT_KEYS[number], number>>;
export type PersonalityInput  = PersonalityObject | number[];

function toVector(pv: PersonalityInput): number[] {
  if (Array.isArray(pv)) {
    const v = [...pv].slice(0, DIMENSIONS);
    while (v.length < DIMENSIONS) v.push(0);
    return v.map((n) => Math.max(0, Math.min(1, n)));
  }
  return TRAIT_KEYS.map((k) => {
    const val = (pv as PersonalityObject)[k];
    return typeof val === "number" ? Math.max(0, Math.min(1, val)) : 0;
  });
}

async function getIndex() {
  if (!config.PINECONE_API_KEY) return null;
  const { Pinecone } = await import("@pinecone-database/pinecone");
  const pc = new Pinecone({ apiKey: config.PINECONE_API_KEY });
  return pc.index(config.PINECONE_INDEX);
}

export async function upsertPersonality(
  userId: string,
  personalityVector: PersonalityInput
): Promise<void> {
  const idx = await getIndex();
  if (!idx) return;
  await idx.upsert({ records: [{ id: userId, values: toVector(personalityVector) }] });  
}

export async function deletePersonality(userId: string): Promise<void> {
  const idx = await getIndex();
  if (!idx) return;
  await idx.deleteOne({ id: userId });
}

export async function querySimilar(
  personalityVector: PersonalityInput,
  topK: number,
  excludeIds: string[]
): Promise<string[]> {
  const idx = await getIndex();
  if (!idx) return [];
  const result = await idx.query({
    vector:           toVector(personalityVector),
    topK:             topK + excludeIds.length + 1,
    includeMetadata:  false,
  });
  return (result.matches ?? [])
    .map((m) => m.id)
    .filter((id) => !excludeIds.includes(id))
    .slice(0, topK);
}

export { toVector };
