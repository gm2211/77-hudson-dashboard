-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BuildingConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "buildingNumber" TEXT NOT NULL DEFAULT '77',
    "buildingName" TEXT NOT NULL DEFAULT 'Hudson Dashboard',
    "subtitle" TEXT NOT NULL DEFAULT 'Real-time System Monitor',
    "scrollSpeed" INTEGER NOT NULL DEFAULT 30
);
INSERT INTO "new_BuildingConfig" ("buildingName", "buildingNumber", "id", "subtitle") SELECT "buildingName", "buildingNumber", "id", "subtitle" FROM "BuildingConfig";
DROP TABLE "BuildingConfig";
ALTER TABLE "new_BuildingConfig" RENAME TO "BuildingConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
