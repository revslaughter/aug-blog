import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function MindfulMovement() {
  return (
    <Layout>
      <Seo
        title="Mindful Movement Series"
        description="Antioch Urban Growers' Mindful Movement Series — Saturday mornings in Kansas City."
        path="/mindful-movement"
      />
      <ProgramSection
        title="Mindful Movement Series"
        intro="New this year — start your Saturday with mindful movement in the garden."
        schedule={[{ label: "When", value: "Saturdays @ 8am, starting in June" }]}
        note="How long the series runs this year is still being finalized — check back soon."
      />
    </Layout>
  );
}
