import Image from "next/image";

export default function NotFoundSite() {
  return (
    <div className="mt-20 flex flex-col items-center space-x-4">
      <h1 className="font-dashboard-heading text-4xl ">404</h1>
      <Image
        alt="missing site"
        src="https://illustrations.popsy.co/gray/falling.svg"
        width={400}
        height={400}
        className=""
      />
      <Image
        alt="missing site"
        src="https://illustrations.popsy.co/white/falling.svg"
        width={400}
        height={400}
        className="hidden "
      />
      <p className="text-lg text-stone-500 ">
        Site does not exist, or you do not have permission to view it
      </p>
    </div>
  );
}
