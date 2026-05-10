import Hero from "./Hero";
import Features from "./Features";
import ScenarioAnatomy from "./ScenarioAnatomy";
import Examples from "./Examples";
import Assertions from "./Assertions";
import Platforms from "./Platforms";
import Install from "./Install";
import DocsLinks from "./DocsLinks";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <ScenarioAnatomy />
      <Assertions />
      <Examples />
      <Platforms />
      <Install />
      <DocsLinks />
    </>
  );
}
