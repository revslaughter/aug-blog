import Layout from "../components/layout";
import Seo from "../components/seo";

export default function About() {
  return (
    <Layout>
      <Seo
        title="About"
        description="Antioch Urban Growers is taking over the world one back yard at a time. Learn about our mission and commitments to our Kansas City community."
        path="/about"
      />
      <article>
        <header>
          <h1>About</h1>
        </header>
        <div>
          <p>Taking over the world, one back yard at a time!</p>
          <h2>Our Commitments</h2>
          <ol>
            <li>Empower & Honor Each Other</li>
            <li>Everyone has Complete Body Autonomy</li>
            <li>Listen Fully & Generously</li>
          </ol>
        </div>
      </article>
    </Layout>
  );
}
