import axios, { AxiosResponse } from "axios";
import socket from "@/utils/socket";
import sendNotification from "@/utils/sendNotification";

interface SendMessagesProps {
  UserData: userData;
  receiverData: any;
  Message: string
}

const SendMessage = async ({
  UserData,
  receiverData,
  Message
}: SendMessagesProps) => {
    const currentDate = new Date();
    const data = {
      senderId: UserData._id,
      receiverId: receiverData?._id,
      message: Message,
      timming: currentDate.toLocaleTimeString([], {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      }),
      seen: false,
    };
    const notify: notification = {
      _id: receiverData?._id,
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
        socket.emit("one-to-one-message", { _id: res.data, ...data });
      });

    sendNotification(notify);
};

export default SendMessage;