import { MoreVertRounded } from "@mui/icons-material";
import React, { useState } from "react";

const MessageBox: React.FC<{
  messageId: string;
  timming: string;
  message: string;
  isSender: boolean;
  onEdit: Function;
  onDelete: Function;
}> = ({ messageId, timming, message, isSender, onEdit, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className={`flex items-center ${isSender ? "justify-start" : "justify-end"}`}>
      <div className="relative max-w-52 my-5">
        <div
          className={`${isSender ? "bg-blue-900" : "bg-blue-600"} ${
            isSender ? "text-right" : "text-left"
          } text-white rounded-md px-2 pt-2 pb-0.5 mx-2`}
        >
          <div className="text-left">{message}</div>
          <span className="text-[10px]">{timming}</span>
        </div>
        {!isSender && (
          <div className={`absolute top-[25%] -left-4`}>
            <button onClick={() => setShowOptions(!showOptions)}>
              <MoreVertRounded />
            </button>
            <div
              className={`absolute bg-white drop-shadow-md right-full top-0 rounded ${
                showOptions ? "block" : "hidden"
              }`}
            >
              <button
                className="bg-transparent hover:bg-neutral-100 px-2 py-1 w-full"
                onClick={() => {
                  setShowOptions(false);
                  onEdit(messageId);
                }}
              >
                Edit
              </button>
              <button
                className="bg-transparent hover:bg-neutral-100 px-2 py-1 w-full"
                onClick={() => {
                  setShowOptions(false);
                  onDelete(messageId);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
