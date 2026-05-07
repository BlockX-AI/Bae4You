const BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://baebackend-production.up.railway.app";

let _jwt: string | null = null;

export function setJwt(token: string) {
  _jwt = token;
  if (typeof window !== "undefined") localStorage.setItem("bae4u_jwt", token);
}

export function getJwt(): string | null {
  if (_jwt) return _jwt;
  if (typeof window !== "undefined") {
    _jwt = localStorage.getItem("bae4u_jwt");
  }
  return _jwt;
}

export function clearJwt() {
  _jwt = null;
  if (typeof window !== "undefined") localStorage.removeItem("bae4u_jwt");
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const jwt = token ?? getJwt();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)              => req<T>("GET",    path),
  post:   <T>(path: string, body: unknown) => req<T>("POST",   path, body),
  put:    <T>(path: string, body: unknown) => req<T>("PUT",    path, body),
  delete: <T>(path: string)              => req<T>("DELETE",  path),
};

// ── Auth ────────────────────────────────────────────────
export async function getNonce(address: string): Promise<string> {
  const data = await api.get<{ nonce: string }>(`/auth/nonce/${address}`);
  return data.nonce;
}

export async function siweVerify(message: string, signature: string): Promise<string> {
  const data = await api.post<{ accessToken?: string; token?: string }>(
    "/auth/siwe",
    { message, signature }
  );
  return (data.accessToken ?? data.token ?? "") as string;
}

// ── Users ───────────────────────────────────────────────
export async function getMe() {
  return api.get<any>("/users/me");
}

export async function updateMe(body: Record<string, unknown>) {
  return api.put<any>("/users/me", body);
}

// ── Pets ────────────────────────────────────────────────
export async function getPets(params?: { limit?: number; page?: number; country?: string }) {
  const page    = params?.page ?? 1;
  const limit   = params?.limit ?? 20;
  const country = params?.country ? `&country=${params.country}` : "";
  return api.get<any>(`/pets/?page=${page}&limit=${limit}${country}`);
}

export async function getPet(tokenId: number) {
  return api.get<any>(`/pets/${tokenId}`);
}

export async function getPortfolio(walletAddress: string) {
  return api.get<any>(`/pets/portfolio/${walletAddress}`);
}

export async function getPetHistory(tokenId: number) {
  return api.get<any>(`/pets/history/${tokenId}`);
}

export async function getWishlist() {
  return api.get<any>("/pets/wishlist");
}

export async function addToWishlist(targetTokenId: number, note?: string) {
  return api.post<any>("/pets/wishlist", { targetTokenId, note });
}

// ── On-chain actions (relay — backend handles gas) ───────
export async function relayBuyPet(tokenId: number) {
  return api.post<any>(`/actions/buy/${tokenId}`, {});
}

export async function relayLockPet(tokenId: number, durationHours: number) {
  return api.post<any>(`/actions/lock/${tokenId}`, { durationHours });
}

export async function relayGiftCash(targetTokenId: number, amountPcash: string) {
  return api.post<any>("/actions/gift", { targetTokenId, amountPcash });
}

export async function setupWallet(walletType: "custodial" | "cdp" = "custodial") {
  return api.post<any>("/actions/setup-wallet", { walletType });
}

// ── Matches ─────────────────────────────────────────────
export async function getMatches() {
  return api.get<any>("/matches/");
}

export async function getDiscover(limit = 10, country?: string) {
  const c = country ? `&country=${country}` : "";
  return api.get<any>(`/matches/discover?limit=${limit}${c}`);
}

// ── Bonus ────────────────────────────────────────────────
export async function getBonusStatus() {
  return api.get<any>("/bonus/status");
}

export async function likeUser(targetUserId: string) {
  return api.post<any>(`/matches/like/${targetUserId}`, {});
}

export async function passUser(targetUserId: string) {
  return api.post<any>(`/matches/pass/${targetUserId}`, {});
}

// ── Messages ─────────────────────────────────────────────
export async function getMessages(matchId: string) {
  return api.get<any>(`/messages/${matchId}`);
}

// ── Rankings ─────────────────────────────────────────────
export async function getRankings() {
  return api.get<any>("/rankings/global");
}

// ── Push token ───────────────────────────────────────────
export async function registerPushToken(token: string, platform: "ios" | "android") {
  return api.post<any>("/users/me/push-token", { token, platform });
}

// ── Bonus ────────────────────────────────────────────────
export async function claimBonus() {
  return api.post<any>("/bonus/claim", {});
}
