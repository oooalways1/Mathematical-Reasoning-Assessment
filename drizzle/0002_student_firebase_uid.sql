ALTER TABLE `students` ADD `firebase_uid` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `students_firebase_uid_idx` ON `students` (`firebase_uid`);

