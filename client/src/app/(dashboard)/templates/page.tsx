import { PageHeading } from "@/components/dashboard/page-heading";
import { TemplatePicker } from "@/components/dashboard/template-picker";

export default function TemplatesPage() {
  return (
    <>
      <PageHeading title="Templates" description="Choose a format to start your next video." />
      <TemplatePicker />
    </>
  );
}
