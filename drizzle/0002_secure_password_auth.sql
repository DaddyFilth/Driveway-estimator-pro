ALTER TABLE `users` ADD `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD `failedLoginAttempts` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD `lockedUntil` timestamp;
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);
