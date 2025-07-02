import { ReactNode, Suspense } from "react";
import Profile from "@/components/profile";
import Nav from "@/components/dashboard-nav";
import Footer from "@/components/dashboard-footer";
import Feedback from "@/components/feedback";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] grid-rows-[auto_1fr_auto]">
      <Feedback />
      <Nav>
        <Suspense fallback={<div>Loading...</div>}>
          <Profile />
        </Suspense>
      </Nav>
      <div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
