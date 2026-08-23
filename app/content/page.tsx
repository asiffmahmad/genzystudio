import { cookies } from 'next/headers';
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { ContentPageClient } from "@/components/pages/ContentPageClient";

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Force dynamic server rendering to bypass any Vercel Edge CDN cache (by reading cookies)
  const cookieStore = await cookies();
  const _token = cookieStore.get('gs_session_token')?.value;

  return (
    <DashboardLayout>
      <ContentPageClient />
    </DashboardLayout>
  );
}
