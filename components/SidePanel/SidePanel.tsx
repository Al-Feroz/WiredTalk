import useAppSelector from "@/lib/hooks";
import { RootState } from "@/lib/store";
import React from "react";

const SidePanel: React.FunctionComponent = () => {
  const currentTab = useAppSelector((state: RootState) => state.tab.currentTab);
  const tabManager: Function = () => {
    if (currentTab === "Profile") {
      return <div>Profile</div>;
    } else if (currentTab === "Chat") {
      return <div>Chat</div>;
    } else if (currentTab === "Calls") {
      return <div>Calls</div>;
    } else if (currentTab === "Contacts") {
      return <div>Contacts</div>;
    } else if (currentTab === "Settings") {
      return <div>Settings</div>;
    }
  };

  return <div>{tabManager()}</div>;
};

export default SidePanel;
