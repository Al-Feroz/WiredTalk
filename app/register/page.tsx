"use client";
import CloseIcon from "@mui/icons-material/Close";
import Header from "@/components/Header/Header";
import axios, { AxiosResponse } from "axios";
import { useState } from "react";
import { NextPage } from "next";

const Login: NextPage = () => {
  const [ErrorMessage, setErrorMessage] = useState<string>();
  const [GotError, setGotError] = useState<boolean>(false);
  const [UserEmail, setUserEmail] = useState<string>("");
  const [UserName, setUserName] = useState<string>("");
  const [UserPwd, setUserPwd] = useState<string>("");
  const [ConfPwd, setConfPwd] = useState<string>("");
  const emailValidator = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const pwdValidator =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/;

  const registerUser = () => {
    if (UserName.trim() === "" || UserName.length <= 5) {
      setErrorMessage("Username must greater than 5 letters.");
      return setGotError(true);
    } else if (!emailValidator.test(UserEmail)) {
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

      axios.post("http://localhost:5000/api/v1/user/register/", {
        name: UserName,
        email: UserEmail,
        pwd: UserPwd,
      }).then((res: AxiosResponse)=>{
        console.log(res);
      }).catch(err =>{
        console.log(err);
      });
    }
  };

  return (
    <main>
      <Header />
      <div>
        <div
          className={
            !GotError
              ? "hidden"
              : "block" +
                " flex w-fit px-5 py-3 items-center bg-red-700 rounded-lg text-white mt-5 mx-auto"
          }
        >
          <p>{ErrorMessage}</p>
          <CloseIcon
            onClick={() => {
              setGotError(false);
            }}
          />
        </div>
      </div>
      <section className="sm:w-full sm:my-0  md:w-[70%] md:my-5 lg:w-[60%] xl:w-[40%] 2xl:w-[30%] mx-auto bg-white px-10 py-5 border rounded-md">
        <h1 className="text-xl text-center pt-5 pb-2">REGISTER</h1>
        <div>
          <div className="my-5 bg-gray-200 sm:w-fit md:w-[80%] py-2 px-5 rounded-md mx-auto">
            <label className="text-sm">Name:</label>
            <input
              onChange={(e) => {
                setUserName(e.target.value);
              }}
              className="ms-5 outline-none bg-transparent"
              type="text"
              placeholder="Jhon Doe"
            />
          </div>
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
          <div className="text-center mt-8 mb-5">
            <button
              className="bg-blue-700 py-3 px-8 rounded-lg text-white"
              onClick={registerUser}
            >
              Register
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
