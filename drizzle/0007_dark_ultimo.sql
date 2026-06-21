CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`promotionId` int NOT NULL,
	`memberId` int,
	`isUsed` int NOT NULL DEFAULT 0,
	`usedAt` timestamp,
	`usedForAppointmentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `memberPromotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`promotionId` int NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberPromotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`offerType` enum('free_service','discount_percentage','discount_amount') NOT NULL,
	`serviceType` varchar(255),
	`discountValue` decimal(10,2),
	`isActive` int NOT NULL DEFAULT 1,
	`startDate` timestamp,
	`endDate` timestamp,
	`maxUsagePerUser` int NOT NULL DEFAULT 1,
	`totalUsageLimit` int,
	`currentUsageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
