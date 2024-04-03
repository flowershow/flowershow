import { Button } from "@/components/button";
import { Heading } from "@/components/heading";

export default function Contact() {
  return (
    <>
      <Heading
        id="contact"
        heading="Contact"
        subheading="Get in touch with us"
      />
      <p className="text-center text-lg leading-8 text-primary">
        Get the answers you need today and join thousands of happy customers.
      </p>
      <div className="mx-auto mt-10 flex max-w-lg justify-center">
        <Button href="https://calendar.app.google/LT4acVdKn3Cxm2MXA">
          Schedule a free call
        </Button>
      </div>
    </>
  );
}
