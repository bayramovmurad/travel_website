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
      <div className="h-24"></div>
      <RecentProduct />
      <div className="h-24"></div>
      
      <div className="min-h-96"></div>
    </div>
  );
}
