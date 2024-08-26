import { ChevronRight, SearchOutlined, VideoCall } from "@mui/icons-material";
import { changeRoute } from "@/lib/slices/routeSlice/routeSlice";
import React, { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

const Chat: React.FunctionComponent<{ userData: userData }> = ({
  userData,
}) => {
  const [FriendsList, setFriendsList] = useState<Array<any>>();
  const [CurrentChat, setCurrentChat] = useState<any>();
  const dispatch = useDispatch();
  const router = useRouter();

  const getFriends = async () => {
    await axios
      .get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/${userData._id}`
      )
      .then((res: AxiosResponse) => {
        setFriendsList(res.data);
      });
  };

  const makeCall = () => {
    const uuid = uuidv4().split("-").join("").slice(0, 15);
    axios
      .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/call/register`, {
        receivers: CurrentChat._id,
        creatorId: userData._id,
        callType: "single",
        callId: uuid,
      })
      .then(() => {
        dispatch(changeRoute(window.location.pathname));
        router.push(`/vc/${uuid}`);
      });
  };

  useEffect(() => {
    if (userData && userData._id.trim() !== "") {
      getFriends();
    }
  }, [userData]);

  return (
    <div className="h-full flex items-center">
      <div className="w-[20%] h-full bg-gray-100 shadow pt-6">
        <div className="relative flex w-[80%] justify-center items-center mx-auto bg-transparent">
          <span className="sm:text-lg lg:text-2xl font-light">
            <SearchOutlined
              className="absolute top-[8px] bottom-0 right-3"
              fontSize="inherit"
            />
          </span>
          <input
            placeholder="Search"
            type="text"
            className="ps-4 pt-2 pb-2 w-full outline-none bg-neutral-300 rounded-2xl sm:text-sm lg:text-base"
          />
        </div>
        <ul className="overflow-hidden my-6 bg-white">
          <li
            className="flex items-center relative px-4 py-4 shadow group"
            onClick={() => {
              setCurrentChat(userData);
            }}
          >
            <div className="relative w-[40px] h-[30px] sm:w-[40px] sm:h-[30px] md:w-[30px] lg:w-[50px] lg:h-[50px] rounded-full overflow-hidden me-2">
              <Image
                src={userData.image}
                layout="fill"
                objectFit="cover"
                alt=""
              ></Image>
            </div>
            <span>You</span>
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ChevronRight />
            </span>
          </li>
          {Array.isArray(FriendsList) && FriendsList.length > 0 ? (
            FriendsList.map((Friend) => {
              return (
                <li
                  className="flex items-center relative px-4 py-4 shadow group"
                  onClick={() => {
                    setCurrentChat(Friend);
                  }}
                  key={Friend._id}
                >
                  <div className="relative w-[40px] h-[30px] sm:w-[40px] sm:h-[30px] md:w-[30px] lg:w-[50px] lg:h-[50px] rounded-full overflow-hidden me-2">
                    <Image
                      src={
                        Friend.image !== undefined
                          ? `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${Friend.image}`
                          : "/user.png"
                      }
                      layout="fill"
                      objectFit="cover"
                      alt=""
                    ></Image>
                  </div>
                  <span className="ellipsis">{Friend.name}</span>
                  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ChevronRight />
                  </span>
                </li>
              );
            })
          ) : (
            <></>
          )}
        </ul>
      </div>
      <div className="w-[80%] h-full bg-neutral-200">
        {CurrentChat !== undefined ? (
          <div className="flex items-center justify-between w-full px-8 py-3 bg-gray-100">
            <div className="flex items-center">
              <div className="relative sm:w-[45px] sm:h-[45px] lg:w-[60px] lg:h-[60px] me-5 rounded-full overflow-hidden">
                <Image
                  src={
                    CurrentChat.name !== userData.name
                      ? CurrentChat.image !== undefined
                        ? `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${CurrentChat.image}`
                        : "/user.png"
                      : CurrentChat.image
                  }
                  layout="fill"
                  objectFit="cover"
                  alt=""
                ></Image>
              </div>
              <h1>
                {CurrentChat.name !== userData.name ? CurrentChat.name : "You"}
              </h1>
            </div>
            {CurrentChat.name !== userData.name ? (
              <div>
                <button
                  onClick={makeCall}
                  className="text-blue-500 border-2 border-blue-500 rounded-full hover:text-blue-600 hover:border-blue-600 px-2 py-1.5"
                >
                  <VideoCall />
                </button>
              </div>
            ) : (
              <></>
            )}
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default Chat;
