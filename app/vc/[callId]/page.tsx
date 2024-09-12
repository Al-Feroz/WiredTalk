"use client";
import MessageBox from "@/components/MessageBox/MessageBox";
import sendNotification from "@/utils/sendNotification";
import * as bodyPix from "@tensorflow-models/body-pix";
import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import "@tensorflow/tfjs-backend-webgl";
import socket from "@/utils/socket";
import "@tensorflow/tfjs-converter";
import { NextPage } from "next";
import Cookies from "js-cookie";
import "@tensorflow/tfjs-core";
import {
  ScreenSearchDesktopOutlined,
  StopScreenShareOutlined,
  Message as MessageIcon,
  VideocamOffOutlined,
  VideocamOutlined,
  CallEnd,
  MicOff,
  Close,
  Send,
  Mic,
} from "@mui/icons-material";

const peerConnectionConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const videoCall: NextPage<{ params: { callId: string } }> = ({
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
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const prevRoute = useAppSelector(
    (state: RootState) => state.route.currentRoute
  );
  const [bodypixnet, setBodypixnet] = useState<bodyPix.BodyPix | null>(null);
  const [RemoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [CallAudio, setCallAudio] = useState<HTMLAudioElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [IsScreenShared, setIsScreenShared] = useState<boolean>(false);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [messagesShow, setMessagesShow] = useState<boolean>(false);
  const [VideoEnabled, setVideoEnabled] = useState<boolean>(false);
  const [RemoteAudio, setRemoteAudio] = useState<boolean>(false);
  const [RemoteVideo, setRemoteVideo] = useState<boolean>(true);
  const [MicEnabled, setMicEnabled] = useState<boolean>(true);
  const [callStatus, setCallStatus] = useState<string>("");
  const [EditValue, setEditValue] = useState<string>("");
  const [CurrentChat, setCurrentChat] = useState<any>();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [Message, setMessage] = useState<string>("");
  const [EditId, setEditId] = useState<string>("");
  const callStatusRef = useRef<string>("");
  const ws = socket;

  ws.connect();

  const getConstraints = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const constraints = {
      video: {
        deviceId: devices.filter((device) => device.kind === "videoinput")[0]
          ?.deviceId,
      },
      audio: {
        deviceId: devices.filter((device) => device.kind === "audioinput")[0]
          ?.deviceId,
      },
    };

    if (!constraints.audio) {
      alert("Error: Not get any audio source.");
      window.location.replace(prevRoute ? prevRoute : "/");
    } else if (!constraints.video) {
      alert("Error: Not get any video source.");
    }

    return constraints;
  };

  const getMediaStream = async (
    constraint: any,
    type: string
  ): Promise<MediaStream | Error> => {
    try {
      let constraints: { video?: any; audio?: any } = {};
  
      switch (type) {
        case "video":
          constraints = { video: constraint };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const canvas = document.createElement("canvas");
  
          const context = canvas.getContext("2d");
          const video = document.createElement("video");
          video.srcObject = stream;
          video.play();

          // Create a Promise to resolve when the video is ready
          const videoReady = new Promise<void>((resolve) => {
            video.addEventListener("canplay", () => {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context?.clearRect(0, 0, canvas.width, canvas.height);
              resolve();
            });
          });

          // Create a Promise to handle mask drawing
          const maskDrawing = async () => {
            // Create tempCanvas
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const tempCtx = tempCanvas.getContext("2d");

            const bodyPixLoader = async ()=>{
              if(!bodypixnet) {
                let net = bodypixnet ? bodypixnet : await bodyPix.load();
                setBodypixnet(net);
                return net;
              } else {
                return bodypixnet;
              }
            }

            const drawMask = async () => {
              requestAnimationFrame(drawMask);
              const net = await bodyPixLoader();

              const segmentation = await net.segmentPerson(video);
              const mask = bodyPix.toMask(segmentation);
              tempCtx?.putImageData(mask, 0, 0);

              if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                context.save();
                context.globalCompositeOperation = "destination-out";
                context.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
                context.restore();
              } else {
                console.log("Canvas context is not available");
              }
            };

            drawMask();
          };

          // Wait for video to be ready and start drawing
          await videoReady;
          maskDrawing();
  
          // Return the canvas stream
          return canvas.captureStream();
  
        case "audio":
          constraints = { audio: constraint };
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          return newStream;
  
        default:
          // Handle invalid type
          return new Error(`Invalid type: ${type}`);
      }
    } catch (err: any) {
      return new Error(`An Error Occurred: ${err.message}`);
    }
  };
  

  function createSilentAudioStream() {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate,
      audioContext.sampleRate
    );
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start();

    return destination.stream;
  }

  const changeAudio = async () => {
    const newState = !MicEnabled;
    const stream = localStream;
    if (!stream) return;

    if (newState) {
      const constraints = await getConstraints();
      const audioStream = await getMediaStream(constraints.audio, "audio");
      if (audioStream instanceof MediaStream) {
        stream.getAudioTracks().forEach((track) => stream.removeTrack(track));
        audioStream.getAudioTracks().forEach((track) => {
          stream.addTrack(track);
          if (peerConnection && peerConnection?.signalingState !== "closed") {
            peerConnection
              .getSenders()
              .filter((sender) => sender.track?.kind === "audio")
              .forEach((sender) => sender.replaceTrack(track));
          }
        });
      }
    } else {
      stream.getAudioTracks().forEach((track) => stream.removeTrack(track));
      const silentAudioTrack = createSilentAudioStream().getAudioTracks()[0];
      stream.addTrack(silentAudioTrack);
      if (peerConnection && peerConnection?.signalingState !== "closed") {
        peerConnection
          .getSenders()
          .filter((sender) => sender.track?.kind === "audio")
          .forEach((sender) => sender.replaceTrack(silentAudioTrack));
      }
    }

    setLocalStream(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    socket.emit("change-event", {
      state: newState,
      type: "audio",
      call_id: callId,
      userId: UserData._id,
    });
    setMicEnabled(newState);
  };

  const changeVideo = async () => {
    const newState = !VideoEnabled;
    const stream = localStream;
    if (!stream) return;

    if (newState) {
      const constraints = await getConstraints();
      const videoStream: MediaStream | Error = await getMediaStream(
        constraints.video,
        "video"
      );
      if (videoStream instanceof MediaStream) {
        stream.getVideoTracks().forEach((track) => {
          stream.removeTrack(track);
        });

        videoStream.getVideoTracks().forEach((track) => {
          stream.addTrack(track);
          if (peerConnection?.signalingState !== "closed") {
            peerConnection?.getSenders().forEach((sender) => {
              if (sender.track?.kind !== "audio") {
                sender.replaceTrack(track);
              }
            });
          }
        });
      }
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const blackStream = canvas.captureStream();
      const blackVideoTrack = blackStream.getVideoTracks()[0];

      stream.getVideoTracks().forEach((track) => {
        stream.removeTrack(track);
      });

      if (peerConnection?.signalingState !== "closed") {
        peerConnection?.getSenders().forEach((sender) => {
          if (sender.track?.kind !== "audio") {
            sender.replaceTrack(blackVideoTrack);
          }
        });
      }
    }

    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    socket.emit("change-event", {
      state: newState,
      type: "video",
      call_id: callId,
      userId: UserData._id,
    });
    setVideoEnabled(newState);
  };

  const endCall = async () => {
    try {
      await stopConnection();

      window.location.replace(prevRoute ? prevRoute : "/");
    } catch (error) {
      console.error("An error occurred during endCall:", error);
    }
  };

  const restartStream = async () => {
    const prevStream = localStream;
    if (VideoEnabled) {
      const constraints = await getConstraints();
      const videoStream: MediaStream | Error = await getMediaStream(
        constraints.video,
        "video"
      );
      if (videoStream instanceof MediaStream) {
        prevStream?.getVideoTracks().map((track) => {
          track.stop();
          prevStream?.removeTrack(track);
        });
        videoStream.getVideoTracks().forEach((track) => {
          prevStream?.addTrack(track);
          if (peerConnection?.signalingState !== "closed") {
            peerConnection?.getSenders().forEach((sender) => {
              if (sender.track?.kind !== "audio") {
                sender.replaceTrack(track);
              }
            });
          }
        });
      }
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const blackStream = canvas.captureStream();
      const blackVideoTrack = blackStream.getVideoTracks()[0];

      prevStream?.addTrack(blackVideoTrack);
      if (peerConnection?.signalingState !== "closed") {
        peerConnection?.getSenders().forEach((sender) => {
          if (sender.track?.kind !== "audio") {
            sender.replaceTrack(blackVideoTrack);
          }
        });
      }
    }
    setLocalStream(prevStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = prevStream;
    }
  };

  const shareScreen = async () => {
    if (!IsScreenShared) {
      await navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: false })
        .then((stream) => {
          const prevStream = localStream;
          prevStream
            ?.getVideoTracks()
            .map((track) => prevStream.removeTrack(track));

          stream.getVideoTracks().map((track) => {
            prevStream?.addTrack(track);
            if (peerConnection?.signalingState !== "closed") {
              peerConnection?.getSenders().forEach((sender) => {
                if (sender.track?.kind !== "audio") {
                  sender.replaceTrack(track);
                }
              });
            }
            track.addEventListener("ended", (ev) => {
              restartStream();
              setIsScreenShared(false);
            });
          });

          setLocalStream(prevStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = prevStream;
          }
          if (!VideoEnabled) {
            socket.emit("change-event", {
              state: true,
              type: "video",
              call_id: callId,
              userId: UserData._id,
            });
            setVideoEnabled(true);
          }
          setIsScreenShared(!IsScreenShared);
        })
        .catch((err) => console.log(err));
    } else {
      restartStream();
      setIsScreenShared(!IsScreenShared);
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
    const notify: notification = {
      _id: CurrentChat._id,
      title: `New Message From ${UserData.name}`,
      type: "one-to-one-message",
      body: Message,
      icon: UserData.image,
      badge: UserData.image,
    };

    await axios
      .post(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/send`,
        data
      )
      .then((res: AxiosResponse) => {
        ws.emit("one-to-one-message", { _id: res.data, ...data });
      });

    sendNotification(notify);
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
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    const sessionUUID = Cookies.get("SESSION_UUID");
    if (sessionUUID) {
      setCallAudio(new Audio("/audios/callring2.mp3"));
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
        if (event.track.kind !== "audio") {
          console.log(event.track.kind);
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
          window.location.replace(prevRoute ? prevRoute : "/");
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
    const handleCalling = async (data: any) => {
      if (data?.to === UserData._id) {
        ws.emit("receiver-busy", data);
      }
    };

    const handleRinging = (data: any) => {
      if (data.callId === callId && data.type === "single") {
        setCallStatus("Ringing...");
      }
    };

    const handleCallAccepted = (data: { callId: string }) => {
      if (data.callId === callId) {
        setCallStatus("Call Accepted.");
        CallAudio && CallAudio.pause();
        setTimeout(() => setCallStatus(""), 2000);
      }
    };

    const handleCallDeclined = (data: { callId: string; from: string }) => {
      if (data.callId === callId && data.from === UserData._id) {
        setCallStatus("Call Declined.");
        CallAudio && CallAudio.pause();
        window.location.replace(prevRoute ? prevRoute : "/");
      }
    };

    const handleReceiverBusy = async (data: {
      callId: string;
      from: string;
    }) => {
      if (data.callId === callId && data.from === UserData._id) {
        setCallStatus(`User is busy.`);
        CallAudio && CallAudio.pause();
        setTimeout(() => {
          window.location.replace(prevRoute ? prevRoute : "/");
        }, 3000);
      }
    };

    const ChangeEvent = (data: {
      state: boolean;
      type: string;
      call_id: string;
      senderId: string;
    }) => {
      if (callId === data.call_id && CurrentChat?._id === data.senderId) {
        if (data.type === "audio") {
          setRemoteAudio(!data.state);
        } else if (data.type === "video") {
          setRemoteVideo(!data.state);
        }
      }
    };

    ws.on("calling", handleCalling);
    ws.on("ringing", handleRinging);
    ws.on("change-event", ChangeEvent);
    ws.on("declined", handleCallDeclined);
    ws.on("accepting", handleCallAccepted);
    ws.on("receiver-busy", handleReceiverBusy);

    return () => {
      ws.off("calling", handleCalling);
      ws.off("ringing", handleRinging);
      ws.off("change-event", ChangeEvent);
      ws.off("declined", handleCallDeclined);
      ws.off("accepting", handleCallAccepted);
      ws.off("receiver-busy", handleReceiverBusy);
    };
  }, [UserData._id, callId, prevRoute]);

  useEffect(() => {
    if (!isCallStarted) {
      setIsCallStarted(true);
    }

    let timeoutId: NodeJS.Timeout | null = null;
    const fetchDataAndSetupCall = async () => {
      try {
        // Fetch call data
        const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/call/${callId}`);
        const data = res.data;
  
        // Get media constraints
        const constraints = await getConstraints();
  
        // Initialize new MediaStream
        const newLocalStream = new MediaStream();
  
        // Get and handle audio stream
        const audioStream = await getMediaStream(constraints.audio, "audio");
        if (audioStream instanceof MediaStream) {
          audioStream.getTracks().forEach(track => newLocalStream.addTrack(track));
        } else {
          console.error("Failed to get audio stream:", audioStream);
          return;
        }
  
        if (isCallStarted) {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          const blackStream = canvas.captureStream();
          const blackVideoTrack = blackStream.getVideoTracks()[0];

          newLocalStream.addTrack(blackVideoTrack);
  
          // Update local stream and video element
          setLocalStream(newLocalStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newLocalStream;
          }
  
          // Handle WebRTC peer connection and notifications
          if (peerConnection) {
            if (data.creatorId === UserData._id && isCallStarted) {
              const notify: notification = {
                _id: data.receivers,
                title: `${UserData.name} Calling...`,
                body: window.location.origin + "/vc/" + callId + "/",
                type: "one-to-one-call",
                icon: UserData.image,
                badge: UserData.image,
              };
              setCallStatus("Calling...");
  
              ws.emit("calling", {
                callId,
                from: UserData._id,
                to: data.receivers,
                type: data.type,
              });
              sendNotification(notify);
  
              const remoteUserRes = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`, { userId: data.receivers });
              setCurrentChat(remoteUserRes.data);
              getMessages(remoteUserRes.data._id);
              CallAudio && CallAudio.play();
  
              timeoutId = setTimeout(() => {
                if (callStatusRef.current === "Calling..." || callStatusRef.current === "Ringing...") {
                  setCallStatus(`${remoteUserRes.data.name} did not receive your request.`);
                  window.location.replace(prevRoute ? prevRoute : "/");
                }
              }, 30000);
            } else if (data.type === "single" && data.receivers === UserData._id) {
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
  
              const creatorUserRes = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`, { userId: data.creatorId });
              setCurrentChat(creatorUserRes.data);
              getMessages(creatorUserRes.data._id);
            }
  
            newLocalStream.getTracks().forEach(track => {
              if (peerConnection.signalingState !== "closed") {
                peerConnection.addTrack(track, newLocalStream);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error getting media stream or handling call:", error);
      }
    };
  
    fetchDataAndSetupCall();
  
    // Cleanup function to stop all tracks in the stream
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      if (timeoutId) clearTimeout(timeoutId);
    };
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
          <div className="absolute bottom-6 right-10 w-[25%] h-auto z-[100]">
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              className="rounded-md shadow-white drop-shadow-xl bg-black"
              style={{
                width: "100%",
                height: "auto",
                transform: "rotateY(180deg)",
              }}
            />
          </div>
          <div className="relative w-[100%] h-full flex flex-col items-center justify-center bg-neutral-300 p-2">
            <video
              ref={remoteVideoRef}
              playsInline
              autoPlay
              className="rounded-md w-auto h-fit bg-black"
            />
            <div className="absolute top-0 right-0 left-0 bottom-0 flex justify-center items-center">
              <span
                className={`${
                  !RemoteAudio && "hidden"
                } bg-gray-600 bg-opacity-30 rounded-full p-5 mx-4 text-white`}
              >
                <MicOff />
              </span>
              <span
                className={`${
                  !RemoteVideo && "hidden"
                } bg-gray-600 bg-opacity-30 rounded-full p-5 mx-4 text-white`}
              >
                <VideocamOffOutlined />
              </span>
            </div>
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
              className="p-2 rounded-full bg-green-600 disabled:bg-green-700 mx-2"
              onClick={changeVideo}
              disabled={IsScreenShared}
            >
              {!VideoEnabled ? <VideocamOffOutlined /> : <VideocamOutlined />}
            </button>
            <button
              className="p-2 rounded-full bg-green-600 mx-2"
              onClick={shareScreen}
            >
              {!IsScreenShared ? (
                <ScreenSearchDesktopOutlined />
              ) : (
                <StopScreenShareOutlined />
              )}
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

export default videoCall;
