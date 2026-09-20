export type OAuthProviderId = 'google' | 'github';

type OAuthProvider = {
    id: OAuthProviderId;
    label: string;
    available: boolean;
    className: string;
};

// UI availability; backend authorization remains enforced by the API.
export const oauthProviders: Record<OAuthProviderId, OAuthProvider> = {
    google: {
        id: 'google',
        label: 'Google',
        available: true,
        className: 'border-[#747775] bg-white text-[#1f1f1f] hover:bg-[#f2f2f2] hover:text-[#1f1f1f] dark:border-[#747775] dark:bg-white dark:hover:bg-[#f2f2f2]',
    },
    github: {
        id: 'github',
        label: 'GitHub',
        available: false,
        className: 'border-[#24292f] bg-[#24292f] text-white hover:bg-[#32383f] hover:text-white dark:border-[#57606a] dark:bg-[#24292f] dark:hover:bg-[#32383f]',
    },
};

export const oauthProviderOrder: OAuthProviderId[] = ['google', 'github'];
export const unavailableProviderMessage = 'Coming soon';

export function getSignInDescription(): string {
    const available = oauthProviderOrder.filter((id) => oauthProviders[id].available).map((id) => oauthProviders[id].label);
    const upcoming = oauthProviderOrder.filter((id) => !oauthProviders[id].available).map((id) => oauthProviders[id].label);
    const methods = available.length ? `email/password or ${available.join(' or ')}` : 'email/password';
    const comingSoon = upcoming.length ? ` ${upcoming.join(' and ')} sign-in is coming soon.` : '';
    return `You can sign in with ${methods}.${comingSoon}`;
}
