import {
  ChevronRight,
  SearchOutlined,
  Send,
  VideoCall,
} from "@mui/icons-material";
import { changeRoute } from "@/lib/slices/routeSlice/routeSlice";
import MessageBox from "@/components/MessageBox/MessageBox";
import React, { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import socket from "@/utils/socket";
import Image from "next/image";

const Chat: React.FunctionComponent<{ userData: userData }> = ({
  userData,
}) => {
  const [FriendsList, setFriendsList] = useState<Array<any>>();
  const [EditValue, setEditValue] = useState<string>("");
  const [CurrentChat, setCurrentChat] = useState<any>();
  const [Message, setMessage] = useState<string>("");
  const [EditId, setEditId] = useState<string>("");
  const [MessagesList, setMessagesList] = useState<
    Array<{
      _id: string;
      senderId: string;
      receiverId: string;
      message: string;
      timming: string;
      seen: boolean;
    }>
  >([]);
  const dispatch = useDispatch();
  const router = useRouter();
  const ws = socket;

  ws.connect();

  const getFriends = async () => {
    await axios
      .get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/friends/${userData._id}`
      )
      .then((res: AxiosResponse) => {
        setFriendsList(res.data);
      });
  };

  const getMessages = async () => {
    try {
      const response: AxiosResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/messages/one-to-one/${userData._id}`
      );

      const messages = response.data;
      const statusUpdatePromises = messages
        .filter((message: any) => message?.seen === false)
        .map((message: any) => {
          if (message?.receiverId === userData._id) {
            axios
              .get(
                `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/change-status/${message?._id}`
              )
              .then(() => {
                message.seen = true;
                ws.emit("message-read", { messageId: message._id });
              });
          }
        });
      await Promise.all(statusUpdatePromises);

      setMessagesList(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
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

  const sendMessage = async () => {
    const currentDate = new Date();
    const data = {
      senderId: userData._id,
      receiverId: CurrentChat?._id,
      message: Message,
      timming: currentDate.toLocaleTimeString([], {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      }),
      seen: false,
    };
    await axios
      .post(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/send`,
        data
      )
      .then((res: AxiosResponse) => {
        ws.emit("one-to-one-message", { _id: res.data, ...data });
      });
    setMessage("");
  };

  const CencelEditedMessage = () => {
    setEditId("");
    setEditValue("");
  };

  const SendEditedMessage = async () => {
    if (EditId.trim() !== "" && EditValue.trim() !== "") {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/edit`,
        { messageId: EditId, updatedMessage: EditValue }
      );

      if (result.status === 200) {
        const index = MessagesList.findIndex(
          (message) => message._id === EditId
        );

        if (index === -1) return;

        setMessagesList((prevMessages) => [
          ...prevMessages.slice(0, index),
          { ...prevMessages[index], message: EditValue },
          ...prevMessages.slice(index + 1),
        ]);

        ws.emit("one-to-one-edited", {
          messageId: EditId,
          updatedMessage: EditValue,
        });

        setEditId("");
        setEditValue("");
      }
    }
  };

  const editMessage = (messageId: string) => {
    setEditId(messageId);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/delete/`,
        { messageId }
      );

      if (result.status === 200) {
        setMessagesList((prevMessagesList) =>
          prevMessagesList.filter((message) => message._id !== messageId)
        );
        ws.emit("one-to-one-delete", { messageId: messageId });
      } else {
        console.error("Failed to delete message:", result.statusText);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const OneToOneMessage = (data: {
    _id: string;
    senderId: string;
    receiverId: string;
    message: string;
    timming: string;
    seen: boolean;
  }) => {
    if (data.senderId === userData._id || data.receiverId === userData._id) {
      if (data.receiverId === userData._id) {
        axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/change-status/${data._id}`
        );
      }
      setMessagesList((prevMessages) => [...prevMessages, data]);
    }
  };

  const OneToOneEdited = (data: {
    messageId: string;
    updatedMessage: string;
  }) => {
    const index = MessagesList.findIndex(
      (message) => message._id === data.messageId
    );

    if (index === -1) return;

    setMessagesList((prevMessages) => [
      ...prevMessages.slice(0, index),
      { ...prevMessages[index], message: data.updatedMessage },
      ...prevMessages.slice(index + 1),
    ]);
  };

  const OneToOneDelete = (data: { messageId: string }) => {
    setMessagesList((prevMessagesList) =>
      prevMessagesList.filter((message) => message._id !== data.messageId)
    );
  };

  const messageStatusHandle = (data: { messageId: string }) => {
    const message = MessagesList.find(
      (message) => message._id === data.messageId
    );
    if (message) {
      message.seen = true;
    }
  };

  useEffect(() => {
    ws.on("message-read", messageStatusHandle);
    ws.on("one-to-one-edited", OneToOneEdited);
    ws.on("one-to-one-delete", OneToOneDelete);
    ws.on("one-to-one-message", OneToOneMessage);

    return () => {
      ws.off("message-read", messageStatusHandle);
      ws.off("one-to-one-edited", OneToOneEdited);
      ws.off("one-to-one-delete", OneToOneDelete);
      ws.off("one-to-one-message", OneToOneMessage);
    };
  }, [ws, userData._id, CurrentChat?._id, MessagesList, setMessagesList]);

  useEffect(() => {
    if (userData && userData._id.trim() !== "") {
      getFriends();
      getMessages();
    }
  }, [userData]);

  return (
    <div className="relative h-full flex items-center">
      <div className="w-[20%] h-full bg-gray-100 pt-6 border-[0.5px] border-neutral-300 border-opacity-50 shadow">
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
            <div className="relative w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] lg:w-[50px] lg:h-[50px] rounded-full overflow-hidden me-2">
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
      <div className="relative w-[80%] h-screen bg-neutral-200 flex flex-col">
        {CurrentChat !== undefined && (
          <>
            <div className="flex items-center justify-between w-full px-8 py-3 bg-gray-100 border-[0.5px] border-neutral-300 border-opacity-50 shadow-2xl">
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
                  {CurrentChat.name !== userData.name
                    ? CurrentChat.name
                    : "You"}
                </h1>
              </div>
              {CurrentChat.name !== userData.name && (
                <div>
                  <button
                    onClick={makeCall}
                    className="text-blue-500 border-2 border-blue-500 rounded-full hover:text-blue-600 hover:border-blue-600 px-2 py-1.5"
                  >
                    <VideoCall />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-100 bg-opacity-60 mb-[62px]">
              {MessagesList.length > 0 &&
                MessagesList.map((message) => {
                  if (
                    (userData._id === message.senderId &&
                      CurrentChat._id === message.receiverId) ||
                    (userData._id === message.receiverId &&
                      CurrentChat._id === message.senderId)
                  ) {
                    const isSender: boolean =
                      message.senderId === userData._id ? false : true;
                    return (
                      <MessageBox
                        key={message._id}
                        isSender={isSender}
                        message={message.message}
                        timming={message.timming}
                        messageId={message._id}
                        onEdit={editMessage}
                        onDelete={deleteMessage}
                      ></MessageBox>
                    );
                  }
                })}
            </div>
            <div className="bg-white w-full flex absolute bottom-0 px-4 py-3">
              <input
                className="w-full h-full bg-neutral-300 px-4 py-2 mr-2 rounded-lg placeholder:text-black text-black outline-none"
                type="text"
                placeholder="Type message..."
                value={Message === "" ? "" : Message}
                onChange={(ev) => setMessage(ev.target.value)}
              />
              <button className="cursor-pointer" onClick={sendMessage}>
                <Send />
              </button>
            </div>
          </>
        )}
      </div>
      {EditId !== "" && (
        <div className="fixed top-0 right-0 bottom-0 left-0 bg-black bg-opacity-55 flex justify-center items-center">
          <div className="bg-white px-5 py-4 rounded-lg">
            <input
              type="text"
              defaultValue={
                MessagesList.filter((message) => message._id === EditId)[0]
                  .message
              }
              onChange={(e) => setEditValue(e.target.value)}
              className="my-3 outline-none border-b-2 border-blue-600 rounded"
            />
            <div className="flex items-center justify-around">
              <button
                className="bg-blue-600 text-white px-3 py-2 rounded-md"
                onClick={CencelEditedMessage}
              >
                Cencel
              </button>
              <button
                className="bg-blue-600 text-white px-3 py-2 rounded-md"
                onClick={SendEditedMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
