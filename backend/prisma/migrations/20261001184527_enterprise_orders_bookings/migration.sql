-- Extend Order with delivery and payment details.
ALTER TABLE "Order"
    ADD COLUMN "deliveryType" TEXT NOT NULL DEFAULT 'HOME_DELIVERY',
    ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "city" TEXT,
    ADD COLUMN "neighborhood" TEXT,
    ADD COLUMN "streetAddress" TEXT,
    ADD COLUMN "roomNumber" TEXT,
    ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';

UPDATE "Order" AS orders
SET "customerName" = COALESCE(users."name", 'Guest'),
    "status" = CASE WHEN orders."status" = 'PLACED' THEN 'PENDING' ELSE orders."status" END,
    "subtotal" = orders."total"
FROM "User" AS users
WHERE users."id" = orders."userId";

-- Allow order items to remain when their food item is removed.
ALTER TABLE "OrderItem"
    ALTER COLUMN "foodId" DROP NOT NULL,
    ADD CONSTRAINT "OrderItem_foodId_fkey"
        FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend Room with booking and display details.
ALTER TABLE "Room"
    ALTER COLUMN "type" SET DEFAULT 'STANDARD',
    ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Alder Room',
    ADD COLUMN "hasEnsuiteBathroom" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isBooked" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

UPDATE "Room"
SET "isBooked" = ("status" = 'BOOKED'),
    "name" = 'Room ' || "roomNumber";

ALTER TABLE "Room" DROP COLUMN "status";

CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
