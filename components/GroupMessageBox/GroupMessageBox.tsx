import Image from "next/image";
import React from "react";

const MessageBox: React.FC<{
  username: string;
  message: string;
  isSender: boolean;
  imageUrl: string;
}> = ({ username, message, isSender, imageUrl }) => {
  return (
    <div className={`flex ${!isSender ? "justify-end" : "justify-start"} px-6 py-4`}>
      {isSender && imageUrl && (
        <div className="flex-shrink-0 mr-2">
          <Image
            src={imageUrl}
            alt={username}
            width={32}
            height={32}
            className="rounded-full object-cover"
          ></Image>
        </div>
      )}

      <div className="flex flex-col relative">
        {isSender && username && (
          <div className="text-xs text-gray-500 mt-1">{username}</div>
        )}
        <div
          className={`p-3 rounded-lg text-white ${
            !isSender ? "bg-blue-500" : "bg-gray-700"
          } relative`}
        >
          {message}
          {!isSender ? (
            <div className="absolute -bottom-2 right-2 w-0 h-0 border-t-8 border-t-blue-500 border-r-8 border-r-transparent border-b-8 border-b-transparent"></div>
          ) : (
            <div className="absolute -bottom-2 left-2 w-0 h-0 border-t-8 border-t-gray-700 border-l-8 border-l-transparent border-b-8 border-b-transparent"></div>
          )}
        </div>
      </div>

      {!isSender && imageUrl && (
        <div className="flex-shrink-0 ml-2">
          <Image
            src={imageUrl}
            alt="Sender"
            width={32}
            height={32}
            className="rounded-full object-cover"
          ></Image>
        </div>
      )}
    </div>
  );
};

export default MessageBox;
