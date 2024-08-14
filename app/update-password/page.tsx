"use client";
import axios, { AxiosResponse } from "axios";
import { Close } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NextPage } from "next";
import Cookies from "js-cookie";

const UpdatePassword: NextPage = () => {
  const [ErrorMessage, setErrorMessage] = useState<string>();
  const [GotError, setGotError] = useState<boolean>(false);
  const [isSession, setIsSession] = useState<boolean>(false);
  const [CurrentPwd, setCurrentPwd] = useState<string>("");
  const [ConfPwd, setConfPwd] = useState<string>("");
  const [NewPwd, setNewPwd] = useState<string>("");
  const [userData, setUserData] = useState<any>();
  const pwdValidator =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/;

  const router = useRouter();

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

  const submitPwd = () => {
    if (CurrentPwd !== userData.pwd) {
      setErrorMessage("Current password is not valid!");
      setGotError(true);
    } else if (NewPwd !== ConfPwd) {
      setErrorMessage("Invalid Password!");
      return setGotError(true);
    } else if (CurrentPwd === NewPwd) {
      setErrorMessage("Enter New Password");
      return setGotError(true);
    } else if (!pwdValidator.test(NewPwd)) {
      setErrorMessage(
        "Password must contains one spacial character, one uppercase letter, one lowercase letter, one number and must be 8-16 digits long."
      );
      return setGotError(true);
    } else {
      setErrorMessage("");
      setGotError(false);

      axios
        .post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/update-pwd/`,
          {
            userId: userData._id,
            updatePwd: NewPwd,
          }
        )
        .then((res: AxiosResponse) => {
          router.push("/");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  return (
    <main className="flex justify-center items-center relative w-full">
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
      <div>
        <h1 className="text-center text-2xl font-bold my-6">Update Password</h1>
        <div className="mx-auto flex flex-col items-center w-full bg-white rounded-md py-10 px-14">
          <div className="ms-28 mb-4">
            <label>Current Password:</label>
            <input
              className="px-3 outline-none border-none"
              placeholder="XXXXXXXXXXX"
              type="password"
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </div>
          <div className="ms-24 mb-4">
            <label>New Password:</label>
            <input
              className="px-3 outline-none border-none"
              placeholder="XXXXXXXXXXX"
              type="password"
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>
          <div className="ms-28 mb-4">
            <label>Confirm Password:</label>
            <input
              className="px-3 outline-none border-none"
              placeholder="XXXXXXXXXXX"
              type="password"
              onChange={(e) => setConfPwd(e.target.value)}
            />
          </div>
          <div>
            <button
              onClick={submitPwd}
              className="bg-blue-700 active:bg-blue-500 text-white px-5 py-3 mt-4 rounded-md"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default UpdatePassword;
