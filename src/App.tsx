import React, { useEffect, useState } from "react";
import Swagger from "swagger-ui-react";

import electron from "electron";

import { platform } from "os";

import Loading from "./Loading";

import "./css/app.css";

const ipc = electron.ipcRenderer;

const IS_WIN = platform() === "win32";

const App = () => {
  const [credentials, setCredentials]: any = useState();
  const [status, setStatus]: any = useState("Starting");

  useEffect(() => {
    ipc.on("READY", (event, data) => {
      setStatus("Attempting to connect to the League Client");
      setCredentials(data);
    });

    ipc.on("LCUCONNECT", (event, data) => {
      setStatus("Connected to league client!");
      setCredentials(data);
    });

    ipc.on("LCUDISCONNECT", (event, data) => {
      setStatus("League client disconnected attempting to reconnect");
      setCredentials("");
    });
  }, []);

  return (
    <>
      <div className="app-close" draggable={false}>
        {IS_WIN ? (
          <div className="app-close__win" draggable={false}>
            X
          </div>
        ) : (
          <div className="app-close__macos">
            <div className="app-close__macos-button" />
          </div>
        )}
      </div>
      {credentials != null ? (
        <Swagger
          url={`https://${credentials.username}:${credentials.password}@${credentials.address}:${credentials.port}/swagger/v2/swagger.json`}
        />
      ) : (
        <Loading message={status} />
      )}
    </>
  );
};

export default App;
