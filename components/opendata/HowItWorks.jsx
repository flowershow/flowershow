import { Player } from '@lottiefiles/react-lottie-player';

export default function HowItWorks() {
  return (
    <section className="py-16 overflow-hidden bg-[#F6F7F8] px-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="max-w-7xl w-full">
            <div className="flex flex-wrap lg:items-center  -m-9 lg:-m-10">
              <div className="w-full md:w-1/2 p-8">
                <div className="md:max-w-md leading-loose">
                  <h2 className="mb-6 text-4xl md:text-5xl text-[#2A3342] font-bold">
                    All-in-one, next-gen SaaS experience
                  </h2>
                  <div className="mb-5 text-[#556987] text-lg font-semibold">
                    <p>
                      DataHub Open Data is a comprehensive, next-generation SaaS
                      solution that provides an all-in-one experience. It is
                      designed with simplicity in mind and offers a
                      user-friendly interface, robust features, and top-notch
                      performance.{" "}
                    </p>
                    <br />
                    <p>
                      Our goal is to make things as easy and hassle-free for you
                      as possible.
                    </p>
                  </div>
                  <div className="flex flex-wrap -m-2">
                    <div className="w-full md:w-auto p-2"></div>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-8 text-[#2A3342]">
                <div className="py-16 px-8 bg-white rounded-3xl">
                  <div className="max-w-md mx-auto">
                    <div className="flex flex-wrap -m-3">
                      <div className="w-full p-3">
                        <div className="flex flex-wrap -m-4 ">
                          <div className="flex flex-col items-center w-auto p-4">
                            <div className="inline-flex h-16 w-16 mx-auto items-center justify-center">
                              <Player
                                autoplay
                                loop
                                src="/assets/icons/mouse.json"
                                style={{ height: "80px", width: "80px" }}
                              />
                            </div>
                            <div className="w-1 h-20 mt-5 bg-orange-400 rounded-full"></div>
                          </div>
                          <div className="flex-1 p-4">
                            <h3 className="font-heading mb-3 text-3xl font-bold">
                              Sign Up
                            </h3>
                            <p className="text-xl">No credit card required.</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-full p-3">
                        <div className="flex flex-wrap -m-4">
                          <div className="flex flex-col items-center w-auto p-4">
                            <div className="inline-flex h-16 w-16 mx-auto items-center justify-center">
                              <Player
                                autoplay
                                loop
                                src="/assets/icons/stationery.json"
                                style={{ height: "80px", width: "80px" }}
                              />
                            </div>
                            <div className="w-1 h-20 mt-5 bg-orange-400 rounded-full"></div>
                          </div>
                          <div className="flex-1 p-4">
                            <h3 className="font-heading mb-3 text-3xl font-bold">
                              Choose a theme
                            </h3>
                            <p className="text-xl">Customize your portal.</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-full p-3">
                        <div className="flex flex-wrap -m-4">
                          <div className="flex flex-col items-center w-auto p-4">
                            <div className="inline-flex h-16 w-16  mx-auto items-center justify-center">
                              <Player
                                autoplay
                                loop
                                src="/assets/icons/verified.json"
                                style={{ height: "80px", width: "80px" }}
                              />
                            </div>
                            <div className="hidden w-1 h-16 bg-orange-400"></div>
                          </div>
                          <div className="flex-1 p-4">
                            <h3 className="font-heading mb-3 text-3xl font-bold">
                              Done
                            </h3>
                            <p className="text-xl">You&aposre all set!</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
