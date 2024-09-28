import React, { useState } from "react";
import socket from "@/utils/socket";
import axios from "axios";

interface SendEditMessageProps {
  EditId: string;
  EditValue: string;
  MessagesList: {
    _id: string;
    senderId: string;
    receiverId: string;
    message?: string;
    filePath?: string;
    timming: string;
    seen: boolean;
    type: string;
  }[];
  setEditId: React.Dispatch<React.SetStateAction<string>>;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
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

const SendEditMessage: React.FC<SendEditMessageProps> = ({
  EditId,
  EditValue,
  setEditId,
  MessagesList,
  setEditValue,
  setMessagesList,
}) => {
  const CencelEditedMessage = () => {
    setEditId("");
    setEditValue("");
  };
  
  const sendMessage = async () => {
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
  
        socket.emit("one-to-one-edited", {
          messageId: EditId,
          updatedMessage: EditValue,
        });
  
        setEditId("");
        setEditValue("");
      }
    }
  };

  return (
    <div className={`fixed top-0 right-0 bottom-0 left-0 bg-black bg-opacity-55 flex justify-center items-center z-50`}>
      <div className="bg-white px-5 py-4 rounded-lg">
        <input
          type="text"
          value={EditValue}
          onChange={(e) => setEditValue(e.target.value) }
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
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendEditMessage;
