import Layout from "../components/layout";
import Seo from "../components/seo";

export default function About() {
  return (
    <Layout>
      <Seo
        title="About"
        description="Antioch Urban Growers is urban agriculture done in community — a North of the River gem in Kansas City, growing people from seed to harvest in soil done right."
        path="/about"
      />
      <article>
        <header>
          <h1>About</h1>
        </header>
        <div className="article-content">
          <p>Taking over the world, one back yard at a time!</p>
          <p>
            Antioch Urban Growers is urban agriculture done in Community. We are
            a North of the River in Kansas City, Missouri gem. We grow people in
            the world of Discovery from seed to harvest in soil done right. Our
            focus on the soil gives us the past, the present and the future.
            What Antioch Urban Growers is doing with the future will empower
            you. We believe that we are here to serve you in taking every day,
            possibly every breath, creating the future of our dreams.
          </p>
          <p>
            Experience cultures with our Mediterranean grapes and figs, get your
            hands soily young people! Considering alternative career paths? Walk
            with the ducks, geese, bunnies, turkey, goats, pigs and about 100
            trillion microbes. Pictures are worth a thousand words. Come view
            our photo album!
          </p>
          <h2>Our Commitments</h2>
          <ol>
            <li>Empower &amp; Honor Each Other</li>
            <li>Everyone has Complete Body Autonomy</li>
            <li>Listen Fully &amp; Generously</li>
          </ol>
        </div>
      </article>
    </Layout>
  );
}
