import Layout from "../components/layout";
import Seo from "../components/seo";
import ProgramSection from "../components/programSection";

export default function Compost() {
  return (
    <Layout>
      <Seo
        title="Compost Program"
        description="Antioch Urban Growers' Compost Program and soil/compost offerings in Kansas City."
        path="/compost"
      />
      <ProgramSection
        title="Compost Program"
        intro="Our compost program and soil/compost offerings."
        note="Full details are coming soon."
      />
    </Layout>
  );
}
