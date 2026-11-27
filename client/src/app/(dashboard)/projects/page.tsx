import { PageHeading } from "@/components/dashboard/page-heading";
import { ProjectList } from "@/components/dashboard/project-list";

export default function ProjectsPage() {
  return (
    <>
      <PageHeading title="My Projects" description="Open and manage the projects saved in this browser." />
      <ProjectList />
    </>
  );
}
