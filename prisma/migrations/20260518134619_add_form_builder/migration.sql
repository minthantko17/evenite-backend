-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('REGISTRATION', 'FEEDBACK');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'CHOICE', 'NUMBER', 'RATING', 'DATE', 'CHECKBOX');

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "FormType" NOT NULL,
    "title" TEXT,
    "description" TEXT,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "autoFillKey" TEXT,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldResponse" (
    "id" TEXT NOT NULL,
    "formResponseId" TEXT NOT NULL,
    "formFieldId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(65,30),
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,

    CONSTRAINT "FormFieldResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Form_eventId_type_key" ON "Form"("eventId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_order_key" ON "FormField"("formId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_id_formId_key" ON "FormField"("id", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "FormResponse_id_formId_key" ON "FormResponse"("id", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldResponse_formResponseId_formFieldId_key" ON "FormFieldResponse"("formResponseId", "formFieldId");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldResponse" ADD CONSTRAINT "FormFieldResponse_formResponseId_formId_fkey" FOREIGN KEY ("formResponseId", "formId") REFERENCES "FormResponse"("id", "formId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldResponse" ADD CONSTRAINT "FormFieldResponse_formFieldId_formId_fkey" FOREIGN KEY ("formFieldId", "formId") REFERENCES "FormField"("id", "formId") ON DELETE RESTRICT ON UPDATE CASCADE;
