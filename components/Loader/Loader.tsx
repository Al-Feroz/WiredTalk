import Logo from "@/public/WiredTalk.svg"
import Image from 'next/image';
import React from 'react'

const Loader: React.FunctionComponent = () => {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
        <Image
          src={Logo}
          alt="Logo"
          width={80}
          height={80}
          className="absolute top-[42.5%] left-[28.5%] object-contain z-10"
        ></Image>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className={`absolute top-1/2 left-1/2 w-4 h-4 bg-white rounded-full ${`animate-bounce${index + 1}`}`}
          ></div>
        ))}
      </div>
  )
}

export default Loader;