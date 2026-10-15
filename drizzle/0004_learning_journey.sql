CREATE TABLE `admin_attempts` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`assessment_id` text NOT NULL,
	`question_id` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`latest_answer` text DEFAULT '' NOT NULL,
	`correct` integer DEFAULT false NOT NULL,
	`completed_at` text,
	`teacher_note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_assessment_question_idx` ON `learning_progress` (`assessment_id`,`question_id`);--> statement-breakpoint
ALTER TABLE `assessments` ADD `feedback` text;