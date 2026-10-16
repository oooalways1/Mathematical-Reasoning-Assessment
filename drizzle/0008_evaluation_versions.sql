CREATE TABLE IF NOT EXISTS `evaluation_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`code` text NOT NULL,
	`grade` integer NOT NULL,
	`status` text NOT NULL,
	`version` text NOT NULL,
	`definition` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "evaluation_forms_status_check" CHECK("evaluation_forms"."status" IN ('draft','active','archived'))
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `evaluation_grade_code_idx` ON `evaluation_forms` (`grade`,`code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `evaluation_revisions` (
	`version` text PRIMARY KEY NOT NULL,
	`form_id` text NOT NULL,
	`title` text NOT NULL,
	`code` text NOT NULL,
	`grade` integer NOT NULL,
	`definition` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `evaluation_forms`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `evaluation_revision_form_idx` ON `evaluation_revisions` (`form_id`);
