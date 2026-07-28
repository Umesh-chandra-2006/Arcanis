CREATE TABLE `battles` (
	`id` varchar(36) NOT NULL,
	`player1Id` int NOT NULL,
	`player2Id` int NOT NULL,
	`winnerId` int,
	`terrain` varchar(32) NOT NULL,
	`mode` varchar(32) NOT NULL DEFAULT 'brawl',
	`turnsPlayed` int,
	`battleLog` json,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`spellIds` json NOT NULL DEFAULT ('[]'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `decks_id` PRIMARY KEY(`id`),
	CONSTRAINT `decks_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `labSlots` (
	`userId` int NOT NULL,
	`weeklySpellsUsed` int NOT NULL DEFAULT 0,
	`weeklyResetAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `labSlots_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `labSlots_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `spells` (
	`id` varchar(36) NOT NULL,
	`ownerId` int,
	`name` varchar(256) NOT NULL,
	`element` varchar(32) NOT NULL,
	`tier` enum('Basic','Advanced','Mega') NOT NULL,
	`primaryCategory` varchar(32) NOT NULL,
	`secondaryCategory` varchar(32),
	`castType` enum('Instant','Trap','Charged','Continuous','Channeled') NOT NULL,
	`castTimeMs` int NOT NULL,
	`damageMin` int NOT NULL,
	`damageMax` int NOT NULL,
	`mpCost` int NOT NULL,
	`mpMaintenancePerTurn` int,
	`willCostMin` int NOT NULL,
	`willCostMax` int NOT NULL,
	`willDrainPerTurn` int,
	`interruptionThreshold` int,
	`scalingFactor` float,
	`mpModifier` float,
	`isPhysical` boolean DEFAULT false,
	`physicalDelivery` text,
	`trapCondition` text,
	`trapVisibility` enum('visible','hidden'),
	`flavorText` text,
	`loreLine` text,
	`imageUrl` text,
	`isPlatformSpell` boolean DEFAULT false,
	`researchStatus` enum('researching','ready') NOT NULL DEFAULT 'ready',
	`researchStartedAt` timestamp,
	`researchComplexityScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spells_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summonProfiles` (
	`id` varchar(36) NOT NULL,
	`spellId` varchar(36) NOT NULL,
	`summonName` varchar(256) NOT NULL,
	`summonHp` int NOT NULL,
	`attackRating` int NOT NULL,
	`element` varchar(32) NOT NULL,
	`mode` enum('autonomous','controlled') NOT NULL,
	`behaviors` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summonProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `summonProfiles_spellId_unique` UNIQUE(`spellId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar` enum('ashen','emberveil','tidecaller','galeborn','stonewarden','voidwalker','dawnbringer','chaosborn') DEFAULT 'ashen' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `hp` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mp` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `willCap` int DEFAULT 250 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `battles` ADD CONSTRAINT `battles_player1Id_users_id_fk` FOREIGN KEY (`player1Id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `battles` ADD CONSTRAINT `battles_player2Id_users_id_fk` FOREIGN KEY (`player2Id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `battles` ADD CONSTRAINT `battles_winnerId_users_id_fk` FOREIGN KEY (`winnerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `decks` ADD CONSTRAINT `decks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labSlots` ADD CONSTRAINT `labSlots_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spells` ADD CONSTRAINT `spells_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summonProfiles` ADD CONSTRAINT `summonProfiles_spellId_spells_id_fk` FOREIGN KEY (`spellId`) REFERENCES `spells`(`id`) ON DELETE no action ON UPDATE no action;