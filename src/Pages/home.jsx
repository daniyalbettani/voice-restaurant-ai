import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import StatsBar from '../components/StatsBar';
import HowItWorks from '../components/HowItWorks';
import Features from '../components/Features';
import VoiceAssistant from '../components/voiceAssistant';
import MenuSection from '../components/MenuSection';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <VoiceAssistant />
      <MenuSection />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Home;
