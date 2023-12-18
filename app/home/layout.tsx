import { ReactNode } from "react";


export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        /* temporary add mt and mb, later add nav and footer */
        <div className="container mx-auto px-2 md:px-4 lg:px-10 my-10">
            {children}
        </div>
    );
}
