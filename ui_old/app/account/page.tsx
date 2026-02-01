import AccountClient from "./page.client";
import { createMetadata } from "@/app/lib/seo";

const accountMeta = {
	title: "Account — JassSpace",
	description: "Manage your JassSpace account: profile, links, security, and billing.",
	path: "/account",
};

export const metadata = createMetadata(accountMeta);

export default function AccountPage() {
	return <AccountClient />;
}
