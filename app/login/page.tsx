"use client";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { Close } from "@mui/icons-material";
import { useState } from "react";
import { NextPage } from "next";
import Cookies from "js-cookie";
import Link from "next/link";

const Login: NextPage = () => {
  const [ErrorMessage, setErrorMessage] = useState<string>();
  const [GotError, setGotError] = useState<boolean>(false);
  const [UserEmail, setUserEmail] = useState<string>("");
  const [UserPwd, setUserPwd] = useState<string>("");
  const [ConfPwd, setConfPwd] = useState<string>("");
  const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pwdValidator =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/;

  const router = useRouter();
  const loginUser = () => {
    if (!emailValidator.test(UserEmail)) {
      setErrorMessage("Enter Valid Email Address.");
      return setGotError(true);
    } else if (UserEmail.trim().length <= 12) {
      setErrorMessage("Email address is too short. Enter valid email address.");
      return setGotError(true);
    } else if (UserPwd !== ConfPwd) {
      setErrorMessage("Invalid Password!");
      return setGotError(true);
    } else if (!pwdValidator.test(UserPwd)) {
      setErrorMessage(
        "Password must contains one spacial character, one uppercase letter, one lowercase letter, one number and must be 8-16 digits long."
      );
      return setGotError(true);
    } else {
      setErrorMessage("");
      setGotError(false);

      axios
        .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/login/`, {
          email: UserEmail,
          pwd: UserPwd,
        })
        .then((res: AxiosResponse) => {
          const data = res.data;
          Cookies.set("SESSION_UUID", data?.sessionId);
          router.push("/");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  return (
    <main className="flex justify-center items-center relative w-full h-[100vh]">
      <div className="absolute top-[5%]">
        <div
          className={
            !GotError
              ? "hidden"
              : "block" +
                " flex w-fit px-5 py-3 items-center bg-red-700 rounded-lg text-white mt-5 mx-auto"
          }
        >
          <p>{ErrorMessage}</p>
          <Close
            onClick={() => {
              setGotError(false);
            }}
          />
        </div>
      </div>
      <section className="sm:w-full md:w-[70%] lg:w-[60%] xl:w-[40%] 2xl:w-[30%] mx-auto bg-white px-10 py-5 border rounded-md">
        <h1 className="text-xl text-center pt-5 pb-2">LOGIN</h1>
        <div>
          <div className="my-5 bg-gray-200 sm:w-fit md:w-[80%] py-2 px-5 rounded-md mx-auto">
            <label className="text-sm">Email:</label>
            <input
              onChange={(e) => {
                setUserEmail(e.target.value);
              }}
              className="ms-5 outline-none bg-transparent"
              type="email"
              placeholder="example@xyz.com"
            />
          </div>
          <div className="my-5 bg-gray-200 sm:w-fit md:w-[80%] py-2 px-5 rounded-md mx-auto">
            <label className="text-sm">Password:</label>
            <input
              onChange={(e) => {
                setUserPwd(e.target.value);
              }}
              className="ms-5 outline-none bg-transparent"
              type="password"
              placeholder="XXXXXXXXX"
            />
          </div>
          <div className="my-5 bg-gray-200 sm:w-fit md:w-[80%] py-2 px-5 rounded-md mx-auto">
            <label className="text-sm block">Confirm Password:</label>
            <input
              onChange={(e) => {
                setConfPwd(e.target.value);
              }}
              className="outline-none bg-transparent mt-1"
              type="password"
              placeholder="XXXXXXXXX"
            />
          </div>
          <div className="text-center">
            <button
              className="bg-blue-700 active:bg-blue-500 py-3 px-8 mt-2 mb-6 rounded-lg text-white block mx-auto"
              onClick={loginUser}
            >
              Login
            </button>
            <Link href="/register" className="text-blue-500">
              Create a new account?
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
