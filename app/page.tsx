"use client";
import SidePanel from "@/components/SidePanel/SidePanel";
import Sidebar from "@/components/Sidebar/Sidebar";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { NextPage } from "next";
import Cookies from "js-cookie";

const Home: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    if (!Cookies.get("SESSION_UUID")) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  return (
    <main>
      {loading ? (
        <div className="flex items-center justify-center bg-stone-900 w-full h-[100vh]">
          <Loader />
        </div>
      ) : (
        <div className="flex">
          <Sidebar />
          <SidePanel />
        </div>
      )}
    </main>
  );
};

export default Home;
