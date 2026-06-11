CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`phoneNumber` varchar(20) NOT NULL,
	`appointmentDate` date NOT NULL,
	`timeSlot` varchar(5) NOT NULL,
	`notified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
