-- Remove foreign keys before replacing the string primary and relation keys.
ALTER TABLE "OrderItem"
    DROP CONSTRAINT "OrderItem_orderId_fkey",
    DROP CONSTRAINT "OrderItem_foodId_fkey";
ALTER TABLE "Order"
    DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "Booking"
    DROP CONSTRAINT "Booking_userId_fkey",
    DROP CONSTRAINT "Booking_roomId_fkey";

ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "Food" DROP CONSTRAINT "Food_pkey";
ALTER TABLE "Room" DROP CONSTRAINT "Room_pkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_pkey";
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey";
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_pkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_pkey";

-- Generate new integer keys and map every existing relation to its new key.
ALTER TABLE "User" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "Food" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "Room" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "Message" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "Order" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "OrderItem" ADD COLUMN "new_id" SERIAL;
ALTER TABLE "Booking" ADD COLUMN "new_id" SERIAL;

ALTER TABLE "Order" ADD COLUMN "new_userId" INTEGER;
ALTER TABLE "OrderItem"
    ADD COLUMN "new_orderId" INTEGER,
    ADD COLUMN "new_foodId" INTEGER;
ALTER TABLE "Booking"
    ADD COLUMN "new_userId" INTEGER,
    ADD COLUMN "new_roomId" INTEGER;

UPDATE "Order" AS orders
SET "new_userId" = users."new_id"
FROM "User" AS users
WHERE users."id" = orders."userId";

UPDATE "OrderItem" AS items
SET "new_orderId" = orders."new_id"
FROM "Order" AS orders
WHERE orders."id" = items."orderId";
UPDATE "OrderItem" AS items
SET "new_foodId" = foods."new_id"
FROM "Food" AS foods
WHERE foods."id" = items."foodId";

UPDATE "Booking" AS bookings
SET "new_userId" = users."new_id"
FROM "User" AS users
WHERE users."id" = bookings."userId";
UPDATE "Booking" AS bookings
SET "new_roomId" = rooms."new_id"
FROM "Room" AS rooms
WHERE rooms."id" = bookings."roomId";

ALTER TABLE "Order"
    ALTER COLUMN "new_userId" SET NOT NULL;
ALTER TABLE "OrderItem"
    ALTER COLUMN "new_orderId" SET NOT NULL;
ALTER TABLE "Booking"
    ALTER COLUMN "new_userId" SET NOT NULL,
    ALTER COLUMN "new_roomId" SET NOT NULL;

ALTER TABLE "Order" DROP COLUMN "userId", DROP COLUMN "id";
ALTER TABLE "OrderItem" DROP COLUMN "orderId", DROP COLUMN "foodId", DROP COLUMN "id";
ALTER TABLE "Booking" DROP COLUMN "userId", DROP COLUMN "roomId", DROP COLUMN "id";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "Food" DROP COLUMN "id";
ALTER TABLE "Room" DROP COLUMN "id";
ALTER TABLE "Message" DROP COLUMN "id";

ALTER TABLE "User" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Food" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Room" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Message" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Order" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "OrderItem" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "Booking" RENAME COLUMN "new_id" TO "id";

ALTER TABLE "Order" RENAME COLUMN "new_userId" TO "userId";
ALTER TABLE "OrderItem"
    RENAME COLUMN "new_orderId" TO "orderId";
ALTER TABLE "OrderItem" RENAME COLUMN "new_foodId" TO "foodId";
ALTER TABLE "Booking"
    RENAME COLUMN "new_userId" TO "userId";
ALTER TABLE "Booking" RENAME COLUMN "new_roomId" TO "roomId";

ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
ALTER TABLE "Food" ADD CONSTRAINT "Food_pkey" PRIMARY KEY ("id");
ALTER TABLE "Room" ADD CONSTRAINT "Room_pkey" PRIMARY KEY ("id");
ALTER TABLE "Message" ADD CONSTRAINT "Message_pkey" PRIMARY KEY ("id");
ALTER TABLE "Order" ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pkey" PRIMARY KEY ("id");

ALTER TABLE "Order"
    ADD CONSTRAINT "Order_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "OrderItem_foodId_fkey"
        FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Booking_roomId_fkey"
        FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
