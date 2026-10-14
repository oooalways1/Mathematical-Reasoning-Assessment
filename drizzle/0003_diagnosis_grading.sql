CREATE TABLE `diagnosis_keys` (
	`grade` integer PRIMARY KEY NOT NULL,
	`answers` text NOT NULL,
	`version` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `assessments` ADD `grade` integer;--> statement-breakpoint
ALTER TABLE `assessments` ADD `submission_method` text;--> statement-breakpoint
ALTER TABLE `assessments` ADD `key_version` text;