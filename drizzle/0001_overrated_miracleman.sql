ALTER TABLE `students` ADD `access_code` text;--> statement-breakpoint
UPDATE `students` SET `access_code` = upper(hex(randomblob(8))) WHERE `access_code` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `students_access_code_idx` ON `students` (`access_code`);
