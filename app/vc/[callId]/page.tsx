"use client";
import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import socket from "@/utils/socket";
import { NextPage } from "next";
import Cookies from "js-cookie";
import {
  CallEnd,
  Close,
  Message as MessageIcon,
  Mic,
  MicOff,
  Send,
  VideocamOffOutlined,
  VideocamOutlined,
} from "@mui/icons-material";
import MessageBox from "@/components/MessageBox/MessageBox";

const peerConnectionConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const VC: NextPage<{ params: { callId: string } }> = ({
  params: { callId },
}) => {
  const [UserData, setUserData] = useState<userData>({
    _id: "",
    pwd: "",
    name: "",
    email: "",
    hashed: "",
    headline: "--",
    image: "/user.png",
  });
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const prevRoute = useAppSelector(
    (state: RootState) => state.route.currentRoute
  );
  const [RemoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [messagesShow, setMessagesShow] = useState<boolean>(false);
  const [VideoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [MicEnabled, setMicEnabled] = useState<boolean>(true);
  const [callStatus, setCallStatus] = useState<string>("");
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
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callStatusRef = useRef<string>("");
  const ws = socket;

  const changeAudio = () => {
    setMicEnabled((prev) => {
      const newState = !prev;
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = newState;
        });
      }

      peerConnection?.getSenders().map((sender) => {
        if (sender.track?.kind == "audio") {
          sender.track.enabled = newState;
        }
      });
      return newState;
    });
  };

  const changeVideo = () => {
    setVideoEnabled((prev) => {
      const newState = !prev;
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = newState;
        });
      }

      peerConnection?.getSenders().map((sender) => {
        if (sender.track?.kind == "video") {
          sender.track.enabled = newState;
        }
      });
      return newState;
    });
  };

  const endCall = async () => {
    try {
      await stopConnection();

      if (prevRoute) {
        window.location.replace(prevRoute);
      } else {
        console.error("prevRoute is not defined or is invalid.");
      }
    } catch (error) {
      console.error("An error occurred during endCall:", error);
    }
  };

  const stopConnection = async () => {
    if (!localStream) return;

    await Promise.all(
      localStream.getTracks().map((track) => {
        return new Promise<void>((resolve) => {
          track.stop();
          resolve();
        });
      })
    );

    setLocalStream(null);

    peerConnection?.getSenders().forEach((sender) => {
      peerConnection.removeTrack(sender);
    });

    if (peerConnection) {
      peerConnection.close();
    }
  };

  const getMessages = async (ReceiverId: string) => {
    try {
      const response: AxiosResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/messages/one-to-one/${UserData._id}`
      );

      const messages = response.data;
      const statusUpdatePromises = messages
        .filter((message: any) => message?.seen === false)
        .map((message: any) => {
          if (message?.receiverId === UserData._id) {
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

      const filteredMessages = messages.filter(
        (message: any) =>
          message.senderId == ReceiverId || message.receiverId == ReceiverId
      );
      setMessagesList(filteredMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  ws.connect();

  const sendMessage = async () => {
    const currentDate = new Date();
    const data = {
      senderId: UserData._id,
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
    if (data.senderId === UserData._id || data.receiverId === UserData._id) {
      if (data.receiverId === UserData._id) {
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
  }, [ws, UserData._id, CurrentChat?._id, MessagesList, setMessagesList]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    const sessionUUID = Cookies.get("SESSION_UUID");
    if (sessionUUID) {
      axios
        .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/profile/`, {
          sessionId: sessionUUID,
        })
        .then(async (res: AxiosResponse) => {
          const data: userData = await res.data;
          if (!data.image) {
            data.image = "/user.png";
          } else {
            data.image = `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${data.image}`;
          }
          setUserData(data);
        })
        .catch((error) => {
          console.error("Error fetching profile:", error);
        });
    }
  }, []);

  useEffect(() => {
    const remoteStream = new MediaStream();
    setRemoteStream(remoteStream);

    const initializePeerConnection = () => {
      const pc = new RTCPeerConnection(peerConnectionConfig);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      pc.ontrack = (event) => {
        if (event.track.kind == "video") {
          remoteStream.getVideoTracks().map((track) => track.stop());
          remoteStream.addTrack(event.track);
        } else if (event.track.kind == "audio") {
          remoteStream.getAudioTracks().map((track) => track.stop());
          remoteStream.addTrack(event.track);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.emit("ice-candidate", event.candidate);
        }
      };

      pc.addEventListener("iceconnectionstatechange", async () => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "closed"
        ) {
          await stopConnection();
          window.location.replace(prevRoute);
        }
      });

      setPeerConnection(pc);
    };

    initializePeerConnection();

    return () => {
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, []);

  useEffect(() => {
    const handleIncomingOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      from: string;
      to: string;
    }) => {
      if (data.to !== UserData._id || peerConnection === null) return;
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.emit("answer", { answer, from: UserData._id, to: data.from });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleIncomingAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      from: string;
      to: string;
    }) => {
      if (data.to !== UserData._id || peerConnection === null) return;
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIncomingIceCandidate = async (
      candidate: RTCIceCandidateInit
    ) => {
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ICE candidate:", error);
        }
      }
    };

    ws.on("offer", handleIncomingOffer);
    ws.on("answer", handleIncomingAnswer);
    ws.on("ice-candidate", handleIncomingIceCandidate);

    return () => {
      ws.off("offer", handleIncomingOffer);
      ws.off("answer", handleIncomingAnswer);
      ws.off("ice-candidate", handleIncomingIceCandidate);
    };
  }, [peerConnection, UserData._id]);

  useEffect(() => {
    const handleRinging = (data: any) => {
      if (data.callId === callId && data.type === "single") {
        setCallStatus("Ringing...");
      }
    };

    const handleCallAccepted = (data: { callId: string }) => {
      if (data.callId === callId) {
        setCallStatus("Call Accepted.");
        setTimeout(() => setCallStatus(""), 2000);
      }
    };

    const handleCallDeclined = (data: { callId: string; from: string }) => {
      if (data.callId === callId && data.from === UserData._id) {
        setCallStatus("Call Declined.");
        window.location.replace(prevRoute);
      }
    };

    ws.on("ringing", handleRinging);
    ws.on("accepting", handleCallAccepted);
    ws.on("declined", handleCallDeclined);

    return () => {
      ws.off("ringing", handleRinging);
      ws.off("accepting", handleCallAccepted);
      ws.off("declined", handleCallDeclined);
    };
  }, [UserData._id, callId, prevRoute]);

  useEffect(() => {
    if (!isCallStarted) {
      setIsCallStarted(true);
    }

    const fetchDataAndSetupCall = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/call/${callId}`
        );
        const data = res.data;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (isCallStarted) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        if (peerConnection) {
          if (data.creatorId === UserData._id && isCallStarted) {
            setCallStatus("Calling...");

            ws.emit("calling", {
              callId,
              from: UserData._id,
              to: data.receivers,
              type: data.type,
            });

            const remoteUserRes = await axios.post(
              `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`,
              { userId: data.receivers }
            );
            setCurrentChat(remoteUserRes.data);
            getMessages(remoteUserRes.data._id);

            const timeoutId = setTimeout(() => {
              if (
                callStatusRef.current === "Calling..." ||
                callStatusRef.current === "Ringing..."
              ) {
                setCallStatus(
                  `${remoteUserRes.data.name} did not receive your request.`
                );
                window.location.replace(prevRoute);
              }
            }, 15000);

            return () => clearTimeout(timeoutId);
          } else if (
            data.type === "single" &&
            data.receivers === UserData._id
          ) {
            ws.emit("accepting", {
              callId,
              from: UserData._id,
              to: data.creatorId,
              type: data.type,
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            ws.emit("offer", {
              offer,
              from: UserData._id,
              to: data.creatorId,
              type: data.type,
            });

            const creatorUserRes = await axios.post(
              `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`,
              { userId: data.creatorId }
            );
            setCurrentChat(creatorUserRes.data);
            getMessages(creatorUserRes.data._id);
          }

          stream.getTracks().forEach((track) => {
            if (peerConnection.signalingState !== "closed") {
              peerConnection.addTrack(track, stream);
            }
          });
        }
      } catch (error) {
        console.error("Error getting media stream or handling call:", error);
      }
    };

    fetchDataAndSetupCall();
  }, [callId, peerConnection, UserData._id, isCallStarted]);

  return (
    <div className="w-full h-full relative">
      {callStatus !== "" && (
        <div className="relative w-auto h-auto z-10">
          <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white py-3 px-8 font-semibold">
            {callStatus}
          </div>
        </div>
      )}
      <div
        className={`fixed ${
          messagesShow ? "left-2" : "-left-[110%]"
        } flex flex-col h-[80vh] w-[250px] sm:w-[275px] bg-white drop-shadow-lg rounded-lg overflow-hidden top-[4vh] z-20 transition-all duration-500`}
      >
        <div className="w-full py-2 px-4 flex justify-between items-center bg-neutral-100 shadow-lg">
          <h1>You - {CurrentChat?.name ? CurrentChat.name : ""}</h1>
          <button onClick={() => setMessagesShow(false)}>
            <Close />
          </button>
        </div>
        <div className="shadow-inner w-full h-full overflow-y-auto">
          {MessagesList &&
            MessagesList.length > 0 &&
            MessagesList.map((message: any) => {
              const isSender: boolean =
                message.senderId === UserData._id ? false : true;
              return (
                <MessageBox
                  key={message._id}
                  message={message.message}
                  timming={message.timming}
                  isSender={isSender}
                  messageId={message._id}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                />
              );
            })}
        </div>
        <div className="w-full flex justify-around items-center py-2 px-4 bg-gray-200">
          <input
            type="text"
            placeholder="Type your message here..."
            className="outline-none bg-transparent"
            value={Message === "" ? "" : Message}
            onChange={(ev) => setMessage(ev.target.value)}
          />
          <button className="cursor-pointer" onClick={sendMessage}>
            <Send />
          </button>
        </div>
      </div>
      <div className="w-[100vw] h-[100vh]">
        <div className="relative w-full h-[85%]">
          <div className="absolute bottom-6 right-10 w-[25%] h-auto">
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              className="rounded-md shadow-white drop-shadow-xl"
              style={{
                width: "100%",
                height: "auto",
                transform: "rotateY(180deg)",
              }}
            />
          </div>
          <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-300 p-2">
            <video
              ref={remoteVideoRef}
              playsInline
              autoPlay
              className="rounded-md w-auto h-auto"
            />
          </div>
        </div>
        <div className="w-full h-[15%] bg-blue-700 text-white flex flex-col items-center justify-around px-6">
          <div>
            <h1>You - {CurrentChat?.name ? CurrentChat.name : ""}</h1>
          </div>
          <div>
            <button
              className="p-2 rounded-full bg-blue-950 mx-2"
              onClick={() => setMessagesShow(true)}
            >
              <MessageIcon />
            </button>
            <button
              className="p-2 rounded-full bg-green-600 mx-2"
              onClick={changeAudio}
            >
              {!MicEnabled ? <MicOff /> : <Mic />}
            </button>
            <button
              className="p-2 rounded-full bg-green-600 mx-2"
              onClick={changeVideo}
            >
              {!VideoEnabled ? <VideocamOffOutlined /> : <VideocamOutlined />}
            </button>
            <button
              className="p-2 rounded-full bg-red-600 mx-2"
              onClick={endCall}
            >
              <CallEnd />
            </button>
          </div>
        </div>
      </div>
      {EditId !== "" && (
        <div className="fixed top-0 right-0 bottom-0 left-0 bg-black bg-opacity-55 flex justify-center items-center z-50">
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

export default VC;
