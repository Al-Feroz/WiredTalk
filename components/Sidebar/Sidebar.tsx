import {
  AccountCircleTwoTone,
  ChatRounded,
  CallOutlined,
  ContactsRounded,
  Logout as LogoutIcon,
  Settings,
} from "@mui/icons-material";
import { changeTab } from "@/lib/slices/tabSlice/tabSlice";
import Logout from "@/components/Logout/Logout";
import Logo from "@/public/WiredTalk.svg";
import { useDispatch } from "react-redux";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const Sidebar: React.FunctionComponent = () => {
  const currentTab = useAppSelector((state: RootState) => state.tab.currentTab);
  const [LogoutTab, setLogoutTab] = useState<boolean>(false);
  const dispatch = useDispatch();

  const changeCurrTab = (currentTab: string) => {
    dispatch(changeTab(currentTab));
  };

  return (
    <section className="hidden sm:flex flex-col sm:w-[8%] lg:w-16 px-2 h-[100vh] justify-between items-center bg-white py-4">
      <ul className="flex flex-col w-full items-center">
        <li className="mt-5 mb-1">
          <Link href="/">
            <Image
              src={Logo}
              alt="Logo WiredTalk"
              width={50}
              height={50}
              style={{ width: "50px", height: "auto" }}
              priority
            ></Image>
          </Link>
        </li>
        <li
          className={`my-2 text-[26px] border-s-blue-500 rounded px-2 ${
            currentTab === "Profile"
              ? "border-s-4 text-blue-500"
              : "border-none text-neutral-700"
          }`}
        >
          <button
            onClick={() => {
              changeCurrTab("Profile");
            }}
          >
            <AccountCircleTwoTone fontSize="inherit" />
          </button>
        </li>
        <li
          className={`my-2 text-[26px] border-s-blue-500 rounded px-2 ${
            currentTab === "Chat"
              ? "border-s-4 text-blue-500"
              : "border-none text-neutral-700"
          }`}
        >
          <button
            onClick={() => {
              changeCurrTab("Chat");
            }}
          >
            <ChatRounded fontSize="inherit" />
          </button>
        </li>
        <li
          className={`my-2 text-[26px] border-s-blue-500 rounded px-2 ${
            currentTab === "Calls"
              ? "border-s-4 text-blue-500"
              : "border-none text-neutral-700"
          }`}
        >
          <button
            onClick={() => {
              changeCurrTab("Calls");
            }}
          >
            <CallOutlined fontSize="inherit" />
          </button>
        </li>
        <li
          className={`my-2 text-[26px] border-s-blue-500 rounded px-2 ${
            currentTab === "Contacts"
              ? "border-s-4 text-blue-500"
              : "border-none text-neutral-700"
          }`}
        >
          <button
            onClick={() => {
              changeCurrTab("Contacts");
            }}
          >
            <ContactsRounded fontSize="inherit" />
          </button>
        </li>
      </ul>
      <ul className="flex flex-col w-full items-center">
        <li
          className={`my-2 text-[26px] border-s-blue-500 rounded px-2 ${
            currentTab === "Settings"
              ? "border-s-4 text-blue-500"
              : "border-none text-neutral-700"
          }`}
        >
          <button
            onClick={() => {
              changeCurrTab("Settings");
            }}
          >
            <Settings fontSize="inherit" />
          </button>
        </li>
        <li className="my-2 text-neutral-700 text-[26px] px-2">
          <button onClick={() => setLogoutTab(!LogoutTab)}>
            <LogoutIcon fontSize="inherit" />
          </button>
        </li>
      </ul>
      {LogoutTab ? <Logout closeBtn={setLogoutTab} /> : ""}
    </section>
  );
};

export default Sidebar;
