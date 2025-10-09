import Image from "next/image";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div>
      <Link href="/" className="flex justify-center items-center">
        <Image
          src={"/logo.png"}
          alt="Travel"
          width={210}
          height={50}
          className="w-36 lg:w-52 h-auto mt-10"
        />
      </Link>
      <div>{children}</div>
    </div>
  );
};

export default AuthLayout;
