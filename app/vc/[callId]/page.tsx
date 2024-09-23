"use client";
import SendEditMessage from "@/components/OneToOneMessages/SendEditMessage";
import DeleteMessage from "@/components/OneToOneMessages/DeleteMessage";
import SendMessage from "@/components/OneToOneMessages/SendMessage";
import GetMessages from "@/components/OneToOneMessages/GetMessages";
import MessageBox from "@/components/MessageBox/MessageBox";
import sendNotification from "@/utils/sendNotification";
import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import socket from "@/utils/socket";
import { NextPage } from "next";
import Cookies from "js-cookie";
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
  RadioButtonChecked,
} from "@mui/icons-material";

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
  const [RecorderCanvas, setRecorderCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [RemoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [CallAudio, setCallAudio] = useState<HTMLAudioElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [IsCallRecording, setIsCallRecording] = useState<boolean>(false);
  const [PeerStream, setPeerStream] = useState<MediaStream | null>(null);
  const [IsScreenShared, setIsScreenShared] = useState<boolean>(false);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [RecordedBy, setRecordedBy] = useState<string | null>(null);
  const [messagesShow, setMessagesShow] = useState<boolean>(false);
  const [VideoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [RemoteVideo, setRemoteVideo] = useState<boolean>(false);
  const [RemoteAudio, setRemoteAudio] = useState<boolean>(false);
  const [IsRecording, setIsRecording] = useState<boolean>(false);
  const [MicEnabled, setMicEnabled] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 400, ideal: 1080 },
        facingMode: { exact: "user" },
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
    let constraints: { video?: any; audio?: any } = {};

    if (type === "video") {
      constraints = { video: constraint };
    } else if (type === "audio") {
      constraints = { audio: constraint };
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      return newStream;
    } catch (err) {
      return Error("an Error Occurred");
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
    const LocalStream = localStream;
    const peerStream = PeerStream;
    if (!LocalStream || !peerStream) return;

    if (newState) {
      const constraints = await getConstraints();
      const audioStream = await getMediaStream(constraints.audio, "audio");

      if (audioStream instanceof MediaStream) {
        LocalStream.getAudioTracks().forEach((track) => {
          LocalStream.removeTrack(track);
        });
        peerStream.getAudioTracks().forEach((track) => {
          peerStream.removeTrack(track);
        });

        audioStream.getAudioTracks().forEach((track) => {
          LocalStream.addTrack(track);
          peerStream.addTrack(track);
          if (peerConnection && peerConnection.signalingState !== "closed") {
            peerConnection
              .getSenders()
              .filter((sender) => sender.track?.kind === "audio")
              .forEach((sender) => sender.replaceTrack(track));
          }
        });
      }
    } else {
      LocalStream.getAudioTracks().forEach((track) =>
        LocalStream.removeTrack(track)
      );
      peerStream
        .getAudioTracks()
        .forEach((track) => peerStream.removeTrack(track));

      const silentAudioTrack = createSilentAudioStream().getAudioTracks()[0];
      LocalStream.addTrack(silentAudioTrack);
      peerStream.addTrack(silentAudioTrack);
      if (peerConnection && peerConnection.signalingState !== "closed") {
        peerConnection
          .getSenders()
          .filter((sender) => sender.track?.kind === "audio")
          .forEach((sender) => sender.replaceTrack(silentAudioTrack));
      }
    }

    setLocalStream(LocalStream);
    setPeerStream(peerStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = LocalStream;
    }
    socket.emit("change-event", {
      state: newState,
      type: "audio",
      call_id: callId,
      userId: UserData._id,
    });
    setMicEnabled(newState);
  };

  const changeVideo = async () => {
    try {
      const newState = !VideoEnabled;
      const LocalStream = localStream;
      const peerStream = PeerStream;
      if (!LocalStream || !peerStream) return;

      if (newState) {
        const constraints = await getConstraints();
        const videoStream: MediaStream | Error = await getMediaStream(
          constraints.video,
          "video"
        );
        if (videoStream instanceof MediaStream) {
          LocalStream.getVideoTracks().forEach((track) =>
            LocalStream.removeTrack(track)
          );
          peerStream
            .getVideoTracks()
            .forEach((track) => peerStream.removeTrack(track));

          videoStream.getVideoTracks().forEach((track) => {
            LocalStream.addTrack(track);
            peerStream.addTrack(track);
            if (peerConnection?.signalingState !== "closed") {
              peerConnection?.getSenders().forEach((sender) => {
                if (sender.track?.kind === "video") {
                  sender.replaceTrack(track);
                }
              });
            }
          });
        }
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const blackStream = canvas.captureStream();
        const blackVideoTrack = blackStream.getVideoTracks()[0];

        LocalStream.getVideoTracks().forEach((track) => {
          LocalStream.removeTrack(track);
        });
        peerStream.getVideoTracks().forEach((track) => {
          peerStream.removeTrack(track);
        });

        LocalStream.addTrack(blackVideoTrack);
        peerStream.addTrack(blackVideoTrack);
        if (peerConnection?.signalingState !== "closed") {
          peerConnection?.getSenders().forEach((sender) => {
            if (sender.track?.kind === "video") {
              sender.replaceTrack(blackVideoTrack);
            }
          });
        }
      }

      setLocalStream(LocalStream);
      setPeerStream(peerStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = LocalStream;
      }
      socket.emit("change-event", {
        state: newState,
        type: "video",
        call_id: callId,
        userId: UserData._id,
      });
      setVideoEnabled(newState);
    } catch (err) {
      console.log(err);
    }
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
    const prevLocalStream = localStream;
    const prevPeerStream = PeerStream;
    if (VideoEnabled) {
      const constraints = await getConstraints();
      const videoStream: MediaStream | Error = await getMediaStream(
        constraints.video,
        "video"
      );
      if (videoStream instanceof MediaStream) {
        prevLocalStream?.getVideoTracks().map((track) => {
          track.stop();
          prevLocalStream?.removeTrack(track);
        });
        prevPeerStream?.getVideoTracks().map((track) => {
          track.stop();
          prevPeerStream?.removeTrack(track);
        });
        videoStream.getVideoTracks().forEach((track) => {
          prevLocalStream?.addTrack(track);
          prevPeerStream?.addTrack(track);
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
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const blackStream = canvas.captureStream();
      const blackVideoTrack = blackStream.getVideoTracks()[0];

      prevLocalStream?.addTrack(blackVideoTrack);
      prevPeerStream?.addTrack(blackVideoTrack);
      if (peerConnection?.signalingState !== "closed") {
        peerConnection?.getSenders().forEach((sender) => {
          if (sender.track?.kind !== "audio") {
            sender.replaceTrack(blackVideoTrack);
          }
        });
      }
    }
    setLocalStream(prevLocalStream);
    setPeerStream(prevPeerStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = prevLocalStream;
    }
  };

  const shareScreen = async () => {
    if (!IsScreenShared) {
      await navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: false })
        .then((stream) => {
          const prevLocalStream = localStream;
          prevLocalStream
            ?.getVideoTracks()
            .map((track) => prevLocalStream.removeTrack(track));
          const prevPeerStream = PeerStream;
          prevPeerStream
            ?.getVideoTracks()
            .map((track) => prevPeerStream.removeTrack(track));

          stream.getVideoTracks().map((track) => {
            prevLocalStream?.addTrack(track);
            prevPeerStream?.addTrack(track);
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

          setLocalStream(prevLocalStream);
          setPeerStream(prevPeerStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = prevLocalStream;
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

  const editMessage = (messageId: string) => {
    setEditId(messageId);
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

  const recordingHandle = (data: {
    call_id: string;
    recording: boolean;
    userId: string;
  }) => {
    if (data.call_id === callId && data.userId === CurrentChat?._id) {
      setIsCallRecording(data.recording);
      !data.recording ? setRecordedBy(null) : setRecordedBy(CurrentChat?._id);
    }
  };

  useEffect(() => {
    let recorder: MediaRecorder | null;
    const ffmpeg = new FFmpeg();
    let chunks: Blob[] = [];

    const loadFFmpeg = async () => {
      if (!PeerStream || !RemoteStream) return;
      const canvas = RecorderCanvas || document.createElement("canvas");
      !RecorderCanvas && setRecorderCanvas(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const remoteStream = RemoteStream;
      const peerStream = PeerStream;

      const audioContext = new AudioContext();

      const localAudioTracks = peerStream.getAudioTracks();
      const remoteAudioTracks = remoteStream.getAudioTracks();

      let localAudioSource, remoteAudioSource;

      if (localAudioTracks.length > 0) {
        localAudioSource = audioContext.createMediaStreamSource(peerStream);
      }

      if (remoteAudioTracks.length > 0) {
        remoteAudioSource = audioContext.createMediaStreamSource(remoteStream);
      }

      const destination = audioContext.createMediaStreamDestination();

      if (localAudioSource) {
        localAudioSource.connect(destination);
      }
      if (remoteAudioSource) {
        remoteAudioSource.connect(destination);
      }

      const combinedAudioStream = destination.stream;

      const mainStream = new MediaStream([
        ...canvas.captureStream().getTracks(),
        ...combinedAudioStream.getTracks(),
      ]);

      recorder = mediaRecorder || new MediaRecorder(mainStream);
      !mediaRecorder && setMediaRecorder(recorder);

      const localVideo = document.createElement("video");
      localVideo.srcObject = localStream;
      localVideo.autoplay = true;

      const remoteVideo = document.createElement("video");
      remoteVideo.srcObject = RemoteStream;
      remoteVideo.autoplay = true;

      const drawFrame = () => {
        canvas.width =
          (localVideo.videoWidth || 0) + (remoteVideo.videoWidth || 0) + 100;
        canvas.height =
          Math.max(localVideo.videoHeight || 0, remoteVideo.videoHeight || 0) +
          100;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(
          localVideo,
          50,
          50,
          canvas.width / 2 - 50,
          canvas.height - 100
        );
        ctx.drawImage(
          remoteVideo,
          canvas.width / 2,
          50,
          canvas.width / 2 - 50,
          canvas.height - 100
        );

        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(UserData.name, canvas.width / 2 - 100, canvas.height - 50);
        ctx.fillText(CurrentChat.name, canvas.width - 150, canvas.height - 50);

        requestAnimationFrame(drawFrame);
      };

      try {
        if (!IsRecording) {
          await ffmpeg.load();

          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0) {
              chunks.push(ev.data);
            }
          };

          recorder.onstop = async () => {
            try {
              const blob = new Blob(chunks, { type: "video/webm" });
              chunks = []

              const arrayBuffer = await blob.arrayBuffer();
              await ffmpeg.writeFile("output.mp4", new Uint8Array(arrayBuffer));
              const mp4URL = URL.createObjectURL(blob);

              const currentDate = new Date();

              const day = String(currentDate.getDate()).padStart(2, "0");
              const month = String(currentDate.getMonth() + 1).padStart(2, "0");
              const year = currentDate.getFullYear();

              const hours = String(currentDate.getHours()).padStart(2, "0");
              const minutes = String(currentDate.getMinutes()).padStart(2, "0");
              const seconds = String(currentDate.getSeconds()).padStart(2, "0");

              const formattedDate = `${day}-${month}-${year}_${hours}:${minutes}:${seconds}`;
              const filename = `wiredtalk-call-recording_${formattedDate}.mp4`;
              const link = document.createElement("a");
              link.href = mp4URL;
              link.download = filename;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              URL.revokeObjectURL(mp4URL);
            } catch (err) {
              console.error("Error processing the video:", err);
            }
          };

          recorder.onerror = (e) => {
            console.error("Error during recording:", e);
          };
        }

        if (IsCallRecording && !RecordedBy && !IsRecording) {
          drawFrame();
          recorder.start();
          setIsRecording(true);
          setRecordedBy(UserData._id);
          ws.emit("recording", {
            call_id: callId,
            recording: true,
            userId: UserData._id,
          });
        }

        if (
          RecordedBy === UserData._id &&
          !IsCallRecording &&
          IsRecording &&
          recorder.state === "recording"
        ) {
          recorder.stop();
          setIsRecording(false);
          setRecordedBy(null);
          ws.emit("recording", {
            call_id: callId,
            recording: false,
            userId: UserData._id,
          });
        }

        return;
      } catch (error) {
        return console.error("Error loading FFmpeg:", error);
      }
    };

    loadFFmpeg();
  }, [
    callId,
    localStream,
    RemoteStream,
    RecorderCanvas,
    setRecorderCanvas,
    IsCallRecording,
    setIsCallRecording,
    IsRecording,
    setIsRecording,
    mediaRecorder,
    setMediaRecorder,
  ]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    const messageToEdit = MessagesList.find((msg) => msg._id === EditId);
    if (messageToEdit) {
      setEditValue(messageToEdit.message);
    } else {
      setEditValue("");
    }
  }, [EditId, MessagesList]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [MessagesList]);

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
    ws.on("recording", recordingHandle);
    ws.on("message-read", messageStatusHandle);
    ws.on("one-to-one-edited", OneToOneEdited);
    ws.on("one-to-one-delete", OneToOneDelete);
    ws.on("one-to-one-message", OneToOneMessage);

    return () => {
      ws.off("recording", recordingHandle);
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

    const fetchDataAndSetupCall = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/call/${callId}`
        );
        const data = res.data;

        const LocalStream = new MediaStream();
        const peerStream = new MediaStream();

        const constraints = await getConstraints();
        const audioStream: MediaStream | Error = await getMediaStream(
          constraints.audio,
          "audio"
        );
        const videoStream: MediaStream | Error = await getMediaStream(
          constraints.video,
          "video"
        );

        if (audioStream instanceof MediaStream) {
          audioStream.getTracks().map((track) => peerStream.addTrack(track));
        }

        if (videoStream instanceof MediaStream) {
          videoStream.getTracks().map((track) => peerStream.addTrack(track));
          videoStream.getTracks().map((track) => LocalStream.addTrack(track));
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = 1920;
          canvas.height = 1080;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          const blackStream = canvas.captureStream();
          const blackVideoTrack = blackStream.getVideoTracks()[0];

          peerStream.addTrack(blackVideoTrack);
          LocalStream.addTrack(blackVideoTrack);

          socket.emit("change-event", {
            state: !VideoEnabled,
            type: "video",
            call_id: callId,
            userId: UserData._id,
          });
          setVideoEnabled(!VideoEnabled);
        }

        if (isCallStarted) {
          setLocalStream(LocalStream);
          setPeerStream(peerStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = LocalStream;
          }
        }

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

            const remoteUserRes = await axios.post(
              `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/userId`,
              { userId: data.receivers }
            );
            setCurrentChat(remoteUserRes.data);
            GetMessages({
              userId: UserData._id,
              receiverId: remoteUserRes.data._id,
              setMessagesList: setMessagesList,
            });
            CallAudio && CallAudio.play();

            const timeoutId = setTimeout(() => {
              if (
                callStatusRef.current === "Calling..." ||
                callStatusRef.current === "Ringing..."
              ) {
                setCallStatus(
                  `${remoteUserRes.data.name} did not receive your request.`
                );
                window.location.replace(prevRoute ? prevRoute : "/");
              }
            }, 15000);

            peerStream.getTracks().forEach((track) => {
              if (peerConnection.signalingState !== "closed") {
                peerConnection.addTrack(track, peerStream);
              }
            });

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
            GetMessages({
              userId: UserData._id,
              receiverId: CurrentChat?._id,
              setMessagesList: setMessagesList,
            });

            peerStream.getTracks().forEach((track) => {
              if (peerConnection.signalingState !== "closed") {
                peerConnection.addTrack(track, peerStream);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error getting media stream or handling call:", error);
      }
    };

    fetchDataAndSetupCall();
  }, [callId, peerConnection, UserData._id, CurrentChat?._id, isCallStarted]);

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
                  onDelete={() => {
                    DeleteMessage({
                      messageId: message._id,
                      setMessagesList: setMessagesList,
                    });
                  }}
                />
              );
            })}
          <div ref={messagesEndRef}></div>
        </div>
        <div className="w-full flex justify-around items-center py-2 px-4 bg-gray-200">
          <input
            type="text"
            placeholder="Type your message here..."
            className="outline-none bg-transparent"
            value={Message === "" ? "" : Message}
            onChange={(ev) => setMessage(ev.target.value)}
          />
          <button
            className="cursor-pointer"
            onClick={() => {
              SendMessage({
                UserData: UserData,
                receiverData: CurrentChat,
                Message: Message,
              });
              setMessage("");
            }}
          >
            <Send />
          </button>
        </div>
      </div>
      {IsCallRecording && (
        <div className="relative z-[500]">
          <div className="absolute top-5 left-0 right-0">
            <div className="mx-auto w-fit h-fit px-5 py-2 bg-gray-900 bg-opacity-50 drop-shadow-md rounded">
              <p className="text-white font-light">
                Call is recording by{" "}
                {RecordedBy === UserData._id ? UserData.name : CurrentChat.name}
              </p>
              {RecordedBy === UserData._id && (
                <button
                  className="text-blue-700 text-sm mt-2"
                  onClick={() => setIsCallRecording(!IsCallRecording)}
                >
                  Stop Recoring
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="w-[100vw] h-[100vh]">
        <div className="relative w-full h-[85%]">
          <div className="absolute bottom-6 right-10 w-[25%] h-auto z-[100]">
            <video
              ref={localVideoRef}
              disablePictureInPicture
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
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-neutral-300 p-2">
            <video
              ref={remoteVideoRef}
              disablePictureInPicture
              playsInline
              autoPlay
              className="rounded-md w-auto h-auto"
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
              className="p-2 rounded-full bg-green-600 disabled:bg-green-700 mx-2"
              onClick={() => setIsCallRecording(!IsCallRecording)}
              disabled={IsCallRecording}
            >
              <RadioButtonChecked />
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

export default VC;
