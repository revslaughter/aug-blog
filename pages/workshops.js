import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function Workshops() {
  return (
    <Layout>
      <Seo
        title="Sustainable Living Workshops"
        description="Antioch Urban Growers' Sustainable Living Workshops — hands-on education in Kansas City."
        path="/workshops"
      />
      <ProgramSection
        title="Sustainable Living Workshops"
        intro="New this year — hands-on sessions in sustainable living."
        schedule={[
          { label: "Spring (Mar – May)", value: "Sundays @ 1pm" },
          { label: "Summer/Fall (Jun – Oct)", value: "Saturdays @ 9am" },
        ]}
        note="Topics and sign-up details are coming soon."
      />
    </Layout>
  );
}
