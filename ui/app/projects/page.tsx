import { redirect } from 'next/navigation';

import { ProjectsList } from './projects-list';
import { projects } from '@/data/projects';

type ProjectsPageProps = {
    searchParams: Promise<{ project?: string | string[] }>;
};

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
    const { project } = await searchParams;
    const legacySlug = Array.isArray(project) ? project[0] : project;

    if (legacySlug) {
        const matchingProject = projects.find((item) => item.slug === legacySlug);
        redirect(matchingProject ? `/projects/${matchingProject.slug}` : '/projects');
    }

    return <ProjectsList projects={projects} />;
}
