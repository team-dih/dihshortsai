import { PageHeading } from "@/components/dashboard/page-heading";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeading title="Settings" description="Workspace information." />
      <Card className="bg-sidebar">
        <CardHeader>
          <CardTitle>Project storage</CardTitle>
          <CardDescription>Projects are saved in this browser. Clearing site data removes your projects.</CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
