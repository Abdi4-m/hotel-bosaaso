ALTER TABLE "Food"
ADD COLUMN "category" TEXT;

ALTER TABLE "Order"
ADD COLUMN "deliveryConfirmation" TEXT;

ALTER TABLE "Booking"
ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "deliveryConfirmation" TEXT;

CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageView" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "visitorName" TEXT NOT NULL,
    "visitorEmail" TEXT,
    "pagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");
