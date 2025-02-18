import { getSession } from "@/server/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function Profile() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex w-full flex-1 items-center space-x-3 rounded-lg px-2 py-1.5 dark:text-white">
        <Image
          src={
            session.user.image ??
            `https://avatar.vercel.sh/${session.user.email}`
          }
          width={40}
          height={40}
          alt={session.user.name ?? "User avatar"}
          className="h-6 w-6 rounded-full"
        />
        {/* <span className="cursor-default truncate text-sm font-medium">
          {session.user.name}
        </span> */}
      </div>
    </div>
  );
}
