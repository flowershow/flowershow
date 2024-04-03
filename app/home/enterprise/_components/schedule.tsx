import { Button } from "@/components/button";

export default function Schedule() {
    return (
        <div className="relative pt-16 pb-20 px-4 sm:px-6 lg:pb-28 lg:px-8" id="contact">
            <div className="relative max-w-7xl mx-auto">
                <div className="text-center">
                    <h2 className="tracking-tight font-semibold text-4xl">
                        Contact us
                    </h2>
                    <p className="mt-3 max-w-2xl mx-auto text-xl text-slate-400 sm:mt-4">
                        Get the answers you need today. Join thousands of happy customers.
                    </p>
                </div>
                <div className="flex justify-center mt-10 max-w-lg mx-auto">
                    <Button
                        href="https://calendar.app.google/LT4acVdKn3Cxm2MXA"
                    >
                        Schedule a free call
                    </Button>
                </div>
            </div>
        </div>
    );
}
