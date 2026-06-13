CREATE TABLE `phoneNumbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`bookingCount` int NOT NULL DEFAULT 0,
	`lastBookingDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phoneNumbers_id` PRIMARY KEY(`id`),
	CONSTRAINT `phoneNumbers_phoneNumber_unique` UNIQUE(`phoneNumber`)
);
