-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_formId_fkey";

-- DropForeignKey
ALTER TABLE "FormFieldResponse" DROP CONSTRAINT "FormFieldResponse_formFieldId_formId_fkey";

-- DropForeignKey
ALTER TABLE "FormFieldResponse" DROP CONSTRAINT "FormFieldResponse_formResponseId_formId_fkey";

-- DropForeignKey
ALTER TABLE "FormResponse" DROP CONSTRAINT "FormResponse_formId_fkey";

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldResponse" ADD CONSTRAINT "FormFieldResponse_formResponseId_formId_fkey" FOREIGN KEY ("formResponseId", "formId") REFERENCES "FormResponse"("id", "formId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormFieldResponse" ADD CONSTRAINT "FormFieldResponse_formFieldId_formId_fkey" FOREIGN KEY ("formFieldId", "formId") REFERENCES "FormField"("id", "formId") ON DELETE CASCADE ON UPDATE CASCADE;
