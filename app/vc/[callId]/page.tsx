"use client";
import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import socket from "@/utils/socket";
import { NextPage } from "next";
import Cookies from "js-cookie";

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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<string>();
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const ws = socket;

  ws.connect();

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
    const initializePeerConnection = () => {
      const pc = new RTCPeerConnection(peerConnectionConfig);

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          ws.emit("ice-candidate", event.candidate);
        }
      };

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
        )
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    };

    const handleIncomingIceCandidate = async (
      candidate: RTCIceCandidateInit
    ) => {
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
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
        setTimeout(() => setCallStatus(undefined), 2000);
      }
    };

    const handleCallDeclined = (data: { callId: string; from: string }) => {
      if (data.callId === callId && data.from === UserData._id) {
        setCallStatus("Call Declined.");
        router.push(prevRoute);
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
    axios
      .get(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/call/${callId}`)
      .then(async (res: AxiosResponse) => {
        const data = res.data;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          if (peerConnection) {
            if (data.creatorId === UserData._id) {
              setCallStatus("Calling...");
              ws.emit("calling", {
                callId,
                from: UserData._id,
                to: data.receivers,
                type: data.type,
              });
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
            }

            stream.getTracks().forEach((track) => {
              if (peerConnection.signalingState !== "closed") {
                peerConnection.addTrack(track, stream);
              }
            });
          }
        } catch (error) {
          console.error("Error getting media stream:", error);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, [callId, peerConnection, UserData._id]);

  return (
    <div className="relative w-auto h-auto px-5 py-2">
      {callStatus && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white py-3 px-8 font-semibold">
          {callStatus}
        </div>
      )}
      <div className="relative sm:w-[85%] lg:w-fit h-fit mx-auto my-10">
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
        <div className="w-full h-full">
          <video
            ref={remoteVideoRef}
            playsInline
            autoPlay
            className="rounded-md"
            style={{
              width: "100%",
              height: "auto",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default VC;
