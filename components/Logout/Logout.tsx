import { useRouter } from "next/navigation";
import { Close } from "@mui/icons-material";
import Cookies from "js-cookie";
import React from "react";

interface LogoutProps {
  closeBtn: React.Dispatch<React.SetStateAction<boolean>>;
}

const Logout: React.FunctionComponent<LogoutProps> = ({ closeBtn }) => {
  const router = useRouter();
  const LogoutUser = () => {
    Cookies.remove("SESSION_UUID");
    router.push("/login");
  };
  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 bg-black bg-opacity-30">
      <div className="flex w-full h-full justify-center items-center">
        <div className="bg-white px-6 py-4 text-center rounded">
          <div className="flex justify-between items-center">
            <p className="pe-10">Are you sure?</p>
            <Close
              onClick={() => {
                closeBtn(false);
              }}
            />
          </div>
          <button
            className="bg-red-700 active:bg-red-500 text-white py-2 px-4 mt-8 rounded"
            onClick={LogoutUser}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;
