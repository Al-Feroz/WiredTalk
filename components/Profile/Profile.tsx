import React, { useState, useEffect } from "react";
import { EditOutlined } from "@mui/icons-material";
import axios, { AxiosResponse } from "axios";
import Cookies from "js-cookie";
import Image from "next/image";
import Link from "next/link";

const Profile = () => {
  const [IsHeadlineChange, setIsHeadlineChange] = useState<boolean>(false);
  const [CurrentImage, setCurrentImage] = useState<string>("/user.png");
  const [IsEmailChange, setIsEmailChange] = useState<boolean>(false);
  const [IsNameChange, setIsNameChange] = useState<boolean>(false);
  const [isSession, setIsSession] = useState<boolean>(false);
  const [ImageEdit, setImageEdit] = useState<boolean>(false);
  const [UserImage, setUserImage] = useState<any>();
  const [userData, setUserData] = useState<any>();

  useEffect(() => {
    setCurrentImage(
      userData?.imagePath !== undefined ? userData?.imagePath : CurrentImage
    );
  }, [CurrentImage, userData?.imagePath]);

  const uploadImage = () => {
    const fileInput: HTMLInputElement = document.createElement("input");
    fileInput.type = "file";

    fileInput.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        return;
      }
      // Check file size (e.g., 2MB limit)
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_SIZE) {
        alert("File size exceeds the 2MB limit.");
        return;
      }

      setUserImage(file);
    });

    fileInput.click();
  };

  const updateProfile = async () => {
    userData.imagePath = `${
      UserImage?.name ? "/users/" + UserImage.name : CurrentImage
    }`;
    let result = {
      ok: true,
    };

    if (UserImage?.name) {
      const data = new FormData();
      data.set("file", UserImage);
      result = await fetch("../../api/uploadImage/", {
        method: "POST",
        body: data,
      });
    }

    if (result.ok) {
      axios.post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/update`, {
        userId: userData._id,
        updateData: {
          name: userData.name,
          email: userData.email,
          headline: userData.headline,
          imagePath: userData.imagePath,
        },
      });
      setCurrentImage(userData.imagePath);
      setIsHeadlineChange(false);
      setIsEmailChange(false);
      setIsNameChange(false);
    }
  };

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
    <div className="w-full h-full">
      <h1 className="text-2xl font-bold my-10 ms-20">Profile</h1>

      <div className="bg-white rounded-md w-[90%] mx-auto py-5 px-20">
        <div
          className="mx-auto w-16 h-16 rounded-full bg-gray-400 overflow-hidden relative"
          onMouseEnter={() => {
            setImageEdit(true);
          }}
          onMouseLeave={() => {
            setImageEdit(false);
          }}
        >
          <Image
            src={CurrentImage}
            alt="Profile Image"
            width={62}
            height={62}
            style={{ width: "auto", height: "auto" }}
            priority
          ></Image>
          <div
            className={`absolute top-0 right-0 bottom-0 left-0 justify-center items-center text-white bg-gray-400 bg-opacity-25 ${
              ImageEdit ? "flex" : "hidden"
            }`}
          >
            <EditOutlined onClick={uploadImage} />
          </div>
        </div>
        <div className="pt-5 pb-2 flex items-end">
          {IsNameChange === false ? (
            <p>
              Name: <span>{userData?.name}</span>
            </p>
          ) : (
            <div>
              Name:{" "}
              <input
                type="text"
                className="outline-none focus:border-b-2 rounded border-blue-700 px-4 pb-1 pt-2 mb-2"
                onChange={(e) => {
                  userData.name = e.target.value;
                }}
              />
            </div>
          )}
          <div
            className={`mx-2 text-gray-600 ${
              !IsNameChange ? "block" : "hidden"
            }`}
          >
            <EditOutlined
              onClick={() => {
                setIsNameChange(true);
              }}
            />
          </div>
        </div>
        <div className="flex items-end">
          {IsHeadlineChange === false ? (
            <p>
              Headline:{" "}
              <span>
                {userData?.headline !== undefined ? userData?.headline : "--"}
              </span>
            </p>
          ) : (
            <div>
              Headline:{" "}
              <input
                type="text"
                className="outline-none focus:border-b-2 rounded border-blue-700 px-4 pb-1 pt-2 mb-2"
                onChange={(e) => {
                  userData.headline = e.target.value;
                }}
              />
            </div>
          )}
          <div
            className={`mx-2 text-gray-600 ${
              !IsHeadlineChange ? "block" : "hidden"
            }`}
          >
            <EditOutlined
              onClick={() => {
                setIsHeadlineChange(true);
              }}
            />
          </div>
        </div>
        <div className="pt-2 pb-5 flex items-end">
          {IsEmailChange === false ? (
            <p>
              Email: <span>{userData?.email}</span>
            </p>
          ) : (
            <div>
              Email:{" "}
              <input
                type="text"
                className="outline-none focus:border-b-2 rounded border-blue-700 px-4 pb-1 pt-2 mb-2"
                onChange={(e) => {
                  userData.email = e.target.value;
                }}
              />
            </div>
          )}
          <div
            className={`mx-2 text-gray-600 ${
              !IsEmailChange ? "block" : "hidden"
            }`}
          >
            <EditOutlined
              onClick={() => {
                setIsEmailChange(true);
              }}
            />
          </div>
        </div>
        <div className="py-5">
          <button
            className="text-white bg-blue-700 active:bg-blue-500 py-2 px-4 rounded-md"
            onClick={updateProfile}
          >
            Save
          </button>
          <Link
            href="/update-password"
            className="text-blue-700 active:text-blue-500 ms-5"
          >
            Update Password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
