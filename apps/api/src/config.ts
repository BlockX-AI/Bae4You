import "dotenv/config";
import { z } from "zod";

const env = z.object({
  PORT:                   z.string().default("3000"),
  NODE_ENV:               z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL:           z.string(),
  REDIS_URL:              z.string(),

  JWT_SECRET:             z.string().min(32),
  JWT_REFRESH_SECRET:     z.string().min(32),
  SIWE_DOMAIN:            z.string().default("localhost"),
  SIWE_CHAIN_ID:          z.string().default("84532"),

  BASE_SEPOLIA_RPC_URL:   z.string(),
  SIGNER_PRIVATE_KEY:     z.string(),
  DEPLOYER_PRIVATE_KEY:   z.string(),

  PETS_CASH_ADDRESS:      z.string(),
  PETS_REGISTRY_ADDRESS:  z.string(),
  PETS_MARKET_ADDRESS:    z.string(),
  PETS_RANKING_ADDRESS:   z.string(),
  BAE_CARD_REGISTRY_ADDRESS:  z.string().optional(),
  BAE_CARD_MARKET_ADDRESS:    z.string().optional(),
  TOURNAMENT_ENGINE_ADDRESS:  z.string().optional(),
  COUPLE_CARD_ADDRESS:        z.string().optional(),
  CHAIN_ID:               z.string().default("84532"),

  GRAPH_API_URL:          z.string().optional(),
  TRANSAK_API_KEY:        z.string().optional(),
  TRANSAK_SECRET:         z.string().optional(),
  MOONPAY_API_KEY:        z.string().optional(),
  PINECONE_API_KEY:       z.string().optional(),
  PINECONE_INDEX:         z.string().default("bae4u-personalities"),

  SENTRY_DSN:             z.string().optional(),
  MIXPANEL_TOKEN:         z.string().optional(),

  BONUS_AMOUNT_PCASH:       z.string().default("100000000000000000000"),
  STARTING_PRICE_PCASH:     z.string().default("1000000000000000000000"),

  WALLET_ENCRYPTION_SECRET: z.string().min(32).default("bae4u_wallet_enc_secret_32_chars_min"),
  PIMLICO_API_KEY:          z.string().optional(),
  GAS_SPONSOR_PRIVATE_KEY:  z.string().optional(),

  CDP_API_KEY_ID:           z.string().optional(),
  CDP_API_KEY_SECRET:       z.string().optional(),
  CDP_PROJECT_ID:           z.string().optional(),
  CDP_WALLET_SECRET:        z.string().optional(),

  PINATA_JWT:               z.string().optional(),
  PINECONE_ENVIRONMENT:     z.string().default("us-east-1-aws"),
  PINECONE_PROJECT_ID:      z.string().optional(),

  EXPO_ACCESS_TOKEN:        z.string().optional(),
});

const parsed = env.safeParse(process.env);

if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = parsed.data;
