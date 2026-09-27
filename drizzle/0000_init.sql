CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"site_url" text NOT NULL,
	"base_url" text NOT NULL,
	"system" text DEFAULT '未识别' NOT NULL,
	"owner_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"invoice" boolean DEFAULT false NOT NULL,
	"pay_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_topup" double precision DEFAULT 10 NOT NULL,
	"recharge_rate" double precision DEFAULT 1 NOT NULL,
	"contact" text,
	"tagline" text,
	"claim_token" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "channels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_id" uuid NOT NULL,
	"offering_id" text,
	"visitor" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"source" text DEFAULT '手动' NOT NULL,
	"note" text,
	"status" text DEFAULT 'new' NOT NULL,
	"channel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"family" text NOT NULL,
	"tier" text NOT NULL,
	"input" double precision NOT NULL,
	"output" double precision NOT NULL,
	"cache_read" double precision NOT NULL,
	"context_k" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "offering_models" (
	"offering_id" text NOT NULL,
	"model_id" text NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "offering_models_offering_id_model_id_pk" PRIMARY KEY("offering_id","model_id")
);
--> statement-breakpoint
CREATE TABLE "offering_stats" (
	"offering_id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"latest" jsonb,
	"excluded_reason" text,
	"h24" double precision,
	"d7" double precision,
	"d30" double precision,
	"p50" integer,
	"p95" integer,
	"tps" integer DEFAULT 0 NOT NULL,
	"bars" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"daily" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_ttft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dao_price" double precision DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_parts" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" uuid NOT NULL,
	"group_name" text NOT NULL,
	"source_type" text DEFAULT '混合' NOT NULL,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claimed_text" text DEFAULT '' NOT NULL,
	"claimed_multiplier" double precision,
	"measured_multiplier" double precision,
	"multiplier_source" text DEFAULT 'manual' NOT NULL,
	"protocol" text DEFAULT 'openai-chat' NOT NULL,
	"probe_key_enc" text,
	"status" text DEFAULT 'active' NOT NULL,
	"sponsored" boolean DEFAULT false NOT NULL,
	"upstream_supply_id" text,
	"upstream_confidence" integer,
	"upstream_disclosed" boolean DEFAULT false NOT NULL,
	"next_probe_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_verify_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offering_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"text" text NOT NULL,
	"delta" double precision
);
--> statement-breakpoint
CREATE TABLE "probe_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offering_id" text NOT NULL,
	"model_id" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"state" text NOT NULL,
	"ttft_ms" integer,
	"total_ms" integer,
	"tps" double precision,
	"http_status" integer,
	"error_class" text,
	"error" text,
	"region" text DEFAULT 'local' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"code" text NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" uuid,
	"author_name" text NOT NULL,
	"rating" integer NOT NULL,
	"text" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"events" jsonb DEFAULT '["down","price","verify"]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"reputation" integer DEFAULT 60 NOT NULL,
	"deals" integer DEFAULT 0 NOT NULL,
	"response_mins" integer DEFAULT 30 NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_items" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"title" text NOT NULL,
	"family" text NOT NULL,
	"source_type" text NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cny_per_usd" double precision NOT NULL,
	"settlement" text NOT NULL,
	"min_order" text NOT NULL,
	"rpm" integer DEFAULT 0 NOT NULL,
	"concurrency" integer DEFAULT 0 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"after_sales" text DEFAULT '' NOT NULL,
	"stock" text DEFAULT '充足' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"probe" jsonb,
	"verification" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offering_id" text NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"score" integer NOT NULL,
	"mystery" boolean DEFAULT false NOT NULL,
	"checks" jsonb NOT NULL,
	"iq_html" text
);
--> statement-breakpoint
CREATE TABLE "wanted_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid,
	"author_slug" text,
	"title" text NOT NULL,
	"family" text NOT NULL,
	"models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"volume" text NOT NULL,
	"target" text NOT NULL,
	"settlement" text DEFAULT '面议' NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT '开放报价' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"approved" boolean DEFAULT true NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wanted_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"supply_id" text,
	"offer" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "welfare" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_models" ADD CONSTRAINT "offering_models_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_models" ADD CONSTRAINT "offering_models_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offering_stats" ADD CONSTRAINT "offering_stats_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_events" ADD CONSTRAINT "price_events_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "probe_results" ADD CONSTRAINT "probe_results_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_items" ADD CONSTRAINT "supply_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_posts" ADD CONSTRAINT "wanted_posts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_responses" ADD CONSTRAINT "wanted_responses_post_id_wanted_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wanted_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wanted_responses" ADD CONSTRAINT "wanted_responses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "welfare" ADD CONSTRAINT "welfare_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_at_index" ON "audit_logs" USING btree ("at");--> statement-breakpoint
CREATE INDEX "channels_status_index" ON "channels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "channels_owner_id_index" ON "channels" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "clicks_channel_id_at_index" ON "clicks" USING btree ("channel_id","at");--> statement-breakpoint
CREATE INDEX "login_codes_email_created_at_index" ON "login_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_sent_at_index" ON "notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "offerings_channel_id_index" ON "offerings" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "offerings_next_probe_at_index" ON "offerings" USING btree ("next_probe_at");--> statement-breakpoint
CREATE INDEX "price_events_offering_id_at_index" ON "price_events" USING btree ("offering_id","at");--> statement-breakpoint
CREATE INDEX "probe_results_offering_id_checked_at_index" ON "probe_results" USING btree ("offering_id","checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_channel_id_code_index" ON "promo_codes" USING btree ("channel_id","code");--> statement-breakpoint
CREATE INDEX "reviews_channel_id_created_at_index" ON "reviews" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_user_id_channel_id_index" ON "subscriptions" USING btree ("user_id","channel_id");--> statement-breakpoint
CREATE INDEX "verification_runs_offering_id_checked_at_index" ON "verification_runs" USING btree ("offering_id","checked_at");