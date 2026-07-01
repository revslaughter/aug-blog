import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function PlantSale() {
  return (
    <Layout>
      <Seo
        title="Spring Plant Sale"
        description="Antioch Urban Growers' Spring Plant Sale — March through May in Kansas City."
        path="/plant-sale"
      />
      <ProgramSection
        title="Spring Plant Sale"
        intro="Kick off the growing season with us."
        schedule={[{ label: "Season", value: "March – May" }]}
        storeLink
        note="Exact days and hours shift a bit each year — check back closer to spring for this year's schedule."
      />
    </Layout>
  );
}
