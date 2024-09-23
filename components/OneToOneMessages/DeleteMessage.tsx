import socket from "@/utils/socket";
import axios from "axios";

interface DeleteMessageProps {
  messageId: string;
  setMessagesList: React.Dispatch<
    React.SetStateAction<
      {
        _id: string;
        senderId: string;
        receiverId: string;
        message: string;
        timming: string;
        seen: boolean;
      }[]
    >
  >;
}

const DeleteMessage = async ({
  messageId,
  setMessagesList,
}: DeleteMessageProps) => {
  try {
    const result = await axios.post(
      `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/v1/message/one-to-one/delete/`,
      { messageId }
    );

    if (result.status === 200) {
      setMessagesList((prevMessagesList) =>
        prevMessagesList.filter((message) => message._id !== messageId)
      );
      socket.emit("one-to-one-delete", { messageId: messageId });
    } else {
      console.error("Failed to delete message:", result.statusText);
    }
  } catch (error) {
    console.error("Error deleting message:", error);
  }
};

export default DeleteMessage;
