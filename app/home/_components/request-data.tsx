import { CTASection } from "@/components/CTA-section";
import RequestDataButton from "@/components/request-data-button";
import RequestDataModal from "@/components/modal/request-data";

export function RequestData() {
  return (
    <CTASection
      id="request-data"
      title="Not finding the data you need?"
      subtitle="We can get it for you!"
      description="Why spend hours searching when our data experts can do it for you? Outsource your data search to our team of experts and stay focused on your business goals. With our Premium Data Service, we’ll source the exact data you need – whether it’s additional or customized datasets. Our team ensures accuracy, regular updates, and seamless integration into your workflow."
      filled
    >
      <RequestDataButton>
        <RequestDataModal />
      </RequestDataButton>
    </CTASection>
  );
}
