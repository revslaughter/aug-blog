import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function ProduceSale() {
  return (
    <Layout>
      <Seo
        title="Produce Sale"
        description="Antioch Urban Growers' weekly Produce Sale — Saturdays, April through October, in Kansas City."
        path="/produce-sale"
      />
      <ProgramSection
        title="Produce Sale"
        intro="Fresh, local produce from our fields to your table."
        schedule={[
          { label: "Days", value: "Saturdays" },
          { label: "Season", value: "April – October" },
        ]}
        storeLink
        note="Hours and current availability are coming soon."
      />
    </Layout>
  );
}
