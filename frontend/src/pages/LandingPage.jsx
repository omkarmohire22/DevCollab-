import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Particles from "../components/Particles";

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(160deg,#f0f1ff 0%,#f8f9ff 40%,#eef2ff 100%)" }}
    >
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full opacity-25"
        style={{ background: "radial-gradient(circle,#c7d2fe,transparent 70%)", filter: "blur(60px)", animation: "float 8s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-40 right-10 h-[400px] w-[400px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle,#ddd6fe,transparent 70%)", filter: "blur(60px)", animation: "float 10s ease-in-out 1s infinite" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: "radial-gradient(circle,#4f46e5 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
      <Particles />
      <div className="relative z-10">
        <Navbar />
        <Hero />
      </div>
    </div>
  );
}
