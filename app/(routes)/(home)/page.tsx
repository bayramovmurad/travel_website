import RecentProduct from "@/components/shared/recent/RecentProduct";
import Hero from "./_components/Hero";
import SectionOne from "@/components/shared/SectionOne";
import SectionTwo from "@/components/shared/SectionTwo";

export default function Home() {
  return (
    <div>
      <Hero />
      <div className="min-h-24"></div>

      <SectionOne />
      <SectionTwo />
      <RecentProduct />
  
  
    </div>
  );
}
