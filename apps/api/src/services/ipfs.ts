import { config } from "../config";

const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const GATEWAY         = "https://gateway.pinata.cloud/ipfs";

export async function uploadToIPFS(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!config.PINATA_JWT) {
    throw new Error("PINATA_JWT not configured — add it to .env to enable photo uploads");
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append("pinataOptions",  JSON.stringify({ cidVersion: 1 }));
  form.append("pinataMetadata", JSON.stringify({ name: filename }));

  const res = await fetch(PINATA_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { IpfsHash: string };
  return json.IpfsHash;
}

export function ipfsGatewayUrl(cid: string): string {
  return `${GATEWAY}/${cid}`;
}
