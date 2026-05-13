import { useEffect, useRef, useState } from "react";
import initialChats from "../utils/initialChat";

const contacts = [
  { id: 1, name: "Mac", status: "online", previewMessage: "See you soon!", lastMessageTime: "1 hour" },
  { id: 2, name: "Farzeen", status: "offline", previewMessage: "Let's catch up later.", lastMessageTime: "1 hour" },
  { id: 3, name: "Aaron", status: "online", previewMessage: "I'll send the files.", lastMessageTime: "1 hour" },
  { id: 4, name: "Kalpesh", status: "offline", previewMessage: "Got it, thanks!", lastMessageTime: "1 hour" },
  { id: 5, name: "BIZ Nest-admins", group: true, previewMessage: "Meeting scheduled for tomorrow.", lastMessageTime: "1 hour" },
  { id: 6, name: "Companies", group: true, subGroups: ["Zomato", "SquadStack", "Infuse"], previewMessage: "Project updates ready.", lastMessageTime: "1 hour" },
  { id: 7, name: "BIZNest All Hands", group: true, previewMessage: "The workload is divided between y'all", lastMessageTime: "1 hour" },
  { id: 8, name: "BIZNest Tech Dept 💻", group: true, previewMessage: "The task of fixing the backend is pending", lastMessageTime: "1 hour" },
  { id: 9, name: "BIZNest Finance Dept", group: true, previewMessage: "The payment has been processed", lastMessageTime: "1 hour" },
  { id: 10, name: "Customer Service", status: "online", previewMessage: "What can I help you with?", lastMessageTime: "1 hour" },
];

const Chat = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [activeContact, setActiveContact] = useState(contacts[0]);
  const [messages, setMessages] = useState(initialChats(activeContact.name));
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (activeContact.name === "Customer Service") {
      setMessages([
        {
          id: 1,
          sender: "Customer Service",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: "What can I help you with?",
          fromMe: false,
        },
      ]);
    } else {
      setMessages(initialChats(activeContact.name));
    }
  }, [activeContact]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() === "") return;

    const newMessage = {
      id: messages.length + 1,
      sender: "Me",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: message,
      fromMe: true,
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setMessage("");
  };

  return <div />;
};

export default Chat;