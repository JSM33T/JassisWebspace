
import PlansClient from "./page.client";
import { createMetadata } from "@/app/lib/seo";

const plansMeta = {
  title: "Pricing — JassSpace Plans & Billing",
  description:
    "Choose the right JassSpace plan for your needs: Free, Plus, or Pro. Simple monthly billing and easy upgrades.",
  path: "/plans",
};

export const metadata = createMetadata(plansMeta);

export default function PlansPage() {
  return <PlansClient />;
}
