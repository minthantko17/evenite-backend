/*
  Warnings:

  - The `options` column on the `FormField` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `valueJson` on the `FormFieldResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FormField" DROP COLUMN "options",
ADD COLUMN     "options" TEXT[];

-- AlterTable
ALTER TABLE "FormFieldResponse" DROP COLUMN "valueJson",
ADD COLUMN     "valueArray" TEXT[];
