import {
    Briefcase, FileText, FolderCode, HelpCircle, House, Image,
    Mail, Music, Shield, UserCircle, Wrench, type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
    href: string;
    label: string;
    description: string;
    icon: LucideIcon;
};

export type NavigationGroup = {
    id: string;
    label: string;
    icon: LucideIcon;
    items: NavigationItem[];
};

export const siteDestinations = {
    home: { href: '/', label: 'Home', description: 'Start exploring my webspace', icon: House },
    projects: { href: '/projects', label: 'Projects', description: 'Explore my engineering projects', icon: FolderCode },
    services: { href: '/services', label: 'Services', description: 'Find engineering support for your next project', icon: Briefcase },
    blog: { href: '/blog', label: 'Blog', description: 'Read my latest posts and updates', icon: FileText },
    gallery: { href: '/gallery', label: 'Gallery', description: 'Explore my photography and artwork', icon: Image },
    music: { href: '/music', label: 'Music', description: 'Listen to my music collection', icon: Music },
    about: { href: '/about', label: 'About', description: 'Learn about me and my work', icon: UserCircle },
    uses: { href: '/uses', label: 'Uses', description: 'Tools, gear, and software I use daily', icon: Wrench },
    contact: { href: '/contact', label: 'Contact', description: 'Get in touch about a project or say hello', icon: Mail },
    faq: { href: '/faq', label: 'FAQ', description: 'Answers to common questions', icon: HelpCircle },
    privacy: { href: '/privacy', label: 'Privacy Policy', description: 'How this site handles your data', icon: Shield },
} satisfies Record<string, NavigationItem>;

const work: NavigationGroup = {
    id: 'work', label: 'Work', icon: Briefcase,
    items: [siteDestinations.projects, siteDestinations.services],
};

const explore: NavigationGroup = {
    id: 'explore', label: 'Explore', icon: FileText,
    items: [siteDestinations.blog, siteDestinations.gallery, siteDestinations.music],
};

const about: NavigationGroup = {
    id: 'about', label: 'About', icon: UserCircle,
    items: [siteDestinations.about, siteDestinations.uses, siteDestinations.contact],
};

// Pals stays out of promoted navigation until its biographies are verified.
// See docs/website-improvement-todos.md, item 9.
export const primaryNavigation: (NavigationItem | NavigationGroup)[] = [
    siteDestinations.home,
    explore,
    work,
    about,
];

// Mobile and footer include Home in the first section because they do not render
// the desktop's standalone Home entry. The three content groups otherwise match.
export const navigationSections: NavigationGroup[] = [
    {
        id: 'explore', label: 'Explore', icon: House,
        items: [siteDestinations.home, ...explore.items],
    },
    work,
    about,
];

export const footerUtilityLinks = [siteDestinations.faq, siteDestinations.privacy];

export const homeNavigationLinks = [
    siteDestinations.about, siteDestinations.projects, siteDestinations.blog,
    siteDestinations.gallery, siteDestinations.music,
];

export const resumeNavigationLinks = [
    siteDestinations.about, siteDestinations.projects,
    siteDestinations.services, siteDestinations.contact,
];

export function isNavigationActive(pathname: string, href: string): boolean {
    const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
}

export function navigationAriaCurrent(pathname: string, href: string): 'page' | 'location' | undefined {
    if (!isNavigationActive(pathname, href)) return undefined;
    const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    return path === href ? 'page' : 'location';
}
