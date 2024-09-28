import axios, { AxiosResponse } from "axios";
import socket from "@/utils/socket";

interface GetMessagesProps {
  userId: string;
  receiverId: string;
  setMessagesList: React.Dispatch<
    React.SetStateAction<
      {
        _id: string;
        senderId: string;
        receiverId: string;
        message?: string;
        filePath?: string;
        timming: string;
        seen: boolean;
        type: string;
      }[]
    >
  >;
}

const GetMessages = async ({
  userId,
  receiverId,
  setMessagesList,
}: GetMessagesProps) => {
  try {
    const response: AxiosResponse = await axios.get(
      `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/messages/one-to-one/${userId}`
    );

    const messages = response.data;
    const statusUpdatePromises = messages
      .filter((message: any) => message?.seen === false)
      .map((message: any) => {
        if (message?.receiverId === userId) {
          return axios
            .get(
              `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/change-status/${message?._id}`
            )
            .then(() => {
              message.seen = true;
              socket.emit("message-read", { messageId: message._id });
            });
        }
        return null;
      })
      .filter(Boolean);

    await Promise.all(statusUpdatePromises);

    const filteredMessages = messages.filter(
      (message: any) =>
        message.senderId === receiverId || message.receiverId === receiverId
    );
    setMessagesList(filteredMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
};

export default GetMessages;