import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Privacy Policy – GenzyStudio",
  description: "GenzyStudio privacy policy explaining data collection, usage, and security.",
};

export default function PrivacyPolicy() {
  return (
    <section className="max-w-3xl mx-auto p-6 text-gray-200">
      <h1 className="text-3xl font-bold mb-4 text-white">Privacy Policy</h1>
      <p className="mb-4">
        Effective date: August 2026
      </p>
      <p className="mb-4">
        GenzyStudio ("we", "our", "us") is a social‑media content management application that enables users to connect their social‑media accounts, schedule posts, and generate AI‑assisted content. This Privacy Policy explains how we collect, use, disclose, and protect your information.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">Information We Collect</h2>
      <ul className="list-disc list-inside mb-4">
        <li><strong>Social‑media identifiers</strong>: Account IDs and usernames from Facebook, Instagram, LinkedIn, X/Twitter.</li>
        <li><strong>OAuth credentials</strong>: Access tokens and refresh tokens obtained via OAuth flows. These tokens are stored securely on our backend and are never exposed to the client.</li>
        <li><strong>Content you create</strong>: Drafts, scheduled posts, media uploads, and AI‑generated text that you store within GenzyStudio.</li>
        <li><strong>Analytics data</strong>: Engagement metrics such as likes, comments, and shares that you retrieve from connected platforms.</li>
        <li><strong>Technical information</strong>: IP address, browser type, operating system, and usage logs for security and performance monitoring.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">How We Use Your Information</h2>
      <ul className="list-disc list-inside mb-4">
        <li>To authenticate and interact with the connected social‑media APIs on your behalf.</li>
        <li>To schedule, publish, and manage posts across your accounts.</li>
        <li>To provide AI‑generated content suggestions and analytics.</li>
        <li>To improve the service, troubleshoot issues, and enforce security.</li>
        <li>To comply with legal obligations and respond to lawful requests.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">Data Security</h2>
      <p className="mb-4">
        OAuth access tokens are encrypted at rest and accessed only by server‑side processes. We do not store plain‑text passwords. All communication between the client and server uses HTTPS.
      </p>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">Sharing & Disclosure</h2>
      <p className="mb-4">
        We do not sell or share your personal data with third parties, except for:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Social‑media platforms, when performing actions on your behalf via OAuth.</li>
        <li>Service providers that assist with hosting, analytics, and security, under strict confidentiality agreements.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">Your Rights</h2>
      <ul className="list-disc list-inside mb-4">
        <li>Access, correct, or delete the data you have stored in GenzyStudio.</li>
        <li>Revoke OAuth permissions at any time from the respective social‑media platform.</li>
        <li>Contact us to request removal of your account and associated data.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-6 mb-2 text-white">Contact Us</h2>
      <p className="mb-4">
        If you have questions about this Privacy Policy, please email <a href="mailto:support@genzystudio.asiff.dev" className="underline">support@genzystudio.asiff.dev</a>.
      </p>
    </section>
  );
}
