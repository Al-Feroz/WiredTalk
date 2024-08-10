import Logo from "@/public/WiredTalk.svg";
import Image from "next/image";
import Link from "next/link";
import React from 'react'

const Header: React.FunctionComponent = () => {
  return (
    <header>
        <nav className="flex justify-between items-center px-10 py-8 shadow bg-white">
          <div className="w-[30%] flex items-center justify-around">
            <Image
              src={Logo}
              alt="WiredTalk Logo"
              width={70}
              className=""
            ></Image>
            <h1 className="font-black text-5xl text-blue-700">WiredTalk</h1>
          </div>
          <ul className="flex justify-around items-center w-[25%]">
            <li>
              <Link
                href="/"
                className="text-stone-900 text-base hover:text-sky-600 hover:text-lg"
              >Home</Link>
            </li>
            <li>
              <Link
                href="/login"
                className="text-stone-900 text-base hover:text-sky-600 hover:text-lg"
              >Login</Link>
            </li>
            <li>
              <Link
                href="/register"
                className="text-stone-900 text-base hover:text-sky-600 hover:text-lg"
              >Register</Link>
            </li>
          </ul>
        </nav>
      </header>
  )
}

export default Header;