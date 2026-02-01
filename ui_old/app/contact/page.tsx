import { createMetadata } from "@/app/lib/seo";
import ContactClient from "./page.client";

const contactMeta = {
  title: "Contact JassSpace Support",
  description:
    "Reach the JassSpace team for product support, partnership opportunities, and general questions.",
  path: "/contact",
};

export const metadata = createMetadata(contactMeta);

export default function ContactPage() {
  return <ContactClient />;
}
