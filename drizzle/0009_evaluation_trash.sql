CREATE TABLE IF NOT EXISTS `evaluation_trash` (
	`form_id` text PRIMARY KEY NOT NULL,
	`deleted_at` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `evaluation_forms`(`id`) ON UPDATE no action ON DELETE no action
);

