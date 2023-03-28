const socialProofs = [
  {
    name: "The World Bank Group",
    src: "/static/img/next/The_World_Bank_Group-300x63.png",
  },
  {
    name: "data gov",
    src: "/static/img/next/data.gov_-300x71.png",
  },
  {
    name: "FedEx",
    src: "/static/img/next/rsz_fedex-300x169.png",
  },
  {
    name: "OECD",
    src: "/static/img/next/OECD-300x76.png",
  },
];

export default function () {
  return (
    <>
      <div className="mt-24 bg-gray-50">
        <div className="text-center max-w-7xl mx-auto py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold">
            Powering data platforms worldwide
          </h2>
          <div className="flow-root mt-8 lg:mt-20">
            <div className="-mt-4 -ml-8 flex flex-wrap justify-between lg:-ml-4">
							{socialProofs.map(({ name, src }) => (
								<div key={name} className="mt-4 ml-8 flex flex-grow flex-shrink-0 lg:flex-grow-0 lg:ml-4 grayscale">
									<img
										className="h-16 object-contain"
										src={src}
										alt={name}
									/>
								</div>
							))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
