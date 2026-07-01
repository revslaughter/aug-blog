import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function SummerFaire() {
  return (
    <Layout>
      <Seo
        title="Summer Faire"
        description="Antioch Urban Growers' Summer Faire — third Saturdays, June through October, in Kansas City."
        path="/summer-faire"
      />
      <ProgramSection
        title="Summer Faire"
        schedule={[{ label: "When", value: "Third Saturdays, June – October" }]}
        note="More details on this year's Faire are coming soon."
      />
    </Layout>
  );
}
