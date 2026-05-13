import { FaGlobe, FaRupeeSign, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const HostFooter = () => {
  return (
    <footer className="flex w-full flex-col items-center justify-center gap-0 bg-gray-100 pb-0 text-black shadow-lg backdrop-blur-md md:pb-0">
      <div className="w-full border-t-2 border-white py-6 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-content md:flex-row md:text-base lg:flex-row">
          <span>
            &copy; Copyright {new Date().getFullYear()} - {(new Date().getFullYear() + 1).toString().slice(-2)} <span></span>
          </span>
          <span className="text-small lg:text-base">WONOCO PRIVATE LIMITED - SINGAPORE. All Rights Reserved.</span>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-4 py-4 text-[10px] font-semibold text-gray-800 md:flex-row md:text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <FaGlobe className="text-[12px]" />
            <span className="tracking-wide">English (IN)</span>
          </div>
          <div className="flex items-center gap-1 rounded-md border-2 border-gray-700 px-2 py-[2px] text-[12px]">
            <FaRupeeSign className="text-[12px]" />
            <span className="tracking-wide">INR</span>
          </div>
          <FaFacebookF className="text-[12px]" />
          <FaXTwitter className="text-[12px]" />
          <FaInstagram className="text-[12px]" />
        </div>
      </div>
    </footer>
  );
};

export default HostFooter;