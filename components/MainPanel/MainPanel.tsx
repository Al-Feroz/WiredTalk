import Contacts from "@/components/Contacts/Contacts";
import Profile from "@/components/Profile/Profile";
import Chat from "@/components/Chat/Chat";
import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import React from "react";

const MainPanel: React.FunctionComponent<{ UserData: userData }> = ({ UserData }) => {
  const currentTab = useAppSelector((state: RootState) => state.tab.currentTab);
  const tabManager: Function = () => {
    if (currentTab === "Profile") {
      return <Profile userData={ UserData } />;
    } else if (currentTab === "Chat") {
      return <Chat userData={ UserData } />;
    } else if (currentTab === "Calls") {
      return <div>Calls</div>;
    } else if (currentTab === "Contacts") {
      return <Contacts userData={ UserData } />;
    } else if (currentTab === "Settings") {
      return <div>Settings</div>;
    }
  };

  return <div className="w-full">{tabManager()}</div>;
};

export default MainPanel;
