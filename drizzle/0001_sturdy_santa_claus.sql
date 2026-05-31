CREATE TABLE `materialPrices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zipCode` varchar(10) NOT NULL,
	`material` varchar(50) NOT NULL,
	`pricePerTon` varchar(50) NOT NULL,
	`pricePerSquareFoot` varchar(50) NOT NULL,
	`supplier` varchar(255),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp,
	CONSTRAINT `materialPrices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectShares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`contractorEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`viewCount` int DEFAULT 0,
	CONSTRAINT `projectShares_id` PRIMARY KEY(`id`),
	CONSTRAINT `projectShares_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoKey` text NOT NULL,
	`squareFeet` int,
	`depthInches` int,
	`cornerPoints` text,
	`selectedMaterial` varchar(50),
	`quantityNeeded` varchar(50),
	`pricePerUnit` varchar(50),
	`totalCost` varchar(50),
	`zipCode` varchar(10),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`previewImageUrl` text,
	`previewImageKey` text,
	`contractorEmail` varchar(320),
	`projectName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projectShares` ADD CONSTRAINT `projectShares_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;