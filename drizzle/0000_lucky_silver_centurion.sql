CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`total_score` integer NOT NULL,
	`max_score` integer DEFAULT 100 NOT NULL,
	`domains` text NOT NULL,
	`answers` text NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assessments_student_completed_idx` ON `assessments` (`student_id`,`completed_at`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`classroom` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
