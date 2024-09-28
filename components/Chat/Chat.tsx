import SendEditMessage from "@/components/OneToOneMessages/SendEditMessage";
import DeleteMessage from "@/components/OneToOneMessages/DeleteMessage";
import SendMessage from "@/components/OneToOneMessages/SendMessage";
import GetMessages from "@/components/OneToOneMessages/GetMessages";
import { changeRoute } from "@/lib/slices/routeSlice/routeSlice";
import MessageBox from "@/components/MessageBox/MessageBox";
import React, { useEffect, useState, useRef } from "react";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import socket from "@/utils/socket";
import Image from "next/image";
import {
  SearchOutlined,
  ChevronRight,
  VideoCall,
  Send,
} from "@mui/icons-material";

const Chat: React.FunctionComponent<{ userData: userData }> = ({
  userData,
}) => {
  const [FriendsList, setFriendsList] = useState<Array<any>>();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [EditValue, setEditValue] = useState<string>("");
  const [CurrentChat, setCurrentChat] = useState<any>();
  const [Message, setMessage] = useState<string>("");
  const [EditId, setEditId] = useState<string>("");
  const [MessagesList, setMessagesList] = useState<
    Array<{
      _id: string;
      senderId: string;
      receiverId: string;
      message?: string;
      filePath?: string;
      timming: string;
      seen: boolean;
      type: string;
    }>
  >([]);
  const dispatch = useDispatch();
  const router = useRouter();
  const ws = socket;

  ws.connect();

  const downloadRecording = async (filePath: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/recording/${filePath}`,
        {
          responseType: "blob", // Important to set the response type to blob
        }
      );

      // Create a blob from the response data
      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      // Create a link element
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filePath; // Set the file name for download

      // Append to the body and trigger the download
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error downloading the file:", error);
    }
  };

  const deleteRecording = async (filename: string) => {
    await axios.post(
      `${process.env.NEXT_PUBLIC_SERVER_PATH}/recording/delete/`,
      { filename: filename }
    );
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

  const editMessage = (messageId: string) => {
    setEditId(messageId);
  };

  const OneToOneMessage = ({
    _id,
    senderId,
    receiverId,
    message,
    timming,
    seen,
  }: {
    _id: string;
    senderId: string;
    receiverId: string;
    message: string;
    timming: string;
    seen: boolean;
  }) => {
    if (senderId === userData._id || receiverId === userData._id) {
      if (receiverId === userData._id) {
        axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/change-status/${_id}`
        );
      }
      setMessagesList((prev) => [
        ...prev,
        { _id, senderId, receiverId, message, timming, seen, type: "message" },
      ]);
    }
  };

  const OneToOneEdited = ({
    messageId,
    updatedMessage,
  }: {
    messageId: string;
    updatedMessage: string;
  }) => {
    setMessagesList((prev) => {
      const index = prev.findIndex((message) => message._id === messageId);
      if (index === -1) return prev;

      const updatedMessages = [...prev];
      updatedMessages[index] = {
        ...updatedMessages[index],
        message: updatedMessage,
      };
      return updatedMessages;
    });
  };

  const OneToOneDelete = ({ messageId }: { messageId: string }) => {
    setMessagesList((prev) =>
      prev.filter((message) => message._id !== messageId)
    );
  };

  const messageStatusHandle = ({ messageId }: { messageId: string }) => {
    setMessagesList((prev) => {
      const message = prev.find((msg) => msg._id === messageId);
      if (message) {
        return prev.map((msg) =>
          msg._id === messageId ? { ...msg, seen: true } : msg
        );
      }
      return prev;
    });
  };

  useEffect(() => {
    const eventHandlers = {
      "message-read": messageStatusHandle,
      "one-to-one-edited": OneToOneEdited,
      "one-to-one-delete": OneToOneDelete,
      "one-to-one-message": OneToOneMessage,
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      ws.on(event, handler);
    });

    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        ws.off(event, handler);
      });
    };
  }, [ws, userData._id, CurrentChat?._id]);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    scrollToBottom();
  }, [MessagesList]);

  useEffect(() => {
    const messageToEdit = MessagesList.find((msg) => msg._id === EditId);
    if (messageToEdit && messageToEdit.message) {
      setEditValue(messageToEdit.message);
    } else {
      setEditValue("");
    }
  }, [EditId, MessagesList]);

  useEffect(() => {
    if (userData && userData._id.trim() !== "" && CurrentChat?._id) {
      GetMessages({
        userId: userData._id,
        receiverId: CurrentChat._id,
        setMessagesList: setMessagesList,
      });
    }
  }, [userData, CurrentChat?._id]);

  useEffect(() => {
    if (userData && userData._id.trim()) {
      getFriends();
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
                    if (message.type === "message" && message.message) {
                      return (
                        <MessageBox
                          key={message._id}
                          isSender={isSender}
                          message={message.message}
                          timming={message.timming}
                          messageId={message._id}
                          onEdit={editMessage}
                          onDelete={() => {
                            DeleteMessage({
                              messageId: message._id,
                              setMessagesList: setMessagesList,
                            });
                          }}
                        />
                      );
                    } else if (message.type === "recording") {
                      const isSender: boolean =
                        message.senderId === userData._id ? false : true;
                      return (
                        <div
                          className={`flex items-center ${
                            isSender ? "justify-start" : "justify-end"
                          } px-2`}
                        >
                          <div className="relative max-w-64 my-5 px-2 pt-4 pb-2 bg-white">
                            <p className="bg-gray-100 rounded p-3 text-ellipsis overflow-hidden whitespace-nowrap">
                              {message.filePath}
                            </p>
                            <div className="flex justify-between items-center pt-2">
                              <button
                                className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 mx-1 rounded"
                                onClick={() =>
                                  message.filePath &&
                                  downloadRecording(message.filePath)
                                }
                              >
                                Download
                              </button>
                              {message.senderId === userData._id && (
                                <button
                                  className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 mx-1 rounded"
                                  onClick={() =>
                                    message.filePath &&
                                    deleteRecording(message.filePath)
                                  }
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  }
                })}
              <div ref={messagesEndRef}></div>
            </div>
            <div className="bg-white w-full flex absolute bottom-0 px-4 py-3">
              <input
                className="w-full h-full bg-neutral-300 px-4 py-2 mr-2 rounded-lg placeholder:text-black text-black outline-none"
                type="text"
                placeholder="Type message..."
                value={Message === "" ? "" : Message}
                onChange={(ev) => setMessage(ev.target.value)}
              />
              <button
                className="cursor-pointer"
                onClick={() => {
                  SendMessage({
                    UserData: userData,
                    receiverData: CurrentChat,
                    Message: Message,
                  });
                  setMessage("");
                }}
              >
                <Send />
              </button>
            </div>
          </>
        )}
      </div>
      {EditId !== "" &&
        SendEditMessage({
          EditId: EditId,
          EditValue: EditValue,
          MessagesList: MessagesList,
          setEditId: setEditId,
          setEditValue: setEditValue,
          setMessagesList: setMessagesList,
        })}
    </div>
  );
};

export default Chat;
