import React, { useState, useEffect } from "react";
import { EditOutlined } from "@mui/icons-material";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";

const Profile: React.FunctionComponent<{ userData: userData }> = ({
  userData,
}) => {
  const [IsHeadlineChange, setIsHeadlineChange] = useState<boolean>(false);
  const [ProfileChanged, setProfileChanged] = useState<boolean>(false);
  const [IsEmailChange, setIsEmailChange] = useState<boolean>(false);
  const [IsNameChange, setIsNameChange] = useState<boolean>(false);
  const [ImageEdit, setImageEdit] = useState<boolean>(false);
  const [UserImage, setUserImage] = useState<any>();

  const uploadImage = () => {
    const fileInput: HTMLInputElement = document.createElement("input");
    fileInput.type = "file";

    fileInput.addEventListener("change", async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        return;
      }

      setUserImage(file);
      setProfileChanged(true);
    });

    fileInput.click();
  };

  const updateProfile = async () => {
    if (!IsNameChange && !IsEmailChange && !IsHeadlineChange) {
      return;
    }

    let success = true;

    try {
      if (ProfileChanged == true) {
        const data = new FormData();
        data.append("file", UserImage);

        await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/uploadImage/`,
          data,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/update`,
          {
            userId: userData._id,
            updateData: {
              name: userData.name,
              email: userData.email,
              headline: userData.headline,
              image: UserImage.name,
            },
          }
        );

        userData.image = `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${UserImage.name}`;
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/update`,
          {
            userId: userData._id,
            updateData: {
              name: userData.name,
              email: userData.email,
              headline: userData.headline,
            },
          }
        );
      }
    } catch (error) {
      console.error("Error during profile update:", error);
      success = false;
    } finally {
      if (success) {
        setIsHeadlineChange(false);
        setIsEmailChange(false);
        setIsNameChange(false);
      }
    }
  };

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
            src={userData.image}
            alt="Profile Image"
            objectFit="cover"
            layout="fill"
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
              Name: <span>{userData.name}</span>
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
              Email: <span>{userData.email}</span>
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
            disabled={
              IsNameChange === true ||
              IsEmailChange === true ||
              IsHeadlineChange === true ||
              UserImage !== undefined
                ? false
                : true
            }
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
