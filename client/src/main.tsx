import ReactDOM from "react-dom/client";
import "./index.css";
import "./sweetalert.css";
import App from "./App";
import "grapesjs/dist/css/grapes.min.css";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { SidebarProvider } from "./context/SideBarContext";
import AuthContextProvider from "./context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import store, { persistor } from "./redux/store/store";
import { PersistGate } from "redux-persist/integration/react";

export const queryClient = new QueryClient();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <AuthContextProvider>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </QueryClientProvider>
      </AuthContextProvider>
    </PersistGate>
  </Provider>
);