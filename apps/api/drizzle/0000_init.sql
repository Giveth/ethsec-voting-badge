CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" text NOT NULL,
	"holder_wallet" text NOT NULL,
	"signature" text NOT NULL,
	"signature_payload_json" jsonb NOT NULL,
	"ciphertext" text NOT NULL,
	"ciphertext_hash" text NOT NULL,
	"nonce" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_token_id_unique" UNIQUE("token_id")
);
