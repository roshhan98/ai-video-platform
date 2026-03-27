CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now()
);
