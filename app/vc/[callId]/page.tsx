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
      message?: string;
      filePath?: string;
      timming: string;
      seen: boolean;
      type: string;
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
  const [AudioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [RemoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [UpdatesMessage, setUpdatesMessage] = useState<string | null>(null);
  const [CallAudio, setCallAudio] = useState<HTMLAudioElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [IsCallRecording, setIsCallRecording] = useState<boolean>(false);
  const [PeerStream, setPeerStream] = useState<MediaStream | null>(null);
  const [RecordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [IsScreenShared, setIsScreenShared] = useState<boolean>(false);
  const [isCallStarted, setIsCallStarted] = useState<boolean>(false);
  const [AudioChunks, setAudioChunks] = useState<Array<Blob>>([]);
  const [RecordedBy, setRecordedBy] = useState<string | null>(null);
  const [RecorderAudio, setRecorderAudio] = useState<boolean>(true);
  const [messagesShow, setMessagesShow] = useState<boolean>(false);
  const [VideoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [IsRecording, setIsRecording] = useState<boolean>(false);
  const [RemoteVideo, setRemoteVideo] = useState<boolean>(false);
  const [RemoteAudio, setRemoteAudio] = useState<boolean>(false);
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
    const peerStream = PeerStream;
    if (!peerStream) return;

    if (newState) {
      const constraints = await getConstraints();
      const audioStream = await getMediaStream(constraints.audio, "audio");

      if (audioStream instanceof MediaStream) {
        peerStream.getAudioTracks().forEach((track) => {
          peerStream.removeTrack(track);
        });

        audioStream.getAudioTracks().forEach((track) => {
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
      peerStream
        .getAudioTracks()
        .forEach((track) => peerStream.removeTrack(track));

      const silentAudioTrack = createSilentAudioStream().getAudioTracks()[0];
      peerStream.addTrack(silentAudioTrack);
      if (peerConnection && peerConnection.signalingState !== "closed") {
        peerConnection
          .getSenders()
          .filter((sender) => sender.track?.kind === "audio")
          .forEach((sender) => sender.replaceTrack(silentAudioTrack));
      }
    }

    setPeerStream(peerStream);
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
      if (IsCallRecording && RecordedBy === UserData._id) {
        setIsCallRecording(false);
      }
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

  const downloadRecording = async (filePath: string) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_PATH}/recording/${filePath}`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filePath;

      document.body.appendChild(link);
      link.click();

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

    const deleteMessage = MessagesList.find(
      (message) => message.type === "recording" && message.filePath === filename
    );

    if (deleteMessage) {
      setMessagesList((prev) => [
        ...prev.filter((message) => message._id !== deleteMessage._id),
      ]);
      ws.emit("recording-delete", { filename });
    }
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
    if (senderId === UserData._id || receiverId === UserData._id) {
      if (receiverId === UserData._id) {
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

  const recordingSaveHandle = ({
    _id,
    senderId,
    receiverId,
    filePath,
    timming,
    seen,
  }: {
    _id: string;
    senderId: string;
    receiverId: string;
    filePath: string;
    timming: string;
    seen: boolean;
  }) => {
    if (senderId === UserData._id || receiverId === UserData._id) {
      if (receiverId === UserData._id) {
        axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/change-status/${_id}`
        );
      }
      setMessagesList((prev) => [
        ...prev,
        {
          _id,
          senderId,
          receiverId,
          filePath,
          timming,
          seen,
          type: "recording",
        },
      ]);
    }
  };

  const recordingHandle = ({
    call_id,
    recording,
    userId,
  }: {
    call_id: string;
    recording: boolean;
    userId: string;
  }) => {
    if (call_id === callId && userId === CurrentChat?._id) {
      setIsCallRecording(recording);
      setRecordedBy(recording ? CurrentChat?._id : null);
    }
  };

  const recordingDeleteHandle = ({ filename }: { filename: string }) => {
    const deleteMessage = MessagesList.find(
      (message) => message.type === "recording" && message.filePath === filename
    );

    if (deleteMessage) {
      setMessagesList((prev) => [
        ...prev.filter((message) => message._id !== deleteMessage._id),
      ]);
    }
  };

  useEffect(() => {
    const eventHandlers = {
      recording: recordingHandle,
      "message-read": messageStatusHandle,
      "one-to-one-edited": OneToOneEdited,
      "one-to-one-delete": OneToOneDelete,
      "recording-save": recordingSaveHandle,
      "one-to-one-message": OneToOneMessage,
      "recording-delete": recordingDeleteHandle,
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      ws.on(event, handler);
    });

    return () => {
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        ws.off(event, handler);
      });
    };
  }, [ws, UserData._id, CurrentChat?._id, MessagesList]);

  useEffect(() => {
    const sessionUUID = Cookies.get("SESSION_UUID");
    if (!sessionUUID) return;

    const fetchUserProfile = async () => {
      try {
        const { data }: AxiosResponse<userData> = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/profile/`,
          {
            sessionId: sessionUUID,
          }
        );

        const userImage = data.image
          ? `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/user/image/${data.image}`
          : "/user.png";
        setUserData({ ...data, image: userImage });
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    setCallAudio(new Audio("/audios/callring2.mp3"));
    fetchUserProfile();
  }, []);

  useEffect(() => {
    let canvasRecorder: MediaRecorder | null;
    let audioRecorder: MediaRecorder | null;

    let videoChunks: Blob[] = [];

    const loadRecorder = async () => {
      if (!PeerStream || !RemoteStream) return;

      const canvas = RecorderCanvas || document.createElement("canvas");
      !RecorderCanvas && setRecorderCanvas(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const CombinedContext = audioContext || new AudioContext();
      !audioContext && setAudioContext(CombinedContext);

      const peerAudio = PeerStream.getAudioTracks().length;
      const remoteAudio = RemoteStream.getAudioTracks().length;

      if (peerAudio > 0 && remoteAudio > 0) {
        const peerSource = CombinedContext.createMediaStreamSource(PeerStream);
        const remoteSource =
          CombinedContext.createMediaStreamSource(RemoteStream);

        const peerGain = CombinedContext.createGain();
        const remoteGain = CombinedContext.createGain();

        peerGain.gain.setValueAtTime(1, CombinedContext.currentTime);
        remoteGain.gain.setValueAtTime(1, CombinedContext.currentTime);

        peerSource.connect(peerGain);
        remoteSource.connect(remoteGain);

        const destination = CombinedContext.createMediaStreamDestination();

        peerGain.connect(destination);
        remoteGain.connect(destination);

        audioRecorder = AudioRecorder || new MediaRecorder(destination.stream);
        !AudioRecorder && setAudioRecorder(audioRecorder);

        if ((!MicEnabled && RecorderAudio) || (MicEnabled && !RecorderAudio)) {
          let RecordingStopped = false;

          if (audioRecorder.state === "recording") {
            audioRecorder.stop();
            RecordingStopped = true;
          }

          audioRecorder.stream
            .getAudioTracks()
            .map((track) => audioRecorder?.stream.removeTrack(track));
          destination.stream
            .getAudioTracks()
            .map((track) => audioRecorder?.stream.addTrack(track));
          setRecorderAudio(!RecorderAudio);
          RecordingStopped && audioRecorder.start();
        }
      }

      canvasRecorder =
        mediaRecorder || new MediaRecorder(canvas.captureStream(30));
      !mediaRecorder && setMediaRecorder(canvasRecorder);

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
        if (!IsRecording && audioRecorder) {
          audioRecorder.ondataavailable = (ev) => {
            setAudioChunks((prev) => [...prev, ev.data]);
          };

          canvasRecorder.ondataavailable = (ev) => {
            videoChunks.push(ev.data);
          };

          canvasRecorder.onstop = async () => {
            const videoBlob = new Blob(videoChunks, {
              type: "video/webm",
            });
            videoChunks = [];

            setRecordedVideo(videoBlob);
          };

          canvasRecorder.onerror = (e) => {
            console.error("Error during recording:", e);
          };
        }

        if (IsCallRecording && !RecordedBy && !IsRecording && audioRecorder) {
          drawFrame();

          audioRecorder.start();
          canvasRecorder.start();

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
          audioRecorder &&
          audioRecorder.state === "recording" &&
          canvasRecorder.state === "recording"
        ) {
          audioRecorder.stop();
          canvasRecorder.stop();
          setIsRecording(false);
          setRecordedBy(null);
          ws.emit("recording", {
            call_id: callId,
            recording: false,
            userId: UserData._id,
          });
        }

        if (RecordedVideo) {
          const currentDate = new Date();
          const formattedDate = currentDate
            .toISOString()
            .replace(/:/g, "-")
            .split(".")[0]
            .replace("T", "_");
          const videoFile = `video-wiredtalk-call-recording_${callId}_${formattedDate}.mp4`;
          const audioFile = `audio-wiredtalk-call-recording_${callId}_${formattedDate}.mp3`;

          const audioBlobs = await Promise.all(
            AudioChunks.map(
              (chunk) => new Blob([chunk], { type: "audio/webm" })
            )
          );

          const formData = new FormData();
          formData.append("videoFile", RecordedVideo, videoFile);
          audioBlobs.map((audioBlob, index)=>
            formData.append("audioFile-"+index, audioBlob, index+"-"+audioFile)
          );
          formData.append("senderId", UserData._id);
          formData.append("receiverId", CurrentChat._id);
          formData.append(
            "timming",
            currentDate.toLocaleTimeString([], {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
            })
          );

          setRecordedVideo(null);

          await axios
            .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/uploads/`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            })
            .then((res) => {
              setUpdatesMessage(res.data.message);
              setTimeout(() => setUpdatesMessage(null), 5000);

              let addedRecording = false;
              const newMessage = {
                _id: res.data.recordingId,
                senderId: UserData._id,
                receiverId: CurrentChat._id,
                filePath: videoFile.replace("video-", ""),
                timming: currentDate.toLocaleTimeString([], {
                  hour12: true,
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                seen: true,
                type: "recording",
              };

              setMessagesList((prevMessages) => {
                const recordingExist = prevMessages.some(
                  (message) => message._id === newMessage._id
                );

                if (!recordingExist && !addedRecording) {
                  addedRecording = true;
                  return [...prevMessages, newMessage];
                }

                return prevMessages;
              });

              ws.emit("recording-save", newMessage);
            })
            .catch((err) => console.log(err));
        }

        return;
      } catch (error) {
        return console.error("Error loading functions:", error);
      }
    };

    loadRecorder();
  }, [
    callId,
    MicEnabled,
    localStream,
    RemoteStream,
    audioContext,
    setAudioContext,
    RecorderCanvas,
    setRecorderCanvas,
    IsCallRecording,
    setIsCallRecording,
    IsRecording,
    setIsRecording,
    mediaRecorder,
    setMediaRecorder,
    AudioRecorder,
    setAudioRecorder,
    PeerStream?.getAudioTracks(),
    RemoteStream?.getAudioTracks(),
    RecorderAudio,
    setRecorderAudio,
    RecordedVideo,
    setRecordedVideo,
    AudioChunks,
    setAudioChunks,
  ]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

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
          pc.iceConnectionState === "closed" ||
          pc.iceConnectionState === "failed"
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
    const handleIncomingOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      from: string;
      to: string;
    }) => {
      const { offer, from, to } = data;
      if (to !== UserData._id || !peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.emit("answer", { answer, from: UserData._id, to: from });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    };

    const handleIncomingAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      from: string;
      to: string;
    }) => {
      const { answer, from, to } = data;
      if (to !== UserData._id || !peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIncomingIceCandidate = async (
      candidate: RTCIceCandidateInit
    ) => {
      if (!peerConnection) return;

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding received ICE candidate:", error);
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
      {UpdatesMessage && (
        <div className="relative z-[500]">
          <div className="absolute top-5 left-0 right-0">
            <div className="mx-auto w-fit h-fit px-5 py-2 bg-blue-700 drop-shadow-md rounded">
              <p className="text-white font-light">{UpdatesMessage}</p>
            </div>
          </div>
        </div>
      )}
      {IsCallRecording && (
        <div className="relative z-[500]">
          <div className="absolute top-5 left-0 right-0">
            <div className="mx-auto w-fit h-fit px-5 py-2 bg-gray-900 bg-opacity-50 drop-shadow-md rounded">
              <p className="text-white font-light">
                Call is recording by{" "}
                {RecordedBy && RecordedBy === UserData._id
                  ? UserData.name
                  : CurrentChat.name}
              </p>
            </div>
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
            MessagesList.map((message) => {
              const isSender: boolean =
                message.senderId === UserData._id ? false : true;

              if (message.type === "message" && message.message) {
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
              } else if (message.type === "recording") {
                const isSender: boolean =
                  message.senderId === UserData._id ? false : true;
                return (
                  <div
                    key={message._id}
                    className={`flex items-center ${
                      isSender ? "justify-start" : "justify-end"
                    } px-2`}
                  >
                    <div className="relative max-w-52 my-5 px-2 pt-4 pb-2 bg-white text-sm font-light">
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
                        {message.senderId === UserData._id && (
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
              className="rounded-md w-auto h-[90%]"
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
              disabled={RecordedBy !== null && RecordedBy !== UserData._id}
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
