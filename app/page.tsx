"use client";
import Header from "@/components/Header/Header";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { NextPage } from "next";
import Cookies from "js-cookie";

const Home: NextPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);

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
        <>
          <Header />
        </>
      )}
    </main>
  );
};

export default Home;
