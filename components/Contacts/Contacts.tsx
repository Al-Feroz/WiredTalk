import { Add, ChevronRight, Done, Send } from "@mui/icons-material";
import React, { useState, useEffect } from "react";
import axios, { AxiosResponse } from "axios";
import Image from "next/image";

const Contacts: React.FunctionComponent<{ userData: userData }> = ({
  userData,
}) => {
  const [FriendRequests, setFriendRequests] = useState<Array<any>>([]);
  const [ContactAdded, setContactAdded] = useState<boolean>(false);
  const [FriendsList, setFriendsList] = useState<Array<any>>([]);
  const [ContactEmail, setContactEmail] = useState<string>("");
  const [Tab, setTab] = useState<string>("showFriends");
  const [GetContact, setGetContact] = useState<Contact>({
    _id: "",
    name: "",
    email: "",
    image: "/user.png",
    headline: "--",
  });

  const findContact = () => {
    if (ContactEmail.trim() === "") {
      return;
    }

    axios
      .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/email`, {
        email: ContactEmail,
      })
      .then(async (res: AxiosResponse) => {
        const data: Contact = res.data;
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friend/requested/`,
          { requestUser: userData._id, acceptUser: data._id }
        );

        if (result.data.exist === true) return;

        if (data.image == undefined) {
          data.image = "/user.png";
        } else {
          data.image = `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${data.image}`;
        }

        if (data.headline == undefined) {
          data.headline = "--";
        }

        setGetContact(data);
      });
  };

  const addContact = () => {
    axios
      .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/request/`, {
        requestUser: userData._id,
        acceptUser: GetContact._id,
      })
      .then(() => {
        setContactAdded(true);
      });
  };

  const friendResponse = (requestId: string, status: boolean) => {
    axios
      .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/response`, {
        requestId: requestId,
        status: status,
      })
      .then(() => {
        setFriendRequests((prevRequests) =>
          prevRequests.filter((req) => req.requestId !== requestId)
        );
      });
  };

  const removeFriend = (connectionId: string) => {
    axios
      .get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/remove/${connectionId}`
      )
      .then(() => {
        setFriendsList((prevFriends) =>
          prevFriends.filter((req) => req.connectionId !== connectionId)
        );
      });
  };

  const getReuests = async () => {
    await axios
      .get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/requests/${userData._id}`
      )
      .then((res: AxiosResponse) => {
        setFriendRequests(res.data);
      });
  };

  const getFriends = async () => {
    await axios
      .get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/${userData._id}`
      )
      .then((res: AxiosResponse) => {
        setFriendsList(res.data);
      });
  };

  useEffect(() => {
    getReuests();
    getFriends();
  }, []);

  return (
    <div className="h-full flex">
      <div className="sm:w-[30%] lg:2-[20%] h-full bg-gray-200 shadow">
        <ul className="overflow-hidden">
          <li
            className="flex w-full relative py-3 ps-5 shadow-xl bg-white group"
            onClick={() => setTab("addContact")}
          >
            <span>Add New</span>
            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </li>
          <li
            className="flex w-full relative py-3 ps-5 shadow-xl bg-white group"
            onClick={() => setTab("showRequests")}
          >
            <span>Requests</span>
            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </li>
          <li
            className="flex w-full relative py-3 ps-5 shadow-xl bg-white group"
            onClick={() => setTab("showFriends")}
          >
            <span>Friends</span>
            <ChevronRight className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </li>
        </ul>
      </div>
      <div className="w-full h-full">
        {Tab === "addContact" ? (
          <div className="w-full h-full flex flex-col items-center">
            <h1 className="text-2xl font-bold my-5">Add New Contact</h1>
            <p>Enter email to find you friends</p>
            <div className="my-14">
              <div className="bg-white rounded-2xl flex justify-between items-center px-4 py-2">
                <input
                  type="email"
                  placeholder="Email"
                  className="outline-none"
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                  }}
                />
                <button
                  className="text-green-500"
                  onClick={findContact}
                  disabled={
                    ContactEmail.trim() === "" &&
                    ContactEmail !== userData.email
                      ? true
                      : false
                  }
                >
                  <Send />
                </button>
              </div>
              {GetContact._id !== "" ? (
                <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 my-10">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden">
                    <Image
                      src={GetContact.image}
                      alt=""
                      layout="fill"
                      objectFit="cover"
                    ></Image>
                  </div>
                  <div className="ms-4 me-10">
                    <p>{GetContact.name}</p>
                    <span className="text-sm pt-2">{GetContact.headline}</span>
                  </div>
                  <button onClick={addContact} disabled={ContactAdded}>
                    {!ContactAdded ? <Add /> : <Done />}
                  </button>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
        {Tab === "showRequests" ? (
          Array.isArray(FriendRequests) && FriendRequests.length > 0 ? (
            <ul className="w-3/4 mx-auto my-10">
              {FriendRequests.map((freq) => (
                <li
                  key={freq._id}
                  className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 my-2"
                >
                  <div className="flex items-center justify-evenly w-1/2">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden">
                      <Image
                        src={
                          freq?.image !== undefined
                            ? `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${freq.image}`
                            : "/user.png"
                        }
                        alt=""
                        layout="fill"
                        objectFit="cover"
                      />
                    </div>
                    <div className="ms-4 me-10">
                      <p>{freq.name}</p>
                      <span className="text-sm pt-2">{freq.headline}</span>
                    </div>
                  </div>
                  <div className="w-1/4 flex items-center justify-around">
                    <button
                      className="px-3 py-2 rounded-full border-blue-500 border-2 text-blue-500"
                      onClick={() => friendResponse(freq.requestId, true)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-2 rounded-full border-blue-500 border-2 text-blue-500"
                      onClick={() => friendResponse(freq.requestId, false)}
                    >
                      Ignore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="w-full h-full flex justify-center items-center">
              No requests yet.
            </div>
          )
        ) : (
          <></>
        )}
        {Tab === "showFriends" ? (
          <div>
            {Array.isArray(FriendsList) && FriendsList.length > 0 ? (
              <ul>
                {FriendsList.map((Friend) => {
                  return (
                    <li
                      key={Friend._id}
                      className="flex items-center justify-between px-12 py-6 bg-neutral-200 shadow"
                    >
                      <div className="flex items-center">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={
                              Friend?.image !== undefined
                                ? `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${Friend.image}`
                                : "/user.png"
                            }
                            objectFit="cover"
                            layout="fill"
                            alt=""
                          ></Image>
                        </div>
                        <div className="px-5">
                          <p>{Friend.name}</p>
                          <span>
                            {Friend.headline !== undefined
                              ? Friend.headline
                              : "--"}
                          </span>
                        </div>
                      </div>
                      <button
                        className="border-2 border-blue-500 rounded-full text-blue-500 px-4 py-2"
                        onClick={() => {
                          removeFriend(Friend.connectionId);
                        }}
                      >
                        remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="w-full h-full flex justify-center items-center">
                No friends yet.
              </div>
            )}
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default Contacts;
