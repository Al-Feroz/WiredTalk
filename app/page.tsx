"use client";
import SidePanel from "@/components/SidePanel/SidePanel";
import Sidebar from "@/components/Sidebar/Sidebar";
import Loader from "@/components/Loader/Loader";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { NextPage } from "next";
import Cookies from "js-cookie";

const Home: NextPage = () => {
  const [isSession, setIsSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>();
  const router = useRouter();

  useEffect(() => {
    if (!Cookies.get("SESSION_UUID")) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const sessionUUID = Cookies.get("SESSION_UUID");
    if (sessionUUID && isSession === false) {
      setIsSession(true);
      axios
        .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/profile/`, {
          sessionId: sessionUUID,
        })
        .then((res: AxiosResponse) => {
          const data = res.data;
          setUserData(data);
        })
        .catch((error) => {
          console.error("Error fetching profile:", error);
        });
    }
  }, [isSession]);

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
