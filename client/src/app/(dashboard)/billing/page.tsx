import { PageHeading } from "@/components/dashboard/page-heading";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <>
      <PageHeading title="Billing" description="Plans and payment details." />
      <Card className="bg-sidebar">
        <CardHeader>
          <CardTitle>Billing is unavailable</CardTitle>
          <CardDescription>You can create and edit local projects.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
