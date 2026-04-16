/*
  Warnings:

  - You are about to drop the `Greeting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Greeting";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RetroItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "sprintId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "wentWell" TEXT NOT NULL DEFAULT '',
    "couldImprove" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'went_well',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetroItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RetroSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sprintId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentiment" TEXT,
    "synopsis" TEXT,
    "patterns" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "assignedUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RetroSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActionItem_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "RetroSession_sprintId_key" ON "RetroSession"("sprintId");
