"use client";
import React, { useRef, useEffect, useState } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-converter";
import { NextPage } from "next";
import "@tensorflow/tfjs-core";

const Call: NextPage = () => {
  const [bodypixnet, setBodypixnet] = useState<bodyPix.BodyPix | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadBodyPix = async () => {
      const net = await bodyPix.load();
      setBodypixnet(net);
    };
    loadBodyPix();
  }, []);

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
      } catch (err) {
        console.error("Error accessing webcam: ", err);
      }
    };

    getVideoStream();

    // Cleanup stream on component unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (bodypixnet && stream && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      const setupCanvas = () => {
        if (video) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context?.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      const drawImage = async () => {
        if (video && context) {
          // Create tempCanvas
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext("2d");

          const drawMask = async () => {
            requestAnimationFrame(drawMask);
            const segmentation = await bodypixnet.segmentPerson(video);
            const mask = bodyPix.toMask(segmentation);
            tempCtx?.putImageData(mask, 0, 0);

            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            context?.save();
            context.globalCompositeOperation = "destination-out";
            context.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
            context?.restore();
          };

          drawMask();
        }
      };

      // Setup canvas and draw image once video is ready
      const handleCanPlay = () => {
        setupCanvas();
        drawImage();
      };

      video.addEventListener("canplay", handleCanPlay);

      return () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.srcObject = null;
      };
    }
  }, [bodypixnet, stream]);

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <canvas ref={canvasRef} className="w-1/2" />
    </div>
  );
};

export default Call;
